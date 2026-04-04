const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset in-memory DB before each test
beforeEach(() => {
  taskService._reset();
});

// Helper — creates a basic task and returns its id
const createTask = async (overrides = {}) => {
  const res = await request(app).post('/tasks').send({
    title: 'Test task',
    ...overrides,
  });
  return res.body.id;
};

// ─────────────────────────────────────────────
// HAPPY PATH
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/assign — happy path', () => {
  test('should assign a task to a valid assignee and return 200', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('returned task should contain all original fields plus assignee', async () => {
    const id = await createTask({ title: 'Fix bug', priority: 'high' });

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe('Fix bug');
    expect(res.body.priority).toBe('high');
    expect(res.body.assignee).toBe('Bob');
  });

  test('should trim whitespace from assignee name before storing', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: '   Alice   ' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('should allow reassigning a task to the same assignee', async () => {
    const id = await createTask();

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('new task should have assignee as null by default', async () => {
    const id = await createTask();
    const res = await request(app).get('/tasks');

    const task = res.body.find((t) => t.id === id);
    expect(task.assignee).toBeNull();
  });
});

// ─────────────────────────────────────────────
// 404 — TASK NOT FOUND
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/assign — 404 cases', () => {
  test('should return 404 for non-existent task id', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('should return 404 for valid UUID that does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/00000000-0000-0000-0000-000000000000/assign')
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});

// ─────────────────────────────────────────────
// 409 — ALREADY ASSIGNED
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/assign — 409 already assigned', () => {
  test('should return 409 if task is already assigned to someone else', async () => {
    const id = await createTask();

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('Alice');
  });

  test('409 response should include the current assignee name', async () => {
    const id = await createTask();

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Charlie' });

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Dave' });

    expect(res.statusCode).toBe(409);
    expect(res.body.assignee).toBe('Charlie');
  });
});

// ─────────────────────────────────────────────
// 400 — VALIDATION ERRORS
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/assign — 400 validation errors', () => {
  test('should return 400 if assignee field is missing', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee is required');
  });

  test('should return 400 if assignee is an empty string', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee must be a non-empty string');
  });

  test('should return 400 if assignee is whitespace only', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: '     ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee must be a non-empty string');
  });

  test('should return 400 if assignee is the string "null"', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'null' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee must be a valid name');
  });

  test('should return 400 if assignee is the string "undefined"', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'undefined' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee must be a valid name');
  });

  test('should return 400 if assignee is a number', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 12345 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee must be a string');
  });

  test('should return 400 if assignee exceeds 100 characters', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'A'.repeat(101) });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee name must be under 100 characters');
  });

  test('should accept assignee of exactly 100 characters', async () => {
    const id = await createTask();

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'A'.repeat(100) });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('A'.repeat(100));
  });
});