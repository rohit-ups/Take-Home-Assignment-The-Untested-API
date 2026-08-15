'use strict';

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Integration task', ...overrides });

// ─── GET /tasks ───────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ─── GET /tasks?status= ───────────────────────────────────────────────────────

describe('GET /tasks?status=', () => {
  it('filters tasks by exact status', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  it('does NOT return substring-matched statuses (B1 regression)', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'done' });
    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toHaveLength(0);
  });

  it('returns empty array when no tasks match the status', async () => {
    await createTask({ status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toHaveLength(0);
  });
});

// ─── GET /tasks?page=&limit= ─────────────────────────────────────────────────

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 15; i++) {
      await createTask({ title: `Task ${i}` });
    }
  });

  it('returns page 1 starting from the first task', async () => {
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('returns page 2 starting from the 11th task', async () => {
    const res = await request(app).get('/tasks?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 11');
  });

  it('uses default limit of 10 when not provided', async () => {
    const res = await request(app).get('/tasks?page=1');
    expect(res.body).toHaveLength(10);
  });

  it('uses default page of 1 when not provided', async () => {
    const res = await request(app).get('/tasks?limit=5');
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 1');
  });
});

// ─── GET /tasks/stats ────────────────────────────────────────────────────────

describe('GET /tasks/stats', () => {
  it('returns zeroes when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('returns correct counts per status', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('counts overdue tasks correctly', async () => {
    await createTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// ─── POST /tasks ──────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  it('creates a task with valid data and returns 201', async () => {
    const res = await createTask({ title: 'My task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('My task');
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status', async () => {
    const res = await createTask({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('returns 400 for an invalid priority', async () => {
    const res = await createTask({ priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  it('returns 400 for an invalid dueDate', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });

  it('applies defaults for optional fields', async () => {
    const res = await createTask();
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
    expect(res.body.completedAt).toBeNull();
  });
});

// ─── PUT /tasks/:id ───────────────────────────────────────────────────────────

describe('PUT /tasks/:id', () => {
  it('updates the task and returns the updated object', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated title', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).put('/tasks/ghost-id').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when setting title to an empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status value', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('deletes the task and returns 204 with no body', async () => {
    const created = await createTask();
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).delete('/tasks/ghost-id');
    expect(res.status).toBe(404);
  });

  it('actually removes the task from the store', async () => {
    const created = await createTask();
    await request(app).delete(`/tasks/${created.body.id}`);
    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });
});

// ─── PATCH /tasks/:id/complete ────────────────────────────────────────────────

describe('PATCH /tasks/:id/complete', () => {
  it('marks the task as done and returns it', async () => {
    const created = await createTask({ status: 'in_progress' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('does NOT change priority when completing (B3 regression)', async () => {
    const created = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).patch('/tasks/ghost-id/complete');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /tasks/:id/assign ─────────────────────────────────────────────────

describe('PATCH /tasks/:id/assign', () => {
  it('assigns the task and returns the updated task', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('returns 404 for a non-existent task id', async () => {
    const res = await request(app)
      .patch('/tasks/ghost-id/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when assignee is missing', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  it('returns 400 when assignee is an empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is a whitespace-only string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('allows reassigning an already-assigned task', async () => {
    const created = await createTask();
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns 400 when assignee is not a string (e.g. a number)', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  it('trims leading/trailing whitespace from the assignee name', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '  Alice  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });
});
