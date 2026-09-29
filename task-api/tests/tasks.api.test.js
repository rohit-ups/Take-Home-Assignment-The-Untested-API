/**
 * Integration tests for the /tasks API.
 *
 * Supertest sends real HTTP requests to the Express app (no server needs to
 * be running), so these cover routing, validation, status codes and JSON
 * handling together. Business rules are unit-tested in taskService.test.js;
 * here the focus is on what an API client actually sees.
 *
 * `test.failing` marks a test that describes the CORRECT behaviour for a
 * known bug (see BUG_REPORT.md). Switch it to `test` once the bug is fixed.
 */
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const PAST = '2000-01-01T00:00:00.000Z';
const FUTURE = '2999-01-01T00:00:00.000Z';

const api = () => request(app);
const createTask = (body) => api().post('/tasks').send(body);

const createMany = async (count, extra = {}) => {
  const tasks = [];
  // Sequential on purpose: tasks are stored in creation order.
  for (let i = 1; i <= count; i++) {
    const res = await createTask({ title: `Task ${i}`, ...extra });
    tasks.push(res.body);
  }
  return tasks;
};

beforeEach(() => {
  taskService._reset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Requests that hit the app's error handler log a stack trace. Tests that
// expect that path call this to keep the test output readable.
const silenceErrorLog = () => jest.spyOn(console, 'error').mockImplementation(() => {});

describe('GET /tasks', () => {
  test('returns an empty list when there are no tasks', async () => {
    const res = await api().get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns every task that was created', async () => {
    await createMany(3);

    const res = await api().get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
  });

  describe('?status= filter', () => {
    beforeEach(async () => {
      await createTask({ title: 'A', status: 'todo' });
      await createTask({ title: 'B', status: 'in_progress' });
      await createTask({ title: 'C', status: 'done' });
    });

    test('returns only tasks with that status', async () => {
      const res = await api().get('/tasks?status=in_progress');

      expect(res.status).toBe(200);
      expect(res.body.map((t) => t.title)).toEqual(['B']);
    });

    test('returns an empty list for a status no task has', async () => {
      const res = await api().get('/tasks?status=archived');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('an empty ?status= is ignored and returns every task', async () => {
      const res = await api().get('/tasks?status=');

      expect(res.body).toHaveLength(3);
    });

    // Regression tests for BUG #6 (fixed): the route used to return as soon as
    // it saw ?status=, so ?page and ?limit were ignored alongside a filter.
    test('applies ?page and ?limit to the filtered results', async () => {
      await createMany(3, { status: 'done' });

      const res = await api().get('/tasks?status=done&page=1&limit=2');

      expect(res.body).toHaveLength(2);
    });

    test('later pages continue through the filtered results', async () => {
      await createMany(3, { status: 'done' });

      const res = await api().get('/tasks?status=done&page=2&limit=2');

      expect(res.body.map((t) => t.title)).toEqual(['Task 2', 'Task 3']);
    });
  });

  describe('?page= and ?limit= pagination', () => {
    // Regression test for BUG #1 (fixed): page 1 used to skip the first `limit` tasks.
    test('?page=1&limit=5 returns the first five tasks', async () => {
      await createMany(7);

      const res = await api().get('/tasks?page=1&limit=5');

      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']);
    });

    test('returns at most `limit` tasks', async () => {
      await createMany(12);

      const res = await api().get('/tasks?page=2&limit=3');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(3);
    });

    test('uses a limit of 10 when only ?page is given', async () => {
      await createMany(25);

      const res = await api().get('/tasks?page=1');

      expect(res.body).toHaveLength(10);
    });

    test('paginates when only ?limit is given', async () => {
      await createMany(12);

      const res = await api().get('/tasks?limit=5');

      expect(res.body).toHaveLength(5);
    });

    test('returns an empty list for a page past the end', async () => {
      await createMany(3);

      const res = await api().get('/tasks?page=50&limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    // BUG #8: invalid values are silently replaced (limit=0 becomes 10) or
    // produce odd results (page=-1 returns an empty list) instead of a 400.
    test.failing('rejects a limit that is not a positive number with 400', async () => {
      const res = await api().get('/tasks?page=1&limit=0');

      expect(res.status).toBe(400);
    });

    test.failing('rejects a negative page with 400', async () => {
      const res = await api().get('/tasks?page=-1&limit=10');

      expect(res.status).toBe(400);
    });
  });
});

describe('POST /tasks', () => {
  test('creates a task with defaults and returns 201', async () => {
    const res = await createTask({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
      createdAt: expect.any(String),
      assignee: null,
    });
  });

  test('stores every field that is provided', async () => {
    const body = {
      title: 'Ship it',
      description: 'Before Friday',
      status: 'in_progress',
      priority: 'high',
      dueDate: FUTURE,
    };

    const res = await createTask(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(body);
  });

  test('accepts dueDate: null, which means "no due date"', async () => {
    const res = await createTask({ title: 'x', dueDate: null });

    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBeNull();
  });

  test('the new task is returned by GET /tasks', async () => {
    const created = await createTask({ title: 'Find me' });

    const res = await api().get('/tasks');

    expect(res.body).toEqual([created.body]);
  });

  test('ignores id, createdAt and completedAt sent by the client', async () => {
    const res = await createTask({ title: 'Sneaky', id: 'my-id', createdAt: PAST, completedAt: PAST });

    expect(res.body.id).not.toBe('my-id');
    expect(res.body.createdAt).not.toBe(PAST);
    expect(res.body.completedAt).toBeNull();
  });

  test.each([
    ['title is missing', {}],
    ['title is an empty string', { title: '' }],
    ['title is only spaces', { title: '   ' }],
    ['title is not a string', { title: 42 }],
    ['status is not allowed', { title: 'x', status: 'pending' }],
    ['priority is not allowed', { title: 'x', priority: 'urgent' }],
    ['dueDate is not a date', { title: 'x', dueDate: 'not-a-date' }],
  ])('returns 400 when %s', async (_, body) => {
    const res = await createTask(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  test('returns 400 when the body is empty', async () => {
    const res = await api().post('/tasks');

    expect(res.status).toBe(400);
  });

  // Regression tests for BUG #4 (fixed): validators checked `body.status && ...`,
  // so null and "" skipped validation, and the `status = 'todo'` default only
  // applies to undefined, not null. Both values were stored as-is.
  test('rejects status: null with 400', async () => {
    const res = await createTask({ title: 'x', status: null });

    expect(res.status).toBe(400);
  });

  test('rejects an empty status with 400', async () => {
    const res = await createTask({ title: 'x', status: '' });

    expect(res.status).toBe(400);
  });

  test('rejects priority: null with 400', async () => {
    const res = await createTask({ title: 'x', priority: null });

    expect(res.status).toBe(400);
  });

  // Regression test for the BUG #4 crash: getByStatus() used to call
  // null.includes() on such a task, so every filtered request was a 500.
  // Stopped by the exact comparison from the #2 fix; the #4 validation fix
  // also keeps null out of the store in the first place.
  test('a task sent with status: null does not break GET /tasks?status=', async () => {
    silenceErrorLog();
    await createTask({ title: 'Bad', status: null });

    const res = await api().get('/tasks?status=todo');

    expect(res.status).toBe(200);
  });

  // BUG #9: description is never validated, so any JSON value is stored.
  test.failing('rejects a description that is not a string with 400', async () => {
    const res = await createTask({ title: 'x', description: { nested: true } });

    expect(res.status).toBe(400);
  });

  // BUG #9: Date.parse() accepts loose formats. "March 5" is read as
  // 5 March 2001, so the task is overdue the moment it is created.
  test.failing('rejects a dueDate that is not an ISO 8601 date with 400', async () => {
    const res = await createTask({ title: 'x', dueDate: 'March 5' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates the given fields, keeps the rest, and returns the task', async () => {
    const { body: task } = await createTask({ title: 'Old', priority: 'low' });

    const res = await api().put(`/tasks/${task.id}`).send({ title: 'New', status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, title: 'New', status: 'in_progress' });
  });

  test('the change is visible in GET /tasks', async () => {
    const { body: task } = await createTask({ title: 'Old' });

    await api().put(`/tasks/${task.id}`).send({ title: 'New' });
    const res = await api().get('/tasks');

    expect(res.body[0].title).toBe('New');
  });

  // Regression test for BUG #10 (fixed): PUT to done used to leave completedAt null.
  test('setting status to done records completedAt', async () => {
    const { body: task } = await createTask({ title: 'x' });

    const res = await api().put(`/tasks/${task.id}`).send({ status: 'done' });

    expect(res.body).toMatchObject({ status: 'done', completedAt: expect.any(String) });
  });

  test('can clear a due date by sending dueDate: null', async () => {
    const { body: task } = await createTask({ title: 'x', dueDate: FUTURE });

    const res = await api().put(`/tasks/${task.id}`).send({ dueDate: null });

    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBeNull();
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await api().put('/tasks/does-not-exist').send({ title: 'New' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test.each([
    ['title is an empty string', { title: '' }],
    ['title is not a string', { title: 42 }],
    ['status is not allowed', { status: 'completed' }],
    ['priority is not allowed', { priority: 'urgent' }],
    ['dueDate is not a date', { dueDate: 'not-a-date' }],
  ])('returns 400 when %s', async (_, body) => {
    const { body: task } = await createTask({ title: 'Valid' });

    const res = await api().put(`/tasks/${task.id}`).send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  // Regression tests for BUG #5 (fixed): the body used to be spread straight
  // onto the stored task, so a client could change id, createdAt or
  // completedAt, or add any field.
  test('does not let the client change the task id', async () => {
    const { body: task } = await createTask({ title: 'Mine' });

    const res = await api().put(`/tasks/${task.id}`).send({ id: 'hacked' });

    expect(res.body.id).toBe(task.id);
  });

  test('ignores createdAt, completedAt and unknown fields', async () => {
    const { body: task } = await createTask({ title: 'Mine' });

    const res = await api()
      .put(`/tasks/${task.id}`)
      .send({ title: 'Renamed', createdAt: PAST, completedAt: PAST, isAdmin: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, title: 'Renamed' });
  });

  // Regression test for BUG #4 (fixed): validateUpdateTask had the same null loophole.
  test('rejects status: null with 400', async () => {
    const { body: task } = await createTask({ title: 'x' });

    const res = await api().put(`/tasks/${task.id}`).send({ status: null });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes the task and returns 204 with no body', async () => {
    const { body: task } = await createTask({ title: 'Delete me' });

    const res = await api().delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await api().get('/tasks')).body).toEqual([]);
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await api().delete('/tasks/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 when the same task is deleted twice', async () => {
    const { body: task } = await createTask({ title: 'Delete me' });

    await api().delete(`/tasks/${task.id}`);
    const res = await api().delete(`/tasks/${task.id}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks the task done, sets completedAt and returns it', async () => {
    const { body: task } = await createTask({ title: 'Finish me' });

    const res = await api().patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: task.id, status: 'done', completedAt: expect.any(String) });
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await api().patch('/tasks/does-not-exist/complete');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  // Regression test for BUG #3 (fixed): completing used to reset priority to 'medium'.
  test('keeps the task priority', async () => {
    const { body: task } = await createTask({ title: 'Urgent', priority: 'high' });

    const res = await api().patch(`/tasks/${task.id}/complete`);

    expect(res.body.priority).toBe('high');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  const assign = (id, body) => api().patch(`/tasks/${id}/assign`).send(body);

  test('assigns the task and returns the updated task', async () => {
    const { body: task } = await createTask({ title: 'Review PR' });

    const res = await assign(task.id, { assignee: 'Asha' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, assignee: 'Asha' });
  });

  test('the assignment is visible in GET /tasks', async () => {
    const { body: task } = await createTask({ title: 'Review PR' });

    await assign(task.id, { assignee: 'Asha' });
    const res = await api().get('/tasks');

    expect(res.body[0].assignee).toBe('Asha');
  });

  test('trims spaces around the name', async () => {
    const { body: task } = await createTask({ title: 'Review PR' });

    const res = await assign(task.id, { assignee: '  Asha  ' });

    expect(res.body.assignee).toBe('Asha');
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await assign('does-not-exist', { assignee: 'Asha' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test.each([
    ['assignee is missing', {}],
    ['assignee is an empty string', { assignee: '' }],
    ['assignee is only spaces', { assignee: '   ' }],
    ['assignee is a number', { assignee: 42 }],
    ['assignee is an object', { assignee: { name: 'Asha' } }],
    ['assignee is longer than 100 characters', { assignee: 'a'.repeat(101) }],
  ])('returns 400 when %s', async (_, body) => {
    const { body: task } = await createTask({ title: 'Review PR' });

    const res = await assign(task.id, body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  describe('when the task is already assigned', () => {
    let task;

    beforeEach(async () => {
      ({ body: task } = await createTask({ title: 'Review PR' }));
      await assign(task.id, { assignee: 'Asha' });
    });

    test('assigning the same person again succeeds and changes nothing', async () => {
      const res = await assign(task.id, { assignee: 'Asha' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Asha');
    });

    test('assigning someone else returns 409 and keeps the current assignee', async () => {
      const res = await assign(task.id, { assignee: 'Ravi' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Task is already assigned to Asha' });
      expect((await api().get('/tasks')).body[0].assignee).toBe('Asha');
    });

    test('assignee: null unassigns the task', async () => {
      const res = await assign(task.id, { assignee: null });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBeNull();
    });

    test('after unassigning, someone else can be assigned', async () => {
      await assign(task.id, { assignee: null });

      const res = await assign(task.id, { assignee: 'Ravi' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Ravi');
    });

    test('completing the task keeps the assignee', async () => {
      const res = await api().patch(`/tasks/${task.id}/complete`);

      expect(res.body.assignee).toBe('Asha');
    });
  });

  test('unassigning a task that has no assignee is fine', async () => {
    const { body: task } = await createTask({ title: 'Review PR' });

    const res = await assign(task.id, { assignee: null });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBeNull();
  });

  // /assign is the only way to set an assignee, so its validation and the
  // 409 rule can't be bypassed through POST or PUT.
  test('POST /tasks ignores an assignee in the body', async () => {
    const res = await createTask({ title: 'Review PR', assignee: 'Asha' });

    expect(res.body.assignee).toBeNull();
  });

  test('PUT /tasks/:id cannot change the assignee', async () => {
    const { body: task } = await createTask({ title: 'Review PR' });
    await assign(task.id, { assignee: 'Asha' });

    const res = await api().put(`/tasks/${task.id}`).send({ assignee: '' });

    expect(res.body.assignee).toBe('Asha');
  });
});

describe('GET /tasks/stats', () => {
  test('returns zero counts when there are no tasks', async () => {
    const res = await api().get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status and unfinished past-due tasks as overdue', async () => {
    await createTask({ title: 'A', status: 'todo', dueDate: PAST });
    await createTask({ title: 'B', status: 'in_progress', dueDate: FUTURE });
    await createTask({ title: 'C', status: 'done', dueDate: PAST });
    await createTask({ title: 'D', status: 'todo' });

    const res = await api().get('/tasks/stats');

    expect(res.body).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 1 });
  });

  test('reflects tasks completed through PATCH /complete', async () => {
    const { body: task } = await createTask({ title: 'A', dueDate: PAST });

    await api().patch(`/tasks/${task.id}/complete`);
    const res = await api().get('/tasks/stats');

    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 1, overdue: 0 });
  });
});

describe('error handling', () => {
  // Regression tests for BUG #7 (fixed): express.json() flags bad JSON as a
  // 400 (and an oversized body as a 413), but the error handler used to
  // ignore err.status, answer 500 and log a stack trace for every one.
  test('returns 400 for a malformed JSON body', async () => {
    const errorLog = silenceErrorLog();

    const res = await api()
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": "missing brace"');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Request body is not valid JSON' });
    expect(errorLog).not.toHaveBeenCalled();
  });

  test('returns 413 for a body over the size limit', async () => {
    silenceErrorLog();

    const res = await api()
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ title: 'x'.repeat(200 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  test('unexpected errors return a generic 500 without leaking details', async () => {
    const errorLog = silenceErrorLog();
    jest.spyOn(taskService, 'getAll').mockImplementation(() => {
      throw new Error('database exploded');
    });

    const res = await api().get('/tasks');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(errorLog).toHaveBeenCalled();
  });
});
