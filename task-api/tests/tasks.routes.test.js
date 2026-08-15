const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API integration tests', () => {
  beforeEach(() => taskService._reset());

  test('POST /tasks creates a task (happy path) and validation error for missing title', async () => {
    const res = await request(app).post('/tasks').send({ title: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    const bad = await request(app).post('/tasks').send({});
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBeDefined();
  });

  test('GET /tasks returns all, supports status filter and pagination', async () => {
    const a = taskService.create({ title: 'A', status: 'todo' });
    const b = taskService.create({ title: 'B', status: 'done' });

    const all = await request(app).get('/tasks');
    expect(all.status).toBe(200);
    expect(all.body.length).toBe(2);

    const done = await request(app).get('/tasks').query({ status: 'done' });
    expect(done.status).toBe(200);
    expect(done.body.length).toBe(1);

    // pagination: create more
    for (let i = 0; i < 7; i++) taskService.create({ title: `t${i}` });
    const page = await request(app).get('/tasks').query({ page: 1, limit: 5 });
    expect(page.status).toBe(200);
    // With page=1 and limit=5 expect first 5 items
    expect(page.body.length).toBe(5);
  });

  test('PUT /tasks/:id updates and returns 404/400 for edge cases', async () => {
    const t = taskService.create({ title: 'up' });
    const ok = await request(app).put(`/tasks/${t.id}`).send({ title: 'updated' });
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe('updated');

    const notFound = await request(app).put('/tasks/no-id').send({ title: 'x' });
    expect(notFound.status).toBe(404);

    const bad = await request(app).put(` /tasks/${t.id}`).send({ title: '' });
    // note: the router will run validators which return 400 for bad title
    // but if the path contains a leading space it becomes 404; ensure we test validator separately
    const bad2 = await request(app).put(`/tasks/${t.id}`).send({ title: '' });
    expect(bad2.status).toBe(400);
  });

  test('DELETE /tasks/:id returns 204 and 404 for missing', async () => {
    const t = taskService.create({ title: 'del' });
    const res = await request(app).delete(`/tasks/${t.id}`);
    expect(res.status).toBe(204);

    const miss = await request(app).delete('/tasks/no-id');
    expect(miss.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks task done and 404 for missing', async () => {
    const t = taskService.create({ title: 'c' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');

    const miss = await request(app).patch('/tasks/no-id/complete');
    expect(miss.status).toBe(404);
  });

  test('PATCH /tasks/:id/assign assigns an assignee, validates input, and 404s for missing', async () => {
    const t = taskService.create({ title: 'to-assign' });
    const ok = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Alice' });
    expect(ok.status).toBe(200);
    expect(ok.body.assignee).toBe('Alice');

    const bad = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '' });
    expect(bad.status).toBe(400);

    const miss = await request(app).patch('/tasks/no-id/assign').send({ assignee: 'X' });
    expect(miss.status).toBe(404);

    // reassign allowed (overwrites)
    const re = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Bob' });
    expect(re.status).toBe(200);
    expect(re.body.assignee).toBe('Bob');
  });

  test('GET /tasks/stats returns counts', async () => {
    taskService.create({ title: 's1', status: 'todo' });
    taskService.create({ title: 's2', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBeDefined();
    expect(res.body.done).toBeDefined();
  });
});
