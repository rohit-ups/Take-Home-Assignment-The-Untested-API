# Bug Report

## Bug 1: Pagination starts from the wrong offset (Fixed)

- Expected behavior: `GET /tasks?page=1&limit=2` should return the first two tasks.
- Actual behavior: Page 1 skipped the first two tasks because offset used `page * limit`.
- Discovery method: Unit test on pagination behavior and route integration test for `GET /tasks?page=1&limit=2`.
- Root cause: Offset calculation in `getPaginated` used `page * limit` instead of `(page - 1) * limit`.
- Fix implemented: Updated offset formula to `(page - 1) * limit` in `src/services/taskService.js`.

## Bug 2: Status filtering is too permissive (Not fixed)

- Expected behavior: `GET /tasks?status=done` should match only tasks with status exactly `done`.
- Actual behavior: Filtering uses substring matching (`includes`), so partial values can produce unexpected matches.
- Discovery method: Code review while writing service tests around status filtering.
- Root cause: `getByStatus` uses `t.status.includes(status)` instead of strict equality.
- Suggested fix: Replace with `t.status === status` and keep validator-driven status constraints.

## Bug 3: Completing a task overrides priority (Not fixed)

- Expected behavior: Marking a task complete should change completion state only, not silently rewrite priority.
- Actual behavior: `PATCH /tasks/:id/complete` sets `priority` to `medium` for every task.
- Discovery method: Code review and route behavior verification.
- Root cause: `completeTask` reconstructs task object with `priority: 'medium'`.
- Suggested fix: Preserve existing priority in `completeTask`.
