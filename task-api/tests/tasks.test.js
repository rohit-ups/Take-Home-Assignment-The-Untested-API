const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) =>
  taskService.create({ title: 'Test Task', status: 'todo', priority: 'medium', ...overrides });

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests — API Routes
// ─────────────────────────────────────────────────────────────────────────────

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ── GET /tasks ──────────────────────────────────────────────────────────────
  describe('GET /tasks', () => {
    it('returns 200 with an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all tasks', async () => {
      makeTask({ title: 'Task A' });
      makeTask({ title: 'Task B' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('each task contains the expected shape fields', async () => {
      makeTask({ title: 'Shaped Task' });
      const res = await request(app).get('/tasks');
      const task = res.body[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('dueDate');
      expect(task).toHaveProperty('completedAt');
      expect(task).toHaveProperty('createdAt');
    });
  });

  // ── GET /tasks?status= ──────────────────────────────────────────────────────
  describe('GET /tasks?status=', () => {
    it('returns only tasks matching the requested status', async () => {
      makeTask({ title: 'Todo', status: 'todo' });
      makeTask({ title: 'Done', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo');
    });

    it('returns an empty array when no tasks match the status', async () => {
      makeTask({ status: 'todo' });
      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 400 for an invalid status value', async () => {
      const res = await request(app).get('/tasks?status=banana');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for a status that is a substring of a valid one (e.g. "do")', async () => {
      const res = await request(app).get('/tasks?status=do');
      expect(res.status).toBe(400);
    });

    it('accepts all three valid statuses without error', async () => {
      for (const status of ['todo', 'in_progress', 'done']) {
        const res = await request(app).get(`/tasks?status=${status}`);
        expect(res.status).toBe(200);
      }
    });
  });

  // ── GET /tasks?page=&limit= ─────────────────────────────────────────────────
  describe('GET /tasks?page=&limit=', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}`, status: 'todo' });
      }
    });

    it('returns the first page with the correct items', async () => {
      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('returns the second page with the correct items', async () => {
      const res = await request(app).get('/tasks?page=2&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
      expect(res.body[0].title).toBe('Task 11');
    });

    it('pages do not overlap', async () => {
      const page1 = (await request(app).get('/tasks?page=1&limit=5')).body.map((t) => t.title);
      const page2 = (await request(app).get('/tasks?page=2&limit=5')).body.map((t) => t.title);
      const overlap = page1.filter((t) => page2.includes(t));
      expect(overlap).toHaveLength(0);
    });

    it('defaults to page 1 when page is not provided', async () => {
      const res = await request(app).get('/tasks?limit=5');
      expect(res.status).toBe(200);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('defaults to limit 10 when limit is not provided', async () => {
      const res = await request(app).get('/tasks?page=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
    });

    it('returns an empty array for an out-of-range page', async () => {
      const res = await request(app).get('/tasks?page=99&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('treats a negative page as page 1', async () => {
      const res = await request(app).get('/tasks?page=-5&limit=5');
      expect(res.status).toBe(200);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('treats a zero or negative limit as the default limit of 10', async () => {
      const res = await request(app).get('/tasks?page=1&limit=0');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
    });
  });

  // ── GET /tasks/stats ────────────────────────────────────────────────────────
  describe('GET /tasks/stats', () => {
    it('returns all zeros when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('counts each status correctly', async () => {
      makeTask({ status: 'todo' });
      makeTask({ status: 'todo' });
      makeTask({ status: 'in_progress' });
      makeTask({ status: 'done' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ todo: 2, in_progress: 1, done: 1 });
    });

    it('counts overdue tasks (non-done with past dueDate)', async () => {
      makeTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
      makeTask({ status: 'in_progress', dueDate: '2000-01-01T00:00:00.000Z' });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(2);
    });

    it('does not count a completed task as overdue even with a past dueDate', async () => {
      makeTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(0);
    });
  });

  // ── POST /tasks ─────────────────────────────────────────────────────────────
  describe('POST /tasks', () => {
    it('creates a task and returns 201 with the created task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'New Task' });
      expect(res.body.id).toBeDefined();
    });

    it('applies correct defaults for omitted optional fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Default Task' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
    });

    it('stores all optional fields when provided', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'A detailed description',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2030-06-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        description: 'A detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-06-01T00:00:00.000Z',
      });
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'low' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when title is an empty string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when title is only whitespace', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'flying' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/);
    });

    it('returns 400 for an invalid priority', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'critical' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority/);
    });

    it('returns 400 for an invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate/);
    });

    it('the created task is retrievable via GET /tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Persisted' });
      const res = await request(app).get('/tasks');
      expect(res.body[0].title).toBe('Persisted');
    });
  });

  // ── PUT /tasks/:id ──────────────────────────────────────────────────────────
  describe('PUT /tasks/:id', () => {
    it('updates and returns the task with new values', async () => {
      const task = makeTask({ title: 'Original', status: 'todo' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated', status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ title: 'Updated', status: 'in_progress' });
    });

    it('preserves fields not included in the update body', async () => {
      const task = makeTask({ title: 'Keep priority', priority: 'high' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New title' });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    it('returns 404 for a non-existent task id', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Nope' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when title is set to an empty string', async () => {
      const task = makeTask();
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid status value', async () => {
      const task = makeTask();
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid priority value', async () => {
      const task = makeTask();
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'extreme' });

      expect(res.status).toBe(400);
    });

    it('does not allow the client to overwrite the task id', async () => {
      const task = makeTask();
      await request(app)
        .put(`/tasks/${task.id}`)
        .send({ id: 'hacked', title: 'Changed' });

      const res = await request(app).get('/tasks');
      expect(res.body[0].id).toBe(task.id);
    });

    it('does not allow the client to overwrite createdAt', async () => {
      const task = makeTask();
      await request(app)
        .put(`/tasks/${task.id}`)
        .send({ createdAt: '2000-01-01T00:00:00.000Z', title: 'Changed' });

      const res = await request(app).get('/tasks');
      expect(res.body[0].createdAt).toBe(task.createdAt);
    });
  });

  // ── DELETE /tasks/:id ───────────────────────────────────────────────────────
  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task and returns 204', async () => {
      const task = makeTask();
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('the deleted task is no longer retrievable', async () => {
      const task = makeTask();
      await request(app).delete(`/tasks/${task.id}`);
      const res = await request(app).get('/tasks');
      expect(res.body).toHaveLength(0);
    });

    it('returns 404 for a non-existent task id', async () => {
      const res = await request(app).delete('/tasks/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('only deletes the targeted task and leaves others intact', async () => {
      const t1 = makeTask({ title: 'Keep me' });
      const t2 = makeTask({ title: 'Delete me' });
      await request(app).delete(`/tasks/${t2.id}`);
      const res = await request(app).get('/tasks');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(t1.id);
    });
  });

  // ── PATCH /tasks/:id/complete ───────────────────────────────────────────────
  describe('PATCH /tasks/:id/complete', () => {
    it('marks the task as done and returns the updated task', async () => {
      const task = makeTask({ status: 'todo' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });

    it('sets completedAt to a valid ISO date string', async () => {
      const task = makeTask();
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.body.completedAt).not.toBeNull();
      expect(new Date(res.body.completedAt).toISOString()).toBe(res.body.completedAt);
    });

    it('preserves the original priority when completing a high priority task', async () => {
      const task = makeTask({ priority: 'high' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.body.priority).toBe('high');
    });

    it('preserves the original priority when completing a low priority task', async () => {
      const task = makeTask({ priority: 'low' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.body.priority).toBe('low');
    });

    it('returns 404 for a non-existent task id', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('persists the completed state — subsequent GET reflects done status', async () => {
      const task = makeTask({ status: 'todo' });
      await request(app).patch(`/tasks/${task.id}/complete`);
      const res = await request(app).get('/tasks');
      expect(res.body[0].status).toBe('done');
      expect(res.body[0].completedAt).not.toBeNull();
    });
  });

  // ── PATCH /tasks/:id/assign ─────────────────────────────────────────────────
  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a name and returns the updated task with 200', async () => {
      const task = makeTask();
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('response includes all original task fields alongside the new assignee', async () => {
      const task = makeTask({ title: 'My Task', priority: 'high' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'My Task',
        priority: 'high',
        assignee: 'Bob',
      });
    });

    it('persists the assignee — subsequent GET reflects the assigned name', async () => {
      const task = makeTask();
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Carol' });
      const res = await request(app).get('/tasks');
      expect(res.body[0].assignee).toBe('Carol');
    });

    it('can reassign a task that already has an assignee', async () => {
      const task = makeTask();
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    it('returns 404 for a non-existent task id', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is missing from the body', async () => {
      const task = makeTask();
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is an empty string', async () => {
      const task = makeTask();
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is only whitespace', async () => {
      const task = makeTask();
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is not a string (number)', async () => {
      const task = makeTask();
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 42 });

      expect(res.status).toBe(400);
    });

    it('does not affect other tasks when assigning', async () => {
      const t1 = makeTask({ title: 'Task 1' });
      const t2 = makeTask({ title: 'Task 2' });
      await request(app).patch(`/tasks/${t1.id}/assign`).send({ assignee: 'Alice' });

      const res = await request(app).get('/tasks');
      const other = res.body.find((t) => t.id === t2.id);
      expect(other.assignee).toBeNull();
    });
  });
});
