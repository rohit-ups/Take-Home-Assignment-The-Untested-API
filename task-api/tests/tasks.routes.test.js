const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('creates a task (happy path)', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Write tests' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Write tests');
      expect(res.body.status).toBe('todo');
      expect(res.body.id).toEqual(expect.any(String));
    });

    it('rejects a missing title', async () => {
      const res = await request(app).post('/tasks').send({ description: 'no title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('rejects an invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad status', status: 'not-a-status' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad date', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad priority', priority: 'urgent' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /tasks', () => {
    it('returns an empty list when there are no tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all created tasks (happy path)', async () => {
      await request(app).post('/tasks').send({ title: 'A' });
      await request(app).post('/tasks').send({ title: 'B' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by status via ?status=', async () => {
      await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'B', status: 'done' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('B');
    });

    it('paginates via ?page=&limit=', async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      // FIXED (Bug #2): page=1 now returns the first 10 items.
      expect(res.body[0].title).toBe('Task 1');
    });

    it('returns the second page correctly', async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=2&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
      expect(res.body[0].title).toBe('Task 11');
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns zero counts with no tasks', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('reflects created and completed tasks', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'A' });
      await request(app).patch(`/tasks/${createRes.body.id}/complete`);

      const res = await request(app).get('/tasks/stats');
      expect(res.body.done).toBe(1);
      expect(res.body.todo).toBe(0);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task (happy path)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });

      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
      expect(res.status).toBe(404);
    });

    it('rejects an empty title', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ title: '   ' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid status', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ status: 'not-a-status' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid priority', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ priority: 'urgent' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid dueDate', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const res = await request(app).put(`/tasks/${createRes.body.id}`).send({ dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task (happy path)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'To delete' });

      const res = await request(app).delete(`/tasks/${createRes.body.id}`);
      expect(res.status).toBe(204);

      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app).delete('/tasks/does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks a task as done (happy path)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Finish me' });

      const res = await request(app).patch(`/tasks/${createRes.body.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toEqual(expect.any(String));
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app).patch('/tasks/does-not-exist/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a task to a user (happy path)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Priya' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Priya');
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app).patch('/tasks/does-not-exist/assign').send({ assignee: 'Priya' });
      expect(res.status).toBe(404);
    });

    it('rejects a missing assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Assign me' });
      const res = await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({});
      expect(res.status).toBe(400);
    });

    it('rejects an empty string assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Assign me' });
      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: '   ' });
      expect(res.status).toBe(400);
    });

    it('rejects a non-string assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Assign me' });
      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 12345 });
      expect(res.status).toBe(400);
    });

    it('allows reassigning an already-assigned task', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Assign me' });
      await request(app).patch(`/tasks/${createRes.body.id}/assign`).send({ assignee: 'Priya' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Rohit' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Rohit');
    });
  });
});
