const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('PUT /tasks/:id', () => {

  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Original Task',
      description: 'Before update',
      status: 'todo',
      priority: 'low'
    });

    taskId = res.body.id;
  });

  it('should update a task successfully', async () => {
    const updatedData = {
      title: 'Updated Task',
      status: 'in_progress',
      priority: 'high'
    };

    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send(updatedData);

    expect(res.statusCode).toBe(200);

    expect(res.body.id).toBe(taskId);
    expect(res.body.title).toBe(updatedData.title);
    expect(res.body.status).toBe(updatedData.status);
    expect(res.body.priority).toBe(updatedData.priority);
  });

  it('should return 404 for non-existing task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';

    const res = await request(app)
      .put(`/tasks/${fakeId}`)
      .send({ title: 'Does not exist' });

    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid status', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'wrong_status' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ priority: 'urgent' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid dueDate format', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ dueDate: 'invalid-date' });

    expect(res.statusCode).toBe(400);
  });

  it('should update only provided fields (partial update)', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'done' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('done');

    expect(res.body.title).toBeDefined();
  });

});

describe('PATCH /tasks/:id/complete', () => {

  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Incomplete Task',
      description: 'Needs completion',
      status: 'todo',
      priority: 'medium'
    });

    taskId = res.body.id;
  });

  it('should mark task as complete', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/complete`);

    expect(res.statusCode).toBe(200);

    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('should not break if task is already completed', async () => {
    await request(app).patch(`/tasks/${taskId}/complete`);
    const res = await request(app).patch(`/tasks/${taskId}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('should return 404 for non-existing task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';

    const res = await request(app)
      .patch(`/tasks/${fakeId}/complete`);

    expect(res.statusCode).toBe(404);
  });

});
