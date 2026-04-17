# Submission Notes

## Implemented work

- Added unit tests for `taskService` in `task-api/tests/taskService.test.js`.
- Added integration tests for routes in `task-api/tests/tasks.routes.test.js` using Supertest.
- Added new endpoint `PATCH /tasks/:id/assign` with validation and edge-case handling.
- Fixed pagination bug in `getPaginated(page, limit)`.
- Documented identified bugs in `BUG_REPORT.md`.

## Feature design decisions (`PATCH /tasks/:id/assign`)

- Validation:
  - `assignee` is required and must be a non-empty string after trimming.
- Not found:
  - Returns `404` when task id does not exist.
- Already assigned:
  - Returns `409` if task already has an assignee.
- Success:
  - Trims and stores assignee string, returns updated task.

## Coverage summary

- `Statements`: 92.4%
- `Branches`: 81.81%
- `Functions`: 93.33%
- `Lines`: 91.66%

## What I would test next

- Validation behavior for malformed pagination values (negative, zero, very large values).
- Concurrency behavior if this moves from in-memory storage to persistent storage.
- Route-level error handling for unexpected runtime failures.

## What surprised me

- A key pagination bug existed in simple offset logic despite the small codebase.
- The complete endpoint mutates `priority`, which appears unrelated to completion state.

## Questions before production

- Should assignment allow reassignment, or should it stay immutable after first assignment?
- Should `complete` preserve priority by definition, or is resetting priority part of product behavior?
- Should status and priority values in docs be aligned with implementation naming (`todo/in_progress/done`)?
