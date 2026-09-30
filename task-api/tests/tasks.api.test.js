const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => service._reset());

const make = async (body = { title: 'Task' }) => (await request(app).post('/tasks').send(body)).body;

describe('POST /tasks', () => {
  test('creates a task (201)', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', priority: 'high', status: 'todo', assignee: null });
  });

  test('400 on missing title', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test('400 on invalid status / priority / dueDate', async () => {
    expect((await request(app).post('/tasks').send({ title: 'x', status: 'bad' })).status).toBe(400);
    expect((await request(app).post('/tasks').send({ title: 'x', priority: 'bad' })).status).toBe(400);
    expect((await request(app).post('/tasks').send({ title: 'x', dueDate: 'bad' })).status).toBe(400);
  });

  //  malformed JSON hits the generic error handler
  test.failing('malformed JSON returns 400, not 500', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{bad');
    spy.mockRestore();
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('returns empty list initially, then all tasks', async () => {
    expect((await request(app).get('/tasks')).body).toEqual([]);
    await make({ title: 'a' });
    await make({ title: 'b' });
    expect((await request(app).get('/tasks')).body).toHaveLength(2);
  });

  test('filters by exact status', async () => {
    await make({ title: 'a', status: 'todo' });
    await make({ title: 'b', status: 'done' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body.map((t) => t.title)).toEqual(['b']);
  });

  test('partial status does not match (regression)', async () => {
    await make({ title: 'a', status: 'todo' });
    await make({ title: 'b', status: 'done' });
    expect((await request(app).get('/tasks?status=do')).body).toEqual([]);
  });

  test('paginates starting at page 1 (regression)', async () => {
    for (let i = 1; i <= 5; i++) await make({ title: `T${i}` });
    const p1 = await request(app).get('/tasks?page=1&limit=2');
    const p3 = await request(app).get('/tasks?page=3&limit=2');
    expect(p1.body.map((t) => t.title)).toEqual(['T1', 'T2']);
    expect(p3.body.map((t) => t.title)).toEqual(['T5']);
  });

  test('defaults: limit=10 when only page is given; page=1 when only limit is given', async () => {
    for (let i = 1; i <= 12; i++) await make({ title: `T${i}` });
    expect((await request(app).get('/tasks?page=1')).body).toHaveLength(10);
    expect((await request(app).get('/tasks?limit=3')).body.map((t) => t.title)).toEqual(['T1', 'T2', 'T3']);
  });

  test('non-numeric page/limit fall back to defaults', async () => {
    await make({ title: 'a' });
    expect((await request(app).get('/tasks?page=abc&limit=xyz')).body).toHaveLength(1);
  });

  // status filter short-circuits pagination
  test.failing('status filter is combined with pagination', async () => {
    for (let i = 1; i <= 4; i++) await make({ title: `T${i}`, status: 'todo' });
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
    expect(res.body).toHaveLength(2);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates a task', async () => {
    const t = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ title: 'New', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, title: 'New', status: 'in_progress' });
  });

  test('404 for unknown id', async () => {
    expect((await request(app).put('/tasks/nope').send({ title: 'x' })).status).toBe(404);
  });

  test('400 on invalid body', async () => {
    const t = await make();
    expect((await request(app).put(`/tasks/${t.id}`).send({ title: '' })).status).toBe(400);
    expect((await request(app).put(`/tasks/${t.id}`).send({ status: 'bad' })).status).toBe(400);
  });

  test.failing('cannot overwrite server-controlled fields (id, createdAt, completedAt)', async () => {
    const t = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ id: 'hacked', createdAt: 'x', completedAt: 'x' });
    expect(res.body).toMatchObject({ id: t.id, createdAt: t.createdAt, completedAt: null });
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes (204) and task is gone', async () => {
    const t = await make();
    const res = await request(app).delete(`/tasks/${t.id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get('/tasks')).body).toHaveLength(0);
  });

  test('404 for unknown id, including double delete', async () => {
    const t = await make();
    await request(app).delete(`/tasks/${t.id}`);
    expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks task done with completedAt', async () => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('404 for unknown id', async () => {
    expect((await request(app).patch('/tasks/nope/complete')).status).toBe(404);
  });

  test.failing('does not change priority', async () => {
    const t = await make({ title: 'x', priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.body.priority).toBe('high');
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts and overdue', async () => {
    await make({ title: 'a', status: 'todo', dueDate: '2000-01-01T00:00:00Z' });
    await make({ title: 'b', status: 'in_progress' });
    const c = await make({ title: 'c' });
    await request(app).patch(`/tasks/${c.id}/complete`);
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('is not shadowed by /:id routes', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.body).toHaveProperty('overdue');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns and returns the updated task', async () => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, assignee: 'Alice' });
    const list = (await request(app).get('/tasks')).body;
    expect(list[0].assignee).toBe('Alice');
  });

  test('trims whitespace', async () => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '  Bob ' });
    expect(res.body.assignee).toBe('Bob');
  });

  test('404 for unknown task', async () => {
    const res = await request(app).patch('/tasks/nope/assign').send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  test.each([[''], ['   '], [42], [null], [undefined]])('400 for invalid assignee %j', async (assignee) => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee });
    expect(res.status).toBe(400);
    expect((await request(app).get('/tasks')).body[0].assignee).toBeNull();
  });

  test('400 when body is missing entirely', async () => {
    const t = await make();
    expect((await request(app).patch(`/tasks/${t.id}/assign`)).status).toBe(400);
  });

  test('400 for over-long assignee', async () => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'x'.repeat(101) });
    expect(res.status).toBe(400);
  });

  test('reassigning an already-assigned task overwrites (200)', async () => {
    const t = await make();
    await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('does not touch other fields', async () => {
    const t = await make({ title: 'keep', priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    expect(res.body).toMatchObject({ title: 'keep', priority: 'high', status: 'todo' });
  });
});
