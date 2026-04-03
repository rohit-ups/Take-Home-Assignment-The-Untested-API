const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset in-memory DB before each test
beforeEach(() => {
  taskService._reset();
});

// ─────────────────────────────────────────────
// BUG 01: Status Validation — case + whitespace
// ─────────────────────────────────────────────
describe('Bug 01 — Status accepts case variants and whitespace', () => {
  test('should accept "TODO" (uppercase)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      status: 'TODO',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should accept " todo " (with spaces)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      status: ' todo ',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should accept "In_Progress" (mixed case)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      status: 'In_Progress',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should still reject completely invalid status', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      status: 'invalid_status',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// BUG 02: Title & Description Whitespace Normalisation
// ─────────────────────────────────────────────
describe('Bug 02 — Title and description are trimmed before storing', () => {
  test('should trim trailing spaces from title', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Write unit tests for auth module    ',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Write unit tests for auth module');
  });

  test('should trim leading and trailing spaces from description', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      description: '     hel lo       ',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.description).toBe('hel lo');
  });
});

// ─────────────────────────────────────────────
// BUG 03: Priority Validation — case + whitespace
// ─────────────────────────────────────────────
describe('Bug 03 — Priority accepts case variants and whitespace', () => {
  test('should accept "HIGH" (uppercase)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      priority: 'HIGH',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should accept " low " (with spaces)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      priority: ' low ',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should accept "Medium" (mixed case)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      priority: 'Medium',
    });
    expect(res.statusCode).not.toBe(400);
  });

  test('should still reject completely invalid priority', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      priority: 'urgent',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// BUG 04: String "null" Accepted as Valid Title
// ─────────────────────────────────────────────
describe('Bug 04 — String "null" and "undefined" rejected as title', () => {
  test('should reject title "null" (string)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'null',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject title "undefined" (string)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'undefined',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject title of only whitespace', async () => {
    const res = await request(app).post('/tasks').send({
      title: '     ',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject empty string title', async () => {
    const res = await request(app).post('/tasks').send({
      title: '',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// BUG 05: No Validation on dueDate Field
// ─────────────────────────────────────────────
describe('Bug 05 — dueDate validation: format, past, and far future', () => {
  test('should reject past date in ISO 8601 format', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject date-only format (not ISO 8601)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: '2026-03-02',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject MM/DD/YYYY format', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: '10/11/2022',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject unrealistically far future date', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: '2091-09-10T00:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should accept valid future ISO 8601 date', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: '2026-12-01T10:00:00.000Z',
    });
    expect(res.statusCode).toBe(201);
  });

  test('should accept null dueDate (optional field)', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Test task',
      dueDate: null,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ─────────────────────────────────────────────
// BUG 06: Duplicate Task Entries Not Rejected
// ─────────────────────────────────────────────
describe('Bug 06 — Duplicate tasks with same title and dueDate are rejected', () => {
  test('should reject a task that is an exact duplicate', async () => {
    const payload = {
      title: 'hey there',
      description: 'hello',
      status: 'todo',
      priority: 'low',
      dueDate: '2026-12-01T10:00:00.000Z',
    };

    const first = await request(app).post('/tasks').send(payload);
    expect(first.statusCode).toBe(201);

    const second = await request(app).post('/tasks').send(payload);
    expect(second.statusCode).toBe(409);
  });

  test('should allow same title with different dueDate', async () => {
    const first = await request(app).post('/tasks').send({
      title: 'hey there',
      dueDate: '2026-12-01T10:00:00.000Z',
    });
    expect(first.statusCode).toBe(201);

    const second = await request(app).post('/tasks').send({
      title: 'hey there',
      dueDate: '2027-01-01T10:00:00.000Z',
    });
    expect(second.statusCode).toBe(201);
  });
});

// ─────────────────────────────────────────────
// BUG 07: Incorrect Pagination Offset Calculation
// ─────────────────────────────────────────────
describe('Bug 07 — Pagination page=1 returns first set of results', () => {
  beforeEach(async () => {
    // Seed 10 tasks
    for (let i = 1; i <= 10; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
  });

  test('page=1 should return the first task (Task 1)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=5');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(5);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('page=2 should return tasks 6 to 10', async () => {
    const res = await request(app).get('/tasks?page=2&limit=5');
    expect(res.statusCode).toBe(200);
    expect(res.body[0].title).toBe('Task 6');
  });
});

// ─────────────────────────────────────────────
// BUG 08: getByStatus Uses Partial Match
// ─────────────────────────────────────────────
describe('Bug 08 — Status filter uses exact match not partial match', () => {
  beforeEach(async () => {
    await request(app).post('/tasks').send({ title: 'Todo task', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Done task', status: 'done' });
  });

  test('?status=do should NOT return todo or done tasks', async () => {
    const res = await request(app).get('/tasks?status=do');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });

  test('?status=todo should return only todo tasks', async () => {
    const res = await request(app).get('/tasks?status=todo');
    expect(res.statusCode).toBe(200);
    res.body.forEach((task) => expect(task.status).toBe('todo'));
  });

  test('?status=done should return only done tasks', async () => {
    const res = await request(app).get('/tasks?status=done');
    expect(res.statusCode).toBe(200);
    res.body.forEach((task) => expect(task.status).toBe('done'));
  });
});

// ─────────────────────────────────────────────
// BUG 09: completeTask Resets Priority to medium
// ─────────────────────────────────────────────
describe('Bug 09 — completeTask preserves original priority', () => {
  test('completing a high priority task should keep priority as high', async () => {
    const create = await request(app).post('/tasks').send({
      title: 'High priority task',
      priority: 'high',
    });
    expect(create.statusCode).toBe(201);
    const id = create.body.id;

    const complete = await request(app).patch(`/tasks/${id}/complete`);
    expect(complete.statusCode).toBe(200);
    expect(complete.body.priority).toBe('high');
  });

  test('completing a low priority task should keep priority as low', async () => {
    const create = await request(app).post('/tasks').send({
      title: 'Low priority task',
      priority: 'low',
    });
    const id = create.body.id;

    const complete = await request(app).patch(`/tasks/${id}/complete`);
    expect(complete.body.priority).toBe('low');
  });
});

// ─────────────────────────────────────────────
// BUG 10: PUT Allows Overwriting Protected Fields
// ─────────────────────────────────────────────
describe('Bug 10 — PUT cannot overwrite id or createdAt', () => {
  test('should not allow overwriting id via PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Original task' });
    const id = create.body.id;
    const originalCreatedAt = create.body.createdAt;

    const update = await request(app).put(`/tasks/${id}`).send({
      title: 'Updated task',
      id: 'fake-id-12345',
    });

    expect(update.body.id).toBe(id);
    expect(update.body.id).not.toBe('fake-id-12345');
  });

  test('should not allow overwriting createdAt via PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Original task' });
    const id = create.body.id;
    const originalCreatedAt = create.body.createdAt;

    const update = await request(app).put(`/tasks/${id}`).send({
      title: 'Updated task',
      createdAt: '2000-01-01T00:00:00.000Z',
    });

    expect(update.body.createdAt).toBe(originalCreatedAt);
  });
});

// ─────────────────────────────────────────────
// BUG 11: No Validation on page and limit Params
// ─────────────────────────────────────────────
describe('Bug 11 — page and limit query params are validated', () => {
  test('should reject negative page number', async () => {
    const res = await request(app).get('/tasks?page=-1&limit=5');
    expect(res.statusCode).toBe(400);
  });

  test('should reject page=0', async () => {
    const res = await request(app).get('/tasks?page=0&limit=5');
    expect(res.statusCode).toBe(400);
  });

  test('should reject absurdly large limit', async () => {
    const res = await request(app).get('/tasks?page=1&limit=99999');
    expect(res.statusCode).toBe(400);
  });

  test('should reject non-numeric page', async () => {
    const res = await request(app).get('/tasks?page=abc&limit=5');
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// BUG 12: PUT Sets status=done Without completedAt
// ─────────────────────────────────────────────
describe('Bug 12 — PUT with status=done sets completedAt automatically', () => {
  test('should set completedAt when status is set to done via PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    const id = create.body.id;

    const update = await request(app).put(`/tasks/${id}`).send({
      status: 'done',
    });

    expect(update.statusCode).toBe(200);
    expect(update.body.status).toBe('done');
    expect(update.body.completedAt).not.toBeNull();
    expect(update.body.completedAt).toBeDefined();
  });

  test('completedAt should be a valid ISO date string', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    const id = create.body.id;

    const update = await request(app).put(`/tasks/${id}`).send({ status: 'done' });

    const parsed = new Date(update.body.completedAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});