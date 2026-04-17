# Bug Report

## Bug 1: Complete Task silently resets priority to 'medium'

**Title**: `completeTask` changes task priority to 'medium' regardless of its original priority.
**Expected behavior**: When marking a task as done, its `priority` should remain unchanged from what the user previously set.
**Actual behavior**: The `priority` field is overwritten with `'medium'`.
**Steps to reproduce**:
1. Create a task with priority `'high'`.
2. Call `PATCH /tasks/:id/complete` on that task.
3. Observe the returned task data has `priority: 'medium'`.
**Root cause**: In `src/services/taskService.js`, the `completeTask` function explicitly sets `priority: 'medium'` when creating the updated task object.
**Suggested fix**: Remove `priority: 'medium'` from the `updated` object construction in `completeTask`.

---

## Bug 2: Get Tasks by Status uses partial matching

**Title**: Unintended partial matching when filtering tasks by status.
**Expected behavior**: Querying `/tasks?status=in_progress` should only return tasks with an exact match for the status `in_progress`.
**Actual behavior**: The filter uses `.includes()`, allowing partial string matching. Querying `status=progress` will match `in_progress`, which is undocumented and can cause issues if statuses have overlapping names.
**Steps to reproduce**:
1. Create a task with status `in_progress`.
2. Send a `GET /tasks?status=progress`.
3. The task is returned, although `progress` is not a valid status name and should return empty or error.
**Root cause**: In `src/services/taskService.js`, `getByStatus` filters using `t.status.includes(status)` instead of strict equality `===`.
**Suggested fix**: Change `t.status.includes(status)` to `t.status === status`.

---

## Bug 3: Incorrect pagination math ignores 1-based indexing

**Title**: Pagination skips the first page data because the offset calculation interprets page 1 as page 2.
**Expected behavior**: `GET /tasks?page=1&limit=10` should return the first 10 tasks (offset 0).
**Actual behavior**: It returns tasks 11-20 (offset 10), effectively skipping the first page.
**Steps to reproduce**:
1. Create 3 tasks (T1, T2, T3).
2. Request `GET /tasks?page=1&limit=2`.
3. Only T3 is returned. T1 and T2 are entirely skipped.
**Root cause**: In `src/services/taskService.js`, `getPaginated` calculates `offset = page * limit`. Since the route sets `page` to default to `1`, `offset` starts at `limit` (e.g., 10), which skips the 0-offset data.
**Suggested fix**: Change the calculation to `const offset = (page - 1) * Math.max(limit, 1);` but since the service should probably support zero or 1 based consistently, we adjust `offset = (page - 1) * limit;` or fix it in the route. 
We'll update `getPaginated` to accept `page=1` as the first page and use `offset = (page - 1) * limit`.
