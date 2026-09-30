# Bug Report

Found while writing the Day 1 test suite. Each bug has a corresponding
`test.failing` case in `task-api/tests/` that documents it (search the
test files for `// BUG:`).

---

## 1. Pagination skips the first page

**Where:** `src/services/taskService.js`, `getPaginated`

```js
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};
```

**Expected:** `GET /tasks?page=1&limit=10` returns the first 10 tasks.
**Actual:** `page=1` computes `offset = 1 * 10 = 10`, so it returns
tasks 11–20 — the *second* page. There is no way to get the first
page through the public API; `page=0` isn't advertised or intended.

**How found:** Wrote a test creating 5 tasks and asserting `page=1,
limit=2` returns the first two (`t1`, `t2`). It returned `t3, t4`
instead.

**Fix:** Use `(page - 1) * limit` for the offset, and treat `page < 1`
as `1`.

---

## 2. Status filter matches substrings, not exact values

**Where:** `src/services/taskService.js`, `getByStatus`

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**Expected:** `GET /tasks?status=done` returns only `done` tasks.
**Actual:** `t.status.includes(status)` is a substring check.
`?status=do` matches both `todo` and `done`, because both contain
`"do"`.

**How found:** Test asserting `?status=do` (an unrecognized status)
returns an empty list; it returned every `todo`/`done` task instead.

**Fix:** Use strict equality: `tasks.filter((t) => t.status === status)`.

---

## 3. Completing a task silently resets its priority

**Where:** `src/services/taskService.js`, `completeTask`

```js
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Expected:** `PATCH /tasks/:id/complete` only changes `status` and
`completedAt`.
**Actual:** It also overwrites `priority` to `'medium'` unconditionally,
so a `high`-priority task loses its priority the moment it's completed.
This looks like a leftover/copy-paste line — there's no reason
completing a task should touch priority at all.

**How found:** Created a task with `priority: 'high'`, completed it,
and asserted the priority was still `high`. It came back `medium`.

**Fix:** Delete the `priority: 'medium'` line.

---

## 4. `PUT /tasks/:id` can overwrite immutable fields

**Where:** `src/services/taskService.js`, `update`

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
`priority`, `dueDate`. Fields like `id`, `createdAt`, `completedAt`
should not change via a client-supplied body.
**Actual:** `update` spreads the entire request body onto the stored
task with no field whitelist, so a `PUT` body containing `id` or
`createdAt` overwrites them. `validateUpdateTask` doesn't check for
this either — it only validates the fields it knows about and lets
anything else through.

**How found:** Sent `PUT /tasks/:id` with `{ id: 'hacked', createdAt:
'2000-01-01...' }` and checked that the response still had the
original `id`/`createdAt`. It didn't — both were overwritten.

**Fix:** In `update`, destructure only the allowed fields out of
`fields` before merging, e.g.
`const { title, description, status, priority, dueDate } = fields;`.

---

## 5. Malformed JSON body returns 500, not 400

**Where:** `src/app.js`, the error-handling middleware

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Expected:** Sending an unparsable JSON body (e.g. `{bad`) is a
client error → `400`.
**Actual:** `express.json()`'s body-parser throws an error with
`err.status === 400` and `err.type === 'entity.parse.failed'`, but
the catch-all handler ignores `err.status` and always responds `500`.
This also pollutes logs with stack traces for what's really a
client-input problem.

**How found:** POSTed a body with intentionally broken JSON
(`Content-Type: application/json`, body `{bad`) and got back `500`
instead of `400`.

**Fix:** Check `err.status` (or `err.type === 'entity.parse.failed'`)
and forward it, falling back to `500` for genuinely unexpected errors:

```js
app.use((err, req, res, next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: 'Invalid request body' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Not fixed (lower priority / out of scope for now)

- **README/ASSIGNMENT status vocabulary mismatch:** `README.md`
  documents statuses as `pending | in-progress | completed`; the code
  and `ASSIGNMENT.md` use `todo | in_progress | done`. Purely a docs
  bug, but worth a follow-up PR so new consumers aren't misled.
- **`GET /tasks` query params aren't composable:** `?status=` short-
  circuits before `page`/`limit` are even looked at, so you can't
  paginate a filtered list. Might be intentional given the small
  scope, but likely to bite the frontend later.
- **No validation on `page`/`limit` bounds:** negative or zero values
  aren't rejected; `page=0` or `limit=-5` both silently "work" (with
  odd results) rather than 400ing.
