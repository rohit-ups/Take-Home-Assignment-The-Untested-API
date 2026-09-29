const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Routes Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return empty list when no tasks exist', async () => {
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
    });

    it('should filter tasks by exact status parameter', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Todo Task');
    });

    it('should handle paginated query parameters starting at page 1', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(5);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[4].title).toBe('Task 5');
    });

    it('should support combining status and pagination parameters', async () => {
      for (let i = 1; i <= 10; i++) {
        taskService.create({ title: `Todo Task ${i}`, status: 'todo' });
      }
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=3');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
      expect(res.body[0].title).toBe('Todo Task 1');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return task statistics', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todo', 1);
      expect(res.body).toHaveProperty('in_progress', 1);
      expect(res.body).toHaveProperty('done', 0);
      expect(res.body).toHaveProperty('overdue', 0);
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task when valid body is sent', async () => {
      const payload = {
        title: 'New API Task',
        description: 'Integration test task',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New API Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
      expect(res.body.assignee).toBeNull();
    });

    it('should return 400 bad request if title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 bad request for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Valid', status: 'unknown' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = taskService.create({ title: 'Old Title', status: 'todo' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/invalid-uuid')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('should return 400 for invalid update fields', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'super-high' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete existing task and return 204', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);

      const fetchRes = await request(app).get('/tasks');
      expect(fetchRes.body.length).toBe(0);
    });

    it('should return 404 if task to delete does not exist', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete and preserve priority', async () => {
      const task = taskService.create({ title: 'Complete me', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 if completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to an assignee and return updated task', async () => {
      const task = taskService.create({ title: 'Assign task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sarah Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Sarah Engineer');
    });

    it('should return 400 if assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Assign task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 if assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Sarah Engineer' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });
});
