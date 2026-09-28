# Day 1 — Read & Test: Deliverable

Test suite for the Task Manager API, written against commit `2b32db7`. **No source
files were modified** — this document is a snapshot of the current, unfixed code.

**Contents**

- [How to run](#how-to-run)
- [Coverage output](#coverage-output)
- [Test suite summary](#test-suite-summary)
- [Bugs found (7)](#bugs-found)
- [Test files](#test-files)

---

## How to run

```bash
cd task-api
npm install
npm test          # run the suite
npm run coverage  # run the suite + coverage report
```

## Coverage output

Pasted verbatim from `npm run coverage`. Target was 80%; both statement and branch
coverage clear it comfortably.

```
Test Suites: 2 failed, 1 passed, 3 total
Tests:       15 failed, 57 passed, 72 total
Time:        22.379 s

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.5 |    97.33 |   96.15 |   98.36 |
 src             |    84.61 |       75 |      50 |   84.61 |
  app.js         |    84.61 |       75 |      50 |   84.61 | 17-18
 src/routes      |      100 |      100 |     100 |     100 |
  tasks.js       |      100 |      100 |     100 |     100 |
 src/services    |      100 |    94.11 |     100 |     100 |
  taskService.js |      100 |    94.11 |     100 |     100 | 22
 src/utils       |      100 |      100 |     100 |     100 |
  validators.js  |      100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
```

**Why the 2 lines are uncovered (and why that's fine)**

- `src/app.js:17-18` — the `app.listen(...)` block. It only executes when the module
  is run directly as a process. Supertest drives the exported app without binding a
  port, so this is never hit. Covered separately by the manual live-server checks.
- `src/services/taskService.js:22` — a defensive branch in the `dueDate` default path.

## Test suite summary

| Suite | Tests | Passing | Failing |
|---|---|---|---|
| `tests/validators.test.js` | 18 | 18 | 0 |
| `tests/taskService.test.js` | 24 | 18 | 6 |
| `tests/tasks.routes.test.js` | 30 | 21 | 9 |
| **Total** | **72** | **57** | **15** |

### Why 15 tests fail

The failures are **deliberate**. Every one of them asserts what the API *should* do,
not what it currently does. Each goes green the moment its bug is fixed — so the
suite is a working spec for Day 2, not a snapshot of broken behaviour.

`Test Suites: 2 failed, 1 passed` is the expected Day 1 state. A reviewer running
`npm test` before any fixes should expect these 15 failures; after the Day 2 fix,
the count should drop.

---

## Bugs found

All 7 were confirmed by driving a **live server** (ports 3311–3313) and observing
raw responses — not by reading source alone.

| # | Severity | Summary |
|---|---|---|
| 1 | Critical | Pagination is off by one page |
| 2 | High | Malformed JSON returns 500 instead of 400 |
| 3 | High | `?status=` filter substring-matches instead of equality |
| 4 | Medium | Completing a task silently resets `priority` to `medium` |
| 5 | Medium | `PUT` can overwrite a task's server-assigned `id` |
| 6 | Medium | `completedAt` not stamped when status becomes `done` |
| 7 | Low | `GET /tasks/:id` (single fetch) does not exist |

### Bug 1 — Pagination is off by one page (Critical)

- **Expected:** `?page=1&limit=2` returns the first 2 tasks; `page=2` returns the next 2.
- **Actual:** With 4 tasks, `page=1&limit=2` returns **Task 3, Task 4**; `page=2&limit=2` returns **nothing**.
- **How discovered:** Live probe of `GET /tasks?page=N`. Regression tests at
  `tests/taskService.test.js:90` / `:97` and `tests/tasks.routes.test.js:48` / `:55`.
- **Root cause:** `src/services/taskService.js:12` computes `const offset = page * limit;`
  but the route parses `page` as 1-based (`src/routes/tasks.js:20`).
- **Fix:** `const offset = (page - 1) * limit;` plus a guard clamping `page` to `>= 1`.

### Bug 2 — Malformed JSON returns 500 instead of 400 (High)

- **Expected:** A malformed request body is a client error → `400`.
- **Actual:** `POST /tasks` with body `{"title":` returns **HTTP 500** and logs a `SyntaxError` stack.
- **How discovered:** Live probe; also present in the pre-existing `task-api/server.err`
  from an earlier manual session. Regression test at `tests/tasks.routes.test.js:122`.
- **Root cause:** `src/app.js:9` — the error handler ignores `err.status` /
  `err.type === 'entity.parse.failed'` and unconditionally returns 500.
- **Fix:** Return `res.status(400).json({ error: 'Invalid JSON body' })` for parse
  failures, keeping 500 for genuine server faults.

### Bug 3 — `?status=` filter substring-matches (High)

- **Expected:** `?status=todo` returns only tasks whose status is exactly `todo`.
- **Actual:** With tasks `todo`, `done`, `in_progress`, `?status=o` returns **all three**.
- **How discovered:** Live probe of `GET /tasks?status=o`. Regression tests at
  `tests/taskService.test.js:80` and `tests/tasks.routes.test.js:39`.
- **Root cause:** `src/services/taskService.js:9` uses `t.status.includes(status)`.
- **Fix:** Use `t.status === status`, and reject an unknown status with a `400`.

### Bug 4 — Completing a task resets `priority` to `medium` (Medium)

- **Expected:** Completing a task sets `status` and `completedAt`; it must not touch `priority`.
- **Actual:** A task created with `priority: 'high'` comes back as `priority: 'medium'` after completing.
- **How discovered:** Live probe, diffing the same task before/after. Regression tests at
  `tests/taskService.test.js:186` and `tests/tasks.routes.test.js:198`.
- **Root cause:** `src/services/taskService.js:70` — a stray `priority: 'medium'` in the
  completion update object.
- **Fix:** Remove `priority` from the update passed to `completeTask`.

### Bug 5 — `PUT` can overwrite a task's `id` (Medium, data integrity)

- **Expected:** `id` is server-assigned and immutable.
- **Actual:** `PUT /tasks/:id` with `{ "id": "HACKED" }` mutates the task's id. After that
  the task is **unreachable via its original id** — original-id `PUT` returns 404.
- **How discovered:** Live probe: create → `PUT` with an `id` field → `GET` showed the
  corrupted id and original-id operations 404'd. Regression tests at
  `tests/taskService.test.js:145` and `tests/tasks.routes.test.js:152`.
- **Root cause:** `src/services/taskService.js:50` — `update` spreads every caller-supplied
  field onto the task, including `id` and `createdAt`.
- **Fix:** Strip `id` (and `createdAt`) from the update payload, or whitelist editable fields.

### Bug 6 — `completedAt` not stamped when status becomes `done` (Medium)

- **Expected:** Any transition to `done` stamps `completedAt`.
- **Actual:** `PUT { "status": "done" }` returns `status: "done", completedAt: null`. A task
  created directly with `status: "done"` also has `completedAt: null`.
- **How discovered:** Live probe of `PUT` and `POST`. Regression tests at
  `tests/taskService.test.js:153` and `tests/tasks.routes.test.js:162`.
- **Root cause:** `completedAt` is only set inside `completeTask`, never in the shared
  `update` path (`src/services/taskService.js:50`).
- **Fix:** Derive `completedAt` in `update`/`create` whenever the resulting status is
  `done`; clear it when moving off `done`.

### Bug 7 — `GET /tasks/:id` does not exist (Low, spec gap)

- **Expected:** A single-task fetch.
- **Actual:** `GET /tasks/<valid-id>` returns **404**.
- **How discovered:** Live probe. Regression test at `tests/tasks.routes.test.js:222`.
- **Root cause:** Missing route in `src/routes/tasks.js`.
- **Fix:** Add `router.get('/:id', ...)` returning the task, or 404.

### Raw evidence

Captured from a live server on port 3311 with 4 seeded tasks (`Task 1`–`Task 4`):

```
total tasks: 4
page=1&limit=2 -> Task 3, Task 4     <-- BUG 1: should be Task 1, Task 2
page=2&limit=2 ->                     <-- BUG 1: should be Task 3, Task 4
status=o       -> alpha, beta, gamma <-- BUG 3: partial "o" matched all 3
before complete: priority=high
after  complete: priority=medium     <-- BUG 4
bad json POST:   HTTP 500            <-- BUG 2
```

```
PUT with body id -> returned id: HACKED-ID        <-- BUG 5
PUT status=done -> status:"done", completedAt:null  <-- BUG 6
GET /tasks/<id> -> 404                              <-- BUG 7
```

### Checked and found NOT broken

Recorded so these are not "fixed" by mistake:

- **`dueDate: null` clears a date.** `validators.js:30` guards with `if (body.dueDate && ...)`,
  so `null` is falsy and passes validation, and the value is persisted. Intentional, not a
  truthiness bug. Covered by `tests/validators.test.js:48` and `:82`.
- **`getStats().overdue` correctly excludes done tasks**, even for past-due completed work.
  Covered by `tests/taskService.test.js:123`.
- **`/stats` is not shadowed by `/:id`** — declared before the `/:id` routes at
  `src/routes/tasks.js:6`, so it resolves correctly. Confirmed live.
- **`validateUpdateTask` treats `title: ''` as invalid** — `validators.js:21` checks
  `body.title !== undefined` first, so an explicit empty string is rejected rather than
  silently ignored. Correct.

---

## Test files

The three files below are the complete suite, reproduced verbatim.

### `tests/taskService.test.js` — unit tests (24 tests)

```js
const taskService = require('../src/services/taskService');

const PAST = '2020-01-01T00:00:00.000Z';
const FUTURE = '2099-01-01T00:00:00.000Z';

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('applies defaults for omitted fields', () => {
      const task = taskService.create({ title: 'Only title' });
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.title).toBe('Only title');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toEqual(expect.any(String));
    });

    test('stores provided fields', () => {
      const task = taskService.create({
        title: 'Full',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: FUTURE,
      });
      expect(task.title).toBe('Full');
      expect(task.description).toBe('desc');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(FUTURE);
    });

    test('assigns unique ids', () => {
      const a = taskService.create({ title: 'a' });
      const b = taskService.create({ title: 'b' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getAll', () => {
    test('returns empty array when no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      taskService.create({ title: 'a' });
      taskService.create({ title: 'b' });
      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    test('returns the task when found', () => {
      const t = taskService.create({ title: 'a' });
      expect(taskService.findById(t.id)).toEqual(t);
    });

    test('returns undefined when not found', () => {
      expect(taskService.findById('nope')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns only tasks with the exact status', () => {
      taskService.create({ title: 'todo', status: 'todo' });
      taskService.create({ title: 'done', status: 'done' });
      const result = taskService.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('todo');
    });

    // BUG 3: getByStatus uses `status.includes(query)` (substring match).
    // A query that is a substring of several statuses wrongly matches them.
    test('does not substring-match partial status values', () => {
      taskService.create({ title: 'todo', status: 'todo' });
      taskService.create({ title: 'prog', status: 'in_progress' });
      // 'o' is a substring of both 'todo' and 'in_progress'.
      // Correct behaviour: no task has status exactly 'o' -> [].
      expect(taskService.getByStatus('o')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('page 1 returns the first items', () => {
      // BUG 1: offset = page * limit (should be (page - 1) * limit).
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      const page1 = taskService.getPaginated(1, 2);
      expect(page1.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('page 2 returns the next items', () => {
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      const page2 = taskService.getPaginated(2, 2);
      expect(page2.map((t) => t.title)).toEqual(['Task 3', 'Task 4']);
    });

    test('returns empty when page is beyond range', () => {
      taskService.create({ title: 'a' });
      taskService.create({ title: 'b' });
      expect(taskService.getPaginated(2, 10)).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('returns zero counts when empty', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('counts tasks by status', () => {
      taskService.create({ title: 'a', status: 'todo' });
      taskService.create({ title: 'b', status: 'todo' });
      taskService.create({ title: 'c', status: 'in_progress' });
      taskService.create({ title: 'd', status: 'done' });
      expect(taskService.getStats()).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
    });

    test('counts overdue tasks (past due, not done)', () => {
      taskService.create({ title: 'overdue', status: 'todo', dueDate: PAST });
      taskService.create({ title: 'future', status: 'todo', dueDate: FUTURE });
      taskService.create({ title: 'done-overdue', status: 'done', dueDate: PAST });
      expect(taskService.getStats().overdue).toBe(1);
    });
  });

  describe('update', () => {
    test('updates provided fields and returns the task', () => {
      const t = taskService.create({ title: 'a' });
      const updated = taskService.update(t.id, { title: 'b', priority: 'high' });
      expect(updated.title).toBe('b');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(t.id).title).toBe('b');
    });

    test('returns null when task not found', () => {
      expect(taskService.update('nope', { title: 'x' })).toBeNull();
    });

    // BUG 5: update spreads the whole body, so a client can overwrite `id`.
    test('does not allow overwriting the task id', () => {
      const t = taskService.create({ title: 'a' });
      const updated = taskService.update(t.id, { id: 'HACKED', title: 'b' });
      expect(updated.id).toBe(t.id);
      expect(taskService.findById(t.id)).toBeDefined();
    });

    // BUG 6: updating status to 'done' does not stamp completedAt.
    test('stamps completedAt when status becomes done', () => {
      const t = taskService.create({ title: 'a', status: 'todo' });
      const updated = taskService.update(t.id, { status: 'done' });
      expect(updated.status).toBe('done');
      expect(updated.completedAt).toEqual(expect.any(String));
    });
  });

  describe('remove', () => {
    test('removes the task and returns true', () => {
      const t = taskService.create({ title: 'a' });
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.findById(t.id)).toBeUndefined();
    });

    test('returns false when task not found', () => {
      expect(taskService.remove('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks the task done and stamps completedAt', () => {
      const t = taskService.create({ title: 'a' });
      const done = taskService.completeTask(t.id);
      expect(done.status).toBe('done');
      expect(done.completedAt).toEqual(expect.any(String));
    });

    test('returns null when task not found', () => {
      expect(taskService.completeTask('nope')).toBeNull();
    });

    // BUG 4: completeTask hardcodes priority to 'medium', clobbering the real value.
    test('preserves the task priority when completing', () => {
      const t = taskService.create({ title: 'a', priority: 'high' });
      const done = taskService.completeTask(t.id);
      expect(done.priority).toBe('high');
    });
  });
});```

### `tests/tasks.routes.test.js` — integration tests, Supertest (30 tests)

```js
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

const PAST = '2020-01-01T00:00:00.000Z';

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  const createTask = (body) =>
    request(app).post('/tasks').send(body).expect(201).then((r) => r.body);

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      await createTask({ title: 'a' });
      await createTask({ title: 'b' });
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toHaveLength(2);
    });

    test('returns empty array when no tasks', async () => {
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('filters by exact status', async () => {
      await createTask({ title: 'todo', status: 'todo' });
      await createTask({ title: 'done', status: 'done' });
      const res = await request(app).get('/tasks?status=todo').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('todo');
    });

    // BUG 3: substring matching leaks tasks whose status merely contains the query.
    test('does not substring-match partial status values', async () => {
      await createTask({ title: 'todo', status: 'todo' });
      await createTask({ title: 'prog', status: 'in_progress' });
      const res = await request(app).get('/tasks?status=o').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=&limit=', () => {
    test('page 1 returns the first items', async () => {
      // BUG 1: off-by-one pagination.
      for (let i = 1; i <= 4; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=1&limit=2').expect(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('page 2 returns the next items', async () => {
      for (let i = 1; i <= 4; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=2&limit=2').expect(200);
      expect(res.body.map((t) => t.title)).toEqual(['Task 3', 'Task 4']);
    });

    test('falls back to the first page and a default limit of 10', async () => {
      for (let i = 1; i <= 3; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=notanumber').expect(200);
      expect(res.body).toHaveLength(3);
    });

    test('returns an empty array for a page past the end', async () => {
      await createTask({ title: 'only one' });
      const res = await request(app).get('/tasks?page=99&limit=10').expect(200);
      expect(res.body).toEqual([]);
    });

    test('never returns more than the requested limit', async () => {
      for (let i = 1; i <= 12; i++) await createTask({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=1&limit=5').expect(200);
      expect(res.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with defaults', async () => {
      const res = await request(app).post('/tasks').send({ title: 'New' }).expect(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.title).toBe('New');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
    });

    test('rejects a missing title', async () => {
      const res = await request(app).post('/tasks').send({}).expect(400);
      expect(res.body.error).toMatch(/title/);
    });

    test('rejects an empty title', async () => {
      await request(app).post('/tasks').send({ title: '   ' }).expect(400);
    });

    test('rejects an invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'x', status: 'bogus' })
        .expect(400);
      expect(res.body.error).toMatch(/status/);
    });

    test('rejects an invalid priority', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'x', priority: 'urgent' })
        .expect(400);
    });

    test('rejects an invalid dueDate', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'x', dueDate: 'not-a-date' })
        .expect(400);
    });

    // BUG 2: malformed JSON body should be a 400, not a 500.
    test('returns 400 for a malformed JSON body', async () => {
      await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":')
        .expect(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates a task', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ title: 'b', priority: 'high' })
        .expect(200);
      expect(res.body.title).toBe('b');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).put('/tasks/nope').send({ title: 'x' }).expect(404);
    });

    test('rejects an empty title', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).put(`/tasks/${t.id}`).send({ title: '' }).expect(400);
    });

    // BUG 5: a client can overwrite the task id via PUT.
    test('does not allow overwriting the task id', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ id: 'HACKED', title: 'b' })
        .expect(200);
      expect(res.body.id).toBe(t.id);
    });

    // BUG 6: setting status to done via PUT does not stamp completedAt.
    test('stamps completedAt when status becomes done', async () => {
      const t = await createTask({ title: 'a', status: 'todo' });
      const res = await request(app)
        .put(`/tasks/${t.id}`)
        .send({ status: 'done' })
        .expect(200);
      expect(res.body.completedAt).toEqual(expect.any(String));
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes a task', async () => {
      const t = await createTask({ title: 'a' });
      await request(app).delete(`/tasks/${t.id}`).expect(204);
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toHaveLength(0);
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).delete('/tasks/nope').expect(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task complete', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app).patch(`/tasks/${t.id}/complete`).expect(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toEqual(expect.any(String));
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).patch('/tasks/nope/complete').expect(404);
    });

    // BUG 4: completing clobbers the priority back to 'medium'.
    test('preserves the task priority when completing', async () => {
      const t = await createTask({ title: 'a', priority: 'high' });
      const res = await request(app).patch(`/tasks/${t.id}/complete`).expect(200);
      expect(res.body.priority).toBe('high');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue', async () => {
      await createTask({ title: 'a', status: 'todo' });
      await createTask({ title: 'b', status: 'todo', dueDate: PAST });
      await createTask({ title: 'c', status: 'done' });
      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body).toEqual({ todo: 2, in_progress: 0, done: 1, overdue: 1 });
    });

    test('returns zeros when empty', async () => {
      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('GET /tasks/:id', () => {
    // BUG 7: there is no single-task fetch endpoint.
    test('returns a single task by id', async () => {
      const t = await createTask({ title: 'a' });
      const res = await request(app).get(`/tasks/${t.id}`).expect(200);
      expect(res.body.id).toBe(t.id);
    });

    test('returns 404 for an unknown id', async () => {
      await request(app).get('/tasks/nope').expect(404);
    });
  });
});```

### `tests/validators.test.js` — unit tests (18 tests)

```js
const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts a valid minimal body', () => {
    expect(validateCreateTask({ title: 'x' })).toBeNull();
  });

  test('accepts a fully specified valid body', () => {
    expect(
      validateCreateTask({
        title: 'x',
        description: 'd',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2099-01-01T00:00:00.000Z',
      })
    ).toBeNull();
  });

  test('rejects a missing title', () => {
    expect(validateCreateTask({})).toMatch(/title/);
  });

  test('rejects an empty title', () => {
    expect(validateCreateTask({ title: '' })).toMatch(/title/);
  });

  test('rejects a whitespace-only title', () => {
    expect(validateCreateTask({ title: '   ' })).toMatch(/title/);
  });

  test('rejects a non-string title', () => {
    expect(validateCreateTask({ title: 123 })).toMatch(/title/);
  });

  test('rejects an invalid status', () => {
    expect(validateCreateTask({ title: 'x', status: 'bogus' })).toMatch(/status/);
  });

  test('rejects an invalid priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/);
  });

  test('rejects an invalid dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });

  test('allows a null dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: null })).toBeNull();
  });
});

describe('validateUpdateTask', () => {
  test('accepts an empty body (all fields optional)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  test('accepts a valid title', () => {
    expect(validateUpdateTask({ title: 'x' })).toBeNull();
  });

  test('rejects an empty title', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/);
  });

  test('rejects a non-string title', () => {
    expect(validateUpdateTask({ title: 123 })).toMatch(/title/);
  });

  test('rejects an invalid status', () => {
    expect(validateUpdateTask({ status: 'bogus' })).toMatch(/status/);
  });

  test('rejects an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'urgent' })).toMatch(/priority/);
  });

  test('rejects an invalid dueDate', () => {
    expect(validateUpdateTask({ dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });

  test('allows a null dueDate (clears the date)', () => {
    expect(validateUpdateTask({ dueDate: null })).toBeNull();
  });
});```

---

## What's next

Full details for each of the 7 bugs — expected vs actual, discovery method, and a
proposed fix — are in the [Bugs found](#bugs-found) section above.
