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

// ─────────────────────────────────────────────
// COVERAGE: GET /stats
// ─────────────────────────────────────────────
describe('Coverage — GET /tasks/stats', () => {
  test('should return counts of todo, in_progress, done and overdue', async () => {
    await request(app).post('/tasks').send({ title: 'Task 1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Task 2', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'Task 3', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('todo');
    expect(res.body).toHaveProperty('in_progress');
    expect(res.body).toHaveProperty('done');
    expect(res.body).toHaveProperty('overdue');
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('should count overdue tasks correctly', async () => {
    // Manually inject an overdue task by bypassing validator
    taskService.create({
      title: 'Overdue task',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: DELETE /tasks/:id
// ─────────────────────────────────────────────
describe('Coverage — DELETE /tasks/:id', () => {
  test('should delete an existing task and return 204', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Task to delete' });
    const id = create.body.id;

    const res = await request(app).delete(`/tasks/${id}`);
    expect(res.statusCode).toBe(204);
  });

  test('should return 404 when deleting a non-existent task', async () => {
    const res = await request(app).delete('/tasks/non-existent-id');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});

// ─────────────────────────────────────────────
// COVERAGE: PATCH /tasks/:id/complete — 404 case
// ─────────────────────────────────────────────
describe('Coverage — PATCH /tasks/:id/complete 404', () => {
  test('should return 404 when completing a non-existent task', async () => {
    const res = await request(app).patch('/tasks/non-existent-id/complete');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});

// ─────────────────────────────────────────────
// COVERAGE: Invalid limit values (Bug 11 branches)
// ─────────────────────────────────────────────
describe('Coverage — invalid limit values', () => {
  test('should reject limit=0', async () => {
    const res = await request(app).get('/tasks?page=1&limit=0');
    expect(res.statusCode).toBe(400);
  });

  test('should reject limit=-5', async () => {
    const res = await request(app).get('/tasks?page=1&limit=-5');
    expect(res.statusCode).toBe(400);
  });

  test('should reject non-numeric limit', async () => {
    const res = await request(app).get('/tasks?page=1&limit=abc');
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: Pagination empty page
// ─────────────────────────────────────────────
describe('Coverage — pagination edge cases', () => {
  test('should return empty array for page beyond available results', async () => {
    await request(app).post('/tasks').send({ title: 'Only task' });

    const res = await request(app).get('/tasks?page=99&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: validateUpdateTask dueDate branches
// ─────────────────────────────────────────────
describe('Coverage — PUT dueDate validation', () => {
  test('should reject past dueDate in PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    const id = create.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject far future dueDate in PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    const id = create.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({
      dueDate: '2091-01-01T00:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject string "null" as dueDate in PUT', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    const id = create.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({
      dueDate: 'null',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should return 404 for PUT on non-existent task', async () => {
    const res = await request(app).put('/tasks/non-existent-id').send({
      title: 'Updated title',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: 500 error handler
// ─────────────────────────────────────────────
describe('Coverage — 500 error handler', () => {
  test('should return 500 when an unexpected error occurs', async () => {
    // Temporarily break getAll to throw
    jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ─────────────────────────────────────────────
// COVERAGE: Invalid limit values
// ─────────────────────────────────────────────
describe('Bug 11 — limit query param validation', () => {
  test('should reject limit=0', async () => {
    const res = await request(app).get('/tasks?page=1&limit=0');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should reject limit=-5 (negative limit)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=-5');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should reject limit=abc (non-numeric limit)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=abc');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should reject limit=99999 (absurdly large)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=99999');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should accept valid limit=10', async () => {
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.statusCode).toBe(200);
  });

  test('should accept limit=1 (minimum valid)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=1');
    expect(res.statusCode).toBe(200);
  });

  test('should accept limit=100 (maximum valid)', async () => {
    const res = await request(app).get('/tasks?page=1&limit=100');
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: app.js lines 17-18
// ─────────────────────────────────────────────
describe('Coverage — app.js startup block', () => {
  test('app module exports a valid express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function'); // express app is a function
    expect(typeof app.listen).toBe('function');
  });
});

// ─────────────────────────────────────────────
// COVERAGE: tasks.js line 27 — limit fallback
// ─────────────────────────────────────────────
describe('Coverage — limit provided without page', () => {
  test('should use default page=1 when only limit is provided', async () => {
    await request(app).post('/tasks').send({ title: 'Task A' });
    await request(app).post('/tasks').send({ title: 'Task B' });

    const res = await request(app).get('/tasks?limit=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('should use default limit=10 when only page is provided', async () => {
    const res = await request(app).get('/tasks?page=1');
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────
// COVERAGE: taskService.js line 22 — findById
// ─────────────────────────────────────────────
describe('Coverage — findById via completeTask', () => {
  test('completeTask should return null for non-existent id', () => {
    const result = taskService.completeTask('non-existent-id');
    expect(result).toBeNull();
  });

  test('findById should return undefined for non-existent id', () => {
    const result = taskService.findById('non-existent-id');
    expect(result).toBeUndefined();
  });

  test('findById should return the correct task', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Find me' });
    const id = create.body.id;

    const result = taskService.findById(id);
    expect(result).toBeDefined();
    expect(result.id).toBe(id);
    expect(result.title).toBe('Find me');
  });
});

// ─────────────────────────────────────────────
// COVERAGE: validators.js lines 15, 22, 25, 28
// — these branches via PUT (validateUpdateTask)
// ─────────────────────────────────────────────
describe('Coverage — validateUpdateTask dueDate all branches', () => {
  let taskId;

  beforeEach(async () => {
    const create = await request(app).post('/tasks').send({ title: 'Test task' });
    taskId = create.body.id;
  });

  // Line 15 — string "null" check in validateUpdateTask
  test('PUT should reject dueDate string "null"', async () => {
    const res = await request(app).put(`/tasks/${taskId}`).send({
      dueDate: 'null',
    });
    expect(res.statusCode).toBe(400);
  });

  // Line 25 — past date check in validateUpdateTask
  test('PUT should reject past dueDate', async () => {
    const res = await request(app).put(`/tasks/${taskId}`).send({
      dueDate: '2020-06-15T10:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  // Line 28 — far future check in validateUpdateTask
  test('PUT should reject far future dueDate', async () => {
    const res = await request(app).put(`/tasks/${taskId}`).send({
      dueDate: '2091-01-01T00:00:00.000Z',
    });
    expect(res.statusCode).toBe(400);
  });

  // Line 22 — wrong format (fails regex, not isNaN) in validateUpdateTask
  test('PUT should reject wrongly formatted dueDate', async () => {
    const res = await request(app).put(`/tasks/${taskId}`).send({
      dueDate: '01-01-2026',
    });
    expect(res.statusCode).toBe(400);
  });

  // Happy path — valid dueDate in PUT
  test('PUT should accept valid future dueDate', async () => {
    const res = await request(app).put(`/tasks/${taskId}`).send({
      dueDate: '2026-12-01T10:00:00.000Z',
    });
    expect(res.statusCode).toBe(200);
  });
});