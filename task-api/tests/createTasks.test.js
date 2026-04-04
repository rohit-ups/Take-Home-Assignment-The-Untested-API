const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('POST /tasks', () => {
  const validTask = {
    title: 'Complete assignment',
    description: 'Write API tests',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  it('should create a new task successfully', async () => {
    const res = await request(app)
      .post('/tasks')
      .send(validTask);

    expect(res.statusCode).toBe(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe(validTask.title);
    expect(res.body.description).toBe(validTask.description);
    expect(res.body.status).toBe(validTask.status);
    expect(res.body.priority).toBe(validTask.priority);

    expect(res.body.createdAt).toBeDefined();

    expect(res.body.completedAt).toBeNull();
  });

  it('should fail if title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        description: 'No title task',
        status: 'todo',
        priority: 'low'
      });

    expect(res.statusCode).toBe(400);
  });

  it('should fail for invalid status value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        ...validTask,
        status: 'invalid_status'
      });

    expect(res.statusCode).toBe(400);
  });

  it('should fail for invalid priority value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        ...validTask,
        priority: 'urgent'
      });

    expect(res.statusCode).toBe(400);
  });

  it('should fail for invalid dueDate format', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        ...validTask,
        dueDate: 'not-a-date'
      });

    expect(res.statusCode).toBe(400);
  });

  it('should ignore or reject extra fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        ...validTask,
        randomField: 'hack'
      });

    expect([200, 201, 400]).toContain(res.statusCode);
  });

});
