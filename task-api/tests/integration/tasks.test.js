const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a task with 201 status and default fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body).toHaveProperty('createdAt');
    });

    it('should create a task with custom fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Custom Task',
          description: 'Custom description',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-11-20T10:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Custom Task');
      expect(res.body.description).toBe('Custom description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe('2026-11-20T10:00:00.000Z');
    });

    it('should return 400 when title is missing or empty', async () => {
      const resMissing = await request(app)
        .post('/tasks')
        .send({});

      expect(resMissing.status).toBe(400);
      expect(resMissing.body).toHaveProperty('error');

      const resEmpty = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'not-valid' });

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

    it('should return 400 when dueDate is an invalid date string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('GET /tasks', () => {
    it('should return 200 and empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 200 and all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should filter tasks by status exact match', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const resTodo = await request(app).get('/tasks?status=todo');
      expect(resTodo.status).toBe(200);
      expect(resTodo.body).toHaveLength(1);
      expect(resTodo.body[0].title).toBe('Todo 1');

      const resDone = await request(app).get('/tasks?status=done');
      expect(resDone.status).toBe(200);
      expect(resDone.body).toHaveLength(1);
      expect(resDone.body[0].title).toBe('Done 1');
    });

    it('should paginate tasks with page and limit starting from page 1', async () => {
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

    it('should support combining status filter and pagination', async () => {
      for (let i = 1; i <= 4; i++) {
        taskService.create({ title: `Todo ${i}`, status: 'todo' });
      }
      taskService.create({ title: 'Done 1', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Todo 3');
      expect(res.body[1].title).toBe('Todo 4');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update task and return 200', async () => {
      const task = taskService.create({ title: 'Original Task', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated Task',
          priority: 'high',
          status: 'in_progress',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Does not exist' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when update payload has invalid values', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid-priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    it('should prevent overwriting immutable id and createdAt via PUT', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const originalCreatedAt = task.createdAt;

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          id: 'hacked-id',
          createdAt: '2000-01-01T00:00:00.000Z',
          title: 'Protected Task',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.createdAt).toBe(originalCreatedAt);
      expect(res.body.title).toBe('Protected Task');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as completed with status done, set completedAt, and preserve original priority', async () => {
      const task = taskService.create({ title: 'Finish testing', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).getTime()).not.toBeNaN();
    });

    it('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return zero counts and overdue when empty', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return accurate counts and overdue statistics', async () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      const future = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: past });
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'T3', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a user to the task and return 200', async () => {
      const task = taskService.create({ title: 'Task to assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Alice');
    });

    it('should allow reassigning a task to a different user', async () => {
      const task = taskService.create({ title: 'Task to reassign' });
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    it('should return 404 when assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Task' });

      const resMissing = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/assignee is required/);

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toMatch(/assignee is required/);
    });

    it('should return 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required/);
    });
  });

  describe('Error handling middleware', () => {
    it('should return 500 when an unhandled error is triggered in a middleware', async () => {
      // Temporarily mock a service function to throw an error
      jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Unexpected failure');
      });

      // Suppress console.error in test output for clean logs
      const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });

      spyConsole.mockRestore();
    });
  });
});
