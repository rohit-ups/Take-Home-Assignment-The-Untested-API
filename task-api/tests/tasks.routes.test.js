const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes integration tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      taskService.create({ title: 'Task A', status: 'todo' });
      taskService.create({ title: 'Task B', status: 'done' });

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t) => t.title)).toEqual(['Task A', 'Task B']);
    });

    test('filters by exact status', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const res = await request(app).get('/tasks').query({ status: 'todo' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('todo');
    });

    test('returns empty array for invalid status query', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const res = await request(app).get('/tasks').query({ status: 'do' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns first page when page=1 and limit=2', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks').query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with valid payload', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New task', status: 'todo', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'New task',
        status: 'todo',
        priority: 'high',
      });
      expect(res.body.id).toEqual(expect.any(String));
    });

    test('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ status: 'todo', priority: 'medium' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('returns 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad status', status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    test('returns 400 for invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad date', dueDate: 'not-an-iso-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const existing = taskService.create({ title: 'Before update', status: 'todo' });

      const res = await request(app)
        .put(`/tasks/${existing.id}`)
        .send({ title: 'After update', status: 'in_progress', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: existing.id,
        title: 'After update',
        status: 'in_progress',
        priority: 'low',
      });
    });

    test('returns 404 when task id does not exist', async () => {
      const res = await request(app).put('/tasks/missing-id').send({ title: 'Updated title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 for invalid status value', async () => {
      const existing = taskService.create({ title: 'Needs valid update' });

      const res = await request(app)
        .put(`/tasks/${existing.id}`)
        .send({ status: 'bad-status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    test('returns 400 for empty title', async () => {
      const existing = taskService.create({ title: 'Title exists' });

      const res = await request(app)
        .put(`/tasks/${existing.id}`)
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task', async () => {
      const existing = taskService.create({ title: 'Delete target' });

      const res = await request(app).delete(`/tasks/${existing.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(existing.id)).toBeUndefined();
    });

    test('returns 404 when task id does not exist', async () => {
      const res = await request(app).delete('/tasks/missing-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 404 when deleting the same task twice', async () => {
      const existing = taskService.create({ title: 'Delete twice' });

      const first = await request(app).delete(`/tasks/${existing.id}`);
      const second = await request(app).delete(`/tasks/${existing.id}`);

      expect(first.status).toBe(204);
      expect(second.status).toBe(404);
      expect(second.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks an existing task as complete', async () => {
      const existing = taskService.create({ title: 'Complete me', status: 'in_progress' });

      const res = await request(app).patch(`/tasks/${existing.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toEqual(expect.any(String));
    });

    test('returns 404 when task id does not exist', async () => {
      const res = await request(app).patch('/tasks/missing-id/complete');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('is idempotent enough to keep done status on repeated completion calls', async () => {
      const existing = taskService.create({ title: 'Complete twice' });

      const first = await request(app).patch(`/tasks/${existing.id}/complete`);
      const second = await request(app).patch(`/tasks/${existing.id}/complete`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.status).toBe('done');
      expect(second.body.completedAt).toEqual(expect.any(String));
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns an assignee to an existing task', async () => {
      const existing = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: 'Ravi Shyam' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(existing.id);
      expect(res.body.assignee).toBe('Ravi Shyam');
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/missing-id/assign')
        .send({ assignee: 'Ravi Shyam' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when assignee is missing or empty', async () => {
      const existing = taskService.create({ title: 'Needs assignee' });

      const missing = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({});
      const empty = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: '   ' });

      expect(missing.status).toBe(400);
      expect(missing.body.error).toBe('assignee is required and must be a non-empty string');
      expect(empty.status).toBe(400);
      expect(empty.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('returns 409 when task is already assigned', async () => {
      const existing = taskService.create({ title: 'Assigned task', assignee: 'Initial Owner' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: 'New Owner' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Task is already assigned');
      expect(taskService.findById(existing.id).assignee).toBe('Initial Owner');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue count', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: past });
      taskService.create({ title: 'In progress', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'Done old', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
    });

    test('returns all zero values when there are no tasks', async () => {
      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('does not count done tasks as overdue', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();

      taskService.create({ title: 'Finished overdue date', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body.overdue).toBe(0);
      expect(res.body.done).toBe(1);
    });
  });
});