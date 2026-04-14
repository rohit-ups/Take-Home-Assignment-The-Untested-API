# Bug Report

## 1. Pagination skips the first page (fixed)

- Location: `src/services/taskService.js` in `getPaginated`
- Expected behavior: `page=1&limit=2` should return the first two tasks.
- Actual behavior: it returned tasks starting from index 2 (effectively page 2 behavior).
- How discovered: failing unit test in `tests/taskService.test.js` and failing integration test in `tests/tasks.routes.test.js`.
- Root cause: offset was calculated as `page * limit` instead of `(page - 1) * limit`.
- Fix applied: changed offset formula to `(page - 1) * limit`.

## 2. Status filtering is too permissive (not fixed)

- Location: `src/services/taskService.js` in `getByStatus`
- Expected behavior: filtering by status should match exact status values only.
- Actual behavior: it uses substring matching (`includes`), so invalid partial values can match unexpectedly.
- How discovered: code review while writing service tests.
- Suggested fix: replace `t.status.includes(status)` with `t.status === status` and consider validating `status` query values in the route.

## 3. Completing a task overwrites priority (not fixed)

- Location: `src/services/taskService.js` in `completeTask`
- Expected behavior: marking completion should update completion fields, not silently change unrelated task properties.
- Actual behavior: completion always sets `priority` to `medium`.
- How discovered: code review while writing tests for completion behavior.
- Suggested fix: remove forced `priority: 'medium'` from the completion update payload.
