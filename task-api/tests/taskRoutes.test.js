const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('task routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('creates and lists tasks', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(created.statusCode).toBe(201);
    expect(created.body).toMatchObject({
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'high',
      dueDate: null,
      completedAt: null,
    });
    expect(created.body.id).toBeDefined();
    expect(created.body.createdAt).toBeDefined();

    const list = await request(app).get('/tasks');

    expect(list.statusCode).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it('rejects invalid create requests', async () => {
    const missingTitle = await request(app).post('/tasks').send({ priority: 'high' });
    const invalidStatus = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: 'doing' });
    const invalidPriority = await request(app)
      .post('/tasks')
      .send({ title: 'Bad priority', priority: 'urgent' });
    const invalidDueDate = await request(app)
      .post('/tasks')
      .send({ title: 'Bad date', dueDate: 'tomorrow-ish' });

    expect(missingTitle.statusCode).toBe(400);
    expect(invalidStatus.statusCode).toBe(400);
    expect(invalidPriority.statusCode).toBe(400);
    expect(invalidDueDate.statusCode).toBe(400);
  });

  it('filters by exact status and paginates results', async () => {
    await request(app).post('/tasks').send({ title: 'One', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Two', status: 'done' });
    await request(app).post('/tasks').send({ title: 'Three', status: 'todo' });

    const filtered = await request(app).get('/tasks?status=do');
    const paginated = await request(app).get('/tasks?page=2&limit=1');

    expect(filtered.statusCode).toBe(200);
    expect(filtered.body).toHaveLength(0);
    expect(paginated.statusCode).toBe(200);
    expect(paginated.body).toHaveLength(1);
    expect(paginated.body[0].title).toBe('Two');
  });

  it('updates a task and rejects invalid updates', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });

    const updated = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated', status: 'in_progress', priority: 'low' });
    const invalid = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });
    const missing = await request(app)
      .put('/tasks/missing-id')
      .send({ title: 'No task' });

    expect(updated.statusCode).toBe(200);
    expect(updated.body).toMatchObject({
      id: created.body.id,
      title: 'Updated',
      status: 'in_progress',
      priority: 'low',
    });
    expect(invalid.statusCode).toBe(400);
    expect(missing.statusCode).toBe(404);
  });

  it('deletes a task and returns 404 for a missing delete', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Delete me' });

    const deleted = await request(app).delete(`/tasks/${created.body.id}`);
    const list = await request(app).get('/tasks');
    const missing = await request(app).delete(`/tasks/${created.body.id}`);

    expect(deleted.statusCode).toBe(204);
    expect(list.body).toHaveLength(0);
    expect(missing.statusCode).toBe(404);
  });

  it('marks a task complete and returns 404 for missing tasks', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Complete me', priority: 'high' });

    const completed = await request(app).patch(`/tasks/${created.body.id}/complete`);
    const missing = await request(app).patch('/tasks/missing-id/complete');

    expect(completed.statusCode).toBe(200);
    expect(completed.body.status).toBe('done');
    expect(completed.body.priority).toBe('high');
    expect(completed.body.completedAt).toBeDefined();
    expect(missing.statusCode).toBe(404);
  });

  it('returns task stats with overdue count', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'Past due', dueDate: '2020-01-01T00:00:00.000Z' });
    await request(app).post('/tasks').send({ title: 'Done', status: 'done' });
    await request(app).post('/tasks').send({ title: 'Active', status: 'in_progress' });

    const stats = await request(app).get('/tasks/stats');

    expect(stats.statusCode).toBe(200);
    expect(stats.body).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});
