'use strict';

/**
 * Integration tests for API routes (src/routes/tasks.js)
 *
 * Uses supertest to make real HTTP calls against the Express app.
 * The service's _reset() is called in beforeEach so every test
 * starts with an empty in-memory store.
 *
 * Three deliberate failure-mode tests (marked ⚠️) are written
 * against the CORRECT expected HTTP behaviour. They will fail
 * against the current implementation and drive the route fixes.
 *
 *   FM-A  GET /tasks?status=<invalid>
 *         Route passes any string to getByStatus without validating it
 *         against allowed values → returns 200+[] instead of 400.
 *
 *   FM-B  PUT /tasks/:id with {"id": "hacked", "title": "valid"}
 *         The route spreads the entire body onto the task, so the
 *         caller can overwrite the task's own id.
 *
 *   FM-C  GET /tasks?status=todo&page=1&limit=2
 *         The route short-circuits on `status` and returns ALL
 *         matching tasks, ignoring the pagination params entirely.
 */

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset in-memory store before every test
beforeEach(() => {
  taskService._reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST a task and return the parsed response body.
 * Asserts 201 so any failure surfaces immediately.
 */
const createTask = async (overrides = {}) => {
  const res = await request(app)
    .post('/tasks')
    .send({ title: 'Default task', ...overrides });
  expect(res.status).toBe(201);
  return res.body;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /tasks/stats  (must be tested before generic /:id routes to verify
//                    that Express sees /stats before treating it as an id)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /tasks/stats', () => {
  test('happy path – returns zero counts on empty store', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status correctly', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'todo' });
    await createTask({ title: 'C', status: 'in_progress' });
    await createTask({ title: 'D', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBe(0);
  });

  test('counts overdue tasks correctly', async () => {
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'todo' });
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'in_progress' });
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'done' }); // done – not overdue

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /tasks
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  test('happy path – returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('response includes all required task fields', async () => {
    await createTask({ title: 'Check fields' });
    const res = await request(app).get('/tasks');

    const task = res.body[0];
    expect(task).toMatchObject({
      title: 'Check fields',
      status: 'todo',
      priority: 'medium',
      completedAt: null,
      dueDate: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  // ── status filtering ──────────────────────────────────────────────────────

  test('?status=todo filters to only todo tasks', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('?status=in_progress filters correctly', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });

    const res = await request(app).get('/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  /**
   * ⚠️  FM-A  Failure mode: the route passes any status string directly to
   * getByStatus without validating it.  An invalid status should return 400
   * but currently returns 200 with an empty array.
   */
  test('⚠️ FM-A – ?status=<invalid> must return 400, not 200+[]', async () => {
    const res = await request(app).get('/tasks?status=garbage');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── pagination ────────────────────────────────────────────────────────────

  test('?page=1&limit=2 returns first 2 tasks', async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  test('?page=2&limit=2 returns the second page', async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
  });

  test('boundary – last page with fewer items than limit', async () => {
    for (let i = 1; i <= 5; i++) {
      await createTask({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks?page=3&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task 5');
  });

  test('boundary – page beyond data returns empty array', async () => {
    await createTask();
    const res = await request(app).get('/tasks?page=99&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  /**
   * ⚠️  FM-C  Failure mode: when both ?status= and ?page= are supplied,
   * the route's early return on status ignores pagination entirely.
   * All matching tasks are returned instead of a paginated subset.
   */
  test('⚠️ FM-C – ?status= and ?page= together must apply both filters', async () => {
    for (let i = 1; i <= 4; i++) {
      await createTask({ title: `Todo ${i}`, status: 'todo' });
    }
    await createTask({ title: 'Done task', status: 'done' });

    // 4 todo tasks exist; page=1&limit=2 should return exactly 2 of them
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((t) => t.status === 'todo')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /tasks
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  test('happy path – creates task and returns 201 with body', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.completedAt).toBeNull();
  });

  test('creates task with all optional fields', async () => {
    const due = '2030-06-01T00:00:00.000Z';
    const res = await request(app).post('/tasks').send({
      title: 'Full task',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: due,
    });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('desc');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe(due);
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when title is whitespace-only', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', status: 'not-a-status' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for an invalid priority value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for a malformed dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('boundary – each new task gets a unique id', async () => {
    const a = await createTask({ title: 'A' });
    const b = await createTask({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /tasks/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /tasks/:id', () => {
  test('happy path – updates and returns the modified task', async () => {
    const task = await createTask({ title: 'Before' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'After', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('After');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(task.id); // id preserved
  });

  test('returns 404 for unknown task id', async () => {
    const res = await request(app)
      .put('/tasks/does-not-exist')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for empty title', async () => {
    const task = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid status', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'flying' });
    expect(res.status).toBe(400);
  });

  test('boundary – updating with no fields still returns 200', async () => {
    const task = await createTask({ title: 'Stable' });
    const res = await request(app).put(`/tasks/${task.id}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Stable');
  });

  /**
   * ⚠️  FM-B  Failure mode: the route passes req.body directly to
   * taskService.update(), which spreads it unconditionally onto the task.
   * Sending {"id": "hacked"} in the body overwrites the task's own id,
   * making it permanently unfindable by its original id.
   * The route should strip immutable fields (id, createdAt) before updating.
   */
  test('⚠️ FM-B – PUT must not allow overwriting immutable field "id"', async () => {
    const task = await createTask({ title: 'Original' });
    const originalId = task.id;

    const res = await request(app)
      .put(`/tasks/${originalId}`)
      .send({ id: 'hacked-id', title: 'Modified' });

    // The response should still carry the original id
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(originalId);

    // And the task must still be reachable by the original id
    const allTasks = await request(app).get('/tasks');
    const found = allTasks.body.find((t) => t.id === originalId);
    expect(found).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /tasks/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  test('happy path – returns 204 with no body', async () => {
    const task = await createTask();
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  test('deleted task no longer appears in GET /tasks', async () => {
    const task = await createTask({ title: 'Gone' });
    await request(app).delete(`/tasks/${task.id}`);

    const res = await request(app).get('/tasks');
    expect(res.body.find((t) => t.id === task.id)).toBeUndefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/tasks/ghost-id');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('boundary – deleting the same task twice returns 404 on second attempt', async () => {
    const task = await createTask();
    await request(app).delete(`/tasks/${task.id}`);
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(404);
  });

  test('boundary – deleting one task does not affect others', async () => {
    const keep = await createTask({ title: 'Keep me' });
    const gone = await createTask({ title: 'Delete me' });

    await request(app).delete(`/tasks/${gone.id}`);

    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(keep.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /tasks/:id/complete
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /tasks/:id/complete', () => {
  test('happy path – sets status to done and returns the task', async () => {
    const task = await createTask({ title: 'Finish me' });
    const before = Date.now();

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
    expect(new Date(res.body.completedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  test('returns 404 for unknown task id', async () => {
    const res = await request(app).patch('/tasks/ghost/complete');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('completed task shows as done in GET /tasks', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);

    const res = await request(app).get('/tasks');
    expect(res.body[0].status).toBe('done');
  });

  test('completing a high-priority task preserves its priority', async () => {
    const task = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  test('boundary – completed task is not counted as overdue in stats', async () => {
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z' });
    const tasks = await request(app).get('/tasks');
    await request(app).patch(`/tasks/${tasks.body[0].id}/complete`);

    const stats = await request(app).get('/tasks/stats');
    expect(stats.body.overdue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-7 regression — empty-string enum values must be rejected at HTTP layer
// ─────────────────────────────────────────────────────────────────────────────

describe('BUG-7 regression – empty-string status/priority rejected by API', () => {
  /**
   * The validators use `body.status && ...` which treats "" as falsy and skips
   * the check, allowing an empty string to be stored on the task.
   * After the fix these must all return 400.
   */

  test('POST /tasks with status:"" returns 400', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /tasks with priority:"" returns 400', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad priority', priority: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /tasks/:id with status:"" returns 400', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /tasks/:id with priority:"" returns 400', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ priority: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('no regression – POST with valid status still returns 201', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Fine', status: 'in_progress' });
    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /tasks/:id/assign  (Part C — new feature)
//
// Design decisions:
//   - assignee is required; missing, empty, or non-string → 400
//   - re-assigning (task already has an assignee) is allowed (200, overwrite)
//   - completing a task does not clear its assignee
//   - new tasks initialise with assignee: null in the response body
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /tasks/:id/assign', () => {
  test('happy path – assigns a name and returns 200 with updated task', async () => {
    const task = await createTask({ title: 'Needs owner' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    // All original fields must be preserved
    expect(res.body.id).toBe(task.id);
    expect(res.body.title).toBe('Needs owner');
    expect(res.body.status).toBe('todo');
  });

  test('returns 404 for an unknown task id', async () => {
    const res = await request(app)
      .patch('/tasks/ghost-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  /**
   * ⚠️  FM-1  The body must contain an "assignee" field.
   * Omitting it entirely should return 400, not silently store undefined/null.
   */
  test('⚠️ FM-1 – missing assignee field returns 400', async () => {
    const task = await createTask();

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  /**
   * ⚠️  FM-2  An empty string is not a valid assignee.
   * Should return 400, not store "" on the task.
   */
  test('⚠️ FM-2 – empty string assignee returns 400', async () => {
    const task = await createTask();

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  /**
   * ⚠️  FM-3  assignee must be a string.
   * Sending a number should return 400, not store 42 on the task.
   */
  test('⚠️ FM-3 – non-string assignee (number) returns 400', async () => {
    const task = await createTask();

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 42 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('boundary – whitespace-only assignee returns 400', async () => {
    const task = await createTask();

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('boundary – re-assigning overwrites the previous assignee', async () => {
    const task = await createTask();

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('boundary – newly created task has assignee: null before assignment', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Fresh task' });

    expect(res.status).toBe(201);
    expect(res.body.assignee).toBeNull();
  });

  test('boundary – assigning to a completed task is allowed', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Eve' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Eve');
    expect(res.body.status).toBe('done');
  });

  test('assigned task shows assignee in GET /tasks', async () => {
    const task = await createTask();
    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Frank' });

    const list = await request(app).get('/tasks');
    const found = list.body.find((t) => t.id === task.id);
    expect(found.assignee).toBe('Frank');
  });

  test('stats endpoint still works correctly after assignment', async () => {
    await createTask({ status: 'todo' });
    const tasks = await request(app).get('/tasks');
    await request(app)
      .patch(`/tasks/${tasks.body[0].id}/assign`)
      .send({ assignee: 'Grace' });

    const stats = await request(app).get('/tasks/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.todo).toBe(1);
  });
});
