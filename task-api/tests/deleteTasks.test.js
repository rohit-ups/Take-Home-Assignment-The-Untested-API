const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('DELETE /tasks/:id', () => {

  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Task to delete',
      description: 'Delete me',
      status: 'todo',
      priority: 'low'
    });

    taskId = res.body.id;
  });

  it('should delete a task successfully', async () => {
    const res = await request(app).delete(`/tasks/${taskId}`);

    expect([200, 204]).toContain(res.statusCode);
  });

  it('should not find the task after deletion', async () => {
    await request(app).delete(`/tasks/${taskId}`);

    const res = await request(app).get(`/tasks/${taskId}`);

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existing task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';

    const res = await request(app).delete(`/tasks/${fakeId}`);

    expect(res.statusCode).toBe(404);
  });

});
