# Submission Notes

## Tests

- **Unit tests** (`tests/unit/taskService.unit.test.js`) — 28 tests covering `taskService.js` directly: `create`, `findById`, `getAll`, `getByStatus`, `getPaginated`, `getStats`, `update`, `remove`, `completeTask`, and `assignTask`, plus a dedicated `Edge Cases` block and a `Bugs` block that pins down the two fixed regressions.
- **Integration tests** (`tests/integration/task.integration.test.js`) — 32 tests covering every route through Supertest: `POST /tasks`, `GET /tasks` (including status filter and pagination), `GET /tasks/stats`, `PUT /tasks/:id`, `DELETE /tasks/:id`, `PATCH /tasks/:id/complete`, and `PATCH /tasks/:id/assign`.
- **Total: 60 tests, all passing** (`npm test`).

```
Test Suites: 2 passed, 2 total
Tests:       60 passed, 60 total
```

## Coverage

`npm run coverage`

| Metric | Result |
| --- | --- |
| Statements | 94.8% |
| Branches | 90.8% |
| Functions | 93.33% |
| Lines | 94.28% |

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |    94.8 |     90.8 |   93.33 |   94.28 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |       95 |     100 |     100 |
  taskService.js |     100 |       95 |     100 |     100 | 22
 src/utils       |   85.18 |    84.61 |     100 |   85.18 |
  validators.js  |   85.18 |    84.61 |     100 |   85.18 | 12,22,25,31
-----------------|---------|----------|---------|---------|-------------------
```

## What I changed

- Added unit tests for `taskService.js` and integration tests for all task routes with Jest and Supertest.
- Fixed two bugs uncovered by the test suite (see `BUG_REPORT.md` for full detail):
  - pagination skipped the first page of results (`page * limit` → `(page - 1) * limit`)
  - completing a task reset its `priority` to `'medium'` regardless of its original value
- Implemented `PATCH /tasks/:id/assign` with validation requiring a non-empty, trimmed assignee string.

## Design decisions for `PATCH /tasks/:id/assign`

- The incoming assignee value is trimmed before storing, so `"  Alice  "` is saved as `"Alice"`.
- Empty or whitespace-only assignees return `400` — an assignment with no usable name doesn't add value and usually indicates a client-side validation miss.
- Reassignment is allowed. If a task already has an assignee, sending a new valid assignee overwrites it and returns the updated task — no separate "unassign" or "force" flag exists yet.
- Validation runs before the not-found check, so an invalid body against a nonexistent task id returns `400`, not `404`. This is a deliberate fail-fast choice: bad input is rejected without needing to look anything up first.

## What I would test next

- Validation behavior for unusual pagination inputs, such as negative numbers, `page=0`, and very large limits.
- Full task lifecycle consistency — e.g., how `PUT /tasks/:id` should behave if a completed task is moved back to another status, and whether `completedAt` should be cleared in that case.
- API behavior under concurrent updates, since the current store is in-memory and mutation-based with no locking.
- The `getByStatus` substring-matching behavior more thoroughly — the current filter uses `String.prototype.includes` rather than strict equality, which could match unintended statuses in edge cases beyond what's covered today.

## Anything that surprised me

- The README and the implementation describe different status vocabularies in a few places, so the tests had to follow the actual code paths instead of the prose alone.
- The bugs were small but meaningful — a one-character offset error and a hardcoded field — which is exactly why the service-level tests paid off quickly: neither would have been obvious from a quick manual read of the code.

## Questions I would ask before shipping to production

- Should the documented status values be `todo / in_progress / done`, or should the implementation change to match the README wording?
- Should assignment support unassigning a task, and if so, should that be `assignee: null`, an empty payload, or a dedicated endpoint?
- What limits should we enforce on `title`, `description`, and `assignee` length?