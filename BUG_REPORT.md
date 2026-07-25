# Bug Report — Task Manager API

This document details the software bugs identified during test coverage expansion and code auditing of the Task Manager API.

---

## Summary of Findings

| Bug ID | Severity | Component | Description | Status |
|--------|----------|-----------|-------------|--------|
| **BUG-01** | High | `taskService.js` | Pagination offset calculation off-by-one error (page 1 skipped initial items) | **FIXED** |
| **BUG-02** | Medium | `taskService.js` | Inexact substring matching on status filter (`includes` vs `===`) | **FIXED** |
| **BUG-03** | Medium | `taskService.js` | Completing a task forcefully resets priority to `'medium'` | **FIXED** |
| **BUG-04** | Low | `routes/tasks.js` | Status filter and pagination parameters were mutually exclusive | **FIXED** |

---

## Detailed Bug Breakdown

### BUG-01: Pagination Offset Off-By-One Error

- **File / Location:** `src/services/taskService.js` -> `getPaginated`
- **Severity:** High
- **Expected Behavior:** 
  For a 1-based pagination API, requesting `page=1` with `limit=10` should calculate `offset = 0` (`(page - 1) * limit`) and return the first 10 items (indices 0 to 9).
- **Actual Behavior:** 
  `offset` was calculated as `page * limit`, resulting in `offset = 10`. Requesting `page=1` skipped the first 10 tasks entirely and returned items 10 through 19.
- **Discovery Method:** 
  Discovered while writing unit tests for `taskService.getPaginated(1, 10)` against a dataset of 25 tasks.
- **Fix:** 
  Updated offset logic to:
  ```js
  const pageNum = parsedPage > 0 ? parsedPage : 1;
  const limitNum = parsedLimit > 0 ? parsedLimit : 10;
  const offset = (pageNum - 1) * limitNum;
  ```

---

### BUG-02: Inexact Substring Match on Task Status Filtering

- **File / Location:** `src/services/taskService.js` -> `getByStatus`
- **Severity:** Medium
- **Expected Behavior:** 
  Filtering tasks by status (e.g. `status=todo`) should strictly return tasks where `t.status === 'todo'`.
- **Actual Behavior:** 
  Used String `includes()` (`t.status.includes(status)`). Searching for `status=do` returned tasks with status `'todo'` AND status `'done'`.
- **Discovery Method:** 
  Identified during code audit of status query filtering and verified with unit test case `getByStatus('do')`.
- **Fix:** 
  Updated predicate from `t.status.includes(status)` to strict equality check `t.status === status`.

---

### BUG-03: Priority Overwrite on Task Completion

- **File / Location:** `src/services/taskService.js` -> `completeTask`
- **Severity:** Medium
- **Expected Behavior:** 
  Marking a task complete via `PATCH /tasks/:id/complete` should update `status` to `'done'` and set `completedAt`, retaining the task's original priority (`'high'`, `'low'`, etc.).
- **Actual Behavior:** 
  The function explicitly injected `priority: 'medium'`, resetting high-priority or low-priority tasks back to medium upon completion.
- **Discovery Method:** 
  Discovered during integration testing when asserting task properties post-completion.
- **Fix:** 
  Removed `priority: 'medium'` property overwrite from the `completeTask` constructor payload, retaining `...task` properties intact.

---

### BUG-04: Mutual Exclusivity of Status Filter and Pagination Parameters

- **File / Location:** `src/routes/tasks.js` -> `GET /tasks`
- **Severity:** Low / API Usability
- **Expected Behavior:** 
  Querying `GET /tasks?status=todo&page=1&limit=5` should filter by status `'todo'` and return the first page of 5 items.
- **Actual Behavior:** 
  The route handler contained early `if (status)` return logic before evaluating `page` and `limit`, causing pagination query parameters to be ignored whenever `status` was present.
- **Discovery Method:** 
  Identified during integration testing of combined query parameter scenarios.
- **Fix:** 
  Created `queryTasks({ status, page, limit })` helper in `taskService.js` to cleanly compose filtering and pagination in a single pipeline.
