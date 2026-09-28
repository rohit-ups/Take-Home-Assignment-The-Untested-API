# Submission Notes — Task Manager API

Here is my submission for the take-home assessment. I've added a full test suite covering both unit and integration tests, tracked down and fixed existing bugs, and implemented the task assignment endpoint with validation.

## Test Suite & Coverage

I wrote unit tests for the core service and validation logic, along with Supertest integration tests for all route handlers.

To run the tests:
```bash
cd task-api
npm test
```

To run coverage:
```bash
npm run coverage
```

Current test results:
```text
PASS tests/validators.test.js
PASS tests/taskService.test.js
PASS tests/tasks.test.js

Test Suites: 3 passed, 3 total
Tests:       86 passed, 86 total (64 unit tests, 22 integration tests)
Snapshots:   0 total
Time:        1.8s
```

Coverage summary:
```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.41 |     94.5 |   93.33 |   97.16 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |    91.66 |     100 |     100 |                   
  tasks.js       |     100 |    91.66 |     100 |     100 |                   
 src/services    |     100 |    91.66 |     100 |     100 |                   
  taskService.js |     100 |    91.66 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```
*(The only uncovered lines in `app.js` are the generic 500 error middleware and the `require.main === module` server bootstrap block that runs when starting via `node src/app.js`)*.

---

## Bugs Found & Fixes

Detailed notes on all bugs are in `BUG_REPORT.md`. A quick summary:

1. **Pagination offset calculation (`taskService.js`)**
   - The offset was calculated as `page * limit`. For `page=1, limit=10`, `offset` became `10`, which skipped the first 10 tasks entirely.
   - Fixed by switching to `(page - 1) * limit` with guards to treat non-positive page numbers as page 1.

2. **Priority overwritten on task completion (`taskService.js`)**
   - `completeTask` had `priority: 'medium'` hardcoded in the update object. Completing a high-priority task silently reset its priority to medium.
   - Fixed by removing that line so the task's existing priority is preserved.

3. **Status filter using substring matching (`taskService.js`)**
   - `getByStatus` used `.includes(status)`, meaning filtering for `"progress"` or `"do"` would match `"in_progress"` or `"todo"`.
   - Fixed by switching to exact equality (`t.status === status`).

4. **Inability to paginate filtered results (`routes/tasks.js`)**
   - The route handler returned early on `if (status)`, ignoring `page` and `limit` query parameters.
   - Refactored `GET /` to filter first and then paginate the resulting set.

5. **`PUT /tasks/:id` allowing mutation of `id` and `createdAt` (`taskService.js`)**
   - `update` did a direct shallow merge of `req.body`, allowing clients to overwrite the task's ID or creation date.
   - Fixed by ignoring `id` and `createdAt` during updates.

---

## Feature Implementation: `PATCH /tasks/:id/assign`

Added the assignment endpoint with the following design considerations:

- **Validation:**
  - Added `validateAssignTask` in `validators.js`.
  - `assignee` is required and must be a non-empty string.
  - Passing empty strings, strings with only whitespace, numbers, booleans, or null returns a `400 Bad Request`.
  - Leading and trailing whitespace is trimmed before saving.
- **Task Lookup:**
  - Returns `404 Not Found` if the task does not exist.
- **Reassignment:**
  - Allows assigning unassigned tasks as well as reassigning tasks that already have an assignee.
- **Tests:**
  - Added unit tests in `taskService.test.js` and integration tests in `tasks.test.js` covering the happy path, validation failures, non-string types, and 404s.

---

## Reflection & Wrap-up

### What I'd test next with more time
- **Concurrency & Race Conditions:** Because the data store is an in-memory array, concurrent asynchronous operations could potentially read or mutate stale state. I'd add load/concurrency tests simulating simultaneous updates and deletes.
- **Date / Timezone Edge Cases:** Test diverse date formats for `dueDate` (e.g. UTC vs local timezone offsets) and verify edge cases around `getStats` overdue logic when tasks are due at the exact current second.
- **Database Integration:** If this were moving beyond an in-memory prototype, I'd write repository-level integration tests backed by an actual database with transaction rollbacks between tests.

### What surprised me in the codebase
- The README documentation listed valid statuses as `pending | in-progress | completed`, while the actual codebase and validator used `todo | in_progress | done`. Running the sample curl in the README would fail out of the box.
- The `completeTask` function resetting `priority` to `'medium'` felt like an easy-to-miss copy-paste bug that would cause subtle data loss in production.
- `taskService.js` implemented `findById`, but there was no corresponding `GET /tasks/:id` route exposed in the API.

### Questions I'd ask before shipping to production
1. **Persistence:** What database are we using for production? An in-memory store won't survive pod restarts or work across multiple instances behind a load balancer.
2. **User Validation:** Should `assignee` just be a free-text name, or should it validate against a real user ID from an auth/users service?
3. **Deletion Strategy:** Are hard deletes acceptable, or should we support soft deletes (`deletedAt`) to retain an audit trail?
4. **Concurrency Control:** Do we need optimistic concurrency locking (e.g., an `ETag` or `version` column) to prevent concurrent writes from stomping on each other?
