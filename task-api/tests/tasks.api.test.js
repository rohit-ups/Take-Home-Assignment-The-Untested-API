const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task API', () => {
  test('GET /tasks returns an empty list initially', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /tasks creates a task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('todo');
  });

  test('POST /tasks rejects invalid payloads', async () => {
    const missingTitle = await request(app).post('/tasks').send({ priority: 'low' });
    expect(missingTitle.status).toBe(400);

    const badStatus = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: 'invalid' });
    expect(badStatus.status).toBe(400);

    const badPriority = await request(app)
      .post('/tasks')
      .send({ title: 'Bad priority', priority: 'urgent' });
    expect(badPriority.status).toBe(400);

    const badDueDate = await request(app)
      .post('/tasks')
      .send({ title: 'Bad date', dueDate: 'not-a-date' });
    expect(badDueDate.status).toBe(400);
  });

  test('GET /tasks?status filters tasks', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');

    const partial = await request(app).get('/tasks?status=do');
    expect(partial.status).toBe(200);
    expect(partial.body).toHaveLength(0);
  });

  test('GET /tasks paginates results', async () => {
    ['t1', 't2', 't3', 't4', 't5'].forEach((title) =>
      taskService.create({ title, status: 'todo' })
    );

    const page1 = await request(app).get('/tasks?page=1&limit=2');
    const page2 = await request(app).get('/tasks?page=2&limit=2');

    expect(page1.status).toBe(200);
    expect(page1.body.map((t) => t.title)).toEqual(['t1', 't2']);
    expect(page2.body.map((t) => t.title)).toEqual(['t3', 't4']);
  });

  test('PUT /tasks/:id updates a task', async () => {
    const task = taskService.create({ title: 'Original', priority: 'low' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.priority).toBe('high');
  });

  test('PUT /tasks/:id validates and handles missing tasks', async () => {
    const invalid = await request(app).put('/tasks/unknown').send({ title: '' });
    expect(invalid.status).toBe(400);

    const missing = await request(app).put('/tasks/unknown').send({ title: 'Valid' });
    expect(missing.status).toBe(404);
  });

  test('PUT /tasks/:id rejects invalid status/priority/dueDate', async () => {
    const task = taskService.create({ title: 'Validate me' });

    const badStatus = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'invalid' });
    expect(badStatus.status).toBe(400);

    const badPriority = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ priority: 'urgent' });
    expect(badPriority.status).toBe(400);

    const badDueDate = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ dueDate: 'not-a-date' });
    expect(badDueDate.status).toBe(400);
  });

  test('DELETE /tasks/:id removes a task', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  test('DELETE /tasks/:id returns 404 when missing', async () => {
    const res = await request(app).delete('/tasks/unknown');
    expect(res.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks a task complete', async () => {
    const task = taskService.create({ title: 'Complete me', priority: 'high' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  test('PATCH /tasks/:id/complete returns 404 when missing', async () => {
    const res = await request(app).patch('/tasks/unknown/complete');
    expect(res.status).toBe(404);
  });

  test('GET /tasks/stats returns counts and overdue', async () => {
    taskService.create({ title: 'Overdue', dueDate: '2000-01-01T00:00:00Z', status: 'todo' });
    taskService.create({ title: 'In progress', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done', dueDate: '2000-01-01T00:00:00Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('PATCH /tasks/:id/assign assigns a task', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');

    const trimmed = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Bob  ' });
    expect(trimmed.status).toBe(200);
    expect(trimmed.body.assignee).toBe('Bob');

    const reassign = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(reassign.status).toBe(200);
    expect(reassign.body.assignee).toBe('Bob');
  });

  test('PATCH /tasks/:id/assign validates and handles missing tasks', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const invalid = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });
    expect(invalid.status).toBe(400);

    const missingBody = await request(app).patch(`/tasks/${task.id}/assign`).send({});
    expect(missingBody.status).toBe(400);

    const missing = await request(app)
      .patch('/tasks/unknown/assign')
      .send({ assignee: 'Alice' });
    expect(missing.status).toBe(404);
  });

  test('GET /tasks returns 500 on unexpected service errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spy = jest.spyOn(taskService, 'getAll').mockImplementation(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });

    spy.mockRestore();
    errorSpy.mockRestore();
  });
});
