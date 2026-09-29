# Bug Report

Everything here turned up while writing the tests in `task-api/tests/`. Each item
says what I expected, what actually happens, where it lives, and which test
caught it. Seven real bugs, plus two smaller things I noticed and chose not to
touch.

---

## 1. Pagination starts at the wrong offset

**Where:** `task-api/src/services/taskService.js:12`

```js
const offset = page * limit;
```

**Expected:** `GET /tasks?page=1&limit=10` returns the first 10 tasks. The route
defaults a missing page to `1` (`routes/tasks.js:20`), which implies 1-based
paging.

**Actual:** page 1 computes an offset of 10, so the first page silently skips the
first `limit` tasks and returns items 11–20. On a store smaller than two pages,
page 1 returns an empty array.

**How I found it:** seeded 15 tasks and paged through them —
`getPaginated > returns the first page of tasks for page 1` and
`GET /tasks?page=&limit= > returns the first 10 tasks on page 1` both failed.
This is the one I picked to fix; those two tests (and the ones for page 2 and
the partial page) are now normal passing tests.

**Fix (applied):**

```js
const getPaginated = (page, limit) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;
  return tasks.slice(offset, offset + safeLimit);
};
```

The clamp matters: with just `(page - 1) * limit`, a caller sending `page=-1`
gets a negative offset and `slice()` returns the *last* tasks instead of the
first.

---

## 2. The status filter matches on substrings

**Where:** `task-api/src/services/taskService.js:9`

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**Expected:** `?status=` matches a status exactly — `?status=todo` returns only
`todo` tasks.

**Actual:** it's a substring check. `?status=do` returns both `todo` and `done`
tasks, and `?status=progress` returns `in_progress`. Any query that happens to
be a fragment of another valid status over-matches.

**How I found it:** reading the line — `.includes()` where `===` was clearly
intended. Confirmed by `getByStatus > returns nothing for a query that is only
part of another status` and its route-level twin.

**Fix:** `tasks.filter((t) => t.status === status)`.

---

## 3. Completing a task resets its priority

**Where:** `task-api/src/services/taskService.js:69`

```js
const updated = {
  ...task,
  priority: 'medium',   // why is this here?
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Expected:** marking a task done only changes `status` and `completedAt`.

**Actual:** a `high` priority task silently becomes `medium` when it's
completed. Completing is a status transition, not a priority decision.

**How I found it:** `completeTask > preserves the priority the task already had`
and `PATCH /tasks/:id/complete > leaves the priority of the task alone` — both
fail today.

**Fix:** delete the `priority: 'medium'` line.

---

## 4. `?status=` silently drops pagination

**Where:** `task-api/src/routes/tasks.js:14-17`

```js
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks);   // early return — page/limit never read
}
```

**Expected:** the query params compose: `?status=todo&page=1&limit=1` should
return one todo task.

**Actual:** as soon as `status` is present the handler returns the full filtered
list; `page` and `limit` are ignored without any warning. The README advertises
all three params as if they work together.

**How I found it:** `GET /tasks?status= > applies pagination when a status filter
is also given` fails — it gets 3 tasks back when it asked for 1.

**Fix:** run the filter first, then paginate the result (drop the early
`return`):

```js
const base = status ? taskService.getByStatus(status) : taskService.getAll();
const tasks = page || limit
  ? taskService.getPaginated(pageNum, limitNum, base)
  : base;
res.json(tasks);
```

which also means `getPaginated` needs an optional source list argument.

---

## 5. PUT lets the request body overwrite `id` and `createdAt`

**Where:** `task-api/src/services/taskService.js:50`

```js
const updated = { ...tasks[index], ...fields };
```

**Expected:** `PUT /tasks/:id` updates the mutable fields of one task; its
identity (`id`) and creation timestamp are not client-editable.

**Actual:** the body is spread straight over the stored task. A PUT with
`{"id": "hacked"}` rewrites the id, so the task can no longer be reached at its
old URL, and `createdAt`/`completedAt` can be set to anything. Unknown keys are
stored too.

**How I found it:** `update > leaves id and createdAt alone when the body tries
to change them` and the matching `PUT /tasks/:id` test — both `it.failing`.

**Fix:** strip immutable fields before merging:

```js
const IMMUTABLE = ['id', 'createdAt', 'completedAt'];
const safe = Object.fromEntries(
  Object.entries(fields).filter(([k]) => !IMMUTABLE.includes(k))
);
```

(I'd put the allowlist next to the validators so the rule lives in one place.)

---

## 6. Malformed JSON returns 500 instead of 400

**Where:** `task-api/src/app.js:9-12`

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Expected:** a body that isn't valid JSON is the client's mistake → `400` with
a message naming the problem.

**Actual:** body-parser throws a `SyntaxError`, it lands in the error handler,
and everything becomes a 500. The handler also ignores `err.status`, so other
body-parser errors (payload too large → 413) are flattened to 500 as well.

**How I found it:** `error handling > returns 400 for a body that is not valid
JSON` (`it.failing`), plus reading `app.js` and noticing the handler hardcodes
the status.

**Fix:** respect the error's own status:

```js
res.status(err.status || err.statusCode || 500)
   .json({ error: err.type === 'entity.parse.failed'
     ? 'Request body is not valid JSON'
     : 'Internal server error' });
```

---

## 7. The README documents status values the code doesn't accept

**Where:** `README.md:77` vs `task-api/src/utils/validators.js:1`

```json
"status": "pending | in-progress | completed"   // README
```
```js
const VALID_STATUSES = ['todo', 'in_progress', 'done'];   // code
```

**Expected:** the docs match the API — someone copy-pasting the README's curl
example (`?status=pending`) should get a useful answer.

**Actual:** `pending`, `in-progress` and `completed` don't exist. `POST` with
`status: "pending"` is rejected with a 400, and `GET ?status=pending` returns an
empty 200. The README's own sample requests (`README.md:96`) use the wrong
values.

**How I found it:** setting up the project — the task shape in `ASSIGNMENT.md`
also says `todo | in_progress | done`, so the README is the outlier.

**Fix:** update the README to `todo | in_progress | done`. It's a docs-only
change, no code.

---

## Secondary notes (deliberately not fixed)

**Truthy-only validation accepts empty values.** `validators.js:8` and
`validators.js:24` check `if (body.status && ...)`, so `status: ""` (and
`status: null`) skip validation entirely and get stored — a task can end up with
a status that isn't in any stats bucket. Same pattern for `priority` and
`dueDate`. My tests document this as current behaviour
(`validateCreateTask > treats an empty status as if it was not sent`). The fix
is to use `!== undefined` instead of truthiness, but it changes accepted input,
so I left it alone rather than change behaviour the assignment didn't ask about.

**Unknown `?status=` values return `200 []` instead of `400`.**
`GET /tasks?status=banana` answers with an empty list. Arguably fine (a filter
that matches nothing), arguably a client error worth a 400. I didn't find
enough in the brief to decide, so the test pins the current behaviour and the
decision stays open.

---

## Priorities

If I could only fix one, it's **#1 (pagination)** — it makes the documented
`page=1` behaviour wrong for every client, and the fix is small and contained.
**#3** is a one-line deletion next. **#5 and #6** are the ones I'd insist on
before this went near production, since both let a client corrupt or mis-use
data. **#7** is a two-minute README edit.
