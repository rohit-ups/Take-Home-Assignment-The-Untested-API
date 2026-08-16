# Bug Report

## BUG-001 — Pagination skips the first page **FIXED**

- **Location**: `task-api/src/services/taskService.js:11-14`
- **Expected behavior**: With one-based API pages, `getPaginated(1, 2)` should return the first two tasks.
- **Actual behavior**: Page 1 started at index 2, skipping the first two tasks.
- **How discovered**: `taskService > getPaginated > uses one-based page numbers` and `Task API routes > GET /tasks > returns the first page, supports a large page, and currently normalizes zero page or limit values` both failed before the fix.
- **Root cause**: The offset was calculated as `page * limit`; that formula treats page numbers as zero-based while the route defaults to page 1.
- **Suggested fix**: Calculate the offset as `(page - 1) * limit`.

The fix changes only the offset calculation, aligning the service with the route's existing page-1 default and avoiding broader request-validation changes. This was chosen over the other defects because it makes the ordinary, documented first-page request omit data.

## BUG-002 — Status filtering performs substring matching

- **Location**: `task-api/src/services/taskService.js:9`
- **Expected behavior**: A status filter should match an exact enum value; for example, `getByStatus('on')` should return no tasks.
- **Actual behavior**: `getByStatus('on')` returns tasks whose status is `done` because `done.includes('on')` is true.
- **How discovered**: Line-by-line trace of `getByStatus` against the `todo | in_progress | done` status enum.
- **Root cause**: The predicate calls `String.prototype.includes` instead of comparing `t.status === status`.
- **Suggested fix**: Replace the predicate with strict equality and, if the API contract requires it, reject unsupported `status` query values in the route.

## BUG-003 — Completing a task overwrites its priority

- **Location**: `task-api/src/services/taskService.js:67-72`
- **Expected behavior**: Completing a task should update its status and completion timestamp while retaining its existing priority.
- **Actual behavior**: Completing a `high` or `low` priority task silently changes its priority to `medium`.
- **How discovered**: Line-by-line trace of `completeTask`; the object spread is followed by an explicit `priority: 'medium'` assignment.
- **Root cause**: `priority` is included in the completion update object even though it is unrelated to completion, so it overrides the value copied from the task.
- **Suggested fix**: Remove the `priority: 'medium'` property from the update object.

## BUG-004 — Empty status and priority values bypass enum validation

- **Location**: `task-api/src/utils/validators.js:8-12` and `task-api/src/utils/validators.js:24-28`
- **Expected behavior**: When `status` or `priority` is supplied, it should be one of its declared enum values; an empty string is invalid.
- **Actual behavior**: `POST /tasks` and `PUT /tasks/:id` accept `{ "status": "" }` or `{ "priority": "" }`, allowing invalid task state.
- **How discovered**: Trace of the truthiness guards: empty strings make `body.status` and `body.priority` false, so neither enum check runs.
- **Root cause**: The validators use truthiness to decide whether an optional field was supplied, rather than checking `!== undefined` (as the title update validation does).
- **Suggested fix**: Use `field !== undefined` for optional enum checks, then validate the supplied value against its allowed list.
