# Bug Report — Task Manager API

## Bug 1: `getByStatus` uses substring matching instead of exact match

**Location:** `src/services/taskService.js`, line 12

**Expected behavior:** `getByStatus('todo')` should return only tasks with status exactly equal to `'todo'`.

**Actual behavior:** `getByStatus('in')` returns tasks with status `'in_progress'` because `String.prototype.includes()` performs substring matching.

**How discovered:** Unit test `getByStatus('in')` returned 1 result instead of 0.

**Fix:** Change `t.status.includes(status)` to `t.status === status`.

---

## Bug 2: `getPaginated` offset calculation is off by one page

**Location:** `src/services/taskService.js`, line 16

**Expected behavior:** `getPaginated(1, 10)` should return the first 10 tasks (items 0-9).

**Actual behavior:** `getPaginated(1, 10)` returns tasks 10-19 (the second page), because `offset = page * limit = 1 * 10 = 10`. The first page is always skipped.

**How discovered:** Unit test `getPaginated(1, 10)` returned `Task 11` as the first item instead of `Task 1`.

**Fix:** Change `const offset = page * limit` to `const offset = (page - 1) * limit`.

---

## Bug 3: `completeTask` resets priority to `'medium'`

**Location:** `src/services/taskService.js`, line 62

**Expected behavior:** Completing a task should only change `status` to `'done'` and set `completedAt`. The priority should remain unchanged.

**Actual behavior:** A task with `priority: 'high'` gets its priority reset to `'medium'` when completed.

**How discovered:** Unit test created a high-priority task, completed it, and found priority was `'medium'`.

**Fix:** Remove `priority: 'medium'` from the `completeTask` update object.

---

## Bug 4: `update` allows overwriting protected fields (`id`, `createdAt`, `completedAt`)

**Location:** `src/services/taskService.js`, line 48

**Expected behavior:** The `update` method should not allow changing a task's `id`, `createdAt`, or `completedAt` fields — these are system-managed.

**Actual behavior:** A `PUT /tasks/:id` request with `{ "id": "hacked-id" }` successfully changes the task's ID, potentially breaking references and data integrity.

**How discovered:** Unit test called `update(task.id, { id: 'hacked-id' })` and the returned task had the new ID.

**Fix:** Strip protected fields from the `fields` object before merging, or use an allowlist of updatable fields.

---

## Bug 5: `getByStatus` does not validate status input

**Location:** `src/routes/tasks.js`, line 10 and `src/services/taskService.js`, line 12

**Expected behavior:** Passing an invalid status like `?status=invalid` should return a 400 error.

**Actual behavior:** Returns an empty array with a 200 status, which is misleading — the client can't distinguish "no tasks match" from "invalid filter value."

**How discovered:** Code review — no validation on the `status` query parameter.

**Fix:** Validate the `status` parameter against `VALID_STATUSES` before calling `getByStatus`.
