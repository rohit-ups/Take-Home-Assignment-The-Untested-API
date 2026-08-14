const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const createTask = (fields = {}) => taskService.create({ title: 'Task', ...fields });

beforeEach(() => {
  taskService._reset();
});

describe('Task API', () => {
  test('POST /tasks creates a sanitized task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: '  Write tests  ', description: '  Cover the API  ', priority: 'high' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Write tests',
      description: 'Cover the API',
      status: 'todo',
      priority: 'high',
      dueDate: null,
      completedAt: null,
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(Date.parse(response.body.createdAt)).not.toBeNaN();
  });

  test.each([
    [{}, 'title'],
    [{ title: '   ' }, 'title'],
    [{ title: 'Task', status: 'progress' }, 'status'],
    [{ title: 'Task', priority: 'urgent' }, 'priority'],
    [{ title: 'Task', dueDate: 'not-a-date' }, 'dueDate'],
  ])('POST /tasks rejects invalid input %#', async (body, field) => {
    const response = await request(app).post('/tasks').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(field);
  });

  test('GET /tasks lists all tasks', async () => {
    createTask({ title: 'First' });
    createTask({ title: 'Second' });

    const response = await request(app).get('/tasks');

    expect(response.status).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['First', 'Second']);
  });

  test('GET /tasks filters by exact status and rejects invalid statuses', async () => {
    createTask({ title: 'Todo', status: 'todo' });
    createTask({ title: 'Started', status: 'in_progress' });

    const filtered = await request(app).get('/tasks?status=todo');
    const invalid = await request(app).get('/tasks?status=progress');

    expect(filtered.status).toBe(200);
    expect(filtered.body.map((task) => task.title)).toEqual(['Todo']);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toContain('status');
  });

  test('GET /tasks returns 1-based pages', async () => {
    for (let number = 1; number <= 6; number++) createTask({ title: `Task ${number}` });

    const firstPage = await request(app).get('/tasks?page=1&limit=5');
    const secondPage = await request(app).get('/tasks?page=2&limit=5');

    expect(firstPage.body.map((task) => task.title)).toEqual([
      'Task 1',
      'Task 2',
      'Task 3',
      'Task 4',
      'Task 5',
    ]);
    expect(secondPage.body.map((task) => task.title)).toEqual(['Task 6']);
  });

  test.each([
    ['?page=-1&limit=5', 5],
    ['?page=1&limit=0', 10],
    ['?page=1&limit=-1', 10],
    ['?page=nope&limit=nope', 10],
  ])('GET /tasks uses pagination defaults for %s', async (query, expectedCount) => {
    for (let number = 1; number <= 11; number++) createTask({ title: `Task ${number}` });

    const response = await request(app).get(`/tasks${query}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(expectedCount);
    expect(response.body[0].title).toBe('Task 1');
  });

  test('GET /tasks/stats returns status and overdue counts', async () => {
    createTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    createTask({ status: 'in_progress', dueDate: '2999-01-01T00:00:00.000Z' });
    createTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });

    const response = await request(app).get('/tasks/stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('PUT /tasks/:id updates sanitized fields and protects internal fields', async () => {
    const task = createTask({ priority: 'low' });

    const response = await request(app).put(`/tasks/${task.id}`).send({
      id: 'replacement-id',
      title: '  Updated  ',
      description: '  New description  ',
      priority: 'high',
      createdAt: 'replacement-created-at',
      completedAt: 'replacement-completed-at',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: task.id,
      title: 'Updated',
      description: 'New description',
      priority: 'high',
      createdAt: task.createdAt,
      completedAt: null,
    });
  });

  test('PUT /tasks/:id rejects invalid updates and missing tasks', async () => {
    const task = createTask();

    const invalid = await request(app).put(`/tasks/${task.id}`).send({ status: 'progress' });
    const missing = await request(app).put('/tasks/missing').send({ title: 'Updated' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toContain('status');
    expect(missing.status).toBe(404);
  });

  test('DELETE /tasks/:id deletes a task and returns an empty 204 response', async () => {
    const task = createTask();

    const deleted = await request(app).delete(`/tasks/${task.id}`);
    const missing = await request(app).delete(`/tasks/${task.id}`);

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');
    expect(taskService.findById(task.id)).toBeUndefined();
    expect(missing.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete preserves priority and handles missing tasks', async () => {
    const task = createTask({ priority: 'high' });

    const completed = await request(app).patch(`/tasks/${task.id}/complete`);
    const missing = await request(app).patch('/tasks/missing/complete');

    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('done');
    expect(completed.body.priority).toBe('high');
    expect(Date.parse(completed.body.completedAt)).not.toBeNaN();
    expect(missing.status).toBe(404);
  });

  test('PATCH /tasks/:id/assign assigns and reassigns a task', async () => {
    const task = createTask();

    const assigned = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Ada  ' });
    const reassigned = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Grace' });

    expect(assigned.status).toBe(200);
    expect(assigned.body.assignee).toBe('Ada');
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.assignee).toBe('Grace');
  });

  test.each([{}, { assignee: '' }, { assignee: '   ' }, { assignee: 42 }])(
    'PATCH /tasks/:id/assign rejects invalid body %#',
    async (body) => {
      const task = createTask();
      const response = await request(app).patch(`/tasks/${task.id}/assign`).send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assignee');
    },
  );

  test('PATCH /tasks/:id/assign returns 404 for a missing task', async () => {
    const response = await request(app).patch('/tasks/missing/assign').send({ assignee: 'Ada' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });
});
