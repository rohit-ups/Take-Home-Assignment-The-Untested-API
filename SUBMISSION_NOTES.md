# Submission Notes

## What I implemented

1. Added comprehensive tests:
- Unit tests for task service logic (`task-api/tests/taskService.test.js`)
- Integration tests for all task routes using Supertest (`task-api/tests/tasks.routes.test.js`)

2. Fixed one production bug:
- Corrected pagination offset logic so page 1 returns the first set of records.

3. Added new feature endpoint:
- `PATCH /tasks/:id/assign`
- Request body: `{ "assignee": "string" }`
- Returns:
  - `200` with updated task on success
  - `400` for invalid/empty assignee
  - `404` when task does not exist
  - `409` when task is already assigned

## Design decisions for assignment feature

- Validation rule: `assignee` must be a non-empty string after trimming whitespace.
- Re-assignment policy: second assignment attempt returns `409 Conflict`.
- Data model change: new tasks now include `assignee: null` by default for consistent shape.

## Coverage summary

Coverage run (`npm run coverage`) reported:

- Statements: 92.4%
- Branches: 82.22%
- Functions: 93.33%
- Lines: 91.66%

This meets the 80%+ target.

## What I would test next with more time

1. Add explicit tests for malformed query params (for example negative/zero page and limit).
2. Add tests for unsupported status filter values at route level.
3. Add tests for race-like behavior in assignment/update flows if persistence or concurrent writes are introduced.

## What surprised me

1. The service logic had subtle behavior bugs (pagination and completion side effects) that are easy to miss without tests.
2. Query and transition behaviors were not uniformly validated, which can lead to inconsistent API contracts.

## Questions I would ask before production

1. Should assignment support re-assignment, and if yes, should audit/history be tracked?
2. Should completing a task be idempotent and preserve all existing fields except status/completedAt?
3. What is the expected behavior for invalid query params (strict validation vs. default fallback)?
4. Are status transitions restricted (for example `done` back to `todo`)?
