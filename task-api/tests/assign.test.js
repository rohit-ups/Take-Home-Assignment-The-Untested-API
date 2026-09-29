const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('PATCH /tasks/:id/assign', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('assigns a task to a user', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(task.id);
  });

  test('re-assigns a task to a different user', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('trims whitespace from assignee', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Alice  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  test('returns 400 when assignee is missing', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is empty string', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is whitespace only', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is not a string', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 123 });
    expect(res.status).toBe(400);
  });
});
