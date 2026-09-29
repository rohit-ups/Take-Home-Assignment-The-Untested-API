# Bug Report — Task Manager API

This document details the software defects identified during static code inspection and automated testing of the Task Manager REST API.

---

## 1. Fixed Defects

### BUG-03: Task Priority Reset on Completion
* **Affected File & Function**: `src/services/taskService.js` — `completeTask()`
* **Status**: **FIXED** (Regression verified in `tests/unit/taskService.test.js`)
* **Expected Behavior**: Marking a task as complete via `PATCH /tasks/:id/complete` should update `status` to `'done'` and set `completedAt`, while preserving the task's original `priority` (`low`, `medium`, or `high`).
* **Observed Behavior**: When completing a task, its `priority` was forcibly overwritten to `'medium'`, destroying any previously assigned priority value (e.g. `'high'`).
* **Root Cause**: The `completeTask` function contained a hardcoded `priority: 'medium'` property in the updated object payload.
* **Fix Applied**: Removed the hardcoded `priority: 'medium'` line from `completeTask()`. The task object spread (`...task`) now preserves the original `priority`.

---

## 2. Confirmed Unresolved Defects

### BUG-01: Substring Matching in Status Filtering
* **Affected File & Function**: `src/services/taskService.js` — `getByStatus()`
* **Status**: **CONFIRMED (UNRESOLVED)** (Reproduced in `tests/unit/taskService.test.js`)
* **Expected Behavior**: Querying `GET /tasks?status=todo` should perform strict exact equality matching and return only tasks with `status === 'todo'`.
* **Observed Behavior**: Querying `GET /tasks?status=do` matches both `todo` and `done` tasks. Querying `status=in` matches `in_progress` tasks.
* **Root Cause**: `getByStatus` filters tasks using `t.status.includes(status)` rather than strict equality `t.status === status`.
* **Impact**: Callers receive unexpected tasks when passing status substrings.
* **Recommended Fix**: Update `getByStatus` to perform exact string comparison: `tasks.filter((t) => t.status === status)`.

### BUG-02: Off-by-One Offset Calculation in 1-Based Pagination
* **Affected File & Function**: `src/services/taskService.js` (`getPaginated()`) and `src/routes/tasks.js` (Route handler)
* **Status**: **CONFIRMED (UNRESOLVED)** (Reproduced in `tests/unit/taskService.test.js` and `tests/integration/tasks.test.js`)
* **Expected Behavior**: Following 1-based API conventions (`?page=1&limit=10`), page 1 should return items 0 through 9 (offset 0).
* **Observed Behavior**: For `page=1, limit=10`, offset is calculated as `1 * 10 = 10`, skipping items 0–9. Querying `page=0` falls back to `1` because `parseInt('0') || 1` evaluates to `1`.
* **Root Cause**: Formula used is `offset = page * limit` without subtracting 1 for 1-based indexing, combined with `parseInt(page) || 1` treating 0 as falsy.
* **Impact**: Items 0 through `limit-1` can never be retrieved via the paginated API endpoint.
* **Recommended Fix**: Change offset calculation to `const offset = (page - 1) * limit` after validating `page >= 1`.

---

## 3. Suspected Defects & Design Limitations

### BUG-04: Mutable Object Reference Leak in `getAll()`
* **Affected File & Function**: `src/services/taskService.js` — `getAll()`
* **Status**: **SUSPECTED**
* **Expected Behavior**: Retried task lists should be immutable or isolated from the internal data store array.
* **Observed Behavior**: `getAll()` returns `[...tasks]`. While the outer array is a shallow copy, elements inside are direct references to stored task objects. Mutating a property on a returned task object directly alters state in the in-memory store without invoking `update()`.
* **Impact**: Potential unintended side effects and state corruption in caller modules.
* **Recommended Fix**: Return deep copies or frozen task objects: `tasks.map((t) => ({ ...t }))`.

### BUG-05: Uncaught `TypeError` on Missing Request Body in Validators
* **Affected File & Function**: `src/utils/validators.js` — `validateCreateTask()` & `validateUpdateTask()`
* **Status**: **SUSPECTED**
* **Expected Behavior**: Invalid request bodies (such as `null` or non-object primitives) should return a validation error string.
* **Observed Behavior**: `if (!body.title ...)` attempts to read properties on `body` without verifying `body` is a non-null object. If `req.body` is `null` or `undefined`, Express throws an uncaught `TypeError`, resulting in a 500 Internal Server Error.
* **Impact**: Unhandled 500 error on malformed client requests.
* **Recommended Fix**: Add a top-level guard: `if (!body || typeof body !== 'object') return 'request body must be an object';`.
