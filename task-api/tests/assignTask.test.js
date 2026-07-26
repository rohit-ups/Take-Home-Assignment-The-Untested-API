const request = require('supertest');
const app = require('../src/app'); // Assuming your express app is exported here
const taskService = require('../src/services/taskService');

describe('PATCH /tasks/:id/assign', () => {
  let taskId;

  beforeEach(async () => {
    taskService._reset();
    // Setup: create a fresh task to test against
    const res = await request(app).post('/tasks').send({ title: 'Task to be assigned' });
    taskId = res.body.id;
  });

  it('should successfully assign a user to the task', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Jane Doe' });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Jane Doe');
  });

  it('should overwrite the assignee if the task is already assigned', async () => {
    // First assignment
    await request(app).patch(`/tasks/${taskId}/assign`).send({ assignee: 'Jane Doe' });
    
    // Re-assignment
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'John Smith' });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('John Smith');
  });

  it('should return 400 if the assignee field is an empty string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '   ' });
      
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Assignee name is required and cannot be empty');
  },1000);

  it('should return 400 if the assignee field is missing', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({});
      
    expect(res.statusCode).toBe(400);
  },1000);

  it('should return 404 if the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Jane Doe' });
      
    expect(res.statusCode).toBe(404);
  },1000);
});
