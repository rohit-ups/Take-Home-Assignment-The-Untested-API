const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task Routes - Integration', () => {
  test('POST /tasks', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test API' });

    expect(res.statusCode).toBe(201);
  });

  test('POST /tasks invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});