const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return all tasks (happy path)', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    it('should filter tasks by exact status (happy path)', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo task');
    });

    it('should return empty array when no tasks match status', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('should not match partial status', async () => {
      taskService.create({ title: 'In progress', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=in_pro');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=&limit=', () => {
    it('should return paginated tasks (happy path)', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should return second page correctly', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=2&limit=2');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 3');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const res = await request(app).get('/tasks?page=invalid&limit=2');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('Invalid pagination parameters');
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task (happy path)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New task', priority: 'high' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toBe('New task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'unknown_status' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task (happy path)', async () => {
      const task = taskService.create({ title: 'Old title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New title', status: 'in_progress' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe('New title');
      expect(res.body.status).toBe('in_progress');
    });

    it('should not allow overwriting protected fields', async () => {
      const task = taskService.create({ title: 'Task' });
      const oldCreatedAt = task.createdAt;

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ id: 'new-id', createdAt: 'new-date' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.createdAt).toBe(oldCreatedAt);
    });

    it('should return 404 for unknown task', async () => {
      const res = await request(app)
        .put('/tasks/unknown-id')
        .send({ title: 'New title' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task (happy path)', async () => {
      const task = taskService.create({ title: 'Task to delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.statusCode).toEqual(204);

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(0);
    });

    it('should return 404 for unknown task', async () => {
      const res = await request(app).delete('/tasks/unknown-id');
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should complete a task and not change priority (happy path)', async () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 for unknown task', async () => {
      const res = await request(app).patch('/tasks/unknown-id/complete');
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return stats for tasks', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'In progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });
      taskService.create({ title: 'Overdue', dueDate: '2020-01-01T00:00:00.000Z' });

      const res = await request(app).get('/tasks/stats');
      expect(res.statusCode).toEqual(200);
      expect(res.body.todo).toBe(2);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user (happy path)', async () => {
      const task = taskService.create({ title: 'Task to assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.assignee).toBe('John Doe');
    });

    it('should trim the assignee value', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Jane Doe  ' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.assignee).toBe('Jane Doe');
    });

    it('should return 400 if assignee is missing', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('assignee is required');
    });

    it('should return 400 if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('assignee must be a string');
    });

    it('should return 400 if assignee is empty or whitespace', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('assignee cannot be empty');
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/unknown-id/assign')
        .send({ assignee: 'John Doe' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});
