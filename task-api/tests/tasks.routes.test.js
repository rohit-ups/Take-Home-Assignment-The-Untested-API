const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const seedTasks = (count, fields = {}) => {
  const created = [];
  for (let i = 1; i <= count; i++) {
    created.push(taskService.create({ title: `task ${i}`, ...fields }));
  }
  return created;
};

beforeEach(() => {
  taskService._reset();
});

describe('GET /tasks', () => {
  it('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks').expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns every task with the documented shape', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'first', priority: 'high' })
      .expect(201);
    await request(app).post('/tasks').send({ title: 'second' }).expect(201);

    const res = await request(app).get('/tasks').expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'first',
        description: expect.any(String),
        status: 'todo',
        priority: 'high',
        dueDate: null,
        completedAt: null,
        createdAt: expect.any(String),
      })
    );
  });
});

describe('GET /tasks?status=', () => {
  beforeEach(() => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'in_progress' });
    taskService.create({ title: 'd', status: 'done' });
  });

  it('returns only the tasks with that status', async () => {
    const res = await request(app).get('/tasks').query({ status: 'todo' }).expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body.every((t) => t.status === 'todo')).toBe(true);
  });

  it('returns an empty array when nothing has that status, including unknown values', async () => {
    taskService._reset();
    taskService.create({ title: 'only todo', status: 'todo' });

    const byStatus = await request(app).get('/tasks').query({ status: 'done' }).expect(200);
    const unknown = await request(app).get('/tasks').query({ status: 'banana' }).expect(200);

    expect(byStatus.body).toEqual([]);
    expect(unknown.body).toEqual([]);
  });

  it.failing('does not match tasks whose status merely contains the query', async () => {
    const res = await request(app).get('/tasks').query({ status: 'do' }).expect(200);

    expect(res.body).toEqual([]);
  });

  it.failing('applies pagination when a status filter is also given', async () => {
    const res = await request(app)
      .get('/tasks')
      .query({ status: 'todo', page: 1, limit: 1 })
      .expect(200);

    expect(res.body).toHaveLength(1);
  });
});

describe('GET /tasks?page=&limit=', () => {
  it('returns an empty array when the page is past the end', async () => {
    seedTasks(5);

    const res = await request(app).get('/tasks').query({ page: 999, limit: 10 }).expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns the first 10 tasks on page 1', async () => {
    seedTasks(15);

    const res = await request(app).get('/tasks').query({ page: 1, limit: 10 }).expect(200);

    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('task 1');
    expect(res.body[9].title).toBe('task 10');
  });

  it('returns the next batch of tasks on page 2', async () => {
    seedTasks(25);

    const res = await request(app).get('/tasks').query({ page: 2, limit: 10 }).expect(200);

    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('task 11');
    expect(res.body[9].title).toBe('task 20');
  });

  it('falls back to page 1 and limit 10 for non-numeric values', async () => {
    seedTasks(15);

    const res = await request(app).get('/tasks').query({ page: 'abc', limit: 'xyz' }).expect(200);

    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('task 1');
  });
});

describe('POST /tasks', () => {
  it('creates a task with the documented defaults', async () => {
    const res = await request(app).post('/tasks').send({ title: 'write tests' }).expect(201);

    expect(res.body).toMatchObject({
      title: 'write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
  });

  it('stores every optional field that was sent', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'with everything',
        description: 'details here',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-06-01T00:00:00.000Z',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      description: 'details here',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-06-01T00:00:00.000Z',
    });
  });

  it('ignores fields that are not part of the task shape', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'clean', somethingElse: true, createdAt: '1999-01-01' })
      .expect(201);

    expect(res.body).not.toHaveProperty('somethingElse');
    expect(res.body.createdAt).not.toBe('1999-01-01');
  });

  it('returns 400 when the title is missing, empty or not a string', async () => {
    const missing = await request(app).post('/tasks').send({}).expect(400);

    expect(missing.body).toEqual({ error: 'title is required and must be a non-empty string' });

    await request(app).post('/tasks').send({ title: '' }).expect(400);
    await request(app).post('/tasks').send({ title: '   ' }).expect(400);
    await request(app).post('/tasks').send({ title: 42 }).expect(400);
    await request(app).post('/tasks').send({ title: ['a'] }).expect(400);
  });

  it('returns 400 for an unknown status, priority or dueDate', async () => {
    const badStatus = await request(app)
      .post('/tasks')
      .send({ title: 'x', status: 'pending' })
      .expect(400);
    expect(badStatus.body).toEqual({ error: 'status must be one of: todo, in_progress, done' });

    const badPriority = await request(app)
      .post('/tasks')
      .send({ title: 'x', priority: 'urgent' })
      .expect(400);
    expect(badPriority.body).toEqual({ error: 'priority must be one of: low, medium, high' });

    const badDate = await request(app)
      .post('/tasks')
      .send({ title: 'x', dueDate: 'next tuesday' })
      .expect(400);
    expect(badDate.body).toEqual({ error: 'dueDate must be a valid ISO date string' });
  });
});

describe('PUT /tasks/:id', () => {
  it('updates the fields that were sent', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'before', priority: 'high' })
      .expect(201);

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'after' })
      .expect(200);

    expect(res.body.title).toBe('after');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put('/tasks/does-not-exist')
      .send({ title: 'x' })
      .expect(404);

    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it('returns 400 for an unknown status, priority or dueDate', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' }).expect(201);
    const id = created.body.id;

    await request(app).put(`/tasks/${id}`).send({ status: 'pending' }).expect(400);
    await request(app).put(`/tasks/${id}`).send({ priority: 'urgent' }).expect(400);
    await request(app).put(`/tasks/${id}`).send({ dueDate: 'not a date' }).expect(400);
  });

  it.failing('does not allow the body to overwrite id or createdAt', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' }).expect(201);

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ id: 'hacked', createdAt: '1999-01-01' })
      .expect(200);

    expect(res.body.id).toBe(created.body.id);
    expect(res.body.createdAt).toBe(created.body.createdAt);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes the task with a 204 and an empty body', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' }).expect(201);

    const res = await request(app).delete(`/tasks/${created.body.id}`).expect(204);

    expect(res.text).toBeFalsy();

    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([]);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/tasks/does-not-exist').expect(404);

    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it('returns 404 when the same task is deleted twice', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' }).expect(201);

    await request(app).delete(`/tasks/${created.body.id}`).expect(204);
    await request(app).delete(`/tasks/${created.body.id}`).expect(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks the task done and stamps completedAt', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' }).expect(201);

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/complete`)
      .expect(200);

    expect(res.body.status).toBe('done');
    expect(Number.isNaN(Date.parse(res.body.completedAt))).toBe(false);
    expect(res.body.title).toBe('x');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete').expect(404);

    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it.failing('leaves the priority of the task alone', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'x', priority: 'high' })
      .expect(201);

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/complete`)
      .expect(200);

    expect(res.body.priority).toBe('high');
  });
});

describe('GET /tasks/stats', () => {
  it('returns zeros for an empty store', async () => {
    const res = await request(app).get('/tasks/stats').expect(200);

    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts the tasks per status and the overdue ones', async () => {
    taskService.create({ title: 'a', status: 'todo', dueDate: '2020-01-01' });
    taskService.create({ title: 'b', status: 'todo', dueDate: '2030-01-01' });
    taskService.create({ title: 'c', status: 'in_progress' });
    taskService.create({ title: 'd', status: 'done', dueDate: '2020-01-01' });

    const res = await request(app).get('/tasks/stats').expect(200);

    expect(res.body).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 1 });
    expect(res.body).not.toHaveProperty('error');
  });
});

describe('error handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to the express error handler when the service throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/tasks').expect(500);

    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it.failing('returns 400 for a body that is not valid JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{ "title": ')
      .expect(400);

    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 404 for a path that does not exist', async () => {
    await request(app).get('/tasks/does-not-exist').expect(404);
    await request(app).get('/nope').expect(404);
  });
});
