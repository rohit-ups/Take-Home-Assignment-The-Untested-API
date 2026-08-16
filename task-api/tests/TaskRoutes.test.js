const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// taskService is an in-memory singleton shared by the app, so resetting it
// directly here gives each test a clean slate.
beforeEach(() => {
  taskService._reset();
});

describe('GET /tasks', () => {
  test('returns 200 and an empty array when there are no tasks', async () => {
    const response = await request(app).get('/tasks');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('returns 200 and all created tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const response = await request(app).get('/tasks');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });
});

describe('GET /tasks?status=', () => {
  test('returns only tasks matching the given status', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Working task', status: 'in_progress' });

    const response = await request(app).get('/tasks?status=todo');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Todo task');
  });

  test('returns an empty array when no tasks match', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });

    const response = await request(app).get('/tasks?status=done');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Known: the status query param isn't validated against VALID_STATUSES
  // (validators.js only runs on POST/PUT), so an unrecognized status just
  // returns 200 + an empty array rather than a 400. Out of scope for this
  // pass, documented so it isn't mistaken for a regression.
  test('an unrecognized status value returns 200 + empty array instead of a 400', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });

    const response = await request(app).get('/tasks?status=bogus');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Known: getByStatus() uses String.includes(), so "in" also matches
  // "in_progress". Same underlying behavior as TaskServices.test.js.
  test('a partial status value matches via substring, not exact match', async () => {
    taskService.create({ title: 'Working task', status: 'in_progress' });

    const response = await request(app).get('/tasks?status=in');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Working task');
  });
});

describe('GET /tasks?page=&limit=', () => {
  beforeEach(() => {
    for (let i = 1; i <= 25; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // FIXED: page=1 now correctly returns the first 10 tasks.
  test('page=1 returns the first 10 tasks', async () => {
    const response = await request(app).get('/tasks?page=1&limit=10');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(10);
    expect(response.body[0].title).toBe('Task 1');
    expect(response.body[9].title).toBe('Task 10');
  });

  test('page=2&limit=10 returns the second 10 tasks', async () => {
    const response = await request(app).get('/tasks?page=2&limit=10');

    expect(response.statusCode).toBe(200);
    expect(response.body[0].title).toBe('Task 11');
    expect(response.body[9].title).toBe('Task 20');
  });

  // Known: pageNum is computed as `parseInt(page) || 1`. Since parseInt('0')
  // is 0 (falsy), an explicit page=0 silently falls back to page=1. Out of
  // scope for this pass, documented so it isn't mistaken for a regression.
  test('page=0 is silently coerced to page=1 due to `parseInt(page) || 1`', async () => {
    const responseZero = await request(app).get('/tasks?page=0&limit=10');
    const responseOne = await request(app).get('/tasks?page=1&limit=10');

    expect(responseZero.body).toEqual(responseOne.body);
  });

  test('missing limit defaults to 10', async () => {
    const response = await request(app).get('/tasks?page=1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(10);
    expect(response.body[0].title).toBe('Task 1');
  });

  test('a page beyond available tasks returns an empty array', async () => {
    const response = await request(app).get('/tasks?page=10&limit=10');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('POST /tasks', () => {
  test('creates a task and returns 201 with the created task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'New task' });

    expect(response.statusCode).toBe(201);
    expect(response.body.title).toBe('New task');
    expect(response.body.id).toBeDefined();
    expect(response.body.status).toBe('todo');
  });

  test('returns 400 when title is missing', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ description: 'No title here' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });

  test('returns 400 when title is an empty string', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: '   ' });

    expect(response.statusCode).toBe(400);
  });

  test('returns 400 for an invalid status', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: 'not_a_status' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/status/i);
  });

  test('returns 400 for an invalid priority', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Bad priority', priority: 'urgent' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/priority/i);
  });

  test('returns 400 for an invalid dueDate', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Bad date', dueDate: 'not-a-date' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/dueDate/i);
  });

  test('does not persist a task when validation fails', async () => {
    await request(app).post('/tasks').send({ title: '' });

    const response = await request(app).get('/tasks');
    expect(response.body).toEqual([]);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates an existing task and returns 200', async () => {
    const task = taskService.create({ title: 'Old title' });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'New title', priority: 'high' });

    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe('New title');
    expect(response.body.priority).toBe('high');
    expect(response.body.id).toBe(task.id);
  });

  test('returns 404 for a non-existent task', async () => {
    const response = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'Does not matter' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('returns 400 for an invalid update body before checking existence', async () => {
    const response = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: '' });

    expect(response.statusCode).toBe(400);
  });

  test('returns 400 for an invalid status on update', async () => {
    const task = taskService.create({ title: 'Task' });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'not_a_status' });

    expect(response.statusCode).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes an existing task and returns 204 with no body', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const response = await request(app).delete(`/tasks/${task.id}`);

    expect(response.statusCode).toBe(204);
    expect(response.body).toEqual({});
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('returns 404 for a non-existent task', async () => {
    const response = await request(app).delete('/tasks/non-existent-id');

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks a task as done and returns 200', async () => {
    const task = taskService.create({ title: 'Complete me' });

    const response = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).not.toBeNull();
  });

  test('returns 404 for a non-existent task', async () => {
    const response = await request(app).patch('/tasks/non-existent-id/complete');

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  // FIXED: completing a task no longer resets its priority to 'medium'.
  test('preserves the task priority when completing it', async () => {
    const task = taskService.create({ title: 'Important task', priority: 'high' });

    const response = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(response.statusCode).toBe(200);
    expect(response.body.priority).toBe('high');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task to a user and returns 200', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Pritul' });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignee).toBe('Pritul');
    expect(response.body.id).toBe(task.id);
  });

  test('returns 404 for a non-existent task', async () => {
    const response = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Pritul' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('returns 400 when assignee is missing', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/assignee/i);
  });

  test('returns 400 when assignee is an empty string', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(response.statusCode).toBe(400);
  });

  test('returns 400 when assignee is not a string', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 123 });

    expect(response.statusCode).toBe(400);
  });

  test('allows reassigning an already assigned task', async () => {
    const task = taskService.create({ title: 'Assign me' });

    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignee).toBe('Bob');
  });
});

describe('GET /tasks/stats', () => {
  test('returns zero counts when there are no tasks', async () => {
    const response = await request(app).get('/tasks/stats');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0
    });
  });

  test('returns correct counts by status and overdue', async () => {
    taskService.create({ title: 'Todo 1', status: 'todo' });
    taskService.create({ title: 'Working', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done' });
    taskService.create({ title: 'Overdue', dueDate: '2020-01-01T00:00:00.000Z' });

    const response = await request(app).get('/tasks/stats');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      todo: 2,
      in_progress: 1,
      done: 1,
      overdue: 1
    });
  });

  test('is not shadowed by other GET routes', async () => {
    const response = await request(app).get('/tasks/stats');

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toHaveProperty('error');
  });
});