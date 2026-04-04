const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── POST /tasks ─────────────────────────────────────────────────

  describe('POST /tasks', () => {
    it('should create a task and return 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New task' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'New task',
        status: 'todo',
        priority: 'medium',
      });
      expect(res.body.id).toBeDefined();
    });

    it('should create a task with all fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full',
          description: 'A full task',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-12-31T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('A full task');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'T', status: 'bad' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty string title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /tasks ──────────────────────────────────────────────────

  describe('GET /tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ─── GET /tasks?status= ──────────────────────────────────────────

  describe('GET /tasks?status=', () => {
    it('should filter tasks by status', async () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });
      taskService.create({ title: 'C', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('A');
    });

    it('should return empty array for unmatched status', async () => {
      taskService.create({ title: 'A', status: 'todo' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── GET /tasks?page=&limit= ─────────────────────────────────────

  describe('GET /tasks?page=&limit=', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return first page', async () => {
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should return second page', async () => {
      const res = await request(app).get('/tasks?page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 3');
    });

    it('should default to page=1 limit=10 if not supplied', async () => {
      const res = await request(app).get('/tasks?page=');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });
  });

  // ─── PUT /tasks/:id ──────────────────────────────────────────────

  describe('PUT /tasks/:id', () => {
    it('should update a task', async () => {
      const task = taskService.create({ title: 'Old' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/fake-id')
        .send({ title: 'X' });
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid update data', async () => {
      const task = taskService.create({ title: 'T' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('should preserve fields not included in the update', async () => {
      const task = taskService.create({ title: 'T', priority: 'high' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });
  });

  // ─── DELETE /tasks/:id ───────────────────────────────────────────

  describe('DELETE /tasks/:id', () => {
    it('should delete a task and return 204', async () => {
      const task = taskService.create({ title: 'Bye' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).delete('/tasks/fake-id');
      expect(res.status).toBe(404);
    });

    it('should actually remove the task from the store', async () => {
      const task = taskService.create({ title: 'Gone' });
      await request(app).delete(`/tasks/${task.id}`);

      const res = await request(app).get('/tasks');
      expect(res.body).toHaveLength(0);
    });
  });

  // ─── PATCH /tasks/:id/complete ───────────────────────────────────

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as done', async () => {
      const task = taskService.create({ title: 'Do it' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).patch('/tasks/fake-id/complete');
      expect(res.status).toBe(404);
    });

    it('should preserve original priority (BUG test)', async () => {
      const task = taskService.create({ title: 'Urgent', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.body.priority).toBe('high');
    });
  });

  // ─── GET /tasks/stats ────────────────────────────────────────────

  describe('GET /tasks/stats', () => {
    it('should return zeroes when empty', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return correct counts', async () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });
      taskService.create({
        title: 'C',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const res = await request(app).get('/tasks/stats');
      expect(res.body.todo).toBe(2);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });
  });

  // ─── PATCH /tasks/:id/assign ─────────────────────────────────────

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a user to a task', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/fake-id/assign')
        .send({ assignee: 'Bob' });
      expect(res.status).toBe(404);
    });

    it('should return 400 when assignee is missing', async () => {
      const task = taskService.create({ title: 'T' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 when assignee is empty string', async () => {
      const task = taskService.create({ title: 'T' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when assignee is whitespace only', async () => {
      const task = taskService.create({ title: 'T' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'T' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });
      expect(res.status).toBe(400);
    });

    it('should allow re-assigning to a different person', async () => {
      const task = taskService.create({ title: 'T' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    it('should persist the assignee in the store', async () => {
      const task = taskService.create({ title: 'T' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Charlie' });

      const res = await request(app).get('/tasks');
      expect(res.body[0].assignee).toBe('Charlie');
    });
  });
});
