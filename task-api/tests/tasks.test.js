const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('returns all tasks', async () => {
    taskService.create({ title: 'Write tests' });
    taskService.create({ title: 'Review API' });

    const response = await request(app).get('/tasks');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((task) => task.title)).toEqual(['Write tests', 'Review API']);
  });

  it('creates a task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Add coverage', priority: 'high' });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Add coverage',
      priority: 'high',
      status: 'todo',
      assignee: null,
    });
  });

  it('rejects invalid task creation payloads', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'title is required and must be a non-empty string',
    });
  });

  it('filters tasks by status', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Doing task', status: 'in_progress' });

    // Exact filtering matters here because partial string matching was too loose before.
    const response = await request(app).get('/tasks').query({ status: 'todo' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Todo task');
  });

  it('paginates tasks using page and limit query params', async () => {
    ['one', 'two', 'three'].forEach((title) => taskService.create({ title }));

    // This covers the route-level behavior the user actually hits, not just the service helper.
    const response = await request(app).get('/tasks').query({ page: 1, limit: 2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['one', 'two']);
  });

  it('returns task stats', async () => {
    taskService.create({ title: 'Todo', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Done', status: 'done' });

    const response = await request(app).get('/tasks/stats');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      todo: 1,
      in_progress: 0,
      done: 1,
      overdue: 1,
    });
  });

  it('updates a task', async () => {
    const task = taskService.create({ title: 'Original title' });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated title', status: 'in_progress' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: task.id,
      title: 'Updated title',
      status: 'in_progress',
    });
  });

  it('returns 404 when updating a missing task', async () => {
    const response = await request(app)
      .put('/tasks/missing-id')
      .send({ title: 'Updated title' });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Task not found' });
  });

  it('returns 400 for invalid task updates', async () => {
    const task = taskService.create({ title: 'Original title' });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ priority: 'urgent' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'priority must be one of: low, medium, high',
    });
  });

  it('deletes a task', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const response = await request(app).delete(`/tasks/${task.id}`);

    expect(response.statusCode).toBe(204);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('returns 404 when deleting a missing task', async () => {
    const response = await request(app).delete('/tasks/missing-id');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Task not found' });
  });

  it('marks a task complete', async () => {
    const task = taskService.create({ title: 'Finish docs', status: 'in_progress', priority: 'high' });

    const response = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: task.id,
      status: 'done',
      priority: 'medium',
    });
    expect(response.body.completedAt).toEqual(expect.any(String));
  });

  it('assigns a task to a user', async () => {
    const task = taskService.create({ title: 'Take ownership' });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Morgan' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      id: task.id,
      assignee: 'Morgan',
    });
  });

  it('rejects empty assignees', async () => {
    const task = taskService.create({ title: 'Take ownership' });

    // Whitespace-only input should be treated the same as missing input.
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'assignee is required and must be a non-empty string',
    });
  });

  it('returns 404 when assigning a missing task', async () => {
    const response = await request(app)
      .patch('/tasks/missing-id/assign')
      .send({ assignee: 'Morgan' });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Task not found' });
  });
});
