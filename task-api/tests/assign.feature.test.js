/*
  tests for new feature: PATCH /tasks/:id/assign
  this is a new endpoint that assigns a task to someone
  testing happy path, validation, and edge cases
*/

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('PATCH /tasks/:id/assign', () => {

  // happy path
  it('assigns a task and returns updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'do something' });
    const id = created.body.id;

    const res = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'musa' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('musa');
  });

  it('returned task still has all original fields', async () => {
    const created = await request(app).post('/tasks').send({ title: 'keep fields', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'john' });
    expect(res.body.title).toBe('keep fields');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(created.body.id);
  });

  it('can reassign a task to someone else', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'ali' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'sara' });
    expect(res.body.assignee).toBe('sara');
  });

  // 404
  it('returns 404 for non existent task id', async () => {
    const res = await request(app).patch('/tasks/fake-id/assign').send({ assignee: 'musa' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  // validation
  it('returns 400 when assignee is missing', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when assignee is empty string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is just whitespace', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is a number', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 123 });
    expect(res.status).toBe(400);
  });

  // trims whitespace
  it('trims whitespace from assignee before storing', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: '  musa  ' });
    expect(res.body.assignee).toBe('musa');
  });

});
