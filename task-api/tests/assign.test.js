const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => {
  service._reset();
});

const createTask = (body = {}) =>
  request(app).post('/tasks').send({ title: 'default', ...body });

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task to a user and returns the updated task', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(created.body.id);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/nope/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 400 when assignee is missing', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  test('returns 400 when assignee is an empty string', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is not a string', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  test('trims surrounding whitespace before storing', async () => {
    const created = await createTask({ title: 'a' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '  Alice  ' });
    expect(res.body.assignee).toBe('Alice');
  });

  test('re-assigning overwrites the previous assignee', async () => {
    const created = await createTask({ title: 'a' });
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });
});
