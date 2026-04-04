# Bug Report

## Bug 1: Pagination skips first page results

- Expected behavior:
  - `GET /tasks?page=1&limit=2` should return the first 2 tasks.
- Actual behavior:
  - It returned tasks starting from index 2, effectively skipping page 1.
- How discovered:
  - Integration tests for pagination exposed mismatch in expected page-1 results.
- Proposed fix:
  - Compute offset as `(page - 1) * limit` instead of `page * limit` in `getPaginated`.
- Status:
  - Fixed in `src/services/taskService.js` and verified by tests.

## Bug 2: Status filter accepts partial values

- Expected behavior:
  - Filtering by status should require exact status values (`todo`, `in_progress`, `done`).
- Actual behavior:
  - `getByStatus` uses `.includes`, so partial values can match unexpectedly.
- How discovered:
  - Unit test showed `getByStatus('in_')` returns `in_progress` task.
- Proposed fix:
  - Use strict equality (`t.status === status`) and validate query value before filtering.
- Status:
  - Fixed in `src/services/taskService.js` (exact match) and `src/routes/tasks.js` (status query validation), verified by integration and unit tests.

## Bug 3: Completing task resets priority

- Expected behavior:
  - Marking complete should not silently overwrite existing priority unless specified by business rule.
- Actual behavior:
  - `completeTask` sets priority to `medium` every time.
- How discovered:
  - Unit test for `completeTask` highlighted priority mutation from `high` to `medium`.
- Proposed fix:
  - Preserve existing priority and update only `status` and `completedAt`.
- Status:
  - Fixed in `src/services/taskService.js` by preserving existing priority, verified by integration and unit tests.
