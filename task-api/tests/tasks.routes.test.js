const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('/tasks routes integration', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('POST /tasks creates task and GET /tasks returns it', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Integration task' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe('Integration task');

    const listRes = await request(app).get('/tasks');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  test('POST /tasks validation error for missing title', async () => {
    const res = await request(app).post('/tasks').send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/);
  });

  test('PUT /tasks/:id updates task and 404 on invalid id', async () => {
    const task = taskService.create({ title: 'Updatable' });
    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');

    const res404 = await request(app).put('/tasks/invalid').send({ status: 'done' });
    expect(res404.status).toBe(404);
  });

  test('DELETE /tasks/:id deletes and returns 204', async () => {
    const task = taskService.create({ title: 'Removable' });
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);

    const res404 = await request(app).delete(`/tasks/${task.id}`);
    expect(res404.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks done', async () => {
    const task = taskService.create({ title: 'Completable', status: 'in_progress' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');

    const res404 = await request(app).patch('/tasks/none/complete');
    expect(res404.status).toBe(404);
  });

  test('PATCH /tasks/:id/assign works and validates', async () => {
    const task = taskService.create({ title: 'Assignable' });

    const emptyRes = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: ' ' });
    expect(emptyRes.status).toBe(400);

    const notFoundRes = await request(app).patch('/tasks/invalid-id/assign').send({ assignee: 'Alice' });
    expect(notFoundRes.status).toBe(404);

    const assignRes = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.assignee).toBe('Alice');

    const reassignRes = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });
    expect(reassignRes.status).toBe(409);
  });

  test('GET /tasks?status= and ?page=&limit= and /stats', async () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'todo' });

    const statusRes = await request(app).get('/tasks').query({ status: 'todo' });
    expect(statusRes.body).toHaveLength(2);

    const pageRes = await request(app).get('/tasks').query({ page: '1', limit: '1' });
    expect(pageRes.body).toHaveLength(1);
    expect(pageRes.body[0].title).toBe('A');

    const statsRes = await request(app).get('/tasks/stats');
    expect(statsRes.body.todo).toBe(2);
    expect(statsRes.body.done).toBe(1);
  });

  test('GET /tasks?priority= priority filter works', async () => {
    taskService.create({ title: 'Low', priority: 'low' });
    taskService.create({ title: 'High', priority: 'high' });

    const res = await request(app).get('/tasks').query({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].priority).toBe('high');
  });
});
