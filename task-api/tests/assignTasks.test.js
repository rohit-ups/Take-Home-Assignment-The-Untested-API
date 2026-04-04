const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('PATCH /tasks/:id/assign', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Unassigned Task',
      description: 'Needs a person',
      status: 'todo',
      priority: 'medium'
    });

    taskId = res.body.id;
  });

  it('should assign a task to a user', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Ada Lovelace' });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(taskId);
    expect(res.body.assignee).toBe('Ada Lovelace');
  });

  it('should trim whitespace from assignee names', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '  Grace Hopper  ' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Grace Hopper');
  });

  it('should allow reassignment', async () => {
    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'First Person' });

    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Second Person' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Second Person');
  });

  it('should return 400 for empty assignee', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '   ' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existing task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';

    const res = await request(app)
      .patch(`/tasks/${fakeId}/assign`)
      .send({ assignee: 'Ada Lovelace' });

    expect(res.statusCode).toBe(404);
  });
});
