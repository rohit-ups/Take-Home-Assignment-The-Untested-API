// Integration tests: real Express app, real HTTP semantics via Supertest.
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

const make = (body = {}) => request(app).post('/tasks').send({ title: 'sample', ...body });

describe('POST /tasks', () => {
  test('201 and the created task', async () => {
    const res = await make({ priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'sample', priority: 'high', status: 'todo' });
  });

  test.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['non-string title', { title: 42 }],
    ['bad status', { title: 'x', status: 'pending' }],
    ['bad priority', { title: 'x', priority: 'urgent' }],
    ['bad dueDate', { title: 'x', dueDate: 'not-a-date' }],
  ])('400 for %s', async (_label, body) => {
    const res = await request(app).post('/tasks').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe('GET /tasks', () => {
  test('lists all tasks', async () => {
    await make(); await make();
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by status', async () => {
    await make({ status: 'done' }); await make({ status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('done');
  });

  test('paginates: page 1 returns the first `limit` tasks', async () => {
    for (let i = 1; i <= 5; i++) await make({ title: `t${i}` });
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.body.map((t) => t.title)).toEqual(['t1', 't2']);
  });

  test('defaults to page 1 / limit 10 when only one param is sent', async () => {
    for (let i = 1; i <= 12; i++) await make({ title: `t${i}` });
    const res = await request(app).get('/tasks?page=1');
    expect(res.body).toHaveLength(10);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates fields', async () => {
    const { body: t } = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ title: 'renamed', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, title: 'renamed', status: 'in_progress' });
  });

  test('404 for unknown id', async () => {
    const res = await request(app).put('/tasks/nope').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('400 for invalid payload', async () => {
    const { body: t } = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ priority: 'urgent' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('204 then the task is gone', async () => {
    const { body: t } = await make();
    expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(204);
    expect((await request(app).get('/tasks')).body).toHaveLength(0);
  });

  test('404 for unknown id', async () => {
    expect((await request(app).delete('/tasks/nope')).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks the task done with a completedAt timestamp', async () => {
    const { body: t } = await make();
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('404 for unknown id', async () => {
    expect((await request(app).patch('/tasks/nope/complete')).status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts and overdue (and is not swallowed by /:id)', async () => {
    await make({ status: 'todo', dueDate: '2000-01-01' });
    await make({ status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 0, done: 1, overdue: 1 });
  });
});
