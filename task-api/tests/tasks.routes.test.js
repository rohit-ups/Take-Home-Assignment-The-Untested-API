const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('GET /tasks returns all tasks', async () => {
    const response = await request(app).get('/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('POST /tasks creates a task', async () => {
    const response = await request(app).post('/tasks').send({ title: 'API task', priority: 'high' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('API task');
    expect(response.body.priority).toBe('high');
    expect(response.body.status).toBe('todo');
  });

  test('POST /tasks returns 400 for invalid payload', async () => {
    const response = await request(app).post('/tasks').send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title is required/i);
  });

  test('GET /tasks?status=todo filters tasks by status', async () => {
    await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Done 1', status: 'done' });

    const response = await request(app).get('/tasks?status=todo');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('todo');
  });

  test('GET /tasks pagination returns first page with expected items', async () => {
    await request(app).post('/tasks').send({ title: 'Task 1' });
    await request(app).post('/tasks').send({ title: 'Task 2' });
    await request(app).post('/tasks').send({ title: 'Task 3' });

    const response = await request(app).get('/tasks?page=1&limit=2');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Task 1');
    expect(response.body[1].title).toBe('Task 2');
  });

  test('PUT /tasks/:id updates an existing task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original', status: 'todo' });

    const response = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated title', status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated title');
    expect(response.body.status).toBe('in_progress');
  });

  test('PUT /tasks/:id returns 400 for invalid update payload', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });

    const response = await request(app).put(`/tasks/${created.body.id}`).send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title must be a non-empty string/i);
  });

  test('PUT /tasks/:id returns 404 when task does not exist', async () => {
    const response = await request(app).put('/tasks/missing-id').send({ title: 'Updated' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('DELETE /tasks/:id deletes task and returns 204', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Delete me' });

    const delResponse = await request(app).delete(`/tasks/${created.body.id}`);
    const listResponse = await request(app).get('/tasks');

    expect(delResponse.status).toBe(204);
    expect(listResponse.body).toHaveLength(0);
  });

  test('DELETE /tasks/:id returns 404 for missing task', async () => {
    const response = await request(app).delete('/tasks/missing-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('PATCH /tasks/:id/complete marks task as done', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Complete me' });

    const response = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).toBeDefined();
  });

  test('PATCH /tasks/:id/complete returns 404 for missing task', async () => {
    const response = await request(app).patch('/tasks/missing-id/complete');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('GET /tasks/stats returns counts and overdue value', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    await request(app).post('/tasks').send({ title: 'Todo overdue', status: 'todo', dueDate: yesterday });
    await request(app).post('/tasks').send({ title: 'In progress', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'Done task', status: 'done', dueDate: yesterday });

    const response = await request(app).get('/tasks/stats');

    expect(response.status).toBe(200);
    expect(response.body.todo).toBe(1);
    expect(response.body.in_progress).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.overdue).toBe(1);
  });

  test('PATCH /tasks/:id/assign assigns a user to task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(response.status).toBe(200);
    expect(response.body.assignee).toBe('Alice');
  });

  test('PATCH /tasks/:id/assign returns 400 for empty assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/assignee must be a non-empty string/i);
  });

  test('PATCH /tasks/:id/assign returns 404 for missing task', async () => {
    const response = await request(app).patch('/tasks/missing-id/assign').send({ assignee: 'Alice' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('PATCH /tasks/:id/assign returns 409 when task is already assigned', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'Alice' });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already assigned/i);
  });
});
