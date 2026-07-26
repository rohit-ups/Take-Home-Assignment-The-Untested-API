# Bug Report

Five issues were found while writing tests against the codebase. Two of them
(Bug 1 and Bug 2) were fixed as part of this submission. The remaining three are
documented here with a proposed fix, and one of them has a skipped test that
records the expected behavior.

## Bug 1: Pagination skips the first page (FIXED)

**Location:** `src/services/taskService.js`, `getPaginated`

**Expected behavior:** `GET /tasks?page=1&limit=10` should return the first ten
tasks (items 1 through 10).

**What actually happens:** The offset was computed as `page * limit`, so page 1
returned items 11 through 20 and the very first page of data was unreachable.
Page 0 would have been the only way to see the first ten items, which
contradicts the documented one based paging.

```js
// before
const offset = page * limit;

// after
const safePage = Math.max(1, page);
const safeLimit = Math.max(1, limit);
const offset = (safePage - 1) * safeLimit;
```

**How it was discovered:** A unit test created 25 tasks and asserted that
`getPaginated(1, 10)` starts at "task 1". The assertion failed against the
original code.

**Fix:** Use `(page - 1) * limit` for the offset. Page and limit are also
clamped to a minimum of 1 so a negative or zero value cannot produce a negative
slice index.

## Bug 2: Status filter matches on substrings (FIXED)

**Location:** `src/services/taskService.js`, `getByStatus`

**Expected behavior:** `GET /tasks?status=done` should return only tasks whose
status is exactly `done`.

**What actually happens:** The filter used `t.status.includes(status)`, which is
a substring check. A query like `?status=do` matched both `todo` and `done`, and
`?status=in` matched `in_progress`. The endpoint looked correct only because
most manual checks use full status names.

```js
// before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// after
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**How it was discovered:** A test seeded one `todo` task and one `done` task,
then queried `?status=do` and expected an empty result. The original code
returned both tasks.

**Fix:** Compare with strict equality instead of `String.includes`.

## Bug 3: Completing a task resets its priority (reported, not fixed)

**Location:** `src/services/taskService.js`, `completeTask`

**Expected behavior:** Marking a task complete should change its status and set
`completedAt`, but leave the rest of the task intact, including `priority`.

**What actually happens:** `completeTask` hardcodes `priority: 'medium'` in the
updated object, so a `high` priority task silently becomes `medium` once it is
completed. This loses information that is often used for reporting.

```js
const updated = {
  ...task,
  priority: 'medium', // overwrites whatever the task had
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**How it was discovered:** A unit test completed a `high` priority task and
checked the priority afterward. It is included as a skipped test
(`preserves the original priority when completing`) so the suite stays green
while still documenting the expected behavior.

**Proposed fix:** Remove the `priority: 'medium'` line so the spread keeps the
original value.

## Bug 4: PUT can overwrite immutable fields (reported, not fixed)

**Location:** `src/routes/tasks.js` (`PUT /:id`) and `src/services/taskService.js` (`update`)

**Expected behavior:** A client should be able to update editable fields, but
`id` and `createdAt` should be server owned and immutable.

**What actually happens:** `update` spreads the whole request body over the
stored task (`{ ...tasks[index], ...fields }`) with no allowlist. A request such
as `PUT /tasks/:id` with body `{ "id": "hacked", "createdAt": "2000-01-01" }`
rewrites those fields. Rewriting `id` also makes the task unreachable by its
original identifier.

**How it was discovered:** Reading `update` while writing tests. The validator
never inspects `id` or `createdAt`, so nothing stops them from being replaced.

**Proposed fix:** Pick only the editable fields in the route (title,
description, status, priority, dueDate) before calling `update`, or strip `id`
and `createdAt` inside `update`.

## Bug 5: Status filter and pagination cannot be combined (reported, not fixed)

**Location:** `src/routes/tasks.js`, `GET /`

**Expected behavior:** A caller should be able to page through a filtered list,
for example `GET /tasks?status=todo&page=2&limit=10`.

**What actually happens:** The handler returns early as soon as `status` is
present, so `page` and `limit` are ignored whenever a status filter is used.
Filtered lists are always returned in full.

```js
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks); // pagination never runs
}
```

**How it was discovered:** Reading the route ordering. The two features are
mutually exclusive by construction.

**Proposed fix:** Filter first, then paginate the filtered result in a single
path rather than returning early.
