const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Integration Task' });
      
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Integration Task');
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /tasks', () => {
    it('should get all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter by status', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('done');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task', async () => {
      const task = taskService.create({ title: 'Old' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });

    it('should return 404 for unknown id', async () => {
      const res = await request(app)
        .put('/tasks/unknown')
        .send({ title: 'New' });
      
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task', async () => {
      const task = taskService.create({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.getAll().length).toBe(0);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete', async () => {
      const task = taskService.create({ title: 'Incomplete' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a user to a task', async () => {
      const task = taskService.create({ title: 'Unassigned' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Doe' });
      
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Doe');
    });

    it('should return 400 for empty assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      
      expect(res.status).toBe(400);
    });

    it('should return 404 for unknown task', async () => {
      const res = await request(app)
        .patch('/tasks/unknown/assign')
        .send({ assignee: 'Jane Doe' });
      
      expect(res.status).toBe(404);
    });
  });

  describe('GET /tasks (with query parameters)', () => {
    it('should return 400 for invalid status', async () => {
      const res = await request(app).get('/tasks?status=invalid');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid status');
    });

    it('should return 400 for negative page', async () => {
      const res = await request(app).get('/tasks?page=-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Page and limit must be positive integers');
    });

    it('should return 400 for non-numeric limit', async () => {
      const res = await request(app).get('/tasks?limit=abc');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return stats', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todo');
      expect(res.body).toHaveProperty('overdue');
    });
  });
});
