# Bug Report

Found by writing characterization tests against the existing endpoints and
`taskService` functions (Day 1), before touching any implementation code.
Each bug below has a corresponding test in `tests/`, so the claims here are
backed by a reproducible failure, not a read-through guess.

Bugs that weren't fixed are still enforced in the suite: their tests use
Jest's `test.failing()`, so they currently show as passing (Jest expects them
to fail) but reference this file. If someone fixes the underlying bug without
reading this doc, that test starts *unexpectedly* passing and Jest fails the
suite — a built-in tripwire instead of a silently-bitrotting TODO comment.

---

## BUG-01: Pagination skips the first page of results

**Where:** `src/services/taskService.js`, `getPaginated()`

```js
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};
```

**Expected:** `GET /tasks?page=1&limit=10` returns the first 10 tasks.

**Actual:** It returns tasks 11–20. `page=1` computes `offset = 1 * 10 = 10`,
so the first `limit` tasks are skipped entirely and are never reachable by
the default/first page. `page=2` then returns tasks 21–30, compounding the
shift on every subsequent page.

**How discovered:** Unit test in `tests/taskService.test.js` (`getPaginated
› page 1 returns the first 'limit' tasks`) and the equivalent integration
test in `tests/tasks.routes.test.js`. Also reproduced directly against the
service in a scratch script before writing tests, to confirm it wasn't a
test-authoring mistake.

**Root cause:** Off-by-one in the offset formula. Pages here are 1-indexed
(the route defaults `page` to `1`), but the offset math treats `page` as
0-indexed.

**Suggested fix:**
```js
const offset = (page - 1) * limit;
```

**Status:** Not fixed (see BUG-02 for the one bug fixed in this submission,
and the note on why this one wasn't picked, at the bottom of this file).

---

## BUG-02: Completing a task silently resets its priority — **FIXED**

**Where:** `src/services/taskService.js`, `completeTask()`

```js
const updated = {
  ...task,
  priority: 'medium',   // <- clobbers whatever priority the task had
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Expected:** `PATCH /tasks/:id/complete` changes `status` and stamps
`completedAt`. Nothing else about the task should change.

**Actual:** A task's `priority` is unconditionally overwritten to
`'medium'` on completion, even if it was `'high'` or `'low'`. This is silent
data loss — the response is a valid-looking task object, so nothing about
the API's behavior signals that a field you didn't touch just changed.

**How discovered:** Unit test asserting the full response object (not just
the fields the endpoint is documented to change) after completing a
`priority: 'high'` task. The assertion on `priority` failed even though the
`status`/`completedAt` assertions passed — a good example of why testing
only the field under change (`status`) would have missed this.

**Root cause:** Looks like a copy/paste of the `create()` default
(`priority = 'medium'`) into an update path where it doesn't belong — there
is no reason completion should touch priority at all.

**Fix applied:**
```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Why this one:** Of the four bugs found, this is the only one that
*silently corrupts data the caller didn't ask to change* — the pagination
and status-filter bugs (BUG-01, BUG-03) produce visibly wrong result sets
that would surface quickly in any manual testing or real usage. A priority
quietly flipping to `medium` on every completed task could go unnoticed for
a long time and mislead anything downstream that trusts `priority` (SLA
dashboards, escalation rules, etc.). It also had the cleanest, lowest-risk
fix of the four — a one-line deletion versus BUG-04's need for a field
whitelist. The assignment asks to fix one; this is the one I'd want fixed
first in a real triage.

**Regression tests:** `tests/taskService.test.js` (`completeTask ›
preserves the task priority it had before completion`) and
`tests/tasks.routes.test.js` (`PATCH /tasks/:id/complete › preserves the
original priority`) — both are plain (non-`.failing`) tests now that the fix
is in.

---

## BUG-03: Status filter does substring matching instead of exact matching

**Where:** `src/services/taskService.js`, `getByStatus()`

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**Expected:** `GET /tasks?status=X` returns tasks whose status is exactly
`X`.

**Actual:** `status.includes(status)` is a substring check, not an equality
check. `GET /tasks?status=do` returns both `todo` tasks (`"todo".includes("do")`
is true) *and* `done` tasks (`"done".includes("do")` is also true — "done"
contains "do" as its first two characters). Any status value that happens to
be a substring of another valid status silently returns the wrong set.

**How discovered:** Test asserting that filtering on a substring of a real
status (`"do"`) returns nothing, since `"do"` isn't itself a valid status.
Reproduced directly against the service first to rule out a test mistake.

**Suggested fix:**
```js
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status:** Not fixed (see the note at the bottom of this file).

---

## BUG-04: `PUT /tasks/:id` can overwrite server-owned fields

**Where:** `src/services/taskService.js`, `update()`

```js
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};
```

**Expected:** A client can update `title`, `description`, `status`,
`priority`, and `dueDate` via `PUT /tasks/:id`. Fields the server owns
(`id`, `createdAt`, `completedAt`) shouldn't be client-settable.

**Actual:** `update()` spreads the *entire* request body onto the stored
task with no field whitelist. `validateUpdateTask()` only checks the shape
of `title`/`status`/`priority`/`dueDate` if present — it doesn't reject or
strip unexpected keys. So `PUT /tasks/:id` with `{ "id": "hacked-id" }` in
the body silently renames the task's id, and `{ "createdAt": "1999-..." }`
rewrites its creation timestamp. Once the `id` is changed this way, the task
is still at the same array index but is no longer reachable by its original
id.

**How discovered:** Unit tests calling `update()` with an `id` / `createdAt`
override and asserting those fields are unchanged in the result.

**Suggested fix:** Whitelist the fields `update()` accepts, e.g.:
```js
const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const patch = Object.fromEntries(
    Object.entries(fields).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
  );
  tasks[index] = { ...tasks[index], ...patch };
  return tasks[index];
};
```

**Status:** Not fixed (see the note at the bottom of this file). This is the
most invasive of the four fixes (new whitelist logic, not a one-line change)
and arguably deserves its own review of what "full update" should mean for
this endpoint, so I left it documented rather than fixed under time
pressure.

---

## Minor observations (not filed as full bugs)

- **Malformed JSON returns 500, not 400.** A body-parser `SyntaxError` from
  an invalid JSON body falls through to `app.js`'s generic error handler,
  which always responds `500 Internal server error`. A malformed *client*
  request is a 400, not a server fault. Covered by a test in
  `tests/tasks.routes.test.js` documenting the current behavior. Fix would
  be a `SyntaxError` check in the error middleware returning 400.
- **`title` is validated as trimmed but stored untrimmed.**
  `validateCreateTask`/`validateUpdateTask` reject a title that is
  whitespace *after* trimming, but `create()`/`update()` store the raw,
  untrimmed value. So `"  Task  "` passes validation and is stored with its
  padding intact. Low impact, but inconsistent — the new `assignee` field
  added for this assignment trims before storing (see SUBMISSION.md) so it
  doesn't repeat the same inconsistency.

## Why only one bug was fixed

`ASSIGNMENT.md` (Part B) asks for one bug fixed with an explanation, not all
of them fixed. I picked BUG-02 for the reasons under its "Why this one"
section above, and documented BUG-01, BUG-03, and BUG-04 here with root
cause, a working test that demonstrates each one, and a concrete suggested
fix, so any of them can be picked up directly.
