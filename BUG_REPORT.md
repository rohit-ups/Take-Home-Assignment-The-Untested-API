# Bug Report — The Untested API

This bug report documents the defects discovered during test development and code audit of the Task API.

---

## Summary of Identified Bugs

| # | Severity | Component | Issue | Status |
|---|----------|-----------|-------|--------|
| **1** | **High** | `taskService.getPaginated` | 1-based pagination offset calculation skips the entire first page | **Fixed** |
| **2** | **High** | `taskService.completeTask` | Completing a task resets `priority` to `'medium'`, destroying prior priority data | **Fixed** |
| **3** | **Medium** | `taskService.getByStatus` | Filtering uses substring `.includes()` rather than exact match | **Fixed** |
| **4** | **Medium** | `routes/tasks.js (GET /)` | Supplying `?status=` ignores pagination parameters (`?page=` and `?limit=`) | **Fixed** |
| **5** | **Medium** | `utils/validators.js` | Falsy values (`""`, `null`) bypass status and priority validation | **Fixed** |
| **6** | **Medium** | `utils/validators.js` | Request body of `null` causes unhandled `TypeError` (500) | **Fixed** |
| **7** | **Medium** | `taskService.update` | Updating a task allows overwriting immutable fields (`id`, `createdAt`) | **Fixed** |

---

## Detailed Bug Reports

### Bug 1: 1-Based Pagination Offset Calculation (Off-by-One Error)

- **Location**: [`src/services/taskService.js`](./task-api/src/services/taskService.js#L12)
- **Component**: `getPaginated(page, limit)`
- **Expected Behavior**:
  For 1-indexed pagination (as documented in API specs: `GET /tasks?page=1&limit=10`), page 1 should calculate an offset of `(1 - 1) * 10 = 0`, returning items at indices `0` through `9`.
- **Actual Behavior**:
  The code calculates offset as `const offset = page * limit;`. When `page = 1` and `limit = 10`, `offset` is `10`. Page 1 skips the first 10 items (indices 0–9). If a database has 10 or fewer items, page 1 returns an empty array `[]`. The first `limit` items can never be retrieved via pagination.
- **How Discovered**:
  Exposed by unit test `TaskService › getPaginated › returns tasks for requested page and limit` and integration test `GET /tasks › returns paginated tasks (page 1 and page 2)`.
- **Fix**:
  Update offset formula to use `(pageNum - 1) * limitNum` with defensive floor clamping:
  ```javascript
  const getPaginated = (page = 1, limit = 10) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

### Bug 2: Task Priority Reset to `'medium'` upon Completion

- **Location**: [`src/services/taskService.js`](./task-api/src/services/taskService.js#L69)
- **Component**: `completeTask(id)`
- **Expected Behavior**:
  Calling `completeTask(id)` or `PATCH /tasks/:id/complete` should mark `status: 'done'` and set `completedAt` to the current ISO timestamp, preserving the task's existing priority (`low`, `medium`, or `high`).
- **Actual Behavior**:
  Line 69 hardcoded `priority: 'medium'` in the updated task object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // Overwrites priority!
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
  A high-priority task completed by a user has its priority silently degraded to `medium`.
- **How Discovered**:
  Exposed by unit test `TaskService › completeTask › preserves the task original priority when completing` and integration test `PATCH /tasks/:id/complete`.
- **Fix**:
  Remove `priority: 'medium'` from `completeTask`, preserving the original `task.priority`:
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

---

### Bug 3: Status Filtering Uses Substring Matching Instead of Exact Match

- **Location**: [`src/services/taskService.js`](./task-api/src/services/taskService.js#L9)
- **Component**: `getByStatus(status)`
- **Expected Behavior**:
  Querying tasks by status should match the exact enum value (`todo`, `in_progress`, or `done`).
- **Actual Behavior**:
  The function filtered tasks with `tasks.filter((t) => t.status.includes(status))`. Because it used `.includes()`, querying `?status=do` returned both `todo` and `done` tasks. Querying `?status=progress` returned `in_progress` tasks.
- **How Discovered**:
  Discovered during code audit and tested with `getByStatus('do')`.
- **Fix**:
  Change substring check to strict equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### Bug 4: Filter by Status Bypasses Pagination

- **Location**: [`src/routes/tasks.js`](./task-api/src/routes/tasks.js#L14)
- **Component**: Route handler `GET /tasks`
- **Expected Behavior**:
  Clients should be able to combine status filtering and pagination, e.g., `GET /tasks?status=todo&page=1&limit=10` (as documented in `README.md`).
- **Actual Behavior**:
  The route had an early return:
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }
  ```
  Whenever `status` was present in query parameters, `page` and `limit` were ignored, returning all matching tasks without pagination.
- **How Discovered**:
  Comparing `README.md` sample request `GET /tasks?status=pending&page=1&limit=10` with the route handler logic.
- **Fix**:
  Combine status filtering with pagination so that if both parameters are provided, pagination is applied to the filtered subset.

---

### Bug 5: Falsy Value Bypass in Input Validation

- **Location**: [`src/utils/validators.js`](./task-api/src/utils/validators.js#L8-L12, #L24-L28)
- **Component**: `validateCreateTask` and `validateUpdateTask`
- **Expected Behavior**:
  Providing an invalid status or priority (such as empty string `""` or `null`) should be rejected with HTTP 400 Bad Request.
- **Actual Behavior**:
  The code checked:
  ```javascript
  if (body.status && !VALID_STATUSES.includes(body.status))
  ```
  In JavaScript, `""` and `null` are falsy, so `body.status` evaluates to `false`. The check is bypassed, and invalid status values get persisted into the data store.
- **How Discovered**:
  Validator boundary testing with falsy invalid inputs.
- **Fix**:
  Check `body.status !== undefined` rather than truthiness:
  ```javascript
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  ```

---

### Bug 6: Request Body Crash on `null` / Non-Object

- **Location**: [`src/utils/validators.js`](./task-api/src/utils/validators.js#L5)
- **Component**: `validateCreateTask`, `validateUpdateTask`
- **Expected Behavior**:
  If a client submits a non-object or `null` JSON payload, the API should return HTTP 400 Bad Request.
- **Actual Behavior**:
  Evaluating `!body.title` or `body.title !== undefined` threw an unhandled `TypeError: Cannot read properties of null`, crashing into the Express 500 internal error handler.
- **How Discovered**:
  Fuzz testing with null/empty payload requests.
- **Fix**:
  Add defensive type check at the beginning of each validator:
  ```javascript
  if (!body || typeof body !== 'object') {
    return 'request body must be an object';
  }
  ```

---

### Bug 7: Overwriting Immutable Task Fields on Update

- **Location**: [`src/services/taskService.js`](./task-api/src/services/taskService.js#L50)
- **Component**: `update(id, fields)`
- **Expected Behavior**:
  Updating a task (`PUT /tasks/:id`) should update mutable attributes (`title`, `description`, `status`, `priority`, `dueDate`) while protecting primary key `id` and `createdAt` from mutation.
- **Actual Behavior**:
  The service applied `{ ...tasks[index], ...fields }` directly. If a payload contained `id: 'new-id'` or `createdAt: '1970-01-01'`, the primary key and creation timestamp were overwritten.
- **How Discovered**:
  Contract and security testing on `PUT /tasks/:id`.
- **Fix**:
  Strip `id` and `createdAt` before merging fields:
  ```javascript
  const update = (id, fields) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const { id: _ignoreId, createdAt: _ignoreCreatedAt, ...safeFields } = fields;
    const updated = { ...tasks[index], ...safeFields };
    tasks[index] = updated;
    return updated;
  };
  ```
