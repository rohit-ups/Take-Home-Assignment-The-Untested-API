const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('POST /tasks', () => {
  it('creates a task with all fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New Task', description: 'Desc', priority: 'high', status: 'in_progress', dueDate: '2026-12-31T00:00:00.000Z' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New Task',
      description: 'Desc',
      priority: 'high',
      status: 'in_progress',
      dueDate: '2026-12-31T00:00:00.000Z',
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('creates a task with defaults when optional fields omitted', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Minimal Task' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'T', status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'T', priority: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'T', dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });

  // BUG: empty string "" for status passes truthiness check in validator,
  // bypassing enum validation. Task is created with status: "".
  it('accepts empty string status due to validation bypass bug', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'T', status: '' });

    // Buggy: should be 400 but returns 201
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('');
  });
});

describe('GET /tasks', () => {
  it('returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Task 1' });
    await request(app).post('/tasks').send({ title: 'Task 2' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /tasks?status=', () => {
  beforeEach(async () => {
    await request(app).post('/tasks').send({ title: 'Todo', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Done', status: 'done' });
    await request(app).post('/tasks').send({ title: 'IP', status: 'in_progress' });
  });

  it('filters tasks by exact status', async () => {
    const res = await request(app).get('/tasks?status=done');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done');
  });

  // BUG: getByStatus uses .includes(), so "do" matches "todo" and "done"
  it('returns too many results for partial status due to substring bug', async () => {
    const res = await request(app).get('/tasks?status=do');

    expect(res.status).toBe(200);
    // Buggy: returns 2 (todo + done) instead of 0
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    await request(app).post('/tasks').send({ title: 'Task 1' });
    await request(app).post('/tasks').send({ title: 'Task 2' });
    await request(app).post('/tasks').send({ title: 'Task 3' });
    await request(app).post('/tasks').send({ title: 'Task 4' });
    await request(app).post('/tasks').send({ title: 'Task 5' });
  });

  // Fixed: page 1 now correctly returns the first 2 items
  it('page 1 returns the correct first page', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('returns empty array for page beyond data', async () => {
    const res = await request(app).get('/tasks?page=100&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // BUG: status filter and pagination are mutually exclusive due to early return
  it('ignores pagination when status filter is also present', async () => {
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');

    expect(res.status).toBe(200);
    // Buggy: returns all 5 todo tasks instead of a paginated slice
    expect(res.body).toHaveLength(5);
  });
});

describe('PUT /tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Original', priority: 'low' });
    taskId = res.body.id;
  });

  it('updates a task and returns the updated object', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.priority).toBe('low');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/tasks/non-existent')
      .send({ title: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for empty title', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ priority: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ dueDate: 'bad-date' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'To delete' });

    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/tasks/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 when deleting a task twice', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'To delete twice' });

    const id = created.body.id;
    const res1 = await request(app).delete(`/tasks/${id}`);
    expect(res1.status).toBe(204);

    const res2 = await request(app).delete(`/tasks/${id}`);
    expect(res2.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done with completedAt timestamp', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Complete me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/tasks/non-existent/complete');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // BUG: completeTask() hardcodes priority: 'medium', resetting original priority
  it('resets priority to medium due to hardcoded priority bug', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'High prio', priority: 'high' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    // Buggy: priority should stay 'high' but gets reset to 'medium'
    expect(res.body.priority).toBe('medium');
  });
});

describe('GET /tasks/stats', () => {
  it('returns correct status counts and overdue count', async () => {
    await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'T2', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'T3', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'T4', status: 'done' });
    await request(app).post('/tasks').send({ title: 'T5', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 3,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  it('returns zeroes when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('returns stats reflecting a specific mix of statuses including overdue in-progress task', async () => {
    await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Todo 2', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Done 1', status: 'done' });
    await request(app).post('/tasks').send({ title: 'Overdue IP', status: 'in_progress', dueDate: '2020-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 2,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});

describe('PATCH /tasks/:id/assign', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Assignable task' });
    taskId = res.body.id;
  });

  it('assigns a user to a task and returns the updated task', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.title).toBe('Assignable task');
    expect(res.body.id).toBe(taskId);
  });

  it('allows reassignment to a different user', async () => {
    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when assignee is missing', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  it('returns 400 when assignee is empty string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  it('returns 400 when assignee is not a string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  it('does not change the task status when assigning', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('todo');
  });
});
