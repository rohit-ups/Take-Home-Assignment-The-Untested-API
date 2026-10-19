const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => service._reset());

it('trims and persists an assignment without changing other fields', async () => {
  const task = service.create({ title: 'Task', priority: 'high' });
  const response = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Vaibhav  ' });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ...task, assignee: 'Vaibhav' });
  expect((await request(app).get('/tasks')).body).toEqual([response.body]);
  const completed = await request(app).patch(`/tasks/${task.id}/complete`);
  expect(completed.body.assignee).toBe('Vaibhav');
});

it('allows reassignment, repeated assignment and assignment of completed tasks', async () => {
  const task = service.create({ title: 'Done', status: 'done' });
  await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Vaibhav' });
  const second = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Rohit' });
  expect(second.status).toBe(200);
  expect(second.body).toEqual({ ...task, assignee: 'Rohit' });
  const repeated = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Rohit' });
  expect(repeated.body).toEqual(second.body);
});

it('returns 404 for a missing task with a valid assignment', async () => {
  const response = await request(app).patch('/tasks/missing/assign').send({ assignee: 'Vaibhav' });
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Task not found' });
});

it.each([{}, { assignee: '' }, { assignee: '  ' }, { assignee: null },
  { assignee: 42 }, { assignee: false }, { assignee: [] }, { assignee: {} },
  { assignee: 'Vaibhav', priority: 'low' }, [], null])('rejects invalid assignment body %j without changing the task', async (body) => {
  const task = service.create({ title: 'Task' });
  const response = await request(app).patch(`/tasks/${task.id}/assign`)
    .set('Content-Type', 'application/json').send(JSON.stringify(body));
  expect(response.status).toBe(400);
  expect(service.findById(task.id)).toEqual(task);
});

it('validates input before checking existence, consistently with PUT', async () => {
  expect((await request(app).patch('/tasks/missing/assign').send({ assignee: '' })).status).toBe(400);
});

it('requires the dedicated endpoint to change an assignment', async () => {
  const task = service.create({ title: 'Task' });
  const response = await request(app).put(`/tasks/${task.id}`).send({ assignee: 'Vaibhav' });
  expect(response.status).toBe(400);
  expect(service.findById(task.id).assignee).toBeUndefined();
});
