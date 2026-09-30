const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset the in-memory store before each test to ensure isolation
beforeEach(() => {
  taskService._reset();
});

// ─── Helper ──────────────────────────────────────────────────────────────────
const createTaskViaAPI = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({
      title: 'API Test Task',
      description: 'Created via supertest',
      priority: 'high',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
      ...overrides,
    });

// ═══════════════════════════════════════════════════════════════════════════════
// POST /tasks — Create a task
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /tasks', () => {
  it('should create a task and return 201', async () => {
    const res = await createTaskViaAPI();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'API Test Task',
      description: 'Created via supertest',
      priority: 'high',
      status: 'todo',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('should create a task with only the required title', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Minimal' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Minimal');
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when title is only whitespace', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for an invalid status value', async () => {
    const res = await createTaskViaAPI({ status: 'invalid-status' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('should return 400 for an invalid priority value', async () => {
    const res = await createTaskViaAPI({ priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  it('should return 400 for an invalid dueDate', async () => {
    const res = await createTaskViaAPI({ dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /tasks — List all tasks
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /tasks', () => {
  it('should return an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return all tasks', async () => {
    await createTaskViaAPI({ title: 'Task A' });
    await createTaskViaAPI({ title: 'Task B' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /tasks?status= — Filter by status
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /tasks?status=', () => {
  beforeEach(async () => {
    await createTaskViaAPI({ title: 'Todo Task', status: 'todo' });
    await createTaskViaAPI({ title: 'In Progress Task', status: 'in_progress' });
    await createTaskViaAPI({ title: 'Done Task', status: 'done' });
  });

  it('should filter tasks by exact status', async () => {
    const res = await request(app).get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo Task');
  });

  it('should return an empty array for a status with no matches', async () => {
    const res = await request(app).get('/tasks?status=nonexistent');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Exposes the .includes() substring bug
  it('BUG: should not match partial status strings', async () => {
    const res = await request(app).get('/tasks?status=do');

    expect(res.status).toBe(200);
    // 'do' is a substring of 'todo' and 'done' — should return 0 with strict match
    expect(res.body).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /tasks?page=&limit= — Pagination
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await createTaskViaAPI({ title: `Task ${i}` });
    }
  });

  it('should return the first page of results', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  it('should return the second page of results', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
    expect(res.body[1].title).toBe('Task 4');
  });

  it('should return an empty array when page exceeds available data', async () => {
    const res = await request(app).get('/tasks?page=100&limit=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /tasks/:id — Update a task
// ═══════════════════════════════════════════════════════════════════════════════
describe('PUT /tasks/:id', () => {
  it('should update a task and return the updated object', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'Updated Title', priority: 'low' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.priority).toBe('low');
  });

  it('should return 404 when the task does not exist', async () => {
    const res = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'Does not matter' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should return 400 when title is set to an empty string', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for an invalid status on update', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid priority on update', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({ priority: 'critical' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /tasks/:id — Delete a task
// ═══════════════════════════════════════════════════════════════════════════════
describe('DELETE /tasks/:id', () => {
  it('should delete a task and return 204', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app).delete(`/tasks/${id}`);
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await request(app).get('/tasks');
    expect(getRes.body).toHaveLength(0);
  });

  it('should return 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/non-existent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /tasks/:id/complete — Mark a task as complete
// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /tasks/:id/complete', () => {
  it('should mark a task as done and set completedAt', async () => {
    const createRes = await createTaskViaAPI({ status: 'todo' });
    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('should return 404 when the task does not exist', async () => {
    const res = await request(app).patch('/tasks/non-existent-id/complete');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // Exposes the priority-reset bug
  it('BUG: should preserve the original priority when completing', async () => {
    const createRes = await createTaskViaAPI({ priority: 'high' });
    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /tasks/stats — Task statistics
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /tasks/stats', () => {
  it('should return zero counts when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should return correct counts by status', async () => {
    await createTaskViaAPI({ status: 'todo' });
    await createTaskViaAPI({ status: 'todo' });
    await createTaskViaAPI({ status: 'in_progress' });
    await createTaskViaAPI({ status: 'done' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('should count overdue tasks correctly', async () => {
    await createTaskViaAPI({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' }); // overdue
    await createTaskViaAPI({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' }); // done = NOT overdue
    await createTaskViaAPI({ status: 'todo', dueDate: '2099-12-31T00:00:00.000Z' }); // future = NOT overdue

    const res = await request(app).get('/tasks/stats');

    expect(res.body.overdue).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /tasks/:id/assign — Assign task
// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /tasks/:id/assign', () => {
  it('should assign a task to a valid user', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('should allow reassigning an already assigned task', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should return 400 if assignee is missing', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 if assignee is an empty string', async () => {
    const createRes = await createTaskViaAPI();
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 404 if task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(404);
  });
});
