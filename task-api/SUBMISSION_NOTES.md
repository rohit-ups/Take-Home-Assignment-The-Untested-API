# Submission Notes

## Coverage Summary

- Command run: `npm run coverage -- --runInBand`
- Result:
  - Statements: 93.67%
  - Branches: 86.66%
  - Functions: 93.33%
  - Lines: 93.10%

## Feature Design Decisions: PATCH /tasks/:id/assign

- Validation: `assignee` must be a non-empty string after trim.
- Missing task: returns `404` with `Task not found`.
- Already assigned task: returns `409` with `Task is already assigned`.
- Data model: task now stores `assignee` and defaults to `null` on creation.

## What I’d Test Next

- Validation and behavior for pagination edge cases such as negative page/limit or very large values.
- Behavior when `status` query is invalid (currently no explicit query validation in route).
- Additional API contract tests for date parsing edge cases and timezone-related overdue calculations.
- More branch-focused tests around global error handler behavior.

## What Surprised Me

- A core pagination bug was present in the service offset calculation and was caught quickly by tests.
- Completion logic changes `priority` to `medium`, which is unexpected for a completion action.
- Status filtering uses substring matching, which allows accidental matches rather than strict status checks.

## Questions Before Production

- Should task assignment be reassignable (replace existing assignee), or should unassign/reassign endpoints be added explicitly?
- Should status query values be strictly validated and return `400` for unsupported values?
- Should completion preserve all existing fields except completion metadata (status and completedAt)?
- Should idempotency rules be defined for assignment and completion endpoints?
