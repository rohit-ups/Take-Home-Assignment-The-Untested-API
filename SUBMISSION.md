# Submission: The Untested API

| | |
|---|---|
| **Live API** | https://take-home-assignment-the-untested-api-iopg.onrender.com |
| **Repository** | https://github.com/atharvsp02/Take-Home-Assignment-The-Untested-API/tree/submission |
| **Bug report** | [BUG_REPORT.md](./BUG_REPORT.md) |
| **API docs** | [README.md](./README.md#api-reference) |

## Summary

- **121 tests** (unit + integration) with **98.9% statement coverage**. Every
  endpoint has a happy-path test and several edge cases.
- **10 bugs found** through those tests, all reproduced by hand with `curl`,
  and documented with where they live, why they happen and how to fix them.
- **8 bugs fixed**: every High and Medium severity bug, one commit each, and
  each with regression tests. The 2 remaining Low severity bugs are
  documented with proposed fixes.
- **`PATCH /tasks/:id/assign`** implemented test-first.
- **README corrected** where it disagreed with the code.

## What the brief asked for, and where to find it

| Brief | Where |
|-------|-------|
| Day 1: unit tests for `taskService.js` | `task-api/tests/taskService.test.js` |
| Day 1: integration tests with Supertest | `task-api/tests/tasks.api.test.js`, `task-api/tests/app.test.js` |
| Day 1: 80%+ coverage, with the summary | [Test coverage](#test-coverage) below |
| Day 2 A: bug report | [BUG_REPORT.md](./BUG_REPORT.md) |
| Day 2 B: fix one bug | 8 fixed, see [How I approached the fixes](#how-i-approached-the-fixes) |
| Day 2 C: `PATCH /tasks/:id/assign` with tests | [Design decisions](#patch-tasksidassign-design-decisions) below |
| Submission note | [Notes the brief asked for](#notes-the-brief-asked-for) below |

## Test coverage

`npm run coverage` inside `task-api/`:

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.91 |    99.15 |   97.05 |   98.82 |
 src             |    91.3 |     90.9 |      80 |    91.3 |
  app.js         |    91.3 |     90.9 |      80 |    91.3 | 54-55
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |      100 |     100 |     100 |
  taskService.js |     100 |      100 |     100 |     100 |
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       121 passed, 121 total
```

The only uncovered lines are `app.listen(...)`, which runs only when the file
is started directly (`npm start`). The tests import the app without starting a
server, which is what lets Supertest run them in-process.

**How the tests are organised:**
- The service is unit-tested directly, so a failure points at the business
  logic rather than at HTTP handling. The routes are tested over HTTP, so the
  suite also checks what a real client sees: status codes, validation
  messages and JSON handling.
- The in-memory store is reset before every test, so no test depends on
  another test's data or on the order the tests run in.
- Overdue logic is tested with fixed dates (year 2000 and 2999) instead of
  "now plus a day", so the results don't depend on when the tests run.
- Tests check behaviour (inputs and outputs), not how the code is written,
  which is why the same tests kept passing while the fixes changed the code.

## How I approached the fixes

1. **Prove the bug with a test first.** Each bug got a test that asserts the
   *correct* behaviour, marked `test.failing`, so the suite stayed green while
   still recording the bug.
2. **Fix, then flip.** After each fix, Jest reports that the `test.failing`
   test now passes, and it's switched to a normal test. That's a built-in check
   that the fix works, and the test then stops the bug from coming back.
3. **One commit per bug**, so each fix can be reviewed or reverted on its own.
   The history reads in order: tests, then the bug report, then the fixes, then
   the feature.
4. **Guard the valid cases, too.** For example, the #4 fix makes validators
   reject `null` status, but `dueDate: null` means "no due date" and has to keep
   working, so there are tests for that on both POST and PUT.

**What I fixed and why:** I fixed every High and Medium bug, because they
corrupt data, crash a feature or return wrong results for normal requests. #8
(odd `page`/`limit` values) and #9 (`description` type, loose date formats)
are Low severity, and fixing them properly needs decisions the brief doesn't
settle, such as the maximum page size or whether date-only values count as
valid. They're documented with proposed fixes, and their tests are ready to
switch on.

**Two bugs were connected.** Fixing #2 (`.includes()` → `===`) also stopped
the #4 crash, because the filter no longer calls a method on a `null` status.
I still fixed #4 in the validators: without that, bad data would still get
into the store and quietly throw off `/tasks/stats`. Blocking bad data on the
way in, and also making the code that reads it tolerate it, is safer than
relying on either alone.

## `PATCH /tasks/:id/assign`: design decisions

| Question | Decision | Why |
|----------|----------|-----|
| Empty string? | `400`, same for whitespace-only, non-string, missing, or over 100 characters | An empty name isn't a person. Surrounding spaces are trimmed so `"  Asha "` and `"Asha"` are the same. The 100-character cap stops unbounded strings from being stored. |
| Already assigned to someone else? | `409 Conflict`, and the current assignee is kept | A task should never be silently taken from someone, for example when two people assign it at the same moment. Handing a task over is still possible, but it's deliberate: unassign, then assign. |
| Assigned to the same person again? | `200`, no change | If a client retries after a timeout, the retry shouldn't fail. |
| How do you unassign? | `{ "assignee": null }` | Consistent with `dueDate: null` meaning "none", and it needs no extra endpoint. |
| Can POST or PUT set `assignee`? | No, both ignore it | If they could, the validation and the 409 rule could be bypassed. That's the same kind of issue as bug #5. |
| Which error comes first? | `400`, then `404`, then `409` | Matches the existing PUT route: check the request itself before looking anything up. |

**Tradeoff I'm aware of:** `assignee` is a free-text name, as the brief
specifies. So `"Asha"` and `"asha"` count as different people, and nothing
checks that the person exists. In a real system this should be a user id (see
the production questions below).

## Notes the brief asked for

### What I'd test next

- **Concurrency once there's a real database.** The 409 check reads the task
  and then writes it. With a database and several server instances, two
  requests could both pass the check. I'd test that, and fix it with a
  conditional update (for example, "set assignee where assignee is null").
- **Randomised input tests for the validators**: generating many random JSON
  bodies to find inputs that crash the server or get through unchecked, beyond
  the cases I thought of.
- **Time zones for `overdue`.** Date-only values like `2026-10-01` are read as
  UTC midnight, so whether a task counts as overdue can depend on the server's
  time zone.
- **#8 and #9**, once the open questions below are answered. Their tests are
  already written.
- **A contract test** against an OpenAPI spec, so the docs and the code can't
  drift apart again the way the README did.

### What surprised me

- **The README disagreed with the code.** It listed different status values
  (`pending | in-progress | completed`), and its own sample request could never
  return results.
- **How much damage one bad request could do.** A single `POST` with
  `"status": null` made every filtered list request fail for every user, until
  that task was deleted. The cause was tiny: checking `if (value)` instead of
  `if (value !== undefined)`.
- **PUT could change a task's `id`**, even to another task's id, leaving two
  tasks with the same id.
- **Bugs affecting each other.** Fixing #2 hid the symptom of #4, which is a
  good reason to test the validators directly rather than only the endpoints.
- **`completeTask()` quietly reset priority to `medium`.** It looks like a
  copy-paste leftover, and it would skew any report of completed high-priority
  work.

### Questions I'd ask before shipping to production

1. **Storage:** the in-memory store loses everything on restart and can't be
   shared between multiple server instances. Which database, and do we need
   history (for example, soft deletes)?
2. **Who is allowed to do what?** There's no authentication, so anyone can
   delete or reassign any task. Should `assignee` be a user id that we can
   check exists?
3. **Pagination contract:** what's the maximum page size, and should list
   responses include the total count and next page so clients know when to
   stop? This also decides the fix for #8.
4. **Dates:** should `dueDate` accept date-only values, and in which time zone
   does "overdue" start? This decides the fix for #9.
5. **Is PUT meant to be a full replacement?** The original README said "full
   update", but the code does a partial update. I documented the current
   behaviour, because changing it would break clients.
6. **Dependencies:** `npm audit` reports 11 known vulnerabilities. 7 of them
   are in test-only tools (Jest, Supertest) and never run in production. The 4
   in the runtime path come in through Express: `path-to-regexp` (high,
   slow-regex denial of service), `qs` (moderate), `body-parser` (low), plus
   `uuid` (moderate, though the affected functions aren't used here). I'd
   upgrade these before launch.
7. **Operations:** rate limiting, structured request logs, and monitoring on
   the 500 rate. The error handler now only logs real server errors, which
   makes that monitoring meaningful.

## Running locally

```bash
cd task-api
npm install
npm start          # http://localhost:3000
npm test           # 121 tests
npm run coverage   # tests + coverage table
```
