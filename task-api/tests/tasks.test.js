const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ============================================================
// POST /tasks
// ============================================================

describe('POST /tasks', () => {
  it('creates a task with defaults', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
    expect(res.body.completedAt).toBeNull();
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('creates a task with provided fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'Ship feature',
        description: 'Feature description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-01-01T00:00:00.000Z'
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects a missing title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects an invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'Task',
        status: 'invalid'
      });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /tasks
// ============================================================

describe('GET /tasks', () => {
  it('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters tasks by status', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'A', status: 'todo' });

    await request(app)
      .post('/tasks')
      .send({ title: 'B', status: 'done' });

    const res = await request(app)
      .get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body.map(task => task.title)).toEqual(['A']);
  });

  it('paginates correctly from page 1', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    await request(app).post('/tasks').send({ title: 'C' });

    const res = await request(app)
      .get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.map(task => task.title)).toEqual(['A', 'B']);
  });

  it('returns the next page correctly', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    await request(app).post('/tasks').send({ title: 'C' });

    const res = await request(app)
      .get('/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.map(task => task.title)).toEqual(['C']);
  });
});

// ============================================================
// GET /tasks/stats
// ============================================================

describe('GET /tasks/stats', () => {
  it('returns task counts by status', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'A', status: 'todo' });

    await request(app)
      .post('/tasks')
      .send({ title: 'B', status: 'in_progress' });

    await request(app)
      .post('/tasks')
      .send({ title: 'C', status: 'done' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('returns zero counts when there are no tasks', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.body).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0
    });
  });
});

// ============================================================
// PUT /tasks/:id
// ============================================================

describe('PUT /tasks/:id', () => {
  it('updates an existing task', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Original',
        priority: 'low'
      });

    const res = await request(app)
      .put(`/tasks/${create.body.id}`)
      .send({
        title: 'Updated'
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .put('/tasks/does-not-exist')
      .send({
        title: 'Updated'
      });

    expect(res.status).toBe(404);
  });

  it('rejects an invalid update', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Task'
      });

    const res = await request(app)
      .put(`/tasks/${create.body.id}`)
      .send({
        title: ''
      });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /tasks/:id
// ============================================================

describe('DELETE /tasks/:id', () => {
  it('deletes an existing task', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Delete me'
      });

    const res = await request(app)
      .delete(`/tasks/${create.body.id}`);

    expect(res.status).toBe(204);

    const list = await request(app).get('/tasks');

    expect(list.body).toHaveLength(0);
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .delete('/tasks/does-not-exist');

    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /tasks/:id/complete
// ============================================================

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as completed', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Complete me'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('preserves the task priority when completing it', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'High priority',
        priority: 'high'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/complete`);

    expect(res.body.priority).toBe('high');
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/complete');

    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /tasks/:id/assign
// ============================================================

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Assign me'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({
        assignee: 'Priya'
      });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({
        assignee: 'Priya'
      });

    expect(res.status).toBe(404);
  });

  it('rejects a missing assignee', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Assign me'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects an empty assignee', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Assign me'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({
        assignee: ''
      });

    expect(res.status).toBe(400);
  });

  it('rejects a non-string assignee', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Assign me'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({
        assignee: 123
      });

    expect(res.status).toBe(400);
  });

  it('allows a task to be reassigned', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({
        title: 'Assign me'
      });

    await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({
        assignee: 'Priya'
      });

    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({
        assignee: 'Rohan'
      });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Rohan');
  });
});