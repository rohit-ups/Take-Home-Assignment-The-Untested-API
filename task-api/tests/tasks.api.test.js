// tests/tasks.api.test.js
// Integration tests — hit the actual Express routes via supertest.
// No real HTTP server is started; supertest handles in-process transport.

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset the in-memory store before each test
beforeEach(() => {
  taskService._reset();
});

// ─── GET /tasks ───────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns 200 and an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ─── GET /tasks?status= ───────────────────────────────────────────────────────

describe('GET /tasks?status=', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo 1' });
    taskService.create({ title: 'Todo 2' });
    taskService.create({ title: 'Done 1', status: 'done' });
  });

  it('filters tasks by status=todo', async () => {
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach(t => expect(t.status).toBe('todo'));
  });

  it('filters tasks by status=done', async () => {
    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  // ⚠️  BUG — substring match. 'do' matches 'todo' and 'done'.
  // This test documents the correct expected behaviour.
  it('returns only exact status matches (not substring matches)', async () => {
    const res = await request(app).get('/tasks?status=do');
    // 'do' is not a valid status so should return [] not 3 tasks
    expect(res.body).toHaveLength(0);
  });
});

// ─── GET /tasks?page=&limit= ──────────────────────────────────────────────────

describe('GET /tasks (pagination)', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // ⚠️  BUG — page=1 skips the first page due to off-by-one in getPaginated.
  it('page=1 returns the first 10 tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('page=2 returns the next set of tasks', async () => {
    const res = await request(app).get('/tasks?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 11');
  });
});

// ─── GET /tasks/stats ─────────────────────────────────────────────────────────

describe('GET /tasks/stats', () => {
  it('returns zero counts on empty store', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('returns correct counts by status', async () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBe(0);
  });

  it('counts overdue tasks correctly', async () => {
    taskService.create({ title: 'Overdue', dueDate: '2020-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1); // done tasks don't count as overdue
  });
});

// ─── POST /tasks ──────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('New task');
    expect(res.body.status).toBe('todo');
  });

  it('returns 400 if title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ status: 'todo' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 if title is an empty string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid priority value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', priority: 'ultra' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('accepts all valid optional fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'Full task',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2099-12-31T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('high');
    expect(res.body.description).toBe('desc');
  });
});

// ─── PUT /tasks/:id ───────────────────────────────────────────────────────────

describe('PUT /tasks/:id', () => {
  it('updates a task and returns it', async () => {
    const task = taskService.create({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for a non-existent task id', async () => {
    const res = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'x' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an empty title string', async () => {
    const task = taskService.create({ title: 'Valid' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status', async () => {
    const task = taskService.create({ title: 'Valid' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'unknown' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const task = taskService.create({ title: 'Gone' });
    const res = await request(app).delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns 404 for a non-existent task id', async () => {
    const res = await request(app).delete('/tasks/bad-id');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /tasks/:id/complete ────────────────────────────────────────────────

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done and returns it', async () => {
    const task = taskService.create({ title: 'Finish' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for a non-existent task id', async () => {
    const res = await request(app).patch('/tasks/bad-id/complete');
    expect(res.status).toBe(404);
  });

  // ⚠️  BUG — completeTask resets priority to 'medium'.
  // A high-priority task should stay high-priority after being marked done.
  it('does NOT change the priority of the task', async () => {
    const task = taskService.create({ title: 'Urgent', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high'); // currently fails — returns 'medium'
  });
});
// ─── PATCH /tasks/:id/assign ──────────────────────────────────────────────────

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a person and returns the updated task', async () => {
    const task = taskService.create({ title: 'Assign me' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(task.id);
    expect(res.body.title).toBe('Assign me'); // other fields unchanged
  });

  it('returns 404 for a non-existent task id', async () => {
    const res = await request(app)
      .patch('/tasks/bad-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
  });

  it('returns 400 if assignee is missing from body', async () => {
    const task = taskService.create({ title: 'Test' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 if assignee is an empty string', async () => {
    const task = taskService.create({ title: 'Test' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' }); // whitespace only

    expect(res.status).toBe(400);
  });

  it('trims whitespace from assignee name', async () => {
    const task = taskService.create({ title: 'Test' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Bob  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob'); // trimmed
  });

  it('allows reassigning a task that is already assigned', async () => {
    const task = taskService.create({ title: 'Test' });
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob'); // reassignment is allowed
  });
});