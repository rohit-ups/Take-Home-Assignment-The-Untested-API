# Bug Report — Task Manager API

This document describes bugs discovered through systematic testing of the Task Manager API codebase. Each bug includes the expected behaviour, actual behaviour, how it was discovered, and a proposed fix.

---

## Bug 1: `getByStatus` uses substring match instead of strict equality

**Severity:** Medium  
**File:** `src/services/taskService.js`, line 9  
**Code:** `tasks.filter((t) => t.status.includes(status))`

### Expected Behaviour
`GET /tasks?status=done` should return **only** tasks with status exactly equal to `"done"`.

### Actual Behaviour
Because `String.prototype.includes()` performs a **substring** search, filtering by `"do"` returns both `"done"` and `"todo"` tasks. Similarly, `"in"` would match `"in_progress"`. Any partial string that appears inside a valid status will produce false positives.

### How I Discovered It
While writing unit tests for `getByStatus`, I added an edge-case test that filters using the substring `"do"`. The test confirmed the function returns tasks with statuses `"todo"` and `"done"`, which should not happen with strict matching.

### Proposed Fix
Replace `.includes()` with strict equality (`===`):

```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 2: `getPaginated` has an off-by-one error (**FIXED**)

**Severity:** High  
**File:** `src/services/taskService.js`, line 12 (original)  
**Code:** `const offset = page * limit;`

### Expected Behaviour
`GET /tasks?page=1&limit=10` should return the **first** 10 tasks (indices 0–9).

### Actual Behaviour
Because the offset is calculated as `page * limit` instead of `(page - 1) * limit`, page 1 starts at index 10, completely skipping the first page of results. Page 2 starts at index 20, etc.

### How I Discovered It
My integration test for `GET /tasks?page=1&limit=2` with 5 tasks expected `Task 1` and `Task 2`, but received `Task 3` and `Task 4` — confirming the offset was shifted by exactly one page.

### Fix Applied
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

Pages are 1-indexed at the API level, so subtracting 1 before multiplying gives the correct zero-based offset for `Array.slice()`.

---

## Bug 3: `completeTask` silently resets priority to `'medium'`

**Severity:** Medium  
**File:** `src/services/taskService.js`, line 69 (original)  
**Code:** `priority: 'medium'` inside the spread

### Expected Behaviour
Marking a task as complete (`PATCH /tasks/:id/complete`) should set `status` to `"done"` and set `completedAt` to the current timestamp **without modifying any other fields**.

### Actual Behaviour
The `completeTask` function hardcodes `priority: 'medium'` in the updated object:

```js
const updated = {
  ...task,
  priority: 'medium',  // ← This overwrites the task's actual priority
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

A `high`-priority task silently becomes `medium` when completed. This is a data-integrity bug — the task's priority history is lost.

### How I Discovered It
My unit test created a task with `priority: 'high'`, completed it, and asserted `priority` was still `'high'`. It wasn't — it was `'medium'`.

### Proposed Fix
Remove the `priority: 'medium'` line:

```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

---

## Bug 4: `update` allows overwriting system-managed fields (`id`, `createdAt`)

**Severity:** Low  
**File:** `src/services/taskService.js`, line 50 (original)  
**Code:** `const updated = { ...tasks[index], ...fields };`

### Expected Behaviour
`PUT /tasks/:id` should only allow updating user-editable fields (`title`, `description`, `status`, `priority`, `dueDate`). System-managed fields like `id` and `createdAt` should be immutable.

### Actual Behaviour
Because the update function blindly spreads all incoming fields, a request like this:

```json
PUT /tasks/abc-123
{ "id": "hacked-id", "createdAt": "1999-01-01" }
```

…will overwrite the task's `id` and `createdAt`. This could break referential integrity (the old UUID no longer resolves) and forge audit timestamps.

### How I Discovered It
My unit test sent `{ id: 'hacked-id' }` through `taskService.update()` and confirmed that `updated.id` was indeed `'hacked-id'`, proving the service does not protect system fields.

### Proposed Fix
Destructure allowed fields explicitly, or strip protected keys before spreading:

```diff
  const update = (id, fields) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

+   // Strip system-managed fields to prevent overwrites
+   const { id: _id, createdAt: _ca, completedAt: _co, ...allowed } = fields;
-   const updated = { ...tasks[index], ...fields };
+   const updated = { ...tasks[index], ...allowed };
    tasks[index] = updated;
    return updated;
  };
```
