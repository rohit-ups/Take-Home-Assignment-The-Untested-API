# Bug Report — Task Manager API

Found by writing tests first, then reading the source to explain each failure.
Each bug references the test that catches it.

---

### BUG-1: Pagination is off by one page — **FIXED**
- **Where:** `src/services/taskService.js`, `getPaginated(page, limit)`
- **Expected:** `page=1` returns the first `limit` tasks (page numbers are 1-indexed everywhere else in the API — the route defaults `page` to `1`).
- **Actual:** `offset = page * limit`, so `page=1, limit=10` skips the first 10 tasks and returns the *second* page. There is no way to ever see the first page through the query params.
- **How found:** `getPaginated` unit tests and the `GET /tasks?page=1&limit=2` integration test.
- **Fix:** `offset = (page - 1) * limit`. Tests updated to assert page 1 starts at the first task.

### BUG-2: Status filter does substring matching instead of exact matching
- **Where:** `src/services/taskService.js`, `getByStatus`: `tasks.filter((t) => t.status.includes(status))`
- **Expected:** `?status=done` returns only tasks whose status is exactly `"done"`.
- **Actual:** `.includes()` is a *string* `.includes`, so `?status=do` matches both `"todo"` and `"done"` (both contain `"do"`). A client filtering on a status could get an unexpectedly mixed result.
- **How found:** `tests/bugs.test.js`, `?status=do must not match "todo" or "done"`.
- **Suggested fix:** `tasks.filter((t) => t.status === status)`.

### BUG-3: Completing a task silently overwrites its priority
- **Where:** `src/services/taskService.js`, `completeTask`
- **Expected:** Completing a task changes `status` and `completedAt` only.
- **Actual:** The spread hard-codes `priority: 'medium'`, so a `high`-priority task becomes `medium` the moment it's marked done — with no field in the request asking for that.
- **How found:** `completeTask` unit test asserting priority is preserved.
- **Suggested fix:** drop the `priority: 'medium'` line from the update object.

### BUG-4: PUT lets the client overwrite server-managed fields
- **Where:** `src/routes/tasks.js` → `taskService.update`, and `validateUpdateTask` (no allow-list)
- **Expected:** `id`, `createdAt` (and arguably `completedAt`) shouldn't be client-settable.
- **Actual:** `update` does `{ ...tasks[index], ...fields }` with no field whitelist, so a `PUT` body containing `{ "id": "x", "createdAt": "..." }` overwrites them.
- **How found:** integration test sending `id`/`createdAt` in a PUT body.
- **Suggested fix:** destructure only the mutable fields (`title`, `description`, `status`, `priority`, `dueDate`) before merging.

### BUG-5: Malformed JSON returns 500 instead of 400
- **Where:** `src/app.js`, generic error handler
- **Expected:** A body-parsing failure (bad JSON) is a client error → 400.
- **Actual:** `express.json()` throws a `SyntaxError`, which falls into the catch-all error handler that always responds 500 — masking client mistakes as server failures.
- **How found:** integration test posting truncated JSON.
- **Suggested fix:** in the error handler, check `err instanceof SyntaxError && 'body' in err` and return 400.

### BUG-6: Empty-string `status`/`priority` bypasses validation
- **Where:** `src/utils/validators.js`, both validators
- **Expected:** `{ "status": "" }` should be rejected the same way an invalid status string is.
- **Actual:** `if (body.status && ...)` — an empty string is falsy in JS, so the whole check short-circuits and an empty status silently passes validation (and then flows into `getStats`, where it doesn't match any known bucket).
- **How found:** POST with `status: ''`, expecting 400.
- **Suggested fix:** check `body.status !== undefined` instead of truthiness (same pattern already used correctly for `title` in `validateUpdateTask`).

### BUG-7: Pagination params aren't sanitised against negative/garbage values
- **Where:** `src/routes/tasks.js`, `GET /`
- **Expected:** `?page=-1` shouldn't silently produce a nonsensical negative-offset slice.
- **Actual:** `parseInt(page) || 1` only catches `NaN`/`0`/falsy — a negative number like `-1` passes straight through into `getPaginated`, producing `Array.prototype.slice` with a negative offset (counts from the end of the array), which is very unlikely to be the intended behaviour.
- **How found:** `?page=-1&limit=2` integration test.
- **Suggested fix:** clamp with `Math.max(1, pageNum)` (and similarly clamp `limit`).

### BUG-8: PUT-ing status to `"done"` doesn't set `completedAt`
- **Where:** `src/routes/tasks.js` / `taskService.update`
- **Expected:** However a task becomes `done` (via `/complete` or a `PUT`), `completedAt` should end up populated — otherwise `getStats`'s overdue logic and any "completed on" reporting silently breaks for tasks completed via `PUT`.
- **Actual:** `update` blindly merges whatever fields are sent; if the client sends `{ "status": "done" }` via `PUT`, `completedAt` stays `null` forever, and there's no way to fix it later (nothing re-triggers it).
- **How found:** `PUT` to `status: 'done'`, asserting `completedAt` is set.
- **Suggested fix:** in `update`, if `fields.status === 'done'` and the task doesn't already have a `completedAt`, set one (or keep completion exclusively behind `PATCH /complete` and reject `status: 'done'` from `PUT`, whichever the product actually wants).

---

## What was fixed vs. left open
Per the assignment ("fix one bug"), **BUG-1 (pagination)** was fixed since it's the most clear-cut, highest-impact bug (an unusable core feature) and the safest one-line fix.

BUG-2 through BUG-8 are captured as `test.failing(...)` in `tests/bugs.test.js` — the suite passes while the bug exists, and any test there will flip to a real failure the moment someone "fixes" the behaviour without updating the test, which is a deliberate tripwire against regressions being reintroduced silently.
