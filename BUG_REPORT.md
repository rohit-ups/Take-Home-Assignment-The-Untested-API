# Bug Report: The Untested API

This document details the bugs identified during test suite execution on the Task Manager API.

---

## Summary of Findings

| ID | Location | Severity | Description | Status |
|---|---|---|---|---|
| **BUG-01** | `src/services/taskService.js:12` | **High** | Pagination skips page 1 (`offset` off-by-one error) | Identified & Fixed |
| **BUG-02** | `src/services/taskService.js:9` | **Medium** | Status filtering uses substring search (`includes`) rather than exact match | Identified & Fixed |
| **BUG-03** | `src/services/taskService.js:69` | **Medium** | Completing a task overwrites existing priority to `"medium"` | Identified & Fixed |
| **BUG-04** | `src/routes/tasks.js:14-24` | **Medium** | Combining `?status=` and `?page=`/`?limit=` ignores pagination | Identified & Fixed |
| **BUG-05** | `src/services/taskService.js:50` | **Low** | `update()` allows clobbering immutable fields (`id`, `createdAt`) | Identified & Fixed |

---

## Detailed Bug Reports

### BUG-01: Pagination Off-By-One Skips Page 1

- **File & Line:** [`src/services/taskService.js:11-14`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L11-L14)
- **Component:** `taskService.getPaginated(page, limit)`
- **Expected Behavior:**
  Requesting `page=1&limit=2` should return the first 2 tasks (elements at indices `0` and `1`).
- **Actual Behavior:**
  Requesting `page=1&limit=2` returns elements starting at index `2` (tasks 3 and 4). Page 1 is skipped completely because offset is calculated as `1 * 2 = 2`.
- **How Discovered:**
  - Unit test: `taskService.getPaginated() › should return the first page with correct items`
  - Integration test: `GET /tasks › should paginate results with page and limit`
  - Test output: `Expected: "Task 1", Received: "Task 3"`
- **Why It Happens:**
  The calculation was implemented as:
  ```javascript
  const offset = page * limit;
  ```
  Since page numbers are 1-based in REST APIs, page 1 results in `1 * limit`, skipping the first `limit` items.
- **Fix:**
  Use 0-based offset calculation:
  ```javascript
  const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
  ```

---

### BUG-02: Status Filter Matches Substrings Instead of Exact Status

- **File & Line:** [`src/services/taskService.js:9`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L9)
- **Component:** `taskService.getByStatus(status)`
- **Expected Behavior:**
  Filtering tasks by status (e.g. `GET /tasks?status=progress` or `status=do`) should only match exact statuses defined in `VALID_STATUSES` (`todo`, `in_progress`, `done`). Filtering by `progress` should return 0 tasks.
- **Actual Behavior:**
  Filtering by `progress` returns tasks with status `in_progress`, and filtering by `do` returns both `todo` and `done`.
- **How Discovered:**
  - Unit test: `getByStatus() › should NOT match partial status strings`
  - Integration test: `GET /tasks › should NOT match partial status queries`
  - Test output: `Expected: [], Received: [ { title: 'Task 2', status: 'in_progress' } ]`
- **Why It Happens:**
  The implementation used `String.prototype.includes`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Fix:**
  Use strict equality comparison:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-03: Marking Task Complete Overwrites Priority to `"medium"`

- **File & Line:** [`src/services/taskService.js:67-73`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L67-L73)
- **Component:** `taskService.completeTask(id)` / `PATCH /tasks/:id/complete`
- **Expected Behavior:**
  Marking a high-priority or low-priority task as complete should update `status` to `'done'` and set `completedAt`, while preserving the existing `priority`.
- **Actual Behavior:**
  The task's priority is forcibly overwritten with `'medium'`, wiping out user-defined priorities.
- **How Discovered:**
  - Unit test: `completeTask() › should preserve existing task priority and NOT overwrite it to medium`
  - Integration test: `PATCH /tasks/:id/complete › should preserve existing priority`
  - Test output: `Expected: "high", Received: "medium"`
- **Why It Happens:**
  The method hardcodes `priority: 'medium'` in the updated object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // <--- unintended overwrite
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Fix:**
  Remove `priority: 'medium'` so that `...task` preserves the original priority:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### BUG-04: Combining `?status=` and Pagination Ignores Pagination

- **File & Line:** [`src/routes/tasks.js:14-24`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/src/routes/tasks.js#L14-L24)
- **Component:** `GET /tasks`
- **Expected Behavior:**
  Requesting `GET /tasks?status=todo&page=1&limit=1` should filter tasks by status `todo` AND return only the first paginated item.
- **Actual Behavior:**
  The route checks `if (status)` and returns immediately with all tasks matching that status, completely ignoring any `page` and `limit` parameters provided in the query string.
- **How Discovered:**
  - Integration test: `GET /tasks › should handle pagination when combined with status filter`
  - Test output: `Expected length: 1, Received length: 2`
- **Why It Happens:**
  Mutually exclusive `if` branches with early returns:
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    // never reached if status is set!
  }
  ```
- **Fix:**
  Chain filtering and pagination so both query parameters can be used together:
  ```javascript
  let tasks = status ? taskService.getByStatus(status) : taskService.getAll();

  if (page !== undefined || limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }

  return res.json(tasks);
  ```

---

### BUG-05: `update()` Allows Overwriting Immutable Metadata

- **File & Line:** [`src/services/taskService.js:50`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L50)
- **Component:** `taskService.update(id, fields)`
- **Expected Behavior:**
  Only editable attributes (`title`, `description`, `status`, `priority`, `dueDate`, `assignee`) should be mutable. Internal identifiers (`id`) and audit timestamps (`createdAt`) should remain immutable.
- **Actual Behavior:**
  `const updated = { ...tasks[index], ...fields };` spreads raw fields from the request body directly, allowing a malicious or buggy client to change the task `id` or `createdAt` timestamp.
- **Why It Happens:**
  Unsanitized object spread without filtering out protected properties.
- **Fix:**
  Explicitly protect immutable properties when applying updates:
  ```javascript
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```
