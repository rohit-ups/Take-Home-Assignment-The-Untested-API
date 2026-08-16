# Submission Notes

## Coverage summary

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.7 |    98.82 |   96.66 |   98.58 |
 src             |   84.61 |       75 |      50 |   84.61 |
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |      100 |     100 |     100 |
  taskService.js |     100 |      100 |     100 |     100 |
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       84 passed, 84 total
```

The only uncovered lines are `app.js:17-18`, the `app.listen(...)` call
guarded by `if (require.main === module)` — it deliberately doesn't run
under Jest since `app.js` is imported as a module, not executed directly.
Everything actually reachable in tests is at 100%.

Run it yourself: `npm test` / `npm run coverage` from `task-api/`.

---

## `PATCH /tasks/:id/assign` — design decisions

- **Validate before checking existence.** Same order as the existing
  `PUT /:id` handler: malformed input gets a 400 regardless of whether the
  task exists, then a 404 if it doesn't. Kept consistent with the codebase's
  existing convention rather than introducing a second pattern.
- **`assignee` must be a non-empty (post-trim) string.** Mirrors how `title`
  is validated in `validators.js`. An empty string or whitespace-only string
  is rejected with 400 — it's not treated as "unassign". There's no
  unassign operation in this API yet; if one's needed, I'd add it as its
  own explicit action (e.g. `DELETE /tasks/:id/assign` or accept `assignee:
  null`) rather than overload an empty string to mean two different things
  through one field.
- **Reassignment is allowed, not blocked.** The brief asks what should
  happen if a task is already assigned. I considered rejecting with 409
  Conflict, but decided against it: nothing in the schema tracks *who* is
  reassigning or *why*, so a 409 would just force the caller to issue an
  unassign-then-assign round trip to do something totally routine (tasks
  get reassigned constantly in any real workflow). PATCH is allowed to be a
  full overwrite of the field it targets; I went with the simpler contract.
- **The value is trimmed before storage.** `"  Priya  "` is stored as
  `"Priya"`. I noticed `title` doesn't do this (validated as trimmed, stored
  raw — see BUGS.md's minor-observations section) and didn't want to repeat
  it in new code, even though fixing `title`'s version was out of scope for
  this pass.
- **`assignee` defaults to `null` on creation.** Added to `create()` so
  every task has the field from the start rather than only tasks that have
  been through `/assign` having it — keeps the object shape consistent for
  API consumers instead of `assignee` being conditionally present.
- **No new validation on `title` etc.** touched — kept the change scoped to
  what Part C asked for.

---

## What I'd test next with more time

- **Concurrent request behavior.** The store is a plain array with no
  locking; two simultaneous `PATCH /:id/complete` (or `/assign`) calls for
  the same id both read-then-write against `tasks[index]` with no atomicity
  guarantee. Not exploitable for corruption in a single-threaded Node event
  loop the way it would be with real parallelism, but worth a concurrency
  test if this ever moves to a store with real concurrent writers.
- **Input fuzzing on `dueDate`.** Current tests cover valid ISO strings and
  one clearly-invalid string (`"not-a-date"`). `Date.parse` is lenient
  (accepts things like `"2026"` or `"March 2026"` as "valid" dates) — worth
  deciding whether the API should be stricter than `Date.parse` allows.
- **Large-payload / type-confusion inputs** on every write endpoint —
  e.g. `title` as a huge string, `description` as an object/array instead
  of a string (currently unvalidated — see below), deeply nested bodies.
- **The three unfixed bugs in BUGS.md**, once prioritized and fixed, need
  their `test.failing()` tests flipped to regular tests plus whatever
  additional edge cases the real fix introduces (e.g. BUG-04's whitelist
  fix needs a test that a *legitimate* field update still works after the
  whitelist is added).
- **`GET /tasks` at scale.** No limit on the unpaginated list endpoint — it
  returns every task in the store. Fine for an in-memory demo, not fine
  once this is backed by a real database with thousands of rows.

## What surprised me in the codebase

- **`getPaginated`'s offset bug (BUG-01)** breaks the single most common
  pagination call (`page=1`, the default) — the bug isn't in some rare edge
  case, it's in the path nearly every paginated request takes. Surprising
  that this wouldn't have been caught by five minutes of manual testing.
- **`completeTask` touching `priority` at all (BUG-02).** There's no
  business reason completion should touch priority — it reads like a
  leftover default that got copy-pasted from `create()`. It's the kind of
  bug that's invisible unless a test asserts on the *whole* response object
  instead of just the fields the endpoint is documented to change, which is
  itself the main lesson I'd take from this exercise.
- **`update()` has no field whitelist (BUG-04).** `taskService.js` is
  otherwise careful — `create()` destructures only the known fields, so
  extra keys in a `POST` body are silently and safely dropped. `update()`
  doesn't follow the same pattern; it does a blind object spread. Given how
  deliberate the rest of the file is about only touching known fields, this
  stood out as the one place that pattern wasn't followed.
- **`_reset()` is already exported** from `taskService.js` despite there
  being no tests in the repo yet — a strong (and correct) hint that the
  store's module-level mutable array was meant to be reset between tests
  from the start.

## Questions I'd ask before shipping this to production

1. **Is the in-memory store intentional for production, or a placeholder?**
   Everything here — no persistence, no concurrency control, no auth — reads
   like a prototype. Worth confirming what's actually shipping vs. what's a
   stand-in for a later real datastore.
2. **Who can call this API?** There's no authentication/authorization
   anywhere — anyone who can reach the service can read, edit, assign, or
   delete any task. Is that intentional for this service's trust boundary
   (e.g. internal-only, behind a gateway that handles auth), or is
   auth missing and expected before production?
3. **What should `PUT /tasks/:id` actually mean?** It's implemented as a
   partial update (`{}` is a no-op, individual fields are optional) but
   named and routed as a full replace. Worth deciding explicitly which
   semantics are intended — it affects whether BUG-04's fix should be "add
   a whitelist" or "require the full object and reject partial bodies."
4. **Should `dueDate` validation be stricter than `Date.parse`?** Right now
   anything `Date.parse` accepts is accepted, which is looser than most
   ISO-8601 validators.
5. **Is there a rate limit / max page size planned for `GET /tasks`?**
   Relevant the moment this sits in front of a real, growing dataset instead
   of an in-memory array that resets on restart.
