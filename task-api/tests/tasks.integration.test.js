const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => service._reset());

const create = (body = {}) => request(app).post('/tasks').send({ title: 'Task', ...body });

it('lists an empty store and all created tasks', async () => {
  expect((await request(app).get('/tasks')).body).toEqual([]);
  const task = (await create()).body;
  expect((await request(app).get('/tasks')).body).toEqual([task]);
});

it('filters exact statuses and combines filtering with pagination', async () => {
  await create({ status: 'done' });
  const first = (await create({ title: 'First' })).body;
  const second = (await create({ title: 'Second' })).body;
  expect((await request(app).get('/tasks?status=todo&page=1&limit=1')).body).toEqual([first]);
  expect((await request(app).get('/tasks?status=todo&page=2&limit=1')).body).toEqual([second]);
  expect((await request(app).get('/tasks?status=in_progress')).body).toEqual([]);
  expect((await request(app).get('/tasks?status=todo')).body).toHaveLength(2);
});

it('paginates without a filter and supports omitted page or limit', async () => {
  const first = (await create({ title: 'First' })).body;
  const second = (await create({ title: 'Second' })).body;
  expect((await request(app).get('/tasks?page=1&limit=1')).body).toEqual([first]);
  expect((await request(app).get('/tasks?limit=1')).body).toEqual([first]);
  expect((await request(app).get('/tasks?page=1')).body).toEqual([first, second]);
  expect((await request(app).get('/tasks?page=3&limit=1')).body).toEqual([]);
});

it.each([
  'status=do', 'status=', 'status=todo&status=done', 'status[x]=todo',
  'page=0', 'page=-1', 'page=1.5', 'page=2abc', 'page=', 'page=9007199254740992',
  'limit=0', 'limit=-1', 'limit=abc', 'limit=', 'page=1&page=2', 'limit[x]=1',
])('rejects invalid list query %s', async (query) => {
  const response = await request(app).get(`/tasks?${query}`);
  expect(response.status).toBe(400);
  expect(response.body.error).toEqual(expect.any(String));
});

it('creates tasks with defaults and optional fields', async () => {
  const basic = await create();
  expect(basic.status).toBe(201);
  expect(basic.body).toMatchObject({ title: 'Task', status: 'todo', priority: 'medium', dueDate: null });
  const detailed = await create({ description: 'Details', status: 'in_progress', priority: 'high', dueDate: '2026-10-01T12:00:00+05:30' });
  expect(detailed.status).toBe(201);
  expect(detailed.body).toMatchObject({ description: 'Details', status: 'in_progress', priority: 'high', dueDate: '2026-10-01T12:00:00+05:30' });
});

it('rejects missing title without creating a task', async () => {
  expect((await request(app).post('/tasks').send({})).status).toBe(400);
  expect(service.getAll()).toEqual([]);
});

it.each([
  { title: '' }, { title: '   ' }, { title: 3 },
  { status: '' }, { status: null }, { status: false }, { status: 0 }, { status: 'pending' },
  { priority: '' }, { priority: null }, { priority: false }, { priority: 0 }, { priority: 'urgent' },
  { description: null }, { description: 1 },
  { dueDate: '' }, { dueDate: 0 }, { dueDate: false }, { dueDate: [] },
  { dueDate: 'September 1, 2026' }, { dueDate: '2026-02-30T12:00:00Z' },
  { dueDate: '2026-01-01T25:00:00Z' }, { dueDate: '2026-01-01T12:00:00+24:00' },
  { dueDate: 'not-a-date' }, { dueDate: '2026-01-01' },
  { id: 'replacement' }, { completedAt: 'fake' }, { createdAt: 'fake' }, { unexpected: true },
])('rejects invalid fields on creation and update: %j', async (fields) => {
  const task = service.create({ title: 'Original' });
  expect((await create(fields)).status).toBe(400);
  expect((await request(app).put(`/tasks/${task.id}`).send(fields)).status).toBe(400);
  expect(service.getAll()).toEqual([task]);
});

it.each([[], ['injected'], null, 'text', 42, false])('rejects non-object JSON body %j', async (body) => {
  const task = service.create({ title: 'Original' });
  for (const method of ['post', 'put']) {
    const path = method === 'post' ? '/tasks' : `/tasks/${task.id}`;
    const response = await request(app)[method](path).set('Content-Type', 'application/json').send(JSON.stringify(body));
    expect(response.status).toBe(400);
  }
  expect(service.getAll()).toEqual([task]);
});

it('updates only supplied fields and allows clearing a due date', async () => {
  const task = (await create({ priority: 'high', dueDate: '2026-10-01T12:00:00Z' })).body;
  const response = await request(app).put(`/tasks/${task.id}`).send({ title: 'Updated', dueDate: null });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ...task, title: 'Updated', dueDate: null });
  expect((await request(app).put(`/tasks/${task.id}`).send({})).body).toEqual(response.body);
});

it('returns 404 when updating a missing task', async () => {
  const response = await request(app).put('/tasks/missing').send({ title: 'Updated' });
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Task not found' });
});

it('deletes a task with 204 and leaves other tasks intact', async () => {
  const first = (await create()).body;
  const second = (await create({ title: 'Second' })).body;
  const response = await request(app).delete(`/tasks/${first.id}`);
  expect(response.status).toBe(204);
  expect(response.text).toBe('');
  expect((await request(app).get('/tasks')).body).toEqual([second]);
  expect((await request(app).delete(`/tasks/${first.id}`)).status).toBe(404);
});

it('returns 404 when deleting a missing task', async () => {
  expect((await request(app).delete('/tasks/missing')).status).toBe(404);
});

it('completes a task without changing priority and handles repeated completion', async () => {
  const task = (await create({ priority: 'high' })).body;
  const response = await request(app).patch(`/tasks/${task.id}/complete`);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ...task, status: 'done', completedAt: expect.any(String) });
  expect((await request(app).patch(`/tasks/${task.id}/complete`)).body).toEqual(response.body);
});

it('returns 404 when completing a missing task', async () => {
  expect((await request(app).patch('/tasks/missing/complete')).status).toBe(404);
});

it('keeps completion metadata consistent through create, update and reopening', async () => {
  const task = (await create({ status: 'done' })).body;
  expect(Number.isNaN(Date.parse(task.completedAt))).toBe(false);
  const reopened = await request(app).put(`/tasks/${task.id}`).send({ status: 'todo' });
  expect(reopened.body.completedAt).toBeNull();
  const completed = await request(app).put(`/tasks/${task.id}`).send({ status: 'done' });
  expect(completed.body.completedAt).toEqual(expect.any(String));
});

it('returns empty statistics', async () => {
  const response = await request(app).get('/tasks/stats');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
});

it('counts overdue incomplete tasks but excludes completed and future tasks', async () => {
  await create({ dueDate: '2000-01-01T00:00:00Z' });
  await create({ status: 'in_progress', dueDate: '2000-01-01T00:00:00Z' });
  await create({ status: 'done', dueDate: '2000-01-01T00:00:00Z' });
  await create({ dueDate: '2099-01-01T00:00:00Z' });
  await create();
  expect((await request(app).get('/tasks/stats')).body).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
});

it('returns 400 JSON for malformed input', async () => {
  const response = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{');
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Invalid JSON body' });
});

it('rejects pagination whose computed offset exceeds the safe integer range', async () => {
  const response = await request(app).get('/tasks?page=9007199254740991&limit=10');
  expect(response.status).toBe(400);
  expect(response.body.error).toBe('pagination offset is too large');
});

it('returns 413 JSON when the body exceeds the parser limit', async () => {
  const response = await create({ description: 'x'.repeat(110 * 1024) });
  expect(response.status).toBe(413);
  expect(response.body).toEqual({ error: 'JSON body is too large' });
});

it('returns a generic 500 for an unexpected service error without leaking details', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const stats = jest.spyOn(service, 'getStats').mockImplementation(() => {
    throw new Error('private diagnostic detail');
  });
  try {
    const response = await request(app).get('/tasks/stats');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    expect(log).toHaveBeenCalled();
  } finally {
    stats.mockRestore();
    log.mockRestore();
  }
});

it.each([
  '2024-02-29T12:00:00Z', '2000-02-29T12:00:00.123Z',
  '2026-10-01T12:00:00-05:30',
])('accepts valid calendar dates and timezone offsets: %s', async (dueDate) => {
  expect((await create({ dueDate })).status).toBe(201);
});

it.each([
  '1900-02-29T12:00:00Z', '2026-02-29T12:00:00Z', '2026-04-31T12:00:00Z',
  '2026-00-01T12:00:00Z', '2026-13-01T12:00:00Z', '2026-01-00T12:00:00Z',
])('rejects impossible calendar dates: %s', async (dueDate) => {
  expect((await create({ dueDate })).status).toBe(400);
});
