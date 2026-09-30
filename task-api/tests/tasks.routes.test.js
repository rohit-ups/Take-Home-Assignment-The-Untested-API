const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => service._reset());

const make = (body = {}) => request(app).post('/tasks').send({ title: 'Task', ...body });

describe('POST /tasks', () => {
  test('creates a task (201) with defaults', async () => {
    const res = await make();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Task', status: 'todo', priority: 'medium', completedAt: null });
    expect(res.body.id).toBeDefined();
  });

  test.each([
    ['missing title', {}],
    ['empty title', { title: '' }],
    ['whitespace title', { title: '   ' }],
    ['non-string title', { title: 123 }],
    ['invalid status', { title: 'x', status: 'pending' }],
    ['invalid priority', { title: 'x', priority: 'urgent' }],
    ['invalid dueDate', { title: 'x', dueDate: 'not-a-date' }],
  ])('400 on %s', async (_n, body) => {
    const res = await request(app).post('/tasks').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  // BUG: the global error handler turns body-parser's 400 (malformed JSON) into a 500
  test.failing('400 (not 500) on malformed JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('returns empty list', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await make({ title: 'a' });
    await make({ title: 'b' });
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(2);
  });

  test('filters by status', async () => {
    await make({ title: 'a', status: 'todo' });
    await make({ title: 'b', status: 'done' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body.map((t) => t.title)).toEqual(['b']);
  });

  test('unknown status returns empty list', async () => {
    await make();
    const res = await request(app).get('/tasks?status=bogus');
    expect(res.body).toEqual([]);
  });

  test.failing('status filter does not partially match', async () => {
    await make({ status: 'todo' });
    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toEqual([]);
  });

  describe('pagination', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) await make({ title: `t${i}` });
    });

    test('page=1&limit=2 returns first two tasks', async () => {
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.body.map((t) => t.title)).toEqual(['t1', 't2']);
    });

    test('limit caps the number of results', async () => {
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.body.length).toBeLessThanOrEqual(2);
    });

    test('page beyond the end returns empty list', async () => {
      const res = await request(app).get('/tasks?page=99&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('non-numeric page/limit fall back to defaults', async () => {
      const res = await request(app).get('/tasks?page=abc&limit=xyz');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

describe('PUT /tasks/:id', () => {
  test('updates a task', async () => {
    const { body: t } = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ title: 'New', priority: 'high', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, title: 'New', priority: 'high', status: 'in_progress' });
  });

  test('404 for unknown id', async () => {
    const res = await request(app).put('/tasks/nope').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test.each([
    [{ title: '' }],
    [{ title: 5 }],
    [{ status: 'bogus' }],
    [{ priority: 'bogus' }],
    [{ dueDate: 'garbage' }],
  ])('400 on invalid body %j', async (body) => {
    const { body: t } = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send(body);
    expect(res.status).toBe(400);
  });

  // BUG: update spreads req.body straight onto the task, so immutable fields can be overwritten
  test.failing('cannot overwrite id / createdAt', async () => {
    const { body: t } = await make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ id: 'hacked', createdAt: '2000-01-01T00:00:00.000Z' });
    expect(res.body.id).toBe(t.id);
    expect(res.body.createdAt).toBe(t.createdAt);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes a task (204)', async () => {
    const { body: t } = await make();
    const res = await request(app).delete(`/tasks/${t.id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get('/tasks')).body).toEqual([]);
  });

  test('404 for unknown id', async () => {
    expect((await request(app).delete('/tasks/nope')).status).toBe(404);
  });

  test('deleting twice gives 404 the second time', async () => {
    const { body: t } = await make();
    await request(app).delete(`/tasks/${t.id}`);
    expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks task done with completedAt', async () => {
    const { body: t } = await make();
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('404 for unknown id', async () => {
    expect((await request(app).patch('/tasks/nope/complete')).status).toBe(404);
  });

  test.failing('keeps original priority', async () => {
    const { body: t } = await make({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.body.priority).toBe('high');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task and returns it', async () => {
    const { body: t } = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, assignee: 'Alice' });
  });

  test('new tasks start unassigned', async () => {
    const { body: t } = await make();
    expect(t.assignee).toBeNull();
  });

  test('404 for unknown id', async () => {
    const res = await request(app).patch('/tasks/nope/assign').send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  test.each([
    ['missing assignee', {}],
    ['empty string', { assignee: '' }],
    ['whitespace only', { assignee: '   ' }],
    ['non-string assignee', { assignee: 42 }],
  ])('400 on %s', async (_name, body) => {
    const { body: t } = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  test('trims surrounding whitespace on the assignee name', async () => {
    const { body: t } = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '  Bob  ' });
    expect(res.body.assignee).toBe('Bob');
  });

  test('re-assigning an already-assigned task overwrites the previous assignee', async () => {
    const { body: t } = await make();
    await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('validating body happens before checking the task exists (400 not 404 for bad body)', async () => {
    const res = await request(app).patch('/tasks/nope/assign').send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('assigning does not change other fields', async () => {
    const { body: t } = await make({ priority: 'high', status: 'in_progress' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    expect(res.body).toMatchObject({ priority: 'high', status: 'in_progress' });
  });
});

describe('GET /tasks/stats', () => {
  test('returns zeroed stats when empty', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts statuses and overdue tasks', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    await make({ status: 'todo', dueDate: past });
    await make({ status: 'in_progress' });
    const { body: t } = await make({ status: 'todo', dueDate: past });
    await request(app).patch(`/tasks/${t.id}/complete`);
    const res = await request(app).get('/tasks/stats');
    expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('/stats is not swallowed by /:id routes', async () => {
    expect((await request(app).get('/tasks/stats')).body).toHaveProperty('overdue');
  });
});
