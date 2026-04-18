# Submission Notes

## Coverage

`npm run coverage -- --runInBand`

| Metric | Result |
| --- | --- |
| Statements | 94.15% |
| Branches | 86.2% |
| Functions | 93.33% |
| Lines | 93.57% |

## What I changed

- Added unit tests for `taskService.js` and integration tests for all task routes with Jest and Supertest.
- Fixed three bugs uncovered by the test suite:
  - pagination skipped the first page
  - status filtering matched partial strings
  - completing a task reset priority to `medium`
- Implemented `PATCH /tasks/:id/assign` with validation for a non-empty assignee string.

## Design decisions for `PATCH /tasks/:id/assign`

- I chose to trim the incoming assignee value before storing it so `"  Priya  "` is saved as `"Priya"`.
- Empty or whitespace-only assignees return `400` because an assignment with no usable name does not add value and usually indicates a client-side validation miss.
- Reassignment is allowed. If a task is already assigned, sending a new valid assignee updates that value and returns the latest task state.
- New tasks now include `assignee: null` so the task shape stays consistent before and after assignment.

## What I would test next

- Validation behavior for unusual pagination inputs such as negative numbers, `page=0`, and very large limits.
- Full task lifecycle consistency, especially how `PUT /tasks/:id` should behave if a completed task is moved back to another status.
- API behavior under concurrent updates, since the current store is in-memory and mutation-based.

## Anything that surprised me

- The README and the implementation describe different status vocabularies in a few places, so the tests had to follow the actual code paths instead of the prose alone.
- The bugs were small but meaningful, which is exactly why the service-level tests paid off quickly.

## Questions I would ask before shipping to production

- Should the documented status values be `todo / in_progress / done`, or should the implementation change to match the README wording?
- Do we want `PUT` to behave as a full replacement or the current partial-merge behavior?
- Should assignment support unassigning a task, and if so, should that be `null`, an empty payload, or a dedicated endpoint?
- What limits should we enforce on `title`, `description`, and `assignee` length?
