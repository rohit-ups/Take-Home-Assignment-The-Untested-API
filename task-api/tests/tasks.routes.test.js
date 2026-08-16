'use strict';

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset in-memory store before every test so tests are fully independent.
beforeEach(() => {
  taskService._reset();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function createTask(overrides = {}) {
  const payload = { title: 'Test task', ...overrides };
  const res = await request(app).post('/tasks').send(payload);
  return res.body;
}

// ---------------------------------------------------------------------------
// GET /tasks
// ---------------------------------------------------------------------------
describe('GET /tasks', () => {
  it('returns 200 with an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all created tasks', async () => {
    await createTask({ title: 'Task A' });
    await createTask({ title: 'Task B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // --- status filter ---
  it('filters tasks by status', async () => {
    await createTask({ title: 'todo task', status: 'todo' });
    await createTask({ title: 'in progress task', status: 'in_progress' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  it('returns an empty array when no tasks match the status filter', async () => {
    await createTask({ title: 'todo task', status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('does not return tasks for a different status when filtering', async () => {
    await createTask({ title: 'a', status: 'in_progress' });
    await createTask({ title: 'b', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // --- pagination ---
  it('paginates results — page 1 returns first n tasks', async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=1&limit=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('paginates results — page 2 returns subsequent tasks', async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 4');
  });

  it('returns empty array for a page beyond the last', async () => {
    await createTask({ title: 'only task' });
    const res = await request(app).get('/tasks?page=99&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('uses default page=1 and limit=10 when only one param is given', async () => {
    for (let i = 1; i <= 3; i++) {
      await createTask({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// GET /tasks/stats
// ---------------------------------------------------------------------------
describe('GET /tasks/stats', () => {
  it('returns zero counts when store is empty', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('reflects correct counts by status', async () => {
    await createTask({ title: 'a', status: 'todo' });
    await createTask({ title: 'b', status: 'todo' });
    await createTask({ title: 'c', status: 'in_progress' });
    await createTask({ title: 'd', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('counts overdue tasks (past dueDate and not done)', async () => {
    await createTask({ title: 'overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  it('does not count done tasks as overdue even if past due', async () => {
    await createTask({ title: 'done overdue', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// POST /tasks
// ---------------------------------------------------------------------------
describe('POST /tasks', () => {
  it('creates a task and returns 201 with the task body', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Buy milk');
  });

  it('sets default values on the created task', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Minimal task' });
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.dueDate).toBeNull();
    expect(res.body.completedAt).toBeNull();
    expect(res.body.createdAt).toBeDefined();
  });

  it('stores all provided optional fields', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Full task',
      description: 'Do the thing',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-06-01T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Do the thing');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe('2030-06-01T00:00:00.000Z');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is only whitespace', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x', status: 'pending' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid priority value', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
  });

  it('created task appears in GET /tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Visible task' });
    const listRes = await request(app).get('/tasks');
    expect(listRes.body.some((t) => t.title === 'Visible task')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PUT /tasks/:id
// ---------------------------------------------------------------------------
describe('PUT /tasks/:id', () => {
  it('updates an existing task and returns 200 with the updated task', async () => {
    const task = await createTask({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.priority).toBe('high');
  });

  it('preserves fields not included in the update', async () => {
    const task = await createTask({ title: 'x', description: 'keep me', priority: 'low' });
    const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'x updated' });
    expect(res.body.description).toBe('keep me');
    expect(res.body.priority).toBe('low');
  });

  it('returns 404 for an unknown task id', async () => {
    const res = await request(app).put('/tasks/unknown-id').send({ title: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when title is set to empty string', async () => {
    const task = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status', async () => {
    const task = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('accepts a partial update (only one field)', async () => {
    const task = await createTask({ title: 'original', priority: 'low' });
    const res = await request(app).put(`/tasks/${task.id}`).send({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
    expect(res.body.title).toBe('original');
  });
});

// ---------------------------------------------------------------------------
// DELETE /tasks/:id
// ---------------------------------------------------------------------------
describe('DELETE /tasks/:id', () => {
  it('deletes an existing task and returns 204', async () => {
    const task = await createTask();
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('task is no longer returned after deletion', async () => {
    const task = await createTask({ title: 'delete me' });
    await request(app).delete(`/tasks/${task.id}`);
    const listRes = await request(app).get('/tasks');
    expect(listRes.body.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('returns 404 when deleting a non-existent task', async () => {
    const res = await request(app).delete('/tasks/non-existent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 on a repeated delete of the same task', async () => {
    const task = await createTask();
    await request(app).delete(`/tasks/${task.id}`);
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(404);
  });

  it('does not affect other tasks', async () => {
    const a = await createTask({ title: 'keep me' });
    const b = await createTask({ title: 'delete me' });
    await request(app).delete(`/tasks/${b.id}`);
    const listRes = await request(app).get('/tasks');
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(a.id);
  });
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id/complete
// ---------------------------------------------------------------------------
describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done and returns the updated task', async () => {
    const task = await createTask({ title: 'finish me' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('sets completedAt to a recent ISO timestamp', async () => {
    const task = await createTask();
    const before = Date.now();
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    const after = Date.now();
    const ts = Date.parse(res.body.completedAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('preserves the original priority when completing', async () => {
    // BUG FIX test: original code silently reset priority to 'medium'
    const task = await createTask({ title: 'high prio', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for an unknown task id', async () => {
    const res = await request(app).patch('/tasks/unknown-id/complete');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('persists the completion — GET /tasks reflects done status', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);
    const listRes = await request(app).get('/tasks');
    const found = listRes.body.find((t) => t.id === task.id);
    expect(found.status).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id/assign
// ---------------------------------------------------------------------------
describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user and returns the updated task', async () => {
    const task = await createTask({ title: 'Assignable task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for an unknown task id', async () => {
    const res = await request(app)
      .patch('/tasks/unknown-id/assign')
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when assignee is missing', async () => {
    const task = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when assignee is an empty string', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is only whitespace', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is not a string', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  it('overwrites a previous assignee', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('preserves all other task fields when assigning', async () => {
    const task = await createTask({ title: 'Important task', priority: 'high', status: 'in_progress' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.body.title).toBe('Important task');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('in_progress');
  });

  it('assignee persists — GET /tasks reflects the assignment', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Charlie' });
    const listRes = await request(app).get('/tasks');
    const found = listRes.body.find((t) => t.id === task.id);
    expect(found.assignee).toBe('Charlie');
  });
});
