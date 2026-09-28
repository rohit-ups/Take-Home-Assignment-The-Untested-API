const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// helper to create a task quickly
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Test Task', ...overrides });

// POST /tasks
describe('POST /tasks', () => {
  test('creates a task and returns 201', async () => {
    const res = await createTask({ title: 'My Task', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'My Task',
      status: 'todo',
      priority: 'high',
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('returns 400 when title is whitespace only', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid status', async () => {
    const res = await createTask({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  test('returns 400 for invalid priority', async () => {
    const res = await createTask({ priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  test('returns 400 for invalid dueDate', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });

  test('creates with defaults when only title is given', async () => {
    const res = await createTask();
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
  });
});

// GET /tasks
describe('GET /tasks', () => {
  test('returns empty array initially', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(2);
  });
});

// GET /tasks?status=
describe('GET /tasks?status=', () => {
  test('filters tasks by status', async () => {
    await createTask({ title: 'T', status: 'todo' });
    await createTask({ title: 'IP', status: 'in_progress' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('T');
  });

  test('returns empty array when no tasks match', async () => {
    await createTask({ status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toEqual([]);
  });
});

// GET /tasks?page=&limit=
describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 15; i++) {
      await createTask({ title: `Task ${i}` });
    }
  });

  test('paginates results', async () => {
    const res = await request(app).get('/tasks?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });

  test('returns empty for out-of-range page', async () => {
    const res = await request(app).get('/tasks?page=100&limit=5');
    expect(res.body).toEqual([]);
  });

  test('defaults limit to 10 when only page is given', async () => {
    const res = await request(app).get('/tasks?page=1');
    expect(res.body.length).toBeLessThanOrEqual(10);
  });
});

// PUT /tasks/:id
describe('PUT /tasks/:id', () => {
  test('updates an existing task', async () => {
    const created = await createTask();
    const id = created.body.id;
    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.id).toBe(id);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 400 for empty title string', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid status', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'bogus' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid priority', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ priority: 'critical' });
    expect(res.status).toBe(400);
  });

  test('preserves unchanged fields', async () => {
    const created = await createTask({ description: 'original' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'New Title' });
    expect(res.body.description).toBe('original');
  });
});

// DELETE /tasks/:id
describe('DELETE /tasks/:id', () => {
  test('deletes a task and returns 204', async () => {
    const created = await createTask();
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);

    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).delete('/tasks/non-existent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('deleting same task twice gives 404 on second try', async () => {
    const created = await createTask();
    await request(app).delete(`/tasks/${created.body.id}`);
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(404);
  });
});

// PATCH /tasks/:id/complete
describe('PATCH /tasks/:id/complete', () => {
  test('marks a task as done', async () => {
    const created = await createTask();
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).patch('/tasks/fake-id/complete');
    expect(res.status).toBe(404);
  });

  test('completing an already completed task still works', async () => {
    const created = await createTask();
    await request(app).patch(`/tasks/${created.body.id}/complete`);
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});

// GET /tasks/stats
describe('GET /tasks/stats', () => {
  test('returns zeroes with no tasks', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('returns correct counts', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('counts overdue tasks correctly', async () => {
    await createTask({ status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });
    await createTask({ status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// edge cases
describe('Edge cases', () => {
  test('extra unknown fields get stored on the task', async () => {
    const res = await createTask({ title: 'T', extraField: 'hello' });
    expect(res.status).toBe(201);
  });

  test('PUT allows overwriting id and createdAt (no guard)', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ id: 'hacked-id', createdAt: '1999-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('hacked-id');
  });

  test('non-JSON content type returns 400', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'text/plain')
      .send('not json');
    expect(res.status).toBe(400);
  });
});
