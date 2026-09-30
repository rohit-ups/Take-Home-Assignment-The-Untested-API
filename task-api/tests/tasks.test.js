const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => service._reset());

test('GET /tasks lists tasks and handles empty results', async () => {
  expect((await request(app).get('/tasks').expect(200)).body).toEqual([]);
  const task = service.create({ title: 'Task' });
  expect((await request(app).get('/tasks').expect(200)).body).toEqual([task]);
  expect((await request(app).get('/tasks?status=done').expect(200)).body).toEqual([]);
});

test('GET /tasks filters before paginating, with one-based pages and defaults', async () => {
  service.create({ title: 'Excluded', status: 'done' });
  for (let i = 1; i <= 4; i++) service.create({ title: `Task ${i}` });
  expect((await request(app).get('/tasks?status=todo&page=1&limit=2').expect(200)).body.map(t => t.title)).toEqual(['Task 1', 'Task 2']);
  expect((await request(app).get('/tasks?page=2&limit=2').expect(200)).body.map(t => t.title)).toEqual(['Task 2', 'Task 3']);
  expect((await request(app).get('/tasks?limit=1').expect(200)).body[0].title).toBe('Excluded');
  expect((await request(app).get('/tasks?page=1').expect(200)).body).toHaveLength(5);
  expect((await request(app).get('/tasks?page=99').expect(200)).body).toEqual([]);
});

test.each(['status=do', 'status=', 'status=todo&status=done', 'page=0', 'page=-1', 'page=1abc', 'page=1.5', 'page=', 'limit=0', 'limit=no', 'limit=9007199254740992', 'page=1&page=2'])('GET /tasks rejects invalid query %s', async query => {
  await request(app).get(`/tasks?${query}`).expect(400);
});

test('POST /tasks creates a task with defaults and accepts full valid input', async () => {
  const response = await request(app).post('/tasks').send({ title: 'Task' }).expect(201);
  expect(response.body).toMatchObject({ title: 'Task', status: 'todo', priority: 'medium', description: '', dueDate: null, completedAt: null });
  expect(service.findById(response.body.id)).toEqual(response.body);
  const full = { title: 'Done', description: 'Details', priority: 'high', status: 'done', dueDate: '2030-01-01T10:00:00+05:30' };
  expect((await request(app).post('/tasks').send(full).expect(201)).body).toMatchObject(full);
});

test.each([{}, { title: '' }, { title: '   ' }, { title: 42 }, { title: 'X', status: null }, { title: 'X', status: '' }, { title: 'X', priority: false }, { title: 'X', priority: 'urgent' }, { title: 'X', description: 42 }, { title: 'X', dueDate: 0 }, { title: 'X', dueDate: 'December 1, 2030' }, { title: 'X', dueDate: '2030-02-30' }, { title: 'X', id: 'fake' }, []])('POST /tasks rejects invalid body %j without storing it', async body => {
  await request(app).post('/tasks').send(body).expect(400);
  expect(service.getAll()).toEqual([]);
});

test('PUT /tasks/:id merges editable fields, preserves omitted fields and permits clearing dueDate', async () => {
  const task = service.create({ title: 'Task', priority: 'high', dueDate: '2030-01-01' });
  const response = await request(app).put(`/tasks/${task.id}`).send({ title: 'Updated', dueDate: null }).expect(200);
  expect(response.body).toEqual({ ...task, title: 'Updated', dueDate: null });
  expect((await request(app).put(`/tasks/${task.id}`).send({ status: 'done' }).expect(200)).body.completedAt).toEqual(expect.any(String));
  expect((await request(app).put(`/tasks/${task.id}`).send({ status: 'todo' }).expect(200)).body.completedAt).toBeNull();
});

test('PUT /tasks/:id returns 404 for a missing task', async () => {
  await request(app).put('/tasks/missing').send({ title: 'Task' }).expect(404);
});

test.each([{ title: '' }, { status: false }, { priority: null }, { description: null }, { dueDate: 'invalid' }, { id: 'changed' }, { createdAt: 'fake' }, { completedAt: 'fake' }, { extra: true }, []])('PUT rejects invalid body %j and leaves the task unchanged', async body => {
  const task = service.create({ title: 'Task' });
  await request(app).put(`/tasks/${task.id}`).send(body).expect(400);
  expect(service.findById(task.id)).toEqual(task);
});

test('DELETE /tasks/:id deletes one task with an empty 204 response', async () => {
  const first = service.create({ title: 'First' });
  const second = service.create({ title: 'Second' });
  const response = await request(app).delete(`/tasks/${first.id}`).expect(204);
  expect(response.text).toBe('');
  expect(service.getAll()).toEqual([second]);
  await request(app).delete(`/tasks/${first.id}`).expect(404);
  await request(app).delete('/tasks/missing').expect(404);
});

test('PATCH completion preserves priority and returns 404 for missing tasks', async () => {
  const task = service.create({ title: 'Task', priority: 'high' });
  const completed = (await request(app).patch(`/tasks/${task.id}/complete`).expect(200)).body;
  expect(completed).toMatchObject({ priority: 'high', status: 'done', completedAt: expect.any(String) });
  expect((await request(app).patch(`/tasks/${task.id}/complete`).expect(200)).body).toEqual(completed);
  await request(app).patch('/tasks/missing/complete').expect(404);
});

test('GET /tasks/stats reports empty counts and excludes completed overdue tasks', async () => {
  expect((await request(app).get('/tasks/stats').expect(200)).body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  service.create({ title: 'Overdue', dueDate: '2000-01-01' });
  service.create({ title: 'Done', status: 'done', dueDate: '2000-01-01' });
  service.create({ title: 'No date', status: 'in_progress' });
  expect((await request(app).get('/tasks/stats').expect(200)).body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
});

test('PATCH assignment trims names, persists assignment and allows reassignment', async () => {
  const task = service.create({ title: 'Task', priority: 'high' });
  expect((await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Alex  ' }).expect(200)).body).toEqual({ ...task, assignee: 'Alex' });
  expect((await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Sam' }).expect(200)).body.assignee).toBe('Sam');
  expect((await request(app).get('/tasks').expect(200)).body[0].assignee).toBe('Sam');
  await request(app).patch('/tasks/missing/assign').send({ assignee: 'Alex' }).expect(404);
});

test.each([{}, { assignee: '' }, { assignee: '  ' }, { assignee: null }, { assignee: 42 }, { assignee: [] }, { assignee: 'Alex', extra: true }, []])('PATCH assignment rejects invalid body %j', async body => {
  const task = service.create({ title: 'Task' });
  await request(app).patch(`/tasks/${task.id}/assign`).send(body).expect(400);
  expect(service.findById(task.id)).toEqual(task);
});

test('malformed JSON returns a client error', async () => {
  const response = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{').expect(400);
  expect(response.body).toEqual({ error: 'Invalid JSON body' });
});

test('oversized JSON returns 413 without storing a task', async () => {
  await request(app).post('/tasks').send({ title: 'X'.repeat(110 * 1024) }).expect(413);
  expect(service.getAll()).toEqual([]);
});

test('unexpected service errors return 500 without exposing internal details', async () => {
  const failure = jest.spyOn(service, 'getStats').mockImplementation(() => {
    throw new Error('private internal detail');
  });
  const logging = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await request(app).get('/tasks/stats').expect(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  } finally {
    failure.mockRestore();
    logging.mockRestore();
  }
});
