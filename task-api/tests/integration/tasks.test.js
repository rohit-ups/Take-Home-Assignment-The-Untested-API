const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return an empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });
      taskService.create({ title: 'WIP 1', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo 1');
    });

    it('should handle pagination query parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const resPage1 = await request(app).get('/tasks?page=1&limit=2');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body).toHaveLength(2);
      expect(resPage1.body[0].title).toBe('Task 1');
      expect(resPage1.body[1].title).toBe('Task 2');

      const resPage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(2);
      expect(resPage2.body[0].title).toBe('Task 3');
      expect(resPage2.body[1].title).toBe('Task 4');
    });

    it('should fallback to defaults when invalid pagination values provided', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks?page=invalid&limit=abc');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return stats with zero counts when store is empty', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return accurate status counts and overdue calculation', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: past });
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: future });
      taskService.create({ title: 'Overdue WIP', status: 'in_progress', dueDate: past });
      taskService.create({ title: 'Done Task', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(2);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(2);
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with minimal valid payload', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Integration Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Integration Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should create a task with all valid fields', async () => {
      const payload = {
        title: 'Full Task',
        description: 'Complete API validation',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 when title is empty or whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'unknown_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    it('should return 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'extreme' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    it('should return 400 when dueDate is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date string/);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update task successfully', async () => {
      const created = taskService.create({ title: 'Original Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when update payload is invalid', async () => {
      const created = taskService.create({ title: 'Valid Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'super_urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete existing task and return 204', async () => {
      const created = taskService.create({ title: 'Task To Delete' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      const list = taskService.getAll();
      expect(list).toHaveLength(0);
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark existing task as done and preserve its priority', async () => {
      const created = taskService.create({
        title: 'Important Task',
        priority: 'high',
        status: 'todo',
      });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to an assignee and return 200', async () => {
      const created = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alex Johnson' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.assignee).toBe('Alex Johnson');
    });

    it('should reassign a previously assigned task', async () => {
      const created = taskService.create({ title: 'Reassign Me' });
      await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alex' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Jordan' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jordan');
    });

    it('should return 404 when assigning non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alex' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is missing or empty string', async () => {
      const created = taskService.create({ title: 'Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '' });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toMatch(/assignee/);

      const resMissing = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/assignee/);

      const resWhitespace = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '    ' });
      expect(resWhitespace.status).toBe(400);
      expect(resWhitespace.body.error).toMatch(/assignee/);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should return 500 on unhandled exception', async () => {
      const spy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Database crash simulation');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });

      spy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

