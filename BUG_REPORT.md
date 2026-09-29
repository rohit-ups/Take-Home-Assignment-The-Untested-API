# Bug Report — Task Manager API

## Overview
During the initial test suite setup and code inspection of the Task Manager API, four bugs were identified across `taskService.js` and `routes/tasks.js`.

---

## 1. Pagination Offset Calculation Bug

* **Location:** `src/services/taskService.js` line 12 (`getPaginated`)
* **Expected Behavior:** `GET /tasks?page=1&limit=10` should return tasks from index `0` to `9` (the first 10 tasks).
* **Actual Behavior:** `const offset = page * limit;` calculates `page 1` with `limit 10` as `offset = 10`. This skips the first 10 tasks completely and returns items starting from index 10.
* **How Discovered:** Identified when writing unit tests for `taskService.getPaginated(1, 10)` in `tests/taskService.test.js`.
* **Proposed Fix:** Change `const offset = page * limit;` to `const offset = (page - 1) * limit;`.

---

## 2. Status Filtering Substring Match Bug

* **Location:** `src/services/taskService.js` line 9 (`getByStatus`)
* **Expected Behavior:** Filtering tasks by status (e.g. `GET /tasks?status=todo`) should strictly match tasks with `status === 'todo'`.
* **Actual Behavior:** The service method uses `tasks.filter((t) => t.status.includes(status))`. Passing a partial query like `status=do` matches both `todo` and `done`.
* **How Discovered:** Discovered during `getByStatus` unit tests by passing `do` as status.
* **Proposed Fix:** Replace `t.status.includes(status)` with strict equality `t.status === status`.

---

## 3. Priority Reset on Task Completion Bug

* **Location:** `src/services/taskService.js` line 69 (`completeTask`)
* **Expected Behavior:** Marking a task as complete (`PATCH /tasks/:id/complete`) should set `status = 'done'` and set `completedAt` to an ISO timestamp, while retaining the task's existing `priority`.
* **Actual Behavior:** `completeTask` explicitly overwrites `priority: 'medium'`, resetting high-priority or low-priority tasks to medium upon completion.
* **How Discovered:** Identified when testing `completeTask` on a task initialized with `priority: 'high'`.
* **Proposed Fix:** Remove `priority: 'medium'` from the return object in `completeTask()`.

---

## 4. Combined Status and Pagination Parameters Ignored

* **Location:** `src/routes/tasks.js` lines 14–27
* **Expected Behavior:** When both `status` and pagination parameters are provided (e.g. `GET /tasks?status=todo&page=1&limit=5`), the API should return paginated results filtered by status.
* **Actual Behavior:** The route uses an `if (status)` check that returns immediately, ignoring `page` and `limit`.
* **How Discovered:** Inspecting control flow in `src/routes/tasks.js`.
* **Proposed Fix:** Refactor the route to first filter by status (if present), and then apply pagination (if page or limit is specified).
