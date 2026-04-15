const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    test('creates task with valid body', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'API task', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('API task');
      expect(res.body.priority).toBe('high');
    });

    test('returns 400 for missing title', async () => {
      const res = await request(app).post('/tasks').send({ priority: 'low' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/i);
    });

    test('returns 400 for invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad due date', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate/i);
    });
  });

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      taskService.create({ title: 'One' });
      taskService.create({ title: 'Two' });

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('filters by status', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Done', status: 'done' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Done');
    });

    test('supports pagination with page and limit', async () => {
      for (let i = 1; i <= 5; i += 1) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates existing task', async () => {
      const task = taskService.create({ title: 'Old title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New title');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 for missing task', async () => {
      const res = await request(app)
        .put('/tasks/missing-id')
        .send({ title: 'No task' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 for invalid update body', async () => {
      const task = taskService.create({ title: 'Task title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title must be a non-empty string/i);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('returns 204 for successful delete', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 for missing task', async () => {
      const res = await request(app).delete('/tasks/missing-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task complete', async () => {
      const task = taskService.create({ title: 'Finish me', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    test('returns 404 for missing task', async () => {
      const res = await request(app).patch('/tasks/missing-id/complete');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue count', async () => {
      const past = '2020-01-01T00:00:00.000Z';
      const future = '2999-01-01T00:00:00.000Z';

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: past });
      taskService.create({ title: 'In progress', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'Done old', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to a user', async () => {
      const task = taskService.create({ title: 'Assignable task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Tanya' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Tanya');
    });

    test('trims assignee and allows reassignment', async () => {
      const task = taskService.create({ title: 'Task' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Initial' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Updated  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Updated');
    });

    test('returns 400 for missing assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee/i);
    });

    test('returns 400 for empty assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-empty/i);
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/missing-id/assign')
        .send({ assignee: 'Tanya' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});
