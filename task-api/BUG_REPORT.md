# Bug Report: The Untested API

This document details all bugs and vulnerabilities identified during testing of the Task Manager API, including exact code locations, root cause analysis, reproduction steps, and implemented/recommended fixes.

---

## Summary of Identified Bugs

| # | Bug Title | Affected File(s) | Severity | Status in Submission |
|---|-----------|------------------|----------|----------------------|
| 1 | Off-by-one pagination offset calculation | `src/services/taskService.js:12`<br>`src/routes/tasks.js:20-22` | High | **Fixed** |
| 2 | Substring matching in `getByStatus` | `src/services/taskService.js:9` | Medium | **Fixed** |
| 3 | Priority overwritten to `'medium'` on `completeTask` | `src/services/taskService.js:69` | High | **Fixed** |
| 4 | Mutual exclusivity of status filter and pagination | `src/routes/tasks.js:14-24` | Medium | **Fixed** |
| 5 | Immutable fields (`id`, `createdAt`) overwritable via PUT | `src/services/taskService.js:50` | High | **Fixed** |
| 6 | Falsy empty string bypass in enum validators | `src/utils/validators.js:8, 11, 24, 27` | Medium | **Fixed** |
| 7 | Uncaught TypeError (HTTP 500) on null / non-object request body | `src/utils/validators.js:5, 21` | Medium | **Fixed** |
| 8 | Status enum discrepancy between README and code/spec | `README.md:77, 96` vs `src/utils/validators.js:1` | Low (Doc) | Documented |

---

## Detailed Bug Reports

### Bug 1: Off-by-one pagination offset calculation

- **Location:** `src/services/taskService.js` (line 12), `src/routes/tasks.js` (lines 20-22)
- **Code snippet:**
  ```javascript
  const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Why it happens:** In human-readable 1-indexed pagination (which `routes/tasks.js` uses via `parseInt(page) || 1`), page 1 with limit 10 calculates `offset = 1 * 10 = 10`. This skips elements 0 through 9 (the first page). Furthermore, because `routes/tasks.js` evaluates `parseInt("0") || 1`, passing `?page=0` is coerced to `1`, meaning the API could **never** return the first page of tasks when pagination parameters were provided.
- **Expected Behavior:** `page=1&limit=10` should return the first 10 items (offset 0). Offset must be `(page - 1) * limit`.
- **How Discovered:** Unit test requesting `getPaginated(1, 2)` on an array of 5 tasks returned `Task 3` and `Task 4` instead of `Task 1` and `Task 2`.
- **Fix:**
  ```javascript
  const getPaginated = (page, limit, status = null) => {
    const source = status ? getByStatus(status) : tasks;
    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, limit || 10);
    const offset = (pageNum - 1) * limitNum;
    return source.slice(offset, offset + limitNum);
  };
  ```

---

### Bug 2: Substring matching in `getByStatus` instead of strict equality

- **Location:** `src/services/taskService.js` (line 9)
- **Code snippet:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Why it happens:** The function uses `String.prototype.includes()` rather than strict equality `===`. Consequently:
  - Querying `?status=do` matches both `'todo'` and `'done'`.
  - Querying `?status=to` matches `'todo'`.
  - Querying `?status=` or empty string matches every task regardless of status.
- **Expected Behavior:** Status is a discrete enum (`'todo'`, `'in_progress'`, `'done'`). Filtering should only return tasks whose `status` exactly equals the requested status.
- **How Discovered:** Unit test `taskService.getByStatus('do')` returned 2 tasks (`todo` and `done`) instead of 0.
- **Fix:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### Bug 3: Priority overwritten to `'medium'` on task completion

- **Location:** `src/services/taskService.js` (line 69)
- **Code snippet:**
  ```javascript
  const completeTask = (id) => {
    const task = findById(id);
    if (!task) return null;

    const updated = {
      ...task,
      priority: 'medium', // <--- Bug
      status: 'done',
      completedAt: new Date().toISOString(),
    };
    ...
  ```
- **Why it happens:** The developer copied default task attributes from `create()` and forgot to remove `priority: 'medium'`. Whenever a task is marked complete, any user-assigned priority (e.g. `'high'` or `'low'`) is permanently overwritten to `'medium'`.
- **Expected Behavior:** Completing a task should transition `status` to `'done'` and set `completedAt`. The task's priority and other fields must remain untouched.
- **How Discovered:** Integration test `PATCH /tasks/:id/complete` on a task with `priority: 'high'` returned a task with `priority: 'medium'`.
- **Fix:** Remove `priority: 'medium'` from the `updated` object in `completeTask`.

---

### Bug 4: Mutual exclusivity of status filter and pagination in `GET /tasks`

- **Location:** `src/routes/tasks.js` (lines 14–24)
- **Code snippet:**
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }
  ```
- **Why it happens:** If `status` is provided in the query string, the route handler returns all matching tasks immediately. Pagination query parameters `page` and `limit` are ignored.
- **Expected Behavior:** Users should be able to filter by status AND paginate the results (e.g. `GET /tasks?status=todo&page=1&limit=10`), which is explicitly highlighted in the README sample requests (`curl "http://localhost:3000/tasks?status=pending&page=1&limit=10"`).
- **How Discovered:** Integration test `GET /tasks?status=todo&page=2&limit=2` returned all 4 `todo` tasks instead of the 2 requested for page 2.
- **Fix:** Update `getPaginated` to accept an optional `status` filter, and update `routes/tasks.js` to pass `status` to `getPaginated` when pagination parameters are provided.

---

### Bug 5: Immutable system fields (`id`, `createdAt`) overwritable via `PUT /tasks/:id`

- **Location:** `src/services/taskService.js` (line 50)
- **Code snippet:**
  ```javascript
  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
  ```
- **Why it happens:** `update` blindly spreads the entire request `fields` onto the existing stored task. If a client sends `{ id: "custom-id", createdAt: "2000-01-01" }`, the system identifier and creation timestamp are overwritten, violating resource immutability and breaking route semantics.
- **Expected Behavior:** System-generated identifiers (`id`) and timestamps (`createdAt`) must be protected from client modification.
- **How Discovered:** Integration test sending `PUT /tasks/:id` with `{ id: "hacked-id" }`. The returned task had `id === "hacked-id"`.
- **Fix:** Destructure out `id` and `createdAt` before applying the update:
  ```javascript
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### Bug 6: Falsy empty string bypass in enum validators

- **Location:** `src/utils/validators.js` (lines 8, 11, 24, 27)
- **Code snippet:**
  ```javascript
  if (body.status && !VALID_STATUSES.includes(body.status))
  if (body.priority && !VALID_PRIORITIES.includes(body.priority))
  ```
- **Why it happens:** In JavaScript, empty string `""` is falsy. When `body.status = ""`, the condition evaluates to `false`, bypassing validation. In `create`, default parameters only trigger on `undefined`, so `""` is stored as status. In `update`, the status is overwritten with `""`.
- **Expected Behavior:** Passing an empty string for `status` or `priority` should fail validation with a 400 Bad Request error.
- **How Discovered:** Unit tests `validateCreateTask({ title: 'T', status: '' })` and `validateUpdateTask({ priority: '' })`.
- **Fix:** Check `body.status !== undefined && !VALID_STATUSES.includes(body.status)` and `body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)`.

---

### Bug 7: Uncaught TypeError (HTTP 500) on null / non-object request body

- **Location:** `src/utils/validators.js` (lines 5, 21)
- **Code snippet:**
  ```javascript
  const validateCreateTask = (body) => {
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
  ```
- **Why it happens:** If a request sends `null` or a non-object JSON payload, accessing `body.title` throws `TypeError: Cannot read properties of null (reading 'title')`. This results in an unhandled exception triggering a 500 Internal Server Error instead of a 400 Bad Request.
- **Expected Behavior:** The validator should safely inspect whether `body` is a non-null object and return an error message when invalid.
- **How Discovered:** Passing `null` to `validateCreateTask(null)` and `validateUpdateTask(null)`.
- **Fix:** Add a guard clause at the start of each validator:
  ```javascript
  if (!body || typeof body !== 'object') {
    return 'request body must be an object';
  }
  ```

---

### Bug 8: Status enum discrepancy between README documentation and codebase

- **Location:** `README.md` (lines 77, 96) vs `src/utils/validators.js` (line 1)
- **Details:** `README.md` documents status values as `pending | in-progress | completed` and gives a sample query `?status=pending`. However, `ASSIGNMENT.md`, `validators.js`, and `taskService.js` use `todo | in_progress | done`.
- **Impact:** Any client developer reading only the README would query `status=pending` and receive no tasks, or send `status="pending"` and receive a 400 validation error.
- **Recommended Fix:** Harmonize `README.md` to use the canonical status enum `todo | in_progress | done`.
