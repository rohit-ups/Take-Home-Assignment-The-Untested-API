# Bug Report

## Bug 1: Pagination skips the first page items (fixed)

- Expected behavior:
  - `GET /tasks?page=1&limit=10` should return items starting from index 0.
- Actual behavior:
  - Page 1 started from index `limit`, skipping the first `limit` tasks.
- Where it lives:
  - `task-api/src/services/taskService.js` in `getPaginated(page, limit)`.
- How discovered:
  - Integration test for `GET /tasks?page=1&limit=2` expected the first two tasks, but the original logic returned later records.
- Why it happens:
  - Offset was calculated as `page * limit` instead of `(page - 1) * limit`.
- Fix implemented:
  - Updated offset calculation to `(page - 1) * limit`.

## Bug 2: Completing a task unexpectedly mutates priority (not fixed)

- Expected behavior:
  - Completing a task should update completion fields (`status`, `completedAt`) and keep unrelated fields unchanged.
- Actual behavior:
  - `PATCH /tasks/:id/complete` forces `priority` to `medium`, overwriting existing value.
- Where it lives:
  - `task-api/src/services/taskService.js` in `completeTask(id)`.
- How discovered:
  - Manual code review while writing service-level tests for completion behavior.
- Why it happens:
  - Completion logic explicitly sets `priority: 'medium'` in the updated object.
- Potential fix:
  - Remove the explicit `priority` assignment in `completeTask`.
