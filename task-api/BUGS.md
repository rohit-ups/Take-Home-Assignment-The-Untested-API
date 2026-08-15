# Bug Report

Found by reading the source and confirming each with a test (see `tests/`).

---

## Bug #1: `getByStatus` matches on substring, not exact status

**File:** `src/services/taskService.js`, line 9

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**Expected:** `GET /tasks?status=X` should return only tasks whose status is *exactly* `X`.

**Actual:** `String.prototype.includes()` does substring matching. `?status=do` matches
both `'todo'` and `'done'`, because `'do'` is a substring of each. Any status query
that happens to be a substring of another valid status will silently over-match.

**How I found it:** Read the line and noticed `.includes()` was used where `===` was
needed. Confirmed with `taskService.test.js` → `getByStatus > BUG: incorrectly
matches on substring instead of exact status`.

**Suggested fix:**
```js
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug #2: Pagination is off by one page (FIXED in this submission)

**File:** `src/services/taskService.js`, `getPaginated`

**Expected:** `GET /tasks?page=1&limit=10` should return the *first* 10 tasks. The
route layer defaults an unspecified `page` to `1`, implying 1-based paging.

**Actual:** `offset = page * limit` meant `page=1` skipped the first `limit` items
and returned items 11–20 instead.

**How I found it:** Created 25 tasks and paged through them in a test; the first
"page" didn't contain the first task.

**Fix applied:** changed to `offset = (Math.max(page, 1) - 1) * limit`, so page 1
starts at offset 0, and a caller passing `page=0` or a negative page is treated as
page 1 instead of producing a negative offset.

---

## Bug #3: Completing a task resets its priority to `medium`

**File:** `src/services/taskService.js`, `completeTask`

```js
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Expected:** Marking a task complete should only change `status` and
`completedAt`. Nothing in the API doc or task shape suggests priority should
change on completion.

**Actual:** A `high`-priority task silently becomes `medium`-priority the moment
it's marked done, discarding data the client already set. This looks like a
copy-paste leftover (maybe from a `create`-with-defaults code path) rather than
intentional behavior.

**How I found it:** Created a task with `priority: 'high'`, called
`PATCH /tasks/:id/complete`, and the response came back `medium`.

**Suggested fix:** drop the `priority: 'medium'` line entirely so `...task` keeps
whatever priority the task already had:
```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Bug #4: `PUT /tasks/:id` lets clients overwrite server-owned fields

**File:** `src/services/taskService.js`, `update`

```js
const updated = { ...tasks[index], ...fields };
```

**Expected:** A client updating a task via `PUT` should only be able to change
user-editable fields (`title`, `description`, `status`, `priority`, `dueDate`).
Fields like `id`, `createdAt`, and `completedAt` are server-owned and shouldn't be
overwritable by request body.

**Actual:** The spread has no field allow-list, so a `PUT` body containing
`{"id": "new-id", "createdAt": "2000-01-01"}` silently overwrites those fields.
`validateUpdateTask` doesn't guard against this either — it only checks
`title`/`status`/`priority`/`dueDate` if present, and ignores unknown keys.

**How I found it:** Read `update()` and noticed the spread had no field
allow-list; confirmed with a test sending `id`/`createdAt` in a `PUT` body.

**Suggested fix:** explicitly whitelist which fields `update()` accepts, e.g.:
```js
const ALLOWED_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => ALLOWED_FIELDS.includes(key))
  );
  const updated = { ...tasks[index], ...safeFields };
  tasks[index] = updated;
  return updated;
};
```

---

## Notes on bugs not fixed

I fixed Bug #2 for this submission (see `src/services/taskService.js` and the
updated tests in `tests/`). Bugs #1, #3, and #4 are documented above with
suggested fixes but left unfixed, per the assignment ("pick one bug and fix it").
