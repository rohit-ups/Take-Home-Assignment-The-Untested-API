const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// Helper to create a task via the API
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Test Task', ...overrides });

// ============================================================
// POST /tasks
// ============================================================
describe('POST /tasks', () => {
  it('should create a task and return 201', async () => {
    const res = await createTask({ title: 'New task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New task',
      priority: 'high',
      status: 'todo',
    });
    expect(res.body.id).toBeDefined();
  });

  it('should apply defaults for optional fields', async () => {
    const res = await createTask();

    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when title is empty', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid status', async () => {
    const res = await createTask({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid priority', async () => {
    const res = await createTask({ priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid dueDate', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('should handle case-insensitivity for status and priority', async () => {
    const res = await createTask({ status: 'IN_PROGRESS', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
  });
});

// ============================================================
// GET /tasks
// ============================================================
describe('GET /tasks', () => {
  it('should return an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ============================================================
// GET /tasks?status=
// ============================================================
describe('GET /tasks?status=', () => {
  it('should filter tasks by status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  it('should return empty array when no tasks match the status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });

    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ============================================================
// GET /tasks?page=&limit=
// ============================================================
describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }
  });

  it('page 1, limit 2 should return the first 2 tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  it('page 2, limit 2 should return the next 2 tasks', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
  });

  it('should return empty array for a page beyond the data', async () => {
    const res = await request(app).get('/tasks?page=100&limit=2');
    expect(res.body).toEqual([]);
  });

  it('should return 400 for negative page numbers', async () => {
    const res = await request(app).get('/tasks?page=-1&limit=2');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for a limit greater than 100', async () => {
    const res = await request(app).get('/tasks?page=1&limit=200');
    expect(res.status).toBe(400);
  });
});

// ============================================================
// PUT /tasks/:id
// ============================================================
describe('PUT /tasks/:id', () => {
  it('should update a task and return the updated version', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .put(`/tasks/${created.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('should return 404 for a non-existing task', async () => {
    const res = await request(app)
      .put('/tasks/non-existing-id')
      .send({ title: 'X' });

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid update data', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .put(`/tasks/${created.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  it('should not affect other fields when only one field is updated', async () => {
    const created = (await createTask({ priority: 'high' })).body;

    const res = await request(app)
      .put(`/tasks/${created.id}`)
      .send({ title: 'New Title' });

    expect(res.body.title).toBe('New Title');
    expect(res.body.priority).toBe('high');
  });
});

// ============================================================
// DELETE /tasks/:id
// ============================================================
describe('DELETE /tasks/:id', () => {
  it('should delete a task and return 204', async () => {
    const created = (await createTask()).body;

    const res = await request(app).delete(`/tasks/${created.id}`);
    expect(res.status).toBe(204);

    // Verify it's gone
    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  it('should return 404 for a non-existing task', async () => {
    const res = await request(app).delete('/tasks/non-existing-id');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /tasks/:id/complete
// ============================================================
describe('PATCH /tasks/:id/complete', () => {
  it('should mark a task as done', async () => {
    const created = (await createTask()).body;

    const res = await request(app).patch(`/tasks/${created.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('should return 404 for a non-existing task', async () => {
    const res = await request(app).patch('/tasks/non-existing-id/complete');
    expect(res.status).toBe(404);
  });

  it('should preserve the original priority', async () => {
    const created = (await createTask({ priority: 'high' })).body;

    const res = await request(app).patch(`/tasks/${created.id}/complete`);
    expect(res.body.priority).toBe('high');
  });
});

// ============================================================
// GET /tasks/stats
// ============================================================
describe('GET /tasks/stats', () => {
  it('should return zeroes when there are no tasks', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('should count tasks correctly by status', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'todo' });
    await createTask({ status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(2);
    expect(res.body.done).toBe(1);
  });

  it('should count overdue tasks', async () => {
    await createTask({
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// ============================================================
// PATCH /tasks/:id/assign
// ============================================================
describe('PATCH /tasks/:id/assign', () => {
  it('should assign a person to a task', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('should return 404 for a non-existing task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existing-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
  });

  it('should return 400 when assignee is missing', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 400 when assignee is an empty string', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when assignee is not a string', async () => {
    const created = (await createTask()).body;

    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
  });

  it('should allow reassigning to a different person', async () => {
    const created = (await createTask()).body;

    await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should persist the assignee on subsequent GET requests', async () => {
    const created = (await createTask()).body;

    await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Charlie' });

    const res = await request(app).get('/tasks');
    const task = res.body.find((t) => t.id === created.id);
    expect(task.assignee).toBe('Charlie');
  });
});
