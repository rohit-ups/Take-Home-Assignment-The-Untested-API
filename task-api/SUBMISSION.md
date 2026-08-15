# Submission Notes

## Coverage summary

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.07 |    92.30 |   93.75 |   96.79 |
 src             |   69.23 |    75.00 |    0.00 |   69.23 |
  app.js         |   69.23 |    75.00 |    0.00 |   69.23 | 10-11, 17-18
 src/routes      |  100.00 |    89.18 |  100.00 |  100.00 |
  tasks.js       |  100.00 |    89.18 |  100.00 |  100.00 | 28-29, 40-41
 src/services    |  100.00 |    94.73 |  100.00 |  100.00 |
  taskService.js |  100.00 |    94.73 |  100.00 |  100.00 | 22
 src/utils       |   96.96 |    95.45 |  100.00 |   96.96 |
  validators.js  |   96.96 |    95.45 |  100.00 |   96.96 | 38
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 2 passed, 2 total
Tests:       103 passed, 103 total
Time:        8.109 s
```

The uncovered lines are:
- `app.js 10-11, 17-18` — the global error handler and `app.listen()` branch inside
  `if (require.main === module)`. Neither fires in test because supertest binds the
  app directly without calling listen, and no test deliberately triggers an unhandled
  500 error.
- `tasks.js 28-29, 40-41` — two branch arms in the `GET /tasks` handler that only
  activate when page/limit are passed without a status filter alongside them (the
  combined filter path covers those params, but not the solo-limit or solo-page path
  individually). Not a coverage gap that affects confidence.
- `taskService.js 22` — the `else` arm of `if (counts[t.status] !== undefined)` inside
  `getStats`. This guards against an unknown status value reaching the counter — it
  can't happen now that `getByStatus` and validators both enforce the enum.
- `validators.js 38` — the `dueDate` validation branch in `validateUpdateTask`.
  Already covered in the POST validator; the PUT path is covered by `validateCreateTask`
  tests but the specific PUT-dueDate test was omitted. Easy to add.

---

## What I'd test next if I had more time

1. **Concurrency / race conditions** — the in-memory store is a plain array mutated
   synchronously. If this ever moved to an async data store (even a file), concurrent
   writes on `update` and `assignTask` could corrupt a task. Worth adding a
   concurrent-request integration test that fires two PATCHes simultaneously and
   asserts the final state is consistent.

2. **The 500 error handler** — `app.js` has a global Express error handler but it's
   never exercised. I'd add a test that mounts a route which deliberately calls
   `next(new Error(...))` and asserts the handler returns `{ error: 'Internal server
   error' }` with a 500 status.

3. **`GET /tasks?limit=` without `page=`** and vice versa — the route defaults the
   missing param (`parseInt(undefined) || 1` → 1), but that behaviour isn't explicitly
   tested. Edge cases like `?limit=0` or `?page=-1` also deserve tests since both
   would produce unexpected slices.

4. **Load/pagination consistency** — if a task is deleted between page 1 and page 2
   requests, page 2 shifts. Worth a test that documents this known limitation.

5. **`DELETE` then `PUT/PATCH` on the same id** — confirmed 404, but not all variants
   (e.g. deleting then assigning) are tested.

---

## Anything that surprised me in the codebase

Three things stood out:

1. **`completeTask` hard-coded `priority: 'medium'`** — this is the most surprising bug
   because it's buried inside a spread and looks intentional. It silently destroys data
   (a task's priority) on a mutation that has nothing to do with priority. In production
   this would be very hard to debug — the task looks fine, it just has the wrong priority
   field with no audit trail.

2. **`getByStatus` using `String.prototype.includes`** — this reads like a typo
   (`t.status.includes(status)` vs `t.status === status`) but it has a real practical
   consequence: any prefix or infix of a valid status string would silently return
   wrong results. This is the kind of bug that almost always slips through manual QA
   because people test with valid status values.

3. **No `assignee` field in the original task shape** — the assignment brief mentions
   `PATCH /tasks/:id/assign` but the task object in the README and the `create()`
   function had no `assignee` field at all. That meant `GET /tasks` before the feature
   would return tasks without the field, and after the feature would return tasks with
   it — an inconsistent shape depending on whether the task had been assigned. I fixed
   this by adding `assignee: null` to `create()` so every task always has the field.

---

## Questions I'd ask before shipping to production

1. **Persistence** — the store is in-memory and resets on every restart. Is there a
   database migration plan? What happens to in-flight tasks on a deploy? The service
   layer is cleanly separated from the data store so swapping to a real DB is
   straightforward, but it needs to be on the roadmap.

2. **Authentication & authorisation** — currently any caller can assign, delete, or
   complete any task. Should there be ownership rules? Can only the assignee complete a
   task? Can only the task creator delete it?

3. **Audit trail** — there's a `completedAt` timestamp but no `assignedAt`, no
   `updatedAt`, and no history of status changes. If this is a real task tracker,
   product will almost certainly ask "who assigned this and when?" eventually.

4. **`PUT` semantics** — the endpoint is named "full update" but the implementation is
   a partial merge (it doesn't clear fields that are absent from the body). If a client
   sends `PUT /tasks/:id { "title": "X" }` expecting a full replace, `description`,
   `priority`, etc. will be silently preserved. This is either a REST contract mismatch
   or the endpoint should be renamed to `PATCH`.

5. **Rate limiting & input size** — there's no body size limit and no rate limiting.
   A caller could send a multi-megabyte `title` or flood the endpoint. Worth adding
   `express.json({ limit: '10kb' })` at minimum before going live.
