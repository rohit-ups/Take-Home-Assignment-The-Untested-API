const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Routes (Integration Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should list all tasks', async () => {
      taskService.create({ title: 'Task A' });
      taskService.create({ title: 'Task B' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should support pagination (page=1&limit=2)', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      taskService.create({ title: 'T3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');

      const page2 = await request(app).get('/tasks?page=2&limit=2');
      expect(page2.status).toBe(200);
      expect(page2.body).toHaveLength(1);
      expect(page2.body[0].title).toBe('T3');
    });

    it('should support combining status filter and pagination', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('T1');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return correct counts and overdue tasks', async () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: past });
      taskService.create({ title: 'Task 2', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 0,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with valid body (happy path)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    it('should return 400 if title is missing or empty', async () => {
      const resMissing = await request(app).post('/tasks').send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toContain('title is required');

      const resBlank = await request(app).post('/tasks').send({ title: '   ' });
      expect(resBlank.status).toBe(400);
      expect(resBlank.body.error).toContain('title is required');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'pending' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'urgent' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 if dueDate is not a valid date string', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task (happy path)', async () => {
      const task = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'in_progress', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('low');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 if validation fails on update', async () => {
      const task = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title must be a non-empty string');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204 (happy path)', async () => {
      const task = taskService.create({ title: 'Delete Me' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app).delete('/tasks/fake-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete and preserve priority (happy path)', async () => {
      const task = taskService.create({ title: 'Important Task', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app).patch('/tasks/fake-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user (happy path)', async () => {
      const task = taskService.create({ title: 'Task to assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alex Doe' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alex Doe');
    });

    it('should return 400 if assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toContain('assignee is required and must be a non-empty string');

      const resMissing = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(resMissing.status).toBe(400);
    });

    it('should return 400 if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alex' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});
