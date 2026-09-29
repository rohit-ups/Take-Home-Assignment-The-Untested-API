# Submission Notes

Everything below lives on the `submission` branch in six commits: tests, bug
report, one fix, the assign endpoint (tests first, then implementation), and
these notes. Run `npm test` inside `task-api/`: 83 tests, 3 suites, all green.

---

## Coverage

```
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.72 |    98.85 |   96.66 |    98.6 |
 src             |   84.61 |       75 |      50 |   84.61 |
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |      100 |     100 |     100 |
  taskService.js |     100 |      100 |     100 |     100 |
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |

Test Suites: 3 passed, 3 total
Tests:       83 passed, 83 total
```

The only uncovered lines are `src/app.js:17-18`, the
`if (require.main === module)` block that starts the server. Tests import the
app instead of listening on a port, so those lines never run, which is what
you want from a test setup.

`taskService.js`, `routes/tasks.js` and `validators.js` are at 100% on every
metric.

---

## The fix I chose: pagination

`getPaginated` used `offset = page * limit`. The route defaults a missing page
to 1, so paging is 1-based, and page 1 computed an offset of `limit`. It
silently skipped the first page entirely. Any client following the README got
the wrong tasks, and a store smaller than two pages returned an empty array
for the only page it had.

I picked this one because it breaks the documented contract for every caller
and the fix is three lines (`BUG_REPORT.md` has the full reasoning, including
why I clamp `page` and `limit` to at least 1: without the clamp, `page=-1`
gives a negative offset and `slice` returns the *last* tasks).

Seven tests were written as `it.failing` for this bug: four on `getPaginated`
(page 1, page 2, the partial last page, limit larger than the store) and three
on the route (`page=1`, `page=2`, the non-numeric fallback). The fix commit
flipped all seven to normal passing tests and added one more for the
`page < 1` clamp.

---

## Design decisions: `PATCH /tasks/:id/assign`

**Validation.** `assignee` must be a non-empty string, with one combined
message, `'assignee is required and must be a non-empty string'`, mirroring
how `validateCreateTask` already treats `title`. The brief asks what should
happen with an empty string: I reject it. An empty name is a form that didn't
get filled in, not a deliberate unassign. If we ever need unassignment, it
should be its own endpoint or an explicit `{ "assignee": null }`, not something
a client stumbles into by submitting a blank field. Missing body, `{}`,
`''`, `'   '`, numbers, `null`: all 400.

**Reassignment overwrites with a 200.** A task already assigned to Priya that
comes back with `assignee: "Sam"` just becomes Sam's. No 409. Conflict
semantics need something to conflict *with*: an ownership rule, a lock, an
unassign step. This API has none of those. PATCH is a partial update: send a
field, the field changes. When a real user model shows up, that's the moment
to revisit whether some assignments should be refused.

**Trimming lives in the service,** not the route, so `taskService.assignTask`
hands back a stored name regardless of who calls it. The route passes
`req.body.assignee` straight through; only that one field is read. A body
carrying `status: "done"` alongside `assignee` changes nothing else.

**One gap worth flagging:** `assignee` isn't in the task shape until it's first
set. `create()` doesn't initialize `assignee: null`, so unassigned tasks don't
serialize the key at all. I left `create()` alone because the brief scoped me
to the new endpoint, but in any real client I'd default it to `null` so the
response schema doesn't shift under people.

**Tests came first:** the ten tests (validator, service, route) were committed
before a single line of implementation, then the implementation made them
pass.

---

## The six bugs I left open

`BUG_REPORT.md` documents seven bugs plus two smaller notes. I fixed one
(pagination). The other six are still in the code, and their tests are marked
`it.failing`, Jest's own "this test is supposed to fail" marker. That's why
the suite is green: every test either passes or is expected to fail, and each
of the eight is written against the behavior its bug breaks. When someone
fixes bug #2, they flip its two tests to plain `it`: if a flip doesn't turn
the suite red, the fix wasn't real.

---

## What I'd test next

- **Concurrency on the store.** It's a module-level array with
  `findIndex`-then-mutate patterns. Two overlapping `PUT`s can interleave; the
  in-memory array makes that a real hole the moment traffic isn't serialized.
- **The error handler for real.** `app.js`'s handler hardcodes 500 (bug #6).
  One `it.failing` pins the malformed-JSON case; I'd add forced errors through
  each route and assert the status codes a client would actually switch on.
- **`?status=` composed with pagination.** Bug #4 drops `page`/`limit` whenever
  `status` is present. The failing test is written; once the early `return` is
  gone I'd extend it to filter-then-paginate and paginate-then-filter, since
  those are different orders with different answers on the last page.
- **Truthy vs. present in the validators.** `if (body.status && ...)` lets
  `status: ""` skip validation entirely (secondary note in the report). The
  current tests pin that behavior on purpose; I'd want a decision from the
  team before changing what the API accepts.

---

## What surprised me

`.includes()` in `getByStatus` read as correct on first pass. I saw it as an
array membership check before I saw it as a string substring check, and it
took typing `?status=do` and getting both `todo` and `done` back for it to
click. The truthy checks in the validators are the same shape of trap:
`if (body.status)` and "was status provided" look identical until someone
sends `""`.

`completeTask` hardcoding `priority: 'medium'` isn't a typo. Somebody wrote
that line deliberately, and nothing in the code says why. And the README's
status enum (`pending | in-progress | completed`) doesn't exist in the code at
all; I noticed it during setup, before writing tests, which is the only reason
the tests weren't built against fiction.

---

## Questions before shipping

- **Is the in-memory store a v1 decision or a placeholder?** Everything is
  lost on restart and nothing guards concurrent writes. What replaces it, and
  does `assignee` become a user id when it does?
- **Should `assignee` validate against real users?** Right now it's free text.
  Fine for a demo, wrong the moment a notification system emails whoever the
  string happens to match.
- **Is `PUT /tasks/:id` meant to merge or replace?** The README says "full
  update", the code does a shallow merge, so it behaves like PATCH. Which one
  is the contract?
- **Are status transitions supposed to be restricted?** Can `done` go back to
  `todo`? Nothing says no.
- **What should bad query input return?** `page=-1`, `limit=0`, unknown
  `?status=banana` all currently get silent defaults or empty 200s. I'd argue
  for 400s, but that's a contract change and the team should own it.
