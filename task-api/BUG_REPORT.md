# Bug Report — Task Manager API

> Discovered through TDD: unit tests on `taskService.js` and integration tests on the API routes via supertest.
> All bugs below were confirmed as failing tests before any fix was applied.

---

## BUG-1 — `getPaginated`: Off-by-one in page offset formula

**File:** `src/services/taskService.js` line 12 *(original)*

### Expected behaviour
`getPaginated(1, 10)` should return the **first** 10 items (array indices 0–9).
`getPaginated(2, 10)` should return the **second** 10 items (indices 10–19), and so on.

### What actually happened
The offset was computed as `page * limit` instead of `(page - 1) * limit`.

| Call | Expected offset | Actual offset | Effect |
|---|---|---|---|
| `getPaginated(1, 3)` | 0 | 3 | **Skips the entire first page** |
| `getPaginated(2, 3)` | 3 | 6 | Returns items 7–9 instead of 4–6 |
| `getPaginated(1, 100)` | 0 | 100 | Returns `[]` for any store smaller than 100 items |

### How discovered
Unit test: `⚠️ FM-1 – page 1 returns the FIRST page of results` in `tests/taskService.test.js`.
Seeded 5 tasks, called `getPaginated(1, 3)`, expected `["Task 1","Task 2","Task 3"]`, received `["Task 4","Task 5"]`.

### Fix
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

**Status: ✅ Fixed** (commit `4c57c8f`)

---

## BUG-2 — `getByStatus`: Substring match instead of strict equality

**File:** `src/services/taskService.js` line 9 *(original)*

### Expected behaviour
`getByStatus("in")` should return **0 tasks** — `"in"` is not a valid status.
`getByStatus("todo")` should return only tasks whose `status === "todo"`.

### What actually happened
The implementation used `t.status.includes(status)`, which checks whether the status
string **contains** the query as a substring. Because `"in_progress".includes("in")` is
`true`, querying `status="in"` returned all in-progress tasks as false positives.

### How discovered
Unit test: `⚠️ FM-2 – querying a substring of a status must NOT match that status`.
Created one `in_progress` task, queried `getByStatus("in")`, expected length 0, received length 1.

### Fix
```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status: ✅ Fixed** (commit `4c57c8f`)

---

## BUG-3 — `completeTask`: Silently resets task priority to `"medium"`

**File:** `src/services/taskService.js` lines 67–71 *(original)*

### Expected behaviour
Marking a task as complete should set `status = "done"` and record `completedAt`.
It should **not** touch any other field — a high-priority task that is completed should
remain high priority.

### What actually happened
The function hard-coded `priority: 'medium'` inside the spread, unconditionally
overwriting whatever priority the task had before completion.

```js
const updated = {
  ...task,
  priority: 'medium',   // ← bug: overwrites high/low priority silently
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### How discovered
Unit test: `⚠️ FM-3 – completing a task must NOT change its priority`.
Created a task with `priority: "high"`, called `completeTask()`, expected `priority: "high"`,
received `priority: "medium"`.

### Fix
```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

**Status: ✅ Fixed** (commit `4c57c8f`)

---

## BUG-4 — `GET /tasks?status=`: No validation of the status query parameter

**File:** `src/routes/tasks.js` lines 14–16 *(original)*

### Expected behaviour
`GET /tasks?status=garbage` should return **400** with a descriptive error message,
because `"garbage"` is not a recognised task status.

### What actually happened
The route passed whatever string appeared in `?status=` directly to `taskService.getByStatus()`
without checking it against the list of valid statuses. The service (now fixed to use `===`)
simply returned an empty array, and the route responded **200 + `[]`** — giving the caller no
indication that they sent an invalid value.

### How discovered
Integration test: `⚠️ FM-A – ?status=<invalid> must return 400, not 200+[]`.
`GET /tasks?status=garbage` → expected 400, received 200.

### Fix
Add a validation guard in the route before calling the service:

```js
if (status) {
  const statusError = validateStatus(status);
  if (statusError) return res.status(400).json({ error: statusError });
}
```

**Status: ✅ Fixed** (commit `d438714`)

---

## BUG-5 — `PUT /tasks/:id`: Caller can overwrite immutable fields (`id`, `createdAt`)

**File:** `src/routes/tasks.js` line 46 *(original)*

### Expected behaviour
`PUT /tasks/:id` is a full-update endpoint. It should allow updating mutable task
properties (title, description, status, priority, dueDate).
It must **never** allow the caller to change a task's `id` or `createdAt` timestamp.

### What actually happened
The route passed `req.body` directly to `taskService.update()`, which spreads the entire
object onto the stored task without exclusions:

```js
const updated = { ...tasks[index], ...fields };  // fields = req.body verbatim
```

Sending `{ "id": "hacked-id", "title": "x" }` in the body permanently changed
the task's `id` to `"hacked-id"`, making it unreachable via its original id.
Any subsequent call referencing the original id would receive a 404.

### How discovered
Integration test: `⚠️ FM-B – PUT must not allow overwriting immutable field "id"`.
Created a task, sent `PUT` with `{ id: "hacked-id", title: "Modified" }`,
received the response with `id: "hacked-id"` instead of the original UUID.
Confirmed the task was then unfindable under its original id.

### Fix
Strip immutable fields from the request body before passing it to the service:

```js
const IMMUTABLE_FIELDS = ['id', 'createdAt'];
const safeFields = { ...req.body };
IMMUTABLE_FIELDS.forEach((field) => delete safeFields[field]);
const task = taskService.update(req.params.id, safeFields);
```

**Status: ✅ Fixed** (commit `d438714`)

---

## BUG-6 — `GET /tasks`: Pagination silently ignored when `?status=` is also present

**File:** `src/routes/tasks.js` lines 14–24 *(original)*

### Expected behaviour
`GET /tasks?status=todo&page=1&limit=2` should return the **first 2** todo tasks —
applying both filters simultaneously.

### What actually happened
The route checked for `status` first and returned early before evaluating the
`page`/`limit` parameters:

```js
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks);   // ← returns ALL matching tasks, ignoring pagination
}
```

So `GET /tasks?status=todo&page=1&limit=2` with 20 todo tasks returned all 20,
not 2.

### How discovered
Integration test: `⚠️ FM-C – ?status= and ?page= together must apply both filters`.
Created 4 todo tasks + 1 done task, sent `GET /tasks?status=todo&page=1&limit=2`,
expected length 2, received length 4.

### Fix
Add a combined branch that filters by status then paginates the result:

```js
if (status && (page !== undefined || limit !== undefined)) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const filtered = taskService.getByStatus(status);
  const offset = (pageNum - 1) * limitNum;
  return res.json(filtered.slice(offset, offset + limitNum));
}
```

**Status: ✅ Fixed** (commit `d438714`)

---

## BUG-7 — `validators.js`: Empty-string `status`/`priority` bypasses validation (unfixed)

**File:** `src/utils/validators.js` lines 13, 16, 29, 32 *(current)*

### Expected behaviour
Sending `{ "title": "X", "status": "" }` to `POST /tasks` should return **400** —
an empty string is not a valid status.

### What actually happened
Both `validateCreateTask` and `validateUpdateTask` guard their status and priority
checks with a **truthiness check** (`body.status &&`). An empty string `""` is
**falsy in JavaScript**, so the check is skipped entirely:

```js
if (body.status && !VALID_STATUSES.includes(body.status)) { // "" is falsy → skipped
  return `status must be one of: ...`;
}
```

The empty string then flows into the service, which stores `status: ""` on the task.
That task will never be returned by `getByStatus("todo")` (or any other valid status),
effectively making it invisible to the API's own filtering. It will also corrupt
`getStats()` because `counts[""]` is `undefined` and the task is not counted anywhere.

The same flaw applies to `priority: ""`.

### How discovered
Code review of `validators.js` after the TDD test run.
The bug is not caught by the existing test suite — it requires a dedicated test with
an explicit empty-string value.

### Fix
Replace the falsy guard with an explicit `undefined`-check (matching how `title`
is already handled in `validateUpdateTask`):

```diff
- if (body.status && !VALID_STATUSES.includes(body.status)) {
+ if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
- if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
+ if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
```
Apply to both `validateCreateTask` and `validateUpdateTask`.

**Status: ✅ Fixed** (Part B — commit `bug-7-fix`)

---

## Summary table

| ID | Location | Severity | Status |
|---|---|---|---|
| BUG-1 | `taskService.getPaginated` | High — wrong data returned for page > 0 | ✅ Fixed |
| BUG-2 | `taskService.getByStatus` | High — false-positive filter results | ✅ Fixed |
| BUG-3 | `taskService.completeTask` | Medium — data loss (priority silently overwritten) | ✅ Fixed |
| BUG-4 | `GET /tasks?status=` route | Medium — invalid input accepted silently | ✅ Fixed |
| BUG-5 | `PUT /tasks/:id` route | High — immutable identity field is writeable | ✅ Fixed |
| BUG-6 | `GET /tasks` route | Medium — query params mutually exclusive when they should compose | ✅ Fixed |
| BUG-7 | `validateCreateTask` / `validateUpdateTask` | Medium — empty string bypasses enum validation, corrupts store | ✅ Fixed (Part B) |
