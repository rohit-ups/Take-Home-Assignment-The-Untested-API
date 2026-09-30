# Bug Report

## Summary

- 48 unit tests were originally written for `taskService.js`, discovering 9 failures across 4 underlying issues.
- 35 integration/API tests were originally written using Jest + Supertest, discovering 6 failures across the same underlying issues through the HTTP layer.
- Baseline test state: 83 tests total (68 passed, 15 failed).
- Two bugs were selected and fixed for this assignment:
  1. Pagination offset calculation (Bug 1) — FIXED
  2. `completeTask()` overwriting task priority (Bug 4) — FIXED
- Two bugs were documented but intentionally left unfixed:
  3. Partial substring matching in status filtering (Bug 2) — NOT FIXED / INTENTIONALLY LEFT UNFIXED
  4. Immutable task fields (`id`, `createdAt`) being modifiable via updates (Bug 3) — NOT FIXED / INTENTIONALLY LEFT UNFIXED
- Added the required `PATCH /tasks/:id/assign` feature alongside comprehensive priority preservation tests.
- Final test state: 100 tests total (94 passed, 6 failed). The 6 remaining failures represent the intentional regression tests for Bug 2 and Bug 3.

---

## Bug 1 — Pagination Offset Calculation

### Expected Behavior
Pagination is 1-indexed:
- `page=1, limit=2` should return Task 1 and Task 2.
- `page=2, limit=2` should return Task 3 and Task 4.
- `page=3, limit=2` should return the remaining Task 5.

### Actual Behavior
- `page=1, limit=2` skipped the first two tasks completely and returned Task 3 and Task 4.
- `page=2, limit=2` skipped ahead incorrectly and returned only Task 5.
- `page=3, limit=2` missed the final task and returned an empty array `[]`.

### How It Was Discovered
Discovered through unit testing of `getPaginated()` and integration testing of `GET /tasks?page=...&limit=...`:
- **Unit Tests:** `tests/taskService.test.js` (`getPaginated()` suite).
- **Integration Tests:** `tests/tasks.test.js` (`GET /tasks?page=...&limit=...` suite).

### Evidence
- `getPaginated(1, 2)` returned Task 3 and Task 4 instead of Task 1 and Task 2.
- `getPaginated(2, 2)` returned Task 5 instead of Task 3 and Task 4.
- `getPaginated(3, 2)` returned an empty array `[]`.
- `GET /tasks?page=1&limit=2` returned Task 3 and Task 4 over HTTP.

### Likely Cause
In `src/services/taskService.js`, the offset was calculated as:
```javascript
const offset = page * limit;
```
For 1-based indexing, page 1 produced offset `1 * limit`, skipping the first page entirely.

### Fix Applied
Updated the offset calculation to account for 1-based indexing in `src/services/taskService.js`:
```javascript
const offset = (page - 1) * limit;
```

### Status
FIXED

---

## Bug 2 — Partial Substring Matching in Status Filter

### Expected Behavior
Filtering tasks by status should match exact enum status values (`todo`, `in_progress`, `done`). Filtering by partial substrings like `do` or `progress` should not return tasks.

### Actual Behavior
The status filter performs a partial substring match instead of an exact match:
- Filtering by `status=do` matches and returns tasks with both `todo` and `done` statuses.
- Filtering by `status=progress` matches tasks with `in_progress` status.

### How It Was Discovered
Discovered by unit and integration tests:
- **Unit Tests:** `tests/taskService.test.js` (`getByStatus()` suite: asserting exact matching for `"do"` and `"progress"`).
- **Integration Tests:** `tests/tasks.test.js` (`GET /tasks?status=...` suite: `GET /tasks?status=do`).

### Evidence
- `getByStatus('do')` returns tasks with status `'todo'` and `'done'`.
- `getByStatus('progress')` returns tasks with status `'in_progress'`.
- `GET /tasks?status=do` returns HTTP 200 with both `'todo'` and `'done'` tasks.

### Likely Cause
In `src/services/taskService.js`, `getByStatus` uses `String.prototype.includes`:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

### Suggested Fix
Replace substring matching with exact equality comparison:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

### Status
NOT FIXED / INTENTIONALLY LEFT UNFIXED

---

## Bug 3 — Immutable Task Fields (id, createdAt) Can Be Modified

### Expected Behavior
System-generated metadata (`id` and `createdAt`) must be immutable once created. Clients should not be able to alter these fields via update requests.

### Actual Behavior
- `PUT /tasks/:id` allows clients to supply an `id` or `createdAt` field in the request body, overwriting the system-managed properties.
- Service function `update(id, fields)` merges all incoming fields directly into the existing object.

### How It Was Discovered
Discovered by unit and integration tests:
- **Unit Tests:** `tests/taskService.test.js` (`update()` suite: attempting to overwrite `id` and `createdAt`).
- **Integration Tests:** `tests/tasks.test.js` (`PUT /tasks/:id` suite: supplying `{ id: 'malicious-custom-id' }`).

### Evidence
- `update(task.id, { id: 'malicious-custom-id' })` overwrites the task `id`, corrupting subsequent lookups.
- `update(task.id, { createdAt: '1970-01-01T00:00:00.000Z' })` overwrites the creation timestamp.
- `PUT /tasks/:id` with `{ id: 'malicious-custom-id' }` returns HTTP 200 with the mutated id.

### Likely Cause
In `src/services/taskService.js`, `update()` uses object spread without stripping protected fields:
```javascript
const updated = { ...tasks[index], ...fields };
```
In `src/utils/validators.js`, `validateUpdateTask` does not strip or reject immutable fields.

### Suggested Fix
Strip or ignore immutable fields during updates:
```javascript
const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
const updated = { ...tasks[index], ...allowedFields };
```

### Status
NOT FIXED / INTENTIONALLY LEFT UNFIXED

---

## Bug 4 — Completing a Task Overwrites Priority

### Expected Behavior
Completing a task should mark `status: 'done'` and set `completedAt: <timestamp>`, while preserving the task's existing `priority` (`'high'`, `'medium'`, or `'low'`).

### Actual Behavior
Calling `completeTask()` unconditionally reset the task's priority to `'medium'`, downgrading high-priority tasks and altering low-priority tasks upon completion.

### How It Was Discovered
Discovered by unit and integration tests:
- **Unit Tests:** `tests/taskService.test.js` (`completeTask()` suite: verifying priority preservation for `'high'`, `'medium'`, and `'low'`).
- **Integration Tests:** `tests/tasks.test.js` (`PATCH /tasks/:id/complete` suite: completing tasks with `'high'` and `'low'` priorities).

### Evidence
- Completing a task with `priority: 'high'` returned `{ priority: 'medium', status: 'done' }`.
- Completing a task with `priority: 'low'` returned `{ priority: 'medium', status: 'done' }`.
- `PATCH /tasks/:id/complete` returned `priority: 'medium'` for high-priority tasks.

### Likely Cause
In `src/services/taskService.js`, `completeTask()` hardcoded `priority: 'medium'` in the update object:
```javascript
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Fix Applied
Removed the hardcoded `priority: 'medium'` from `completeTask()` in `src/services/taskService.js`:
```javascript
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Status
FIXED

---

## New Feature: PATCH /tasks/:id/assign

### Overview
Added endpoint `PATCH /tasks/:id/assign` with payload:
```json
{
  "assignee": "string"
}
```

### Design & Validation Decisions
1. **Validation:**
   - `assignee` is required and must be a string.
   - Missing payload (`{}`), non-string types (numbers, booleans, objects, null), empty strings (`""`), and whitespace-only strings (`"   "`) are rejected with HTTP 400 (`{ "error": "assignee is required and must be a non-empty string" }`).
2. **Whitespace Trimming:**
   - Leading and trailing whitespace is trimmed before storage (e.g., `"  Bob  "` becomes `"Bob"`).
3. **404 Behavior:**
   - Attempting to assign a nonexistent task returns HTTP 404 (`{ "error": "Task not found" }`).
4. **Reassignment:**
   - Tasks can be reassigned to another valid assignee. The new assignee replaces the previous assignee without error.
5. **Backwards Compatibility:**
   - Task creation (`POST /tasks`) does not require an assignee, preserving full backwards compatibility.

---

## Final Testing Summary

- **Total Test Suites:** 2
- **Total Tests:** 100
- **Passed:** 94
- **Failed:** 6 (the 6 intentional regression tests for Bug 2 and Bug 3)
- **Code Coverage:**
  - `src/routes/tasks.js`: 100% Statements, 100% Branches, 100% Functions, 100% Lines
  - `src/services/taskService.js`: 100% Statements, 100% Branches, 100% Functions, 100% Lines
  - `src/utils/validators.js`: 100% Statements, 100% Branches, 100% Functions, 100% Lines
  - Overall repository coverage: 97.43% Statements, 98.86% Branches, 93.33% Functions, 97.18% Lines

