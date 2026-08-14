# Bug Report

This document records the bugs identified in the Task Manager API through unit and integration testing.

---

## Bug 1: Pagination 1-Based Offset Off-by-One Error

- **Severity:** High
- **Location:** `src/services/taskService.js` (`getPaginated`)
- **Expected Behavior:** Requesting page 1 with limit `L` (`/tasks?page=1&limit=L`) should return the first `L` items (indices `0` to `L-1`).
- **What Actually Happens:** The service calculates `const offset = page * limit;`. For `page=1, limit=2`, `offset` is calculated as `2`, skipping the first 2 items and returning tasks starting at index 2 (items 3 and 4). Page 1 completely disappears.
- **How Discovered:** Unit tests for `getPaginated(1, 2)` and integration tests for `GET /tasks?page=1&limit=2` failed with unexpected item offsets.
- **Proposed Fix:**
  Compute zero-indexed offset using `(page - 1) * limit`:
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

## Bug 2: `completeTask` Resets Priority to 'medium'

- **Severity:** Medium
- **Location:** `src/services/taskService.js` (`completeTask`)
- **Expected Behavior:** Completing a task (`PATCH /tasks/:id/complete`) should update `status` to `'done'` and set `completedAt` to the current timestamp while preserving the original task's `priority` (e.g., `'high'` or `'low'`).
- **What Actually Happens:** `completeTask` hardcodes `priority: 'medium'` in the updated object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // Overwrites existing priority!
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **How Discovered:** Unit test `should mark task as done and set completedAt without mutating priority` failed when completing a task with `priority: 'high'`.
- **Proposed Fix:**
  Remove the hardcoded `priority: 'medium'` property:
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

## Bug 3: `getByStatus` Performs Substring Search Instead of Exact Match

- **Severity:** Medium
- **Location:** `src/services/taskService.js` (`getByStatus`)
- **Expected Behavior:** Filtering tasks by status should match only tasks whose status exactly equals the requested status.
- **What Actually Happens:** The code uses `tasks.filter((t) => t.status.includes(status))`. Querying for `'progress'` matches `'in_progress'`, and querying for single characters like `'o'` matches both `'todo'` and `'in_progress'`.
- **How Discovered:** Unit test `should not match partial/substring statuses` with query `'progress'` unexpectedly returned `in_progress` tasks.
- **Proposed Fix:**
  Use strict equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

## Bug 4: Unhandled `null` / Non-Object Body in Validators Causes 500 Uncaught Exception

- **Severity:** Medium
- **Location:** `src/utils/validators.js` (`validateCreateTask`, `validateUpdateTask`)
- **Expected Behavior:** Passing a null, undefined, or malformed non-object body in HTTP requests should fail gracefully with a 400 Bad Request error.
- **What Actually Happens:** `validateCreateTask` and `validateUpdateTask` directly access `body.title` without verifying that `body` is a non-null object, throwing `TypeError: Cannot read properties of null (reading 'title')` which results in an unhandled 500 Internal Server Error.
- **How Discovered:** Validator unit tests passing `null` / `undefined` threw uncaught TypeError.
- **Proposed Fix:**
  Add a type guard at the start of validator functions:
  ```javascript
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'request body must be a valid JSON object';
  }
  ```

---

## Bug 5: `update` and `create` Allow Mutating Protected Fields

- **Severity:** Low / Security Hygiene
- **Location:** `src/services/taskService.js` (`update`) & `src/routes/tasks.js`
- **Expected Behavior:** System metadata like `id` and `createdAt` should be immutable on update.
- **What Actually Happens:** `const updated = { ...tasks[index], ...fields };` blindly merges arbitrary fields, permitting clients to overwrite `id`, `createdAt`, or `completedAt`.
- **Proposed Fix:**
  Sanitize allowed fields during update:
  ```javascript
  const { title, description, status, priority, dueDate } = fields;
  const updated = {
    ...tasks[index],
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(dueDate !== undefined && { dueDate }),
  };
  ```
