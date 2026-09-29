const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── GET /tasks ────────────────────────────────────────────
  describe('GET /tasks', () => {
    test('returns empty array when no tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('filters by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    test('paginates results', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
    });
  });

  // ─── POST /tasks ───────────────────────────────────────────
  describe('POST /tasks', () => {
    test('creates a new task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New task', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New task');
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('todo');
    });

    test('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'high' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 when title is empty string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' });
      expect(res.status).toBe(400);
    });

    test('returns 400 when title is whitespace only', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid priority', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'urgent' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  // ─── PUT /tasks/:id ────────────────────────────────────────
  describe('PUT /tasks/:id', () => {
    test('updates a task', async () => {
      const task = taskService.create({ title: 'Original' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated', priority: 'low' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
      expect(res.body.priority).toBe('low');
    });

    test('returns 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent')
        .send({ title: 'Updated' });
      expect(res.status).toBe(404);
    });

    test('returns 400 for invalid update data', async () => {
      const task = taskService.create({ title: 'Original' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE /tasks/:id ─────────────────────────────────────
  describe('DELETE /tasks/:id', () => {
    test('deletes a task and returns 204', async () => {
      const task = taskService.create({ title: 'Delete me' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 for non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent');
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /tasks/:id/complete ────────────────────────────
  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task as complete', async () => {
      const task = taskService.create({ title: 'Complete me' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
    });

    test('returns 404 for non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent/complete');
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /tasks/stats ──────────────────────────────────────
  describe('GET /tasks/stats', () => {
    test('returns stats with zero counts', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('returns correct counts', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'done' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(2);
      expect(res.body.done).toBe(1);
    });
  });
});
