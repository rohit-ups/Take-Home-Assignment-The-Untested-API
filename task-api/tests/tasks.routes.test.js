const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('GET /tasks', () => {
  test('returns an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns every created task', async () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('reflects deletions', async () => {
    const created = taskService.create({ title: 'A' });
    taskService.remove(created.id);

    const res = await request(app).get('/tasks');
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks?status=', () => {
  test('returns only tasks matching the status', async () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['B']);
  });

  test('returns an empty array when nothing matches', async () => {
    taskService.create({ title: 'A', status: 'todo' });

    const res = await request(app).get('/tasks?status=archived');
    expect(res.body).toEqual([]);
  });

  // BUG-03 (see BUGS.md): the status filter substring-matches instead of comparing
  // exactly, so ?status=do incorrectly returns both "todo" and "done" tasks.
  test.failing('does not substring-match an unrelated status filter', async () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks?page=&limit=', () => {
  // 30 tasks so a full 10-item page exists somewhere in the result regardless of
  // which pagination offset formula is in effect — see the note on BUG-01 below.
  beforeEach(() => {
    for (let i = 1; i <= 30; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // BUG-01 (see BUGS.md): page 1 skips the first `limit` tasks because of the
  // offset off-by-one in getPaginated.
  test.failing('page 1 returns the first `limit` tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=5');
    expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']);
  });

  // Deliberately checks page 2, not page 1: with the current off-by-one offset,
  // page 1 only has 20 tasks left to serve from (30 - 10 skipped), which still
  // fills a full page, but page 2 keeps this assertion valid both before and
  // after BUG-01 is fixed, so it isn't coupled to that bug either way.
  test('defaults limit to 10 when only page is given', async () => {
    const res = await request(app).get('/tasks?page=2');
    expect(res.body).toHaveLength(10);
  });

  test('defaults page to 1 when only limit is given', async () => {
    const res = await request(app).get('/tasks?limit=5');
    expect(res.body).toHaveLength(5);
  });

  test('omitting both page and limit returns the unpaginated list', async () => {
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(30);
  });
});

describe('POST /tasks', () => {
  test('creates a task and returns 201', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', priority: 'high', status: 'todo' });
    expect(res.body.id).toBeDefined();
  });

  test('persists the task so it shows up in GET /tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Write tests' });
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(1);
  });

  test('rejects a missing title with 400', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('rejects an invalid priority with 400', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  test('returns 500 (not 400) for malformed JSON — see BUGS.md minor notes', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{not valid json');

    // Documents the current behavior of the shared Express error handler.
    expect(res.status).toBe(500);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates the given fields', async () => {
    const created = taskService.create({ title: 'A', priority: 'low' });

    const res = await request(app).put(`/tasks/${created.id}`).send({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.id, title: 'A', priority: 'high' });
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('rejects an empty title with 400', async () => {
    const created = taskService.create({ title: 'A' });
    const res = await request(app).put(`/tasks/${created.id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes the task and returns 204', async () => {
    const created = taskService.create({ title: 'A' });

    const res = await request(app).delete(`/tasks/${created.id}`);
    expect(res.status).toBe(204);
    expect(taskService.findById(created.id)).toBeUndefined();
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks the task as done and stamps completedAt', async () => {
    const created = taskService.create({ title: 'A' });

    const res = await request(app).patch(`/tasks/${created.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });

  // BUG-02 fix regression test — completing a high-priority task must not
  // silently downgrade it to medium.
  test('preserves the original priority', async () => {
    const created = taskService.create({ title: 'A', priority: 'high' });

    const res = await request(app).patch(`/tasks/${created.id}/complete`);
    expect(res.body.priority).toBe('high');
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts by status plus an overdue count', async () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ todo: 2, done: 1, overdue: 1 });
  });
});

// New for PATCH /tasks/:id/assign (see ASSIGNMENT.md Part C).
describe('PATCH /tasks/:id/assign', () => {
  test('assigns the task and returns it', async () => {
    const created = taskService.create({ title: 'A' });

    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Priya' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/assign').send({ assignee: 'Priya' });
    expect(res.status).toBe(404);
  });

  test('rejects a missing assignee with 400', async () => {
    const created = taskService.create({ title: 'A' });
    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  test('rejects an empty-string assignee with 400', async () => {
    const created = taskService.create({ title: 'A' });
    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('rejects a non-string assignee with 400', async () => {
    const created = taskService.create({ title: 'A' });
    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  test('allows reassigning a task that already has an assignee', async () => {
    const created = taskService.create({ title: 'A' });
    await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Priya' });

    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Sam' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Sam');
  });

  test('trims surrounding whitespace before storing the assignee', async () => {
    const created = taskService.create({ title: 'A' });
    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: '  Priya  ' });
    expect(res.body.assignee).toBe('Priya');
  });
});
