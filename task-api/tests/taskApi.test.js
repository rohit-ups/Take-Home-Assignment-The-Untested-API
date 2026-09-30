const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const buildTask = (overrides = {}) => ({
  title: 'Sample task',
  description: 'Sample description',
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  ...overrides,
});

describe('Task service', () => {
  test('getByStatus returns tasks with the exact status', () => {
    taskService.create(buildTask({ title: 'A', status: 'todo' }));
    taskService.create(buildTask({ title: 'B', status: 'in_progress' }));

    const todos = taskService.getByStatus('todo');

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('A');
  });

  // Regression test for FIX #2: a partial value must NOT match.
  // Under the old includes() logic, 'do' matched 'todo' and 'progress' matched 'in_progress'.
  test('getByStatus does not match partial status values', () => {
    taskService.create(buildTask({ status: 'todo' }));
    taskService.create(buildTask({ status: 'in_progress' }));

    expect(taskService.getByStatus('do')).toHaveLength(0);
    expect(taskService.getByStatus('progress')).toHaveLength(0);
  });

  // Regression test for FIX #1
  test('getPaginated uses 1-based page numbers', () => {
    taskService.create(buildTask({ title: 'A' }));
    taskService.create(buildTask({ title: 'B' }));
    taskService.create(buildTask({ title: 'C' }));

    expect(taskService.getPaginated(1, 2).map((t) => t.title)).toEqual(['A', 'B']);
    expect(taskService.getPaginated(2, 2).map((t) => t.title)).toEqual(['C']);
  });

  test('getPaginated falls back to defaults for invalid page/limit', () => {
    taskService.create(buildTask({ title: 'A' }));

    expect(taskService.getPaginated(-5, 0).map((t) => t.title)).toEqual(['A']);
    expect(taskService.getPaginated('abc', 'xyz').map((t) => t.title)).toEqual(['A']);
  });

  test('getStats counts statuses and overdue items', () => {
    taskService.create(buildTask({ title: 'Overdue', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' }));
    taskService.create(buildTask({ title: 'In progress', status: 'in_progress' }));
    taskService.create(buildTask({ title: 'Done', status: 'done', dueDate: '2020-01-01T00:00:00.000Z' }));

    // A done task with a past due date is NOT overdue
    expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  // Regression test for FIX #3
  test('completeTask sets status/completedAt and preserves priority', () => {
    const task = taskService.create(buildTask({ title: 'Finish', priority: 'high' }));

    const result = taskService.completeTask(task.id);

    expect(result.status).toBe('done');
    expect(result.priority).toBe('high');
    expect(result.completedAt).toBeTruthy();
  });

  test('completeTask returns null for a missing task', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });

  test('assignTask overwrites an existing assignee', () => {
    const task = taskService.create(buildTask({ assignee: 'Alice' }));

    const result = taskService.assignTask(task.id, 'Bob');

    expect(result.assignee).toBe('Bob');
  });

  test('assignTask returns null for a missing task', () => {
    expect(taskService.assignTask('nope', 'Bob')).toBeNull();
  });
});

describe('Task API', () => {
  test('GET /tasks returns all tasks', async () => {
    taskService.create(buildTask({ title: 'Task 1' }));
    taskService.create(buildTask({ title: 'Task 2' }));

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /tasks?status=todo filters matching tasks', async () => {
    taskService.create(buildTask({ title: 'Task 1', status: 'todo' }));
    taskService.create(buildTask({ title: 'Task 2', status: 'in_progress' }));

    const res = await request(app).get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task 1');
  });

  // Regression test for FIX #2 at the API level
  test('GET /tasks?status=do (partial value) returns no tasks', async () => {
    taskService.create(buildTask({ status: 'todo' }));

    const res = await request(app).get('/tasks?status=do');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /tasks?page=1&limit=2 returns the first page', async () => {
    taskService.create(buildTask({ title: 'Task 1' }));
    taskService.create(buildTask({ title: 'Task 2' }));
    taskService.create(buildTask({ title: 'Task 3' }));

    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  test('GET /tasks?page=2&limit=2 returns the second page', async () => {
    taskService.create(buildTask({ title: 'Task 1' }));
    taskService.create(buildTask({ title: 'Task 2' }));
    taskService.create(buildTask({ title: 'Task 3' }));

    const res = await request(app).get('/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['Task 3']);
  });

  test('GET /tasks/stats reports counts by status and overdue', async () => {
    taskService.create(buildTask({ title: 'Overdue', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' }));
    taskService.create(buildTask({ title: 'Task 2', status: 'in_progress' }));
    taskService.create(buildTask({ title: 'Task 3', status: 'done' }));

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('POST /tasks creates a new task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send(buildTask({ title: 'New task', priority: 'high' }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New task',
      status: 'todo',
      priority: 'high',
      description: 'Sample description',
      assignee: null,
    });
    expect(res.body.id).toBeTruthy();
  });

  test('POST /tasks accepts an optional assignee', async () => {
    const res = await request(app)
      .post('/tasks')
      .send(buildTask({ assignee: 'Alice' }));

    expect(res.status).toBe(201);
    expect(res.body.assignee).toBe('Alice');
  });

  test('POST /tasks rejects invalid payloads', async () => {
    const res = await request(app).post('/tasks').send({ title: '', priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title|priority/);
  });

  // Regression test for FIX #4
  test('POST /tasks with malformed JSON returns 400, not 500', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON in request body');
  });

  test('PUT /tasks/:id updates the task', async () => {
    const task = taskService.create(buildTask({ title: 'Old title' }));

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'New title', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.priority).toBe('high');
  });

  test('PUT /tasks/:id returns 404 for a missing task', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'Nope' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('PUT /tasks/:id rejects an invalid status', async () => {
    const task = taskService.create(buildTask());

    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'banana' });

    expect(res.status).toBe(400);
  });

  test('DELETE /tasks/:id removes a task', async () => {
    const task = taskService.create(buildTask({ title: 'Delete me' }));

    const res = await request(app).delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('DELETE /tasks/:id returns 404 for a missing task', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  // Regression test for FIX #3 at the API level
  test('PATCH /tasks/:id/complete marks done and preserves priority', async () => {
    const task = taskService.create(buildTask({ priority: 'high' }));

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.priority).toBe('high');
    expect(res.body.completedAt).toBeTruthy();
  });

  test('PATCH /tasks/:id/complete returns 404 for a missing task', async () => {
    const res = await request(app).patch('/tasks/missing-id/complete');

    expect(res.status).toBe(404);
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a task and returns the updated task', async () => {
      const task = taskService.create(buildTask());

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
      expect(res.body.id).toBe(task.id);
    });

    test('trims whitespace around the assignee', async () => {
      const task = taskService.create(buildTask());

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Alice  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    test('allows reassigning an already-assigned task', async () => {
      const task = taskService.create(buildTask({ assignee: 'Alice' }));

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('rejects an empty or whitespace-only assignee', async () => {
      const task = taskService.create(buildTask());

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee must be a non-empty string');
    });

    test('rejects a non-string assignee', async () => {
      const task = taskService.create(buildTask());

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 123 });

      expect(res.status).toBe(400);
    });

    test('rejects a missing assignee field', async () => {
      const task = taskService.create(buildTask());

      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});

      expect(res.status).toBe(400);
    });

    test('returns 404 for a missing task', async () => {
      const res = await request(app).patch('/tasks/missing-id/assign').send({ assignee: 'Bob' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});