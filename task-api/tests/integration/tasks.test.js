const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Routes Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns all tasks happy path', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Todo Task');
    });

    test('returns paginated tasks (page=1, limit=2)', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('combines status filter and pagination', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Todo ${i}`, status: 'todo' });
      }
      taskService.create({ title: 'Done 1', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Todo 1');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue count', async () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'done' });

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
    test('creates a task with valid payload', async () => {
      const payload = {
        title: 'New Task',
        description: 'New Description',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('high');
      expect(res.body.id).toBeDefined();
    });

    test('returns 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('returns 400 when dueDate is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const task = taskService.create({ title: 'Initial Title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when update payload is invalid', async () => {
      const task = taskService.create({ title: 'Valid Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as complete and preserves original priority', async () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 when marking non-existent task as complete', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to a user', async () => {
      const task = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Doe');
      expect(taskService.findById(task.id).assignee).toBe('Jane Doe');
    });

    test('returns 404 when assigning non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Task' });

      const resMissing = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      expect(resMissing.status).toBe(400);

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      expect(resEmpty.status).toBe(400);

      const resNumber = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });
      expect(resNumber.status).toBe(400);
    });
  });

  describe('Express Error Middleware', () => {
    test('handles 500 internal server errors', () => {
      const errorHandlerLayer = app._router.stack.find((layer) => layer.handle && layer.handle.length === 4);
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const err = new Error('Test error');
      errorHandlerLayer.handle(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      spy.mockRestore();
    });
  });
});


