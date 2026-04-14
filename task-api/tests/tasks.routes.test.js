const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('GET /tasks should return all tasks', async () => {
    taskService.create({ title: 'Task A' });
    taskService.create({ title: 'Task B' });

    const response = await request(app).get('/tasks');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('GET /tasks?status=todo should filter by status', async () => {
    taskService.create({ title: 'Todo one', status: 'todo' });
    taskService.create({ title: 'Done one', status: 'done' });

    const response = await request(app).get('/tasks?status=todo');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('todo');
  });

  test('GET /tasks with pagination should return expected page', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });

    const response = await request(app).get('/tasks?page=1&limit=2');

    expect(response.statusCode).toBe(200);
    expect(response.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  test('POST /tasks should create a task', async () => {
    const payload = { title: 'New task', priority: 'high' };

    const response = await request(app).post('/tasks').send(payload);

    expect(response.statusCode).toBe(201);
    expect(response.body.title).toBe('New task');
    expect(response.body.priority).toBe('high');
  });

  test('POST /tasks should return 400 for invalid payload', async () => {
    const response = await request(app).post('/tasks').send({ title: '' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('title is required and must be a non-empty string');
  });

  test('PUT /tasks/:id should update task', async () => {
    const created = taskService.create({ title: 'Before update' });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .send({ title: 'After update', status: 'in_progress' });

    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe('After update');
    expect(response.body.status).toBe('in_progress');
  });

  test('PUT /tasks/:id should return 404 for missing task', async () => {
    const response = await request(app).put('/tasks/missing-id').send({ title: 'No task' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('DELETE /tasks/:id should delete existing task', async () => {
    const created = taskService.create({ title: 'Delete me' });

    const response = await request(app).delete(`/tasks/${created.id}`);

    expect(response.statusCode).toBe(204);
  });

  test('DELETE /tasks/:id should return 404 for missing task', async () => {
    const response = await request(app).delete('/tasks/missing-id');

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('PATCH /tasks/:id/complete should mark task done', async () => {
    const created = taskService.create({ title: 'Complete me' });

    const response = await request(app).patch(`/tasks/${created.id}/complete`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).toBeTruthy();
  });

  test('PATCH /tasks/:id/complete should return 404 for missing task', async () => {
    const response = await request(app).patch('/tasks/missing-id/complete');

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('GET /tasks/stats should return counts and overdue values', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    taskService.create({ title: 'Overdue', status: 'todo', dueDate: pastDate });
    taskService.create({ title: 'Done', status: 'done', dueDate: pastDate });

    const response = await request(app).get('/tasks/stats');

    expect(response.statusCode).toBe(200);
    expect(response.body.todo).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.overdue).toBe(1);
  });

  test('PATCH /tasks/:id/assign should assign task', async () => {
    const created = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Rohit' });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignee).toBe('Rohit');
  });

  test('PATCH /tasks/:id/assign should return 400 for invalid assignee', async () => {
    const created = taskService.create({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: '   ' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('assignee is required and must be a non-empty string');
  });

  test('PATCH /tasks/:id/assign should return 404 for missing task', async () => {
    const response = await request(app)
      .patch('/tasks/missing-id/assign')
      .send({ assignee: 'Rohit' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('PATCH /tasks/:id/assign should return 409 if task is already assigned', async () => {
    const created = taskService.create({ title: 'Assigned once' });

    await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Alice' });

    const response = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe('Task is already assigned');
  });
});
