# Bug Report — Task Manager API

Bugs found while writing the test suite for `task-api`. Every bug below is
backed by at least one automated test and was also reproduced by hand against
the running server with `curl`.

**Result: 10 bugs found, 8 fixed, 2 left open on purpose.** All High and
Medium bugs are fixed, one commit per bug, and each fix commit also turns that
bug's tests into regular regression tests. The two open bugs are Low severity
input-validation gaps; see [Why #8 and #9 are still open](#why-8-and-9-are-still-open).

## How the bugs are captured in the tests

Tests for a known bug are written with Jest's `test.failing`. Each one
asserts the **correct** behaviour, so it fails while the bug exists, and
`test.failing` counts that failure as expected. The suite stays green while
still recording every bug in code. Once a bug is fixed, Jest reports its test
as "passed but was supposed to fail", which is the signal to change it to a
plain `test`.

Today, the tests for the 8 fixed bugs are regular tests (so the bugs can't
quietly come back), and only the tests for #8 and #9 still use `test.failing`.

```bash
cd task-api
npm test           # all tests pass, bug tests included
npm run coverage   # same, with the coverage table
```

Test files:
- `task-api/tests/taskService.test.js`: unit tests for the service layer
- `task-api/tests/tasks.api.test.js`: HTTP integration tests (Supertest)

## Summary

Severity guide: **High** means data corruption, a crash, or wrong data
returned on a normal request. **Medium** means a feature returns wrong
results, or a wrong status code is sent. **Low** means input that should be
rejected is accepted.

| # | Bug | Severity | Where | Status |
|---|-----|----------|-------|--------|
| 1 | Pagination skips the first page | High | `src/services/taskService.js:12` | ✅ Fixed |
| 2 | Status filter matches partial words | Medium | `src/services/taskService.js:9` | ✅ Fixed |
| 3 | Completing a task resets its priority to `medium` | Medium | `src/services/taskService.js:69` | ✅ Fixed |
| 4 | `null` status/priority skips validation and crashes the status filter | High | `src/utils/validators.js:8-14, 24-30` | ✅ Fixed |
| 5 | PUT can overwrite `id`, `createdAt` and add any field | High | `src/services/taskService.js:50` | ✅ Fixed |
| 6 | Status filter ignores `page` and `limit` | Medium | `src/routes/tasks.js:14-17` | ✅ Fixed |
| 7 | Malformed or oversized JSON returns 500 instead of 4xx | Medium | `src/app.js:9-12` | ✅ Fixed |
| 8 | Invalid `page`/`limit` values are silently accepted | Low | `src/routes/tasks.js:20-21` | Open |
| 9 | `description` is never validated; loose date formats accepted | Low | `src/utils/validators.js:14, 30` | Open |
| 10 | Setting `status: done` through PUT leaves `completedAt` empty | Medium | `src/services/taskService.js:46-53` | ✅ Fixed |

Paths in the table are relative to `task-api/`. Line numbers point to the
**original** code (commit `2b32db7`), so they match what a reviewer sees in the
untouched assignment repo; the fixes have shifted some lines since.

### Why #8 and #9 are still open

Both are Low severity: they let odd input through, but they don't crash
anything, corrupt existing data, or return wrong results for normal requests.
Fixing them also needs product decisions that the brief doesn't answer, such as
the maximum page size (#8), or whether date-only values like `2026-10-01` count
as valid ISO dates (#9). Each section below includes a proposed fix, and their
`test.failing` tests are ready to switch on once those decisions are made.

---

## 1. Pagination skips the first page

**Severity:** High · **Where:** `src/services/taskService.js:12` · **Status:** ✅ Fixed

**Expected:** `GET /tasks?page=1&limit=10` returns tasks 1–10.

**Actual:** It returns tasks 11–20. With 12 tasks, page 1 returns only
`t11` and `t12`. Tasks 1–10 can't be reached through pagination at all,
because `page=0` is also turned into `1` by the route (see #8).

```bash
curl 'localhost:3000/tasks?page=1&limit=10'   # → [t11, t12]
```

**Why it happens:**

```js
const offset = page * limit;   // page 1 → offset 10
```

Pages are 1-based (the route defaults a missing `page` to `1`), but the
offset is calculated as if they were 0-based. Page 1 starts at index 10
instead of index 0.

**How it was found:**
- `taskService.test.js` › getPaginated › *page 1 returns the first `limit` tasks*
- `taskService.test.js` › getPaginated › *page 2 returns the remaining tasks*
- `tasks.api.test.js` › pagination › *?page=1&limit=5 returns the first five tasks*

**Fix (applied):**

```js
const offset = (page - 1) * limit;
```

---

## 2. Status filter matches partial words

**Severity:** Medium · **Where:** `src/services/taskService.js:9` · **Status:** ✅ Fixed

**Expected:** `?status=` only returns tasks whose status is exactly the value
given. `?status=do` matches nothing, because `do` isn't a status.

**Actual:** `?status=do` returns both `todo` and `done` tasks. `?status=o`
returns every task, since all three statuses contain the letter "o".

```bash
curl 'localhost:3000/tasks?status=do'   # → todo and done tasks
```

**Why it happens:**

```js
tasks.filter((t) => t.status.includes(status));
```

`t.status` is a string, so `.includes()` here is `String.prototype.includes`,
which checks whether `status` appears **anywhere inside** the task's
status. It's a substring search, not a comparison.

**How it was found:** `taskService.test.js` › getByStatus › *matches the
status exactly, not as a substring*

**Fix (applied):**

```js
tasks.filter((t) => t.status === status);
```

---

## 3. Completing a task resets its priority to `medium`

**Severity:** Medium · **Where:** `src/services/taskService.js:69` · **Status:** ✅ Fixed

**Expected:** `PATCH /tasks/:id/complete` changes `status` to `done` and sets
`completedAt`. Everything else about the task stays the same.

**Actual:** The task's priority is also changed to `medium`. A `high`
priority task becomes `medium` as soon as it is completed, which also skews
any report of "high priority work completed".

```bash
# create a task with "priority": "high", then:
curl -X PATCH localhost:3000/tasks/<id>/complete   # → "priority": "medium"
```

**Why it happens:** `completeTask()` builds the updated task with a
hard-coded field:

```js
const updated = {
  ...task,
  priority: 'medium',   // ← overwrites the task's real priority
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

Completing a task has nothing to do with priority, so this line looks like a
leftover from copy-pasting.

**How it was found:**
- `taskService.test.js` › completeTask › *keeps the original priority*
- `tasks.api.test.js` › PATCH /tasks/:id/complete › *keeps the task priority*

**Fix (applied):** Delete the `priority: 'medium'` line.

---

## 4. `null` status/priority skips validation and crashes the status filter

**Severity:** High · **Where:** `src/utils/validators.js:8-14` (create) and
`:24-30` (update), with the crash at `src/services/taskService.js:9` · **Status:** ✅ Fixed

**Expected:** `POST /tasks` with `"status": null` (or `""`) is rejected with
`400`, like any other invalid status.

**Actual:** The task is created with `status: null` (201). After that, **every**
`GET /tasks?status=...` request fails with `500 Internal Server Error`, for
every user, until that task is deleted. One bad request breaks the filter for
everyone.

```bash
curl -X POST localhost:3000/tasks -H 'Content-Type: application/json' \
  -d '{"title":"n","status":null}'          # → 201, "status": null
curl -i 'localhost:3000/tasks?status=todo'   # → HTTP/1.1 500
# server log: TypeError: Cannot read properties of null (reading 'includes')
```

**Why it happens:** Two small things combine:

1. The validators only check a field if it is **truthy**:
   ```js
   if (body.status && !VALID_STATUSES.includes(body.status)) { ... }
   ```
   `null`, `""`, `0` and `false` are all falsy, so the check is skipped
   entirely and the value counts as "valid".
2. `create()` uses a default parameter, `status = 'todo'`. JavaScript only
   applies a default when the value is `undefined`, **not** when it is
   `null`. So `null` is stored as-is.

Later, `getByStatus()` calls `t.status.includes(...)` on that task, and
calling a method on `null` throws a `TypeError`. Express catches it and
the error handler returns 500.

The same pattern lets `priority: null` through, and PUT has the same
loophole (`validateUpdateTask`).

**How it was found:**
- `tasks.api.test.js` › POST /tasks › *rejects status: null with 400*
- `tasks.api.test.js` › POST /tasks › *rejects priority: null with 400*
- `tasks.api.test.js` › POST /tasks › *a task sent with status: null does not break GET /tasks?status=*
- `tasks.api.test.js` › PUT /tasks/:id › *rejects status: null with 400*

After the fix, extra tests also check that `""` is rejected and that
`dueDate: null` ("no due date") is still accepted on both POST and PUT.

**Fix (applied):** Check whether the field was **sent** instead of whether it is truthy:

```js
if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) { ... }
if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) { ... }
// dueDate may legitimately be null ("no due date"), so allow null explicitly:
if (body.dueDate !== undefined && body.dueDate !== null && isNaN(Date.parse(body.dueDate))) { ... }
```

`null` and `""` are not in the allowed lists, so they are now rejected with
400. Fixing #2 (`===` instead of `.includes()`) also stops the crash, which is
a useful second layer of protection. But the validators are the real fix,
because bad data should never reach the store.

---

## 5. PUT can overwrite `id`, `createdAt` and add any field

**Severity:** High · **Where:** `src/services/taskService.js:50` · **Status:** ✅ Fixed

**Expected:** `PUT /tasks/:id` changes only the editable fields (`title`,
`description`, `status`, `priority`, `dueDate`). Server-managed fields
(`id`, `createdAt`, `completedAt`) can't be changed by the client, and
unknown fields are ignored.

**Actual:** Anything in the request body is written onto the task:
- `{"id": "hacked"}` changes the task's id. PUT, DELETE and PATCH requests
  to the old id now return 404.
- `{"id": "<another task's id>"}` gives **two tasks the same id**. A
  `DELETE` for that id then removes the first match, and the other task can
  no longer be reached by its original id.
- `{"createdAt": "yesterday"}` corrupts the creation date.
- `{"isAdmin": true}` stores a field that isn't part of the task shape.

```bash
curl -X PUT localhost:3000/tasks/<id> -H 'Content-Type: application/json' \
  -d '{"id":"hacked","createdAt":"yesterday"}'
# → "id": "hacked", "createdAt": "yesterday"
```

**Why it happens:**

```js
const updated = { ...tasks[index], ...fields };
```

`fields` is the raw request body. Spreading it last means every key the
client sends overwrites the stored value. The validator only checks the
format of the known fields; it never removes unknown or protected ones.
(This is often called a *mass assignment* bug.) Notably, `create()` doesn't
have this problem, because it destructures only the fields it wants.

**How it was found:**
- `taskService.test.js` › update › *does not let the caller overwrite id or createdAt*
- `tasks.api.test.js` › PUT /tasks/:id › *does not let the client change the task id*

**Fix (applied):** Copy only the editable fields, the same way `create()` does:

```js
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const changes = {};
  EDITABLE_FIELDS.forEach((key) => {
    if (fields[key] !== undefined) changes[key] = fields[key];
  });

  const updated = { ...tasks[index], ...changes };
  tasks[index] = updated;
  return updated;
};
```

---

## 6. Status filter ignores `page` and `limit`

**Severity:** Medium · **Where:** `src/routes/tasks.js:14-17` · **Status:** ✅ Fixed

**Expected:** `GET /tasks?status=done&page=1&limit=2` returns at most 2
done tasks. The README's own example request combines them:
`?status=pending&page=1&limit=10`.

**Actual:** All matching tasks are returned; `page` and `limit` are silently
ignored.

```bash
curl 'localhost:3000/tasks?status=done&page=100&limit=1'   # → every done task
```

**Why it happens:** The route handles each query option in a separate branch
and **returns early** from the status branch:

```js
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks);        // pagination code below never runs
}
if (page !== undefined || limit !== undefined) { ... }
```

**How it was found:** `tasks.api.test.js` › ?status= filter › *applies ?page
and ?limit to the filtered results*

**Fix (applied):** Check pagination **before** the status filter, and let
`getPaginated()` take an optional status so it filters first and then
paginates the filtered list:

```js
// routes/tasks.js — pagination branch now comes first
if (page !== undefined || limit !== undefined) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  return res.json(taskService.getPaginated(pageNum, limitNum, status));
}
if (status) { ... }

// services/taskService.js
const getPaginated = (page, limit, status) => {
  const source = status ? getByStatus(status) : tasks;
  const offset = (page - 1) * limit;
  return source.slice(offset, offset + limit);
};
```

---

## 7. Malformed or oversized JSON returns 500 instead of 4xx

**Severity:** Medium · **Where:** `src/app.js:9-12` · **Status:** ✅ Fixed

**Expected:** A request with broken JSON gets `400 Bad Request`, and a body
over the size limit gets `413 Payload Too Large`. Both are the client's
mistake, not the server's.

**Actual:** Both return `500 Internal Server Error`, and a full stack trace is
written to the server log for every such request.

```bash
curl -i -X POST localhost:3000/tasks -H 'Content-Type: application/json' -d '{bad json'
# → HTTP/1.1 500 Internal Server Error
```

**Why it happens:** `express.json()` already knows what went wrong. It
passes an error with `status: 400` (or `413`) to the error handler. But the
handler ignores that and always answers 500:

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

This gives clients a misleading signal. A 500 tells them "the server is
broken, retry later", when they actually need to fix their request. It also
makes real server errors harder to find in the logs.

**How it was found:** `tasks.api.test.js` › error handling › *returns 400
for a malformed JSON body*. The 413 case was then confirmed manually, and
after the fix it has its own test (*returns 413 for a body over the size
limit*). Another test checks that client errors are no longer logged as
server errors, while real 500s still are.

**Fix (applied):** Respect the status the error carries, and only log real server errors:

```js
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status < 500) {
    return res.status(status).json({ error: err.type === 'entity.parse.failed'
      ? 'Request body is not valid JSON'
      : err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 8. Invalid `page`/`limit` values are silently accepted

**Severity:** Low · **Where:** `src/routes/tasks.js:20-21`

**Expected:** `page` and `limit` must be positive whole numbers. Anything else
gets `400` with a clear message, and very large limits are capped.

**Actual:**

| Request | Result |
|---------|--------|
| `?limit=0` | treated as `limit=10` |
| `?page=0` | treated as `page=1` |
| `?page=-1&limit=10` | `200` with an empty list |
| `?page=abc` | treated as `page=1` |
| `?limit=1000000` | returns every task, no upper limit |

**Why it happens:**

```js
const pageNum = parseInt(page) || 1;
const limitNum = parseInt(limit) || 10;
```

`parseInt('0')` is `0` and `parseInt('abc')` is `NaN`. Both are falsy, so
`|| default` replaces them silently. Negative numbers are truthy, so they
pass through and produce a negative offset. There is no range check anywhere.

**How it was found:**
- `tasks.api.test.js` › pagination › *rejects a limit that is not a positive number with 400*
- `tasks.api.test.js` › pagination › *rejects a negative page with 400*

**Fix:** Validate before using the values, for example in `validators.js`:

```js
const parsePositiveInt = (value, fallback) => {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;   // null = invalid
};
// in the route: return 400 if either is null; cap limit at e.g. 100
```

---

## 9. `description` is never validated; loose date formats accepted

**Severity:** Low · **Where:** `src/utils/validators.js` (no `description`
check at all; date check at lines 14 and 30)

**Expected:** `description` must be a string. `dueDate` must be an ISO 8601
date, which is what both the error message and the README promise.

**Actual:**
- `{"description": {"nested": true}}` or `{"description": 42}` is stored as-is.
- `{"dueDate": "March 5"}` is accepted, and JavaScript reads it as
  **5 March 2001**. The task is overdue the moment it's created and inflates
  the `overdue` count in `/tasks/stats`. `"1"` and the number `0` are also
  accepted (read as 1 Jan 2001 and 1 Jan 2000).

**Why it happens:** There is simply no rule for `description`. For dates,
`Date.parse()` is lenient: it accepts many non-ISO formats and fills in
missing parts (such as the year) with its own guesses. Also, the original
string is stored, not the parsed date, so different clients can store the
same date in different formats.

**How it was found:**
- `tasks.api.test.js` › POST /tasks › *rejects a description that is not a string with 400*
- `tasks.api.test.js` › POST /tasks › *rejects a dueDate that is not an ISO 8601 date with 400*

**Fix:**

```js
if (body.description !== undefined && typeof body.description !== 'string') {
  return 'description must be a string';
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
if (body.dueDate != null && (!ISO_DATE.test(body.dueDate) || isNaN(Date.parse(body.dueDate)))) {
  return 'dueDate must be a valid ISO 8601 date string';
}
```

---

## 10. Setting `status: done` through PUT leaves `completedAt` empty

**Severity:** Medium · **Where:** `src/services/taskService.js:46-53` · **Status:** ✅ Fixed

**Expected:** A task has a `completedAt` time if and only if its status is
`done`, no matter which endpoint changed the status.

**Actual:**
- `PUT /tasks/:id` with `{"status": "done"}` gives a finished task with
  `completedAt: null`.
- Moving a completed task back to `todo` with PUT keeps its old
  `completedAt`, so an unfinished task claims it was finished.

**Why it happens:** Only `completeTask()` sets `completedAt`. `update()`
merges the body without checking whether `status` changed, so the two
ways of finishing a task disagree.

**How it was found:** `taskService.test.js` › update › *sets completedAt when
the status changes to done*

After the fix, extra tests cover reopening a done task (clears `completedAt`),
saving a done task as done again (keeps the original time), and updates that
don't touch `status` (leave `completedAt` alone).

**Fix (applied):** Keep `completedAt` in sync inside `update()`. This builds on the #5
fix, where `changes` holds only the editable fields:

```js
const current = tasks[index];
const updated = { ...current, ...changes };

if (changes.status === 'done' && current.status !== 'done') {
  updated.completedAt = new Date().toISOString();
} else if (changes.status !== undefined && changes.status !== 'done') {
  updated.completedAt = null;
}
```

---

## Documentation issues

These aren't code bugs, but a client following the README would hit them
immediately.

| # | README says | Code actually does | Where |
|---|-------------|--------------------|-------|
| D1 | Task `status` is `pending \| in-progress \| completed` | Only `todo \| in_progress \| done` are valid (`validators.js:1`). ASSIGNMENT.md has the right values. | README "Task shape" |
| D2 | Sample request `?status=pending&page=1&limit=10` | `pending` is not a status, so the list is always empty; the pagination part is ignored (#6) | README "Sample requests" |
| D3 | `PUT /tasks/:id` is a "Full update of a task" | PUT is a **partial** merge: fields you don't send are kept. That's closer to PATCH behaviour. | README "API Reference" |

**Fix (applied):** The README now uses the real status values (D1), and its
sample request uses `?status=todo` (D2), which also paginates now that #6 is
fixed. For D3, PUT is documented as a partial update rather than changed into a
full replacement. Changing the behaviour would break any client that sends only
the fields it wants to change, so the docs were the safer side to fix.
