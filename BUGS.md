# Bug Report: Task Manager API

This document details the bugs identified in the Task Manager API through comprehensive unit and integration testing. Entries are ordered by severity, with the most impactful bugs listed first.

---

## Bug 1: Pagination offset calculation skips page 1 entirely

**Location:** `src/services/taskService.js`, function `getPaginated` (line 12)

**Expected behavior:** In a standard 1-indexed pagination API (where page 1 is default, as handled in routes via `parseInt(page) || 1`), querying `page=1` with `limit=10` must compute an offset of `0` and return the first 10 items (index 0 to 9, e.g. `Task 1` through `Task 10`).

**Actual behavior:** `offset` is computed as `const offset = page * limit;`. For `page=1` and `limit=10`, `offset` evaluates to `10`. As a result, requesting `page=1` skips the first 10 tasks and returns items 11 through 20. Requesting `page=2` returns items 21 through 30. The first `limit` tasks in the store can never be retrieved by standard 1-indexed pagination.

**How discovered:** 
- Unit test: `tests/taskService.test.js` -> `getPaginated() -> returns the first page (items 1 to 10) for page=1 and limit=10`
- Integration test: `tests/tasks.routes.test.js` -> `GET /tasks?page=&limit= -> returns page 1 containing the first 10 items (Task 1 to Task 10)`

**Root cause:** The calculation treats the 1-based `page` parameter as a 0-based page index. It fails to convert the 1-indexed page number into a zero-based slice offset.

**Suggested fix:**
```javascript
const getPaginated = (page, limit) => {
  const pageNum = Math.max(1, page);
  const offset = (pageNum - 1) * limit;
  return tasks.slice(offset, offset + limit);
};
```

**Severity/impact:** **Critical / High**. In production, all API clients requesting the first page of tasks will silently miss the most recent / initial `limit` tasks. If a user has fewer tasks than `limit` (e.g., 5 tasks total), `GET /tasks?page=1&limit=10` returns an empty array `[]`, making it appear that no tasks exist.

---

## Bug 2: `completeTask` silently mutates and resets task `priority` to `'medium'`

**Location:** `src/services/taskService.js`, function `completeTask` (line 69)

**Expected behavior:** Marking a task as complete via `completeTask(id)` (and `PATCH /tasks/:id/complete`) should only change `status` to `'done'` and assign `completedAt`. All other task properties, including `priority`, must remain unchanged.

**Actual behavior:** The function constructs the updated object with a hardcoded `priority: 'medium'`, overwriting existing `'high'` or `'low'` priorities upon task completion.

**How discovered:**
- Unit test: `tests/taskService.test.js` -> `completeTask() -> preserves the original priority when marking a task as complete`
- Integration test: `tests/tasks.routes.test.js` -> `PATCH /tasks/:id/complete -> preserves task priority when marking as complete`

**Root cause:** The updated object literal in `completeTask` contains `priority: 'medium'`, likely a copy-paste artifact from the default task template in `create()`.

**Suggested fix:**
```javascript
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};
```

**Severity/impact:** **High**. Data corruption of task metadata upon state transition. Critical audit records and priority-based filtering on completed tasks become permanently inaccurate.

---

## Bug 3: `update` allows client to overwrite immutable server-managed fields (`id` and `createdAt`)

**Location:** `src/services/taskService.js`, function `update` (line 50)

**Expected behavior:** Updating a task via `PUT /tasks/:id` should only update mutable fields (`title`, `description`, `status`, `priority`, `dueDate`). Server-generated identity and timestamp properties (`id`, `createdAt`) must be protected from client modification.

**Actual behavior:** `update` performs an unchecked shallow merge `const updated = { ...tasks[index], ...fields };`. If a client passes `id` or `createdAt` in the request body, those fields overwrite the internal record values.

**How discovered:**
- Unit test: `tests/taskService.test.js` -> `update() -> does not allow overwriting server-managed immutable fields (id and createdAt)`
- Integration test: `tests/tasks.routes.test.js` -> `PUT /tasks/:id -> does not allow overriding server-controlled fields (id, createdAt) via PUT body`

**Root cause:** Absence of field whitelisting or sanitization before merging the incoming `fields` object onto the existing task record.

**Suggested fix:**
```javascript
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const { id: _id, createdAt: _createdAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  tasks[index] = updated;
  return updated;
};
```

**Severity/impact:** **High (Security & Data Integrity)**. A client can maliciously or accidentally alter a task's UUID or backdate its `createdAt` timestamp, corrupting data integrity and breaking client lookup references.

---

## Bug 4: Status filtering uses substring `.includes()` matching instead of exact equality

**Location:** `src/services/taskService.js`, function `getByStatus` (line 9)

**Expected behavior:** `getByStatus(status)` (and `GET /tasks?status=...`) should only return tasks whose `status` exactly matches the requested string (e.g. `'todo'` only returns tasks with status `'todo'`). A search for a substring like `'do'` should return no tasks since `'do'` is not a valid task status.

**Actual behavior:** `getByStatus` uses `tasks.filter((t) => t.status.includes(status))`. Because `'do'` is a substring of both `'todo'` and `'done'`, querying `status=do` returns tasks with both `todo` and `done` statuses.

**How discovered:**
- Unit test: `tests/taskService.test.js` -> `getByStatus() -> does not return tasks whose status merely contains the search term as a substring`
- Integration test: `tests/tasks.routes.test.js` -> `GET /tasks?status= -> does not return tasks on partial substring matches for status query`

**Root cause:** The filter callback uses `String.prototype.includes` instead of strict equality `===`.

**Suggested fix:**
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Severity/impact:** **Medium**. Causes unintended task matching and breaks UI views that rely on precise category filtering.

---

## Bug 5: Global error handler converts malformed JSON syntax errors into 500 Internal Server Errors

**Location:** `src/app.js`, error middleware (lines 9–12)

**Expected behavior:** When a client sends malformed JSON with `Content-Type: application/json`, Express's `body-parser` raises a 400 Bad Request error. The API should respond with an HTTP 400 status code indicating a client error.

**Actual behavior:** The error middleware catches the `SyntaxError` and indiscriminately responds with `500 { error: 'Internal server error' }`.

**How discovered:**
- Integration test: `tests/tasks.routes.test.js` -> `Malformed JSON handling -> responds with 400 Client Error rather than 500 Internal Server Error when receiving malformed JSON`

**Root cause:** The error handler does not check `err.status` or `err instanceof SyntaxError` before defaulting to status 500.

**Suggested fix:**
```javascript
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Severity/impact:** **Medium / Low**. Misleads clients and monitoring tools into treating client payload syntax errors as server crashes.
