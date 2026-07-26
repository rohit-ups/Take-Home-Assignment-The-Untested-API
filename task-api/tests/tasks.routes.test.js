const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => {
  service._reset();
});

const createTask = (body = {}) =>
  request(app).post('/tasks').send({ title: 'default', ...body });

describe('POST /tasks', () => {
  test('creates a task and returns 201', async () => {
    const res = await createTask({ title: 'Write tests', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
  });

  test('rejects a missing title with 400', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test('rejects an invalid status with 400', async () => {
    const res = await createTask({ status: 'archived' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
  });
});

describe('GET /tasks', () => {
  test('lists all tasks', async () => {
    await createTask({ title: 'a' });
    await createTask({ title: 'b' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by exact status', async () => {
    await createTask({ title: 'a', status: 'todo' });
    await createTask({ title: 'b', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('status substring does not leak other statuses', async () => {
    await createTask({ title: 'a', status: 'todo' });
    await createTask({ title: 'b', status: 'done' });

    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toEqual([]);
  });

  test('paginates from page 1', async () => {
    for (let i = 1; i <= 15; i++) {
      await createTask({ title: `task ${i}` });
    }

    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('task 1');
  });

  test('returns the second page correctly', async () => {
    for (let i = 1; i <= 15; i++) {
      await createTask({ title: `task ${i}` });
    }

    const res = await request(app).get('/tasks?page=2&limit=10');
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('task 11');
  });
});

describe('PUT /tasks/:id', () => {
  test('updates an existing task', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'b', status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('b');
    expect(res.body.status).toBe('in_progress');
  });

  test('returns 404 for a missing task', async () => {
    const res = await request(app).put('/tasks/nope').send({ title: 'b' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for an invalid priority', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ priority: 'urgent' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes a task and returns 204', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  test('returns 404 for a missing task', async () => {
    const res = await request(app).delete('/tasks/nope');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks a task complete', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for a missing task', async () => {
    const res = await request(app).patch('/tasks/nope/complete');
    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts and overdue total', async () => {
    await createTask({ title: 'a', status: 'todo' });
    await createTask({ title: 'b', status: 'done' });
    await createTask({ title: 'c', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ todo: 2, done: 1, overdue: 1 });
  });
});
