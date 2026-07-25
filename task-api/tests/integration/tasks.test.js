const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    it('should return stats for tasks', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });
  });

  describe('GET /tasks', () => {
    it('should list all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    it('should paginate tasks correctly (1-based index)', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[4].title).toBe('Task 5');
    });

    it('should combine status filter and pagination', async () => {
      for (let i = 1; i <= 10; i++) {
        taskService.create({ title: `Todo ${i}`, status: 'todo' });
      }

      const res = await request(app).get('/tasks?status=todo&page=2&limit=3');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].title).toBe('Todo 4');
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return task by ID', async () => {
      const created = taskService.create({ title: 'Specific Task' });

      const res = await request(app).get(`/tasks/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Specific Task');
    });

    it('should return 404 if task ID does not exist', async () => {
      const res = await request(app).get('/tasks/non-existent-uuid');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task successfully', async () => {
      const payload = {
        title: 'New API Endpoint',
        description: 'Implement assign endpoint',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New API Endpoint');
      expect(res.body.description).toBe('Implement assign endpoint');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 for invalid ISO dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task successfully', async () => {
      const task = taskService.create({ title: 'Old Title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('should return 400 when validation fails', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'ultra-high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task and return 204', async () => {
      const task = taskService.create({ title: 'Delete Me' });

      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete and preserve priority', async () => {
      const task = taskService.create({ title: 'Finish Project', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a user to a task successfully', async () => {
      const task = taskService.create({ title: 'Review Code' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sarah Connor' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Sarah Connor');
    });

    it('should trim whitespace from assignee name', async () => {
      const task = taskService.create({ title: 'Review Code' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  John Doe  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('John Doe');
    });

    it('should return 400 if assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toContain('assignee is required');

      const resWhitespace = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(resWhitespace.status).toBe(400);

      const resMissing = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(resMissing.status).toBe(400);
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Sarah Connor' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('Error handling middleware (app.js)', () => {
    it('should catch unhandled errors and return 500 Internal Server Error', async () => {
      const getStatsSpy = jest.spyOn(taskService, 'getStats').mockImplementation(() => {
        throw new Error('Unexpected catastrophic error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });

      getStatsSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

