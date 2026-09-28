# Day 2 — Find & Build

> Day 1 deliverables (test suite, coverage, full bug report) are in [`DAY1.md`](./DAY1.md).
> This file covers **Part A** (bug report), **Part B** (fix one bug) and **Part C**
> (new endpoint).

**Status**

| Part | State |
|---|---|
| A — Bug report | 7 bugs documented (full detail in `DAY1.md`) |
| B — Fix one bug | **Bug 1 (pagination) fixed and verified** |
| C — New feature | **`PATCH /tasks/:id/assign` shipped with 20 tests** |

**Suite:** 95 tests · 85 passing · 10 failing (the 10 are the unfixed bugs below)
**Coverage:** 98.74% stmts / 97.8% branch / 96.66% funcs

---

## Part A — Bug report

All 7 bugs, with expected vs actual, discovery method and a proposed fix, are written
up in full in [`DAY1.md` → Bugs found](./DAY1.md#bugs-found). Summary table:

| # | Severity | Summary | Fixed? |
|---|---|---|---|
| 1 | Critical | Pagination off by one page | **Yes — Part B** |
| 2 | High | Malformed JSON returns 500 instead of 400 | No |
| 3 | High | `?status=` substring-matches instead of equality | No |
| 4 | Medium | Completing a task resets `priority` to `medium` | No |
| 5 | Medium | `PUT` can overwrite a task's `id` | No |
| 6 | Medium | `completedAt` not stamped when status becomes `done` | No |
| 7 | Low | `GET /tasks/:id` does not exist | No |

Each bug was confirmed by driving a **live server** and observing raw responses, not
by reading source. The 10 currently-failing tests correspond exactly to bugs 2–7.

---

## Part B — Fix one bug (Bug 1: pagination)

**The bug.** `GET /tasks?page=1&limit=2` returned the *second* page of results, and
the final page was never reachable. With 4 tasks, page 1 gave Task 3–4 and page 2
gave nothing.

**Root cause.** `src/services/taskService.js` computed the offset as
`page * limit`, but the route layer numbers pages from 1 — so page 1 skipped the
first `limit` tasks.

**The change** (one file, `src/services/taskService.js`):

```js
// before
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};

// after
const getPaginated = (page, limit) => {
  // Pages are 1-based at the route layer, so page 1 must start at the first task.
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const offset = (safePage - 1) * safeLimit;
  return tasks.slice(offset, offset + safeLimit);
};
```

The stated defect was the offset. While fixing it I found the inputs were also
unguarded: `?page=-1` produced a negative slice index and `?page=0` skipped a page.
`Number(x) || fallback` coerces `undefined`/`null`/`NaN`, and `Math.max(1, …)` clamps
zero and negatives. That guard is what the 3 added tests cover.

**Verification** — against a live server on port 3321 with 6 seeded tasks, not only
under Supertest:

```
page=1&limit=2 -> Task 1, Task 2
page=2&limit=2 -> Task 3, Task 4
page=3&limit=2 -> Task 5, Task 6
page=4&limit=2 (past end) ->
page=0&limit=2 -> Task 1, Task 2
page=-1&limit=2 -> Task 1, Task 2
page=abc&limit=2 -> Task 1, Task 2
```

| | Before fix | After fix |
|---|---|---|
| Tests | 72 | 75 |
| Passing | 57 | 65 |
| Failing | 15 | 10 |
| Branch coverage | 97.33% | 97.46% |

The 5 pre-existing pagination tests went green and **no previously-passing test broke**.

**Known quirk, deliberately not fixed.** `GET /tasks?page=1&limit=0` returns 10 tasks
rather than erroring. That comes from `parseInt('0') || 10` at
`src/routes/tasks.js:21` — `0` is falsy, so it falls through to the default before
reaching the service guard. Deciding whether `limit=0` is a `400` or means "unset" is
a product decision outside Bug 1's scope, so it is flagged rather than silently changed.

---

## Part C — New feature: `PATCH /tasks/:id/assign`

```http
PATCH /tasks/:id/assign
Content-Type: application/json

{ "assignee": "ada" }
```

Returns `200` with the updated task, `400` for an invalid assignee, `404` if the task
does not exist.

### Design decisions

The brief asked what should happen for an empty assignee and for a task that is
already assigned. My choices, and why:

| Question | Decision | Reasoning |
|---|---|---|
| Empty string `""` | **400** | "Assign to nobody" is a different operation. Since there is no unassign endpoint, silently accepting `""` would leave a task assigned to an empty string with no way to clear it. A 400 makes the client send a real name. |
| Whitespace-only `"   "` | **400** | Same as above, but a subtler version — caught by trimming before validating. |
| Non-string (`42`, `null`, array, object) | **400** | The field is typed as a string in the spec. Rejecting non-strings keeps the store from holding mixed types. |
| Missing `assignee` key | **400** | A `PATCH` with nothing to do is a client error, not a no-op success. |
| Already-assigned task | **200, overwritten** | Reassignment is the normal case — people change owners. Making it a `409` would break the obvious workflow for no safety gain. The response always reflects the new assignee. |
| Assign a completed task | **200, allowed** | Assigning completed work is legitimate (audits, handovers). The `done` status is preserved. |
| Surrounding whitespace `"  ada  "` | **200, trimmed to `"ada"`** | Avoids `"ada"` and `"ada"` becoming two different assignees downstream. |
| Unassign | **Not supported** | Out of scope for the brief. Worth a follow-up endpoint if it comes up. |

### Changes

Three small additions, one per layer:

**1. `src/utils/validators.js`** — a `validateAssign` validator, following the existing
pattern of returning an error string or `null`:

```js
const validateAssign = (body) => {
  if (body.assignee === undefined) {
    return 'assignee is required';
  }
  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee must be a non-empty string';
  }
  return null;
};
```

**2. `src/services/taskService.js`** — an `assign` method, mirroring `remove`'s
null-on-missing convention:

```js
const assign = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], assignee };
  tasks[index] = updated;
  return updated;
};
```

**3. `src/routes/tasks.js`** — the route, with the same 400/404 shape as every other
route in the file:

```js
router.patch('/:id/assign', (req, res) => {
  const error = validateAssign(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const assignee = req.body.assignee.trim();
  const task = taskService.assign(req.params.id, assignee);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});
```

Note the `assignee` field is **absent** from `create()` in the service, so new tasks
simply have no `assignee` key until first assigned. I chose that over defaulting to
`null` so "never assigned" is distinguishable from "assigned to nobody".

### Tests

20 new tests, written **before** the implementation as the brief asked — 13
integration tests in `tests/tasks.routes.test.js` and 7 unit tests in
`tests/validators.test.js`. All 13 integration tests passed on the first run against
the new code.

| Case | Expected |
|---|---|
| Assign a task | `200`, `assignee` set, other fields untouched |
| Assignment persists | A later `GET /tasks` shows the assignee |
| Other fields preserved | title, description, priority, status unchanged |
| Reassign an already-assigned task | `200`, replaced with the new name |
| Whitespace padded name | `200`, stored trimmed |
| Unknown task id | `404` |
| Missing `assignee` | `400` |
| Empty string | `400` |
| Whitespace-only string | `400` |
| Non-string (`42`) | `400` |
| `null` | `400` |
| Failed validation does not assign | Task still has no `assignee` |
| Assign a completed task | `200`, assignee set, status stays `done` |

### Live verification

Confirmed against a real server on port 3331, not only Supertest:

```
created: ship it / priority=high / assignee=[]
assign ada          -> 200 OK  assignee=ada
reassign grace      -> 200 OK  assignee=grace
whitespace '  ada ' -> 200 OK  assignee=ada
empty string        -> HTTP 400
whitespace only     -> HTTP 400
number 42           -> HTTP 400
null                -> HTTP 400
unknown id          -> HTTP 404
final: title=ship it priority=high status=todo assignee=ada
```

The `final:` line confirms the task's `title`, `priority` and `status` were untouched
by the assign calls — the endpoint only writes the one field.

---

## What I'd test next

- **A real persistence layer.** The in-memory store means `PUT`/`PATCH` semantics
  around missing rows and concurrent writes are untested; behaviour under an actual
  database would likely differ.
- **Concurrency and duplicate submission.** Two simultaneous `POST /tasks` requests
  could collide, and a client retrying after a timeout may create duplicates. Nothing
  here tests idempotency.
- **Property-based pagination.** A property test asserting "the concatenation of all
  pages equals the full list, with no gaps or repeats" would have caught Bug 1
  outright and would catch any future regression in the offset math. This is the
  single highest-value addition.
- **Input validation as a table.** `validators.js` is a long `if` chain; a
  table-driven test over the valid/invalid matrix would scale far better than the
  one-case-per-test style used here.

## Anything that surprised me

- **Completing a task silently downgraded its priority to `medium` (Bug 4).** A single
  stray property in the update object. Nothing about the endpoint name suggests it
  touches priority — this would have shipped as "the API quietly loses data".
- **A client could rewrite a task's `id` via `PUT` (Bug 5)**, after which the task was
  permanently unreachable through its own URL. The service spread the request body
  straight onto the stored object with no allowlist.
- **Pagination had the same failure shape on both sides**: the route treated pages as
  1-based while the service treated them as 0-based. Two individually reasonable
  lines of code disagreeing across a boundary is exactly the class of bug that unit
  tests on each side in isolation miss.
- **`/tasks/stats` is correctly ordered before `/:id`**, which is easy to get wrong and
  would have been an obvious bug — worth recording that it was checked and is fine.
- The `validators.js` `dueDate` guard uses truthiness (`if (body.dueDate && ...)`), so
  `null` is accepted. That is *correct* — it's what lets you clear a date — but it
  reads like a missing `!== undefined` check, so it will look like a bug to the next
  reader. It is documented in `DAY1.md` under "Checked and found NOT broken".

## Questions I'd ask before shipping to production

1. **Is `limit=0` a `400` or "use the default"?** Right now it silently returns 10
   (Part B, known quirk). Needs a product decision.
2. **Should an unknown `?status=` be a `400`?** Today `?status=bogus` returns `[]`,
   which is indistinguishable from "no tasks match". For a production API I'd expect a
   `400` so a client typo doesn't look like an empty project.
3. **Is overwriting `id` via `PUT` intended to be blocked at the service or the route
   layer (Bug 5)?** Also: should `PUT` be a full replace rather than a merge? Right
   now it merges, so you cannot clear a field by omitting it.
4. **Should an unassign operation exist?** The 400-on-empty decision means there is
   currently no way to remove an assignee once set.
5. **What is the rate limit / auth story?** Neither exists, and both are needed before
   this is internet-facing.
6. **Who calls `PATCH /complete` on an already-done task?** It's currently idempotent,
   which is probably right, but I would want that confirmed as intentional.
