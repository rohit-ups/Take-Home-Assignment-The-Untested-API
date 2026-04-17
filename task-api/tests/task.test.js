import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});
});

describe('Task API', () => {
  let token;
  let user;

  beforeEach(async () => {
    const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
    const res = await request(app).post('/api/auth/register').send(userData);
    token = res.body.data.token;
    user = res.body.data.user;
  });

  describe('POST /api/tasks', () => {
    it('should create a new task when authenticated', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Description',
        priority: 'high',
      };

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(taskData.title);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).post('/api/tasks').send({});
      expect(res.status).toBe(401);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when registering with an existing email', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      const res = await request(app).post('/api/auth/register').send(userData);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email already in use');
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should return 404 when updating a non-existent task', async () => {
      const res = await request(app)
        .patch('/api/tasks/non-existent-uuid')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/assign', () => {
    it('should return 400 for an invalid assignee ID format', async () => {
      const task = await Task.create({ title: 'Task for Assignment', creator: user._id });
      
      const res = await request(app)
        .post(`/api/tasks/${task.uuid}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: 'invalid-id' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid user ID');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return list of tasks', async () => {
      await Task.create({ title: 'Task 1', creator: user._id });
      await Task.create({ title: 'Task 2', creator: user._id });

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter tasks by priority', async () => {
      await Task.create({ title: 'Low', priority: 'low', creator: user._id });
      await Task.create({ title: 'High', priority: 'high', creator: user._id });

      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('High');
    });
  });
});
