const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('GET /tasks returns all tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /tasks?status=todo filters by status', async () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  test('GET /tasks?page=1&limit=2 returns paginated tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });

    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  test('POST /tasks creates a task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
  });

  test('POST /tasks returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('PUT /tasks/:id updates an existing task', async () => {
    const task = taskService.create({ title: 'Old title', status: 'todo' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated title', status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.status).toBe('in_progress');
  });

  test('PUT /tasks/:id returns 404 when task not found', async () => {
    const res = await request(app)
      .put('/tasks/missing-id')
      .send({ title: 'Updated title' });

    expect(res.status).toBe(404);
  });

  test('DELETE /tasks/:id deletes a task', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const res = await request(app).delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('DELETE /tasks/:id returns 404 when task not found', async () => {
    const res = await request(app).delete('/tasks/missing-id');

    expect(res.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks task done', async () => {
    const task = taskService.create({ title: 'Finish docs', status: 'in_progress' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeTruthy();
  });

  test('PATCH /tasks/:id/complete returns 404 when task not found', async () => {
    const res = await request(app).patch('/tasks/missing-id/complete');

    expect(res.status).toBe(404);
  });

  test('GET /tasks/stats returns counts and overdue tasks', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: past });
    taskService.create({ title: 'Done task', status: 'done', dueDate: past });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBe(1);
  });

  test('PATCH /tasks/:id/assign assigns a task', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('PATCH /tasks/:id/assign returns 400 for invalid assignee', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  test('PATCH /tasks/:id/assign returns 404 for missing task', async () => {
    const res = await request(app)
      .patch('/tasks/missing-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
  });

  test('PATCH /tasks/:id/assign returns 409 if already assigned', async () => {
    const task = taskService.create({ title: 'Assigned task' });

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already assigned/i);
  });
});
