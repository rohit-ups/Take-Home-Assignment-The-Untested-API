const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return 200 and an empty list initially', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Todo Task');
    });

    it('should support pagination (page 1, limit 2)', async () => {
      for (let i = 0; i < 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 0');
      expect(res.body[1].title).toBe('Task 1');
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with valid input', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Learn Jest',
          description: 'Study testing frameworks',
          priority: 'high',
          status: 'in_progress',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Learn Jest');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'very-high' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'pending' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if dueDate is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update task and return 200', async () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title', priority: 'medium' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.priority).toBe('medium');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for validation errors', async () => {
      const task = taskService.create({ title: 'Title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app).delete('/tasks/non-existent-uuid');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should complete task and return 200', async () => {
      const task = taskService.create({ title: 'Task to complete', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.priority).toBe('high'); // Priority should not change!
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-uuid/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return counts and overdue status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 0,
        done: 1,
        overdue: 0,
      });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign task, return 200, contain updated task, and preserve other fields', async () => {
      const task = taskService.create({ title: 'Task to assign', priority: 'high', description: 'desc' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Omer' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Omer');
      expect(res.body.title).toBe('Task to assign');
      expect(res.body.priority).toBe('high');
      expect(res.body.description).toBe('desc');
    });

    it('should return 404 for nonexistent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-uuid/assign')
        .send({ assignee: 'Omer' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for null assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: null });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-string assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty string assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for whitespace-only string assignee', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return 409 Conflict if task is already assigned to someone else', async () => {
      const task = taskService.create({ title: 'Task' });
      taskService.assignTask(task.id, 'Alice');

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Omer' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Alice');
    });

    it('should return 200 and be idempotent if task is already assigned to the same person', async () => {
      const task = taskService.create({ title: 'Task' });
      taskService.assignTask(task.id, 'Omer');

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Omer' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Omer');
    });
  });
});
