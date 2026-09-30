# Bug Report — Task API

Found by writing tests and probing the running app. Bugs #1 and #2 are **fixed**;
the rest are documented and covered by `test.failing` tests (the suite is green now,
and each of those tests will start failing loudly — "remove .failing" — once the bug is fixed).

## #1 Pagination skips the first page — FIXED
- **Where:** `src/services/taskService.js` → `getPaginated`
- **Expected:** `?page=1&limit=2` returns items 1–2.
- **Actual:** returned items 3–4. `page=0` (coerced to 1 by the route) behaved identically.
- **Why:** `offset = page * limit` treats `page` as 0-indexed, but the API (and the route's `|| 1` default) is 1-indexed.
- **Found by:** a pagination test with 5 tasks expecting `[T1, T2]`.
- **Fix:** `offset = (page - 1) * limit`.
- **Still open (related):** `page=-1` or `limit=-5` yields a negative offset/`slice` and silently returns odd results; there's no max `limit`. Suggest clamping (`page >= 1`, `1 <= limit <= 100`) or returning 400.

## #2 Status filter uses substring matching — FIXED
- **Where:** `src/services/taskService.js` → `getByStatus`
- **Expected:** `?status=done` returns only `done` tasks; an invalid status returns nothing (or 400).
- **Actual:** `?status=do` returned every `todo` **and** `done` task.
- **Why:** `t.status.includes(status)` is a String `includes`, not equality.
- **Found by:** test filtering with the partial value `do`.
- **Fix:** `t.status === status`.
- **Suggestion:** validate `?status` against the allowed list and return 400 for unknown values.

## #3 Completing a task silently resets priority to `medium`
- **Where:** `taskService.completeTask` (`priority: 'medium'` in the updated object)
- **Expected:** only `status` and `completedAt` change.
- **Actual:** a `high` priority task becomes `medium` after `PATCH /tasks/:id/complete`.
- **Found by:** create high-priority task → complete → assert priority unchanged.
- **Fix:** delete the `priority: 'medium'` line.

## #4 PUT (and `update`) can overwrite server-controlled fields
- **Where:** `taskService.update` → `{ ...tasks[index], ...fields }`; validators don't reject unknown keys.
- **Expected:** `id`, `createdAt`, `completedAt` can't be changed by clients.
- **Actual:** `PUT /tasks/:id {"id":"hacked"}` changes the task's id (task then unreachable by its old id); arbitrary extra keys are stored.
- **Fix:** whitelist `title, description, status, priority, dueDate` (and `assignee`) before merging.
- **Related:** setting `status: "done"` via PUT doesn't set `completedAt`, so `/complete` and PUT produce inconsistent data.

## #5 Completing an already-completed task overwrites `completedAt`
- **Where:** `taskService.completeTask`
- **Expected:** idempotent — original completion time preserved (or a 409).
- **Actual:** each call stamps a new `completedAt`.
- **Fix:** if `task.status === 'done'`, return the task unchanged.

## #6 Empty-string `status`/`priority` bypass validation
- **Where:** `validators.js` — `if (body.status && ...)`.
- **Actual:** `POST {"title":"x","status":""}` is accepted and stored with `status: ""` (the default only applies to `undefined`). Such a task is then invisible to stats counts.
- **Fix:** use `body.status !== undefined && !VALID_STATUSES.includes(body.status)` (same for `priority`; and reject non-string `description`).

## #7 Malformed JSON returns 500 instead of 400
- **Where:** `src/app.js` error handler.
- **Actual:** `express.json()` throws a `SyntaxError` (`err.status === 400`) but the handler always responds 500 and logs a stack trace.
- **Fix:** `res.status(err.status || 500)` and don't leak/log client errors as server errors.

## #8 `?status=` short-circuits pagination
- **Where:** `routes/tasks.js` `GET /` — returns right after `getByStatus`.
- **Actual:** `?status=todo&page=1&limit=2` ignores `page`/`limit`.
- **Fix:** filter first, then paginate the filtered list.

## Minor / observations
- `create` and `getAll` return references to the stored objects (a caller mutating them mutates the store). `getAll` copies the array, not the items.
- README documents statuses `pending | in-progress | completed`; ASSIGNMENT and code use `todo | in_progress | done`. The code is what I tested against.
- No 404 handler for unknown routes beyond Express's default HTML response.

---

# `PATCH /tasks/:id/assign` — design decisions
- **Validation:** `assignee` must be a string, non-empty after trim, ≤ 100 chars → otherwise `400`. Whitespace is trimmed before storing so `"  Bob "` and `"Bob"` are equal.
- **Empty string:** rejected (400). Un-assigning isn't requested; if needed it should be an explicit `assignee: null` or a `DELETE /:id/assign` rather than an accidental empty string.
- **Already assigned:** allowed; it overwrites (200). Reassigning is a normal workflow, and PATCH is naturally idempotent. A 409 would force clients to unassign first for no real safety gain. (Trade-off: no audit trail of previous assignees.)
- **404 vs 400 ordering:** body is validated before lookup, so a bad body on a nonexistent task returns 400. Either order is defensible.
- **Data model:** tasks now carry `assignee: null` by default so the response shape is consistent.
- **Not done (would ask first):** should assignees be validated against a user list? Should completed tasks be assignable? I allowed it.

# Submission note
# Submission note

**How I worked:** I used an AI tool (Claude) to help write the tests.
 After that, I read the source files myself, ran the tests, and
checked the pagination and status-filter bugs by looking at the actual
output. The README allows AI tools, so I am mentioning it here.

**What I would test next:**
- Pagination with page=-1, page=0 and a very large limit. Right now the
  code does not handle these properly.
- Using PUT to set status to "done" and checking whether completedAt is set.
- Sending status and page/limit together in one request.

**What surprised me:**
- Completing a task changes its priority to "medium", even if it was "high".
  It looks like a mistake, not something done on purpose.
- Searching with ?status=do returned both "todo" and "done" tasks.
- The README lists statuses as pending / in-progress / completed, but the
  code uses todo / in_progress / done.

**Questions I would ask before shipping:**
- Data is stored in memory, so it is lost when the server restarts. What is
  the plan for a database?
- Is there any login or permission check? Right now anyone can change or
  delete any task.
- Should page numbers start at 1 or 0? Do any existing users depend on the
  current behavior?