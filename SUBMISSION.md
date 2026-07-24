# Take-Home Submission & Developer Reflection

Hi team! Here is my submission for **The Untested API** take-home assignment. 

Below is an overview of what I built, the bugs I found, design decisions and trade-offs I made for the new feature, things that surprised me in the codebase, and what I'd ask before shipping this to production.

---

## 1. Feature Implementation: `PATCH /tasks/:id/assign`

### Design Decisions & Validation Logic
When building `PATCH /tasks/:id/assign`, I focused on keeping the input contract clear and preventing garbage data from entering the task store:

1. **Input Validation (`validateAssignTask` in [`validators.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/utils/validators.js))**:
   - I required `assignee` to be present, to be of type `string`, and to be non-empty after trimming (`assignee.trim() !== ''`).
   - If the client sends an empty string (`""`), whitespace (`"   "`), a non-string value (number, boolean), or omits `assignee` entirely, the endpoint responds with `400 Bad Request` and a helpful message: `'assignee is required and must be a non-empty string'`.

2. **Trade-off on Empty Strings & Unassigning**:
   - The brief asked: *"What should happen if assignee is an empty string?"*
   - I considered whether an empty string should mean "unassign the task" (setting `assignee = null`). However, in a RESTful API, attempting to assign a task with an empty name is almost always a client-side form error or payload bug. I decided it was much safer to return `400 Bad Request`. If unassigning tasks is needed later, a dedicated `DELETE /tasks/:id/assign` or explicit `{ "assignee": null }` would be a far cleaner API contract.

3. **Task Existence & Re-assignment**:
   - If the task ID doesn't exist, the endpoint returns `404 Not Found`.
   - If a task is already assigned to someone, sending a new `assignee` updates it to the new person smoothly.

---

## 2. What Surprised Me in the Codebase

- **The Priority Reset on Task Completion**: 
  In `taskService.completeTask`, line 69 explicitly included `priority: 'medium'`. I was surprised to find that completing a high-priority task would silently downgrade its priority to medium. It felt like a leftover placeholder from initial prototyping.

- **Schema Discrepancy Between Docs and Code**: 
  The `README.md` listed task statuses as `"pending | in-progress | completed"`, but `ASSIGNMENT.md` and `src/utils/validators.js` used `"todo | in_progress | done"`. Checking the code first prevented writing tests against the wrong status strings!

- **Substring Matching for Status Queries**: 
  `getByStatus` used `tasks.filter(t => t.status.includes(status))`. I was surprised that requesting `?status=do` would return both `todo` and `done` tasks simultaneously.

---

## 3. What I'd Test Next With More Time

- **Complex Date Edge Cases**: Currently, `Date.parse()` validates `dueDate`. Standard JS `Date.parse()` accepts some loose formats (like `"2026-12-31"` or `"2026"`). With more time, I'd write strict ISO-8601 regex validation tests and use Jest fake timers to test timezone boundary transitions for overdue task calculations.
- **Concurrent Async Operations**: Because `tasks` is an in-memory array (`let tasks = []`), rapid concurrent `PUT`, `PATCH`, or `DELETE` requests can cause race conditions or array index mismatches during splicing. I'd add load/concurrency integration tests.
- **Express Middleware Error Catching**: I'd add tests specifically forcing an unhandled error inside a route to verify that the custom 500 error handler middleware (`app.use((err, req, res, next) => ...)`) responds correctly.

---

## 4. Questions I'd Ask Before Shipping to Production

1. **Persistence & Database Migration**: What database (e.g. Postgres, MongoDB) will replace the in-memory array, and do we need transaction support for task updates?
2. **Auth & Ownership**: Who can assign or modify tasks? Should we attach `assignedBy` or `createdById` fields, and restrict editing based on user roles?
3. **Pagination Caps & Defaults**: Should we enforce a maximum `limit` (e.g. `limit=100`) on `GET /tasks` to prevent clients from requesting 10,000 tasks at once and causing memory pressure?
4. **Audit History**: Do stakeholders want an activity log tracking when tasks change status or get reassigned over time?

---

## 5. Test Suite & Coverage Summary

- **Total Test Cases**: 59 passing tests across 3 suites (`validators.test.js`, `taskService.test.js`, `tasks.test.js`).
- **Code Coverage**: **100%** statement, **100%** branch, **100%** function, and **100%** line coverage across all files.

