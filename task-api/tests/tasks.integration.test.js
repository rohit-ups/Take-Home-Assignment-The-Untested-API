const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const create = async (overrides = {}) => {
  const response = await request(app).post('/tasks').send({ title: 'Default task', ...overrides });
  return response.body;
};

describe('Task API routes', () => {
  beforeEach(() => taskService._reset());

  describe('GET /tasks', () => {
    it('lists all tasks and returns an empty list when none exist', async () => {
      expect((await request(app).get('/tasks')).body).toEqual([]);
      const created = await create({ title: 'One' });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([expect.objectContaining({ id: created.id, title: 'One' })]);
    });

    it('filters tasks by status and returns an empty list for an unmatched status', async () => {
      const todo = await create({ title: 'Todo', status: 'todo' });
      await create({ title: 'Done', status: 'done' });

      expect((await request(app).get('/tasks?status=todo')).body).toEqual([expect.objectContaining({ id: todo.id })]);
      expect((await request(app).get('/tasks?status=in_progress')).body).toEqual([]);
    });

    it('returns the first page, supports a large page, and currently normalizes zero page or limit values', async () => {
      const one = await create({ title: 'One' });
      const two = await create({ title: 'Two' });
      await create({ title: 'Three' });

      expect((await request(app).get('/tasks?page=1&limit=2')).body).toEqual([
        expect.objectContaining({ id: one.id }), expect.objectContaining({ id: two.id }),
      ]);
      expect((await request(app).get('/tasks?page=99&limit=2')).body).toEqual([]);
      expect((await request(app).get('/tasks?page=0&limit=0')).body).toHaveLength(3);
    });
  });

  describe('POST /tasks', () => {
    it('creates a task', async () => {
      const response = await request(app).post('/tasks').send({ title: 'Ship it', priority: 'high' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ title: 'Ship it', priority: 'high', status: 'todo' });
    });

    it.each([
      [{}, 'title is required'],
      [{ title: '   ' }, 'title is required'],
      [{ title: 'Task', status: 'blocked' }, 'status must be one of'],
      [{ title: 'Task', priority: 'urgent' }, 'priority must be one of'],
      [{ title: 'Task', dueDate: 'not-a-date' }, 'dueDate must be a valid'],
    ])('rejects invalid input %j', async (body, message) => {
      const response = await request(app).post('/tasks').send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(message);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const task = await create({ title: 'Old', priority: 'low' });

      const response = await request(app).put(`/tasks/${task.id}`).send({ title: 'New', status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: task.id, title: 'New', priority: 'low', status: 'in_progress' });
    });

    it('returns 404 for an unknown task', async () => {
      const response = await request(app).put('/tasks/missing').send({ title: 'New' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    it.each([
      [{ title: '' }, 'title must be a non-empty string'],
      [{ status: 'blocked' }, 'status must be one of'],
      [{ priority: 'urgent' }, 'priority must be one of'],
    ])('rejects invalid update input %j', async (body, message) => {
      const task = await create();
      const response = await request(app).put(`/tasks/${task.id}`).send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(message);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task', async () => {
      const task = await create();

      const response = await request(app).delete(`/tasks/${task.id}`);
      expect(response.status).toBe(204);
      expect((await request(app).get('/tasks')).body).toEqual([]);
    });

    it('returns 404 for an unknown or already-deleted task', async () => {
      expect((await request(app).delete('/tasks/missing')).status).toBe(404);
      const task = await create();
      await request(app).delete(`/tasks/${task.id}`);

      expect((await request(app).delete(`/tasks/${task.id}`)).status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('completes an existing task', async () => {
      const task = await create({ status: 'in_progress' });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: task.id, status: 'done' });
      expect(new Date(response.body.completedAt).toString()).not.toBe('Invalid Date');
    });

    it('returns 404 for an unknown id', async () => {
      expect((await request(app).patch('/tasks/missing/complete')).status).toBe(404);
    });

    it('can complete a task more than once', async () => {
      const task = await create();
      await request(app).patch(`/tasks/${task.id}/complete`);

      expect((await request(app).patch(`/tasks/${task.id}/complete`)).body.status).toBe('done');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns an existing task', async () => {
      const task = await create();

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Asha  ' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: task.id, assignee: 'Asha' });
    });

    it('allows an existing assignment to be replaced', async () => {
      const task = await create();
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Asha' });

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Ben' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Ben');
    });

    it('returns 404 for an unknown task', async () => {
      const response = await request(app).patch('/tasks/missing/assign').send({ assignee: 'Asha' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    it.each([
      [{}, 'missing assignee'],
      [{ assignee: '' }, 'empty assignee'],
      [{ assignee: '   ' }, 'whitespace assignee'],
      [{ assignee: 42 }, 'non-string assignee'],
    ])('returns 400 for %s', async (body) => {
      const task = await create();
      const response = await request(app).patch(`/tasks/${task.id}/assign`).send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assignee is required');
    });
  });

  describe('GET /tasks/stats', () => {
    it('reports status totals and excludes completed past-due tasks from overdue', async () => {
      await create({ title: 'Late', dueDate: '2000-01-01T00:00:00.000Z' });
      await create({ title: 'Active', status: 'in_progress', dueDate: '2999-01-01T00:00:00.000Z' });
      const done = await create({ title: 'Done', dueDate: '2000-01-01T00:00:00.000Z' });
      await request(app).patch(`/tasks/${done.id}/complete`);

      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
    });

    it('returns zeros for an empty task list', async () => {
      expect((await request(app).get('/tasks/stats')).body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });
});
