const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const PAST = '2020-01-01T00:00:00.000Z';

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  const createTask = (body) =>
    request(app).post('/tasks').send(body).expect(201).then((r) => r.body);

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      await createTask({ title: 'a' });
      await createTask({ title: 'b' });
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toHaveLength(2);
    });

    test('returns empty array when no tasks', async () => {
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('filters by exact status', async () => {
      await createTask({ title: 'todo', status: 'todo' });
      await createTask({ title: 'done', status: 'done' });
      const res = await request(app).get('/tasks?status=todo').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('todo');
    });

    // BUG 3: substring matching leaks tasks whose status merely contains the query.
    test('does not substring-match partial status values', async () => {
      await createTask({ title: 'todo', status: 'todo' });
      await createTask({ title: 'prog', status: 'in_progress' });
      const res = await request(app).get('/tasks?status=o').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=&limit=', () => {
    test('page 1 returns the first items', async () => {
      // BUG 1 (fixed): pagination was off by one page.
      for (let i = 1; i <= 4; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=1&limit=2').expect(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('page 2 returns the next items', async () => {
      for (let i = 1; i <= 4; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=2&limit=2').expect(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 3', 'Task 4']);
    });

    test('falls back to the first page and a default limit of 10', async () => {
      for (let i = 1; i <= 3; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=notanumber').expect(200);
      expect(res.body).toHaveLength(3);
    });

    test('returns an empty array for a page past the end', async () => {
      await createTask({ title: 'only one' });
      const res = await request(app).get('/tasks?page=99&limit=10').expect(200);
      expect(res.body).toEqual([]);
    });

    test('never returns more than the requested limit', async () => {
      for (let i = 1; i <= 12; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=1&limit=5').expect(200);
      expect(res.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with defaults', async () => {
      const res = await request(app).post('/tasks').send({ title: 'New' }).expect(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.title).toBe('New');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
    });

    test('rejects a missing title', async () => {
      const res = await request(app).post('/tasks').send({}).expect(400);
      expect(res.body.error).toMatch(/title/);
    });

    test('rejects an empty title', async () => {
      await request(app).post('/tasks').send({ title: '   ' }).expect(400);
    });

    test('rejects an invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'x', status: 'bogus' })
        .expect(400);
      expect(res.body.error).toMatch(/status/);
    });

    test('rejects an invalid priority', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'x', priority: 'urgent' })
        .expect(400);
    });

    test('rejects an invalid dueDate', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'x', dueDate: 'not-a-date' })
        .expect(400);
    });

    // BUG 2: malformed JSON body should be a 400, not a 500.
    test('returns 400 for a malformed JSON body', async () => {
      await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":')
        .expect(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates a task', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ title: 'b', priority: 'high' })
        .expect(200);
      expect(res.body.title).toBe('b');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).put('/tasks/nope').send({ title: 'x' }).expect(404);
    });

    test('rejects an empty title', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).put(`/tasks/${t.id}`).send({ title: '' }).expect(400);
    });

    // BUG 5: a client can overwrite the task id via PUT.
    test('does not allow overwriting the task id', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ id: 'HACKED', title: 'b' })
        .expect(200);
      expect(res.body.id).toBe(t.id);
    });

    // BUG 6: setting status to done via PUT does not stamp completedAt.
    test('stamps completedAt when status becomes done', async () => {
      const t = await createTask({ title: 'a', status: 'todo' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ status: 'done' })
        .expect(200);
      expect(res.body.completedAt).toEqual(expect.any(String));
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes a task', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).delete(`/tasks/${t.id}`).expect(204);
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toHaveLength(0);
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).delete('/tasks/nope').expect(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task complete', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app).patch(`/tasks/${t.id}/complete`).expect(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toEqual(expect.any(String));
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).patch('/tasks/nope/complete').expect(404);
    });

    // BUG 4: completing clobbers the priority back to 'medium'.
    test('preserves the task priority when completing', async () => {
      const t = await createTask({ title: 'a', priority: 'high' });
      const res = await request(app).patch(`/tasks/${t.id}/complete`).expect(200);
      expect(res.body.priority).toBe('high');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue', async () => {
      await createTask({ title: 'a', status: 'todo' });
      await createTask({ title: 'b', status: 'todo', dueDate: PAST });
      await createTask({ title: 'c', status: 'done' });
      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body).toEqual({ todo: 2, in_progress: 0, done: 1, overdue: 1 });
    });

    test('returns zeros when empty', async () => {
      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('GET /tasks/:id', () => {
    // BUG 7: there is no single-task fetch endpoint.
    test('returns a single task by id', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app).get(`/tasks/${t.id}`).expect(200);
      expect(res.body.id).toBe(t.id);
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).get('/tasks/nope').expect(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a task and returns the updated task', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .patch(`/tasks/${t.id}/assign`)
        .send({ assignee: 'ada' })
        .expect(200);
      expect(res.body.assignee).toBe('ada');
      expect(res.body.id).toBe(t.id);
    });

    test('persists the assignee so it is returned by a later read', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'ada' }).expect(200);
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body[0].assignee).toBe('ada');
    });

    test('leaves every other field untouched', async () => {
      const t = await createTask({ title: 'a', description: 'd', priority: 'high' });
      const res = await request(app)
        .patch(`/tasks/${t.id}/assign`)
        .send({ assignee: 'ada' })
        .expect(200);
      expect(res.body).toMatchObject({
        title: 'a',
        description: 'd',
        priority: 'high',
        status: 'todo',
      });
    });

    test('reassigning replaces the previous assignee', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'ada' }).expect(200);
      const res = await request(app)
        .patch(`/tasks/${t.id}/assign`)
        .send({ assignee: 'grace' })
        .expect(200);
      expect(res.body.assignee).toBe('grace');
    });

    test('trims surrounding whitespace', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .patch(`/tasks/${t.id}/assign`)
        .send({ assignee: '  ada  ' })
        .expect(200);
      expect(res.body.assignee).toBe('ada');
    });

    test('returns 404 for an unknown id', async () => {
      await request(app)
        .patch('/tasks/nope/assign')
        .send({ assignee: 'ada' })
        .expect(404);
    });

    test('rejects a missing assignee', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app).patch(`/tasks/${t.id}/assign`).send({}).expect(400);
      expect(res.body.error).toMatch(/assignee/);
    });

    test('rejects an empty assignee', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '' }).expect(400);
    });

    test('rejects a whitespace-only assignee', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '   ' }).expect(400);
    });

    test('rejects a non-string assignee', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 42 }).expect(400);
    });

    test('rejects a null assignee', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: null }).expect(400);
    });

    test('does not assign when validation fails', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '' }).expect(400);
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body[0].assignee).toBeUndefined();
    });

    test('can assign a task that is already complete', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).patch(`/tasks/${t.id}/complete`).expect(200);
      const res = await request(app)
        .patch(`/tasks/${t.id}/assign`)
        .send({ assignee: 'ada' })
        .expect(200);
      expect(res.body.assignee).toBe('ada');
      expect(res.body.status).toBe('done');
    });
  });
});