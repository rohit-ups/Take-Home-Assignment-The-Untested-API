# Bug Report — Task Manager API

Bugs discovered during code review and confirmed by automated tests.

---

## Bug B1 — `getByStatus` uses substring match instead of exact match

**File:** `src/services/taskService.js`, line 9

**Expected behavior:**
`GET /tasks?status=todo` should return only tasks whose status is exactly `todo`.

**Actual behavior:**
The function uses `String.prototype.includes()`, which performs a substring search. The query `?status=do` returns both `todo` and `done` tasks because `"do"` is a substring of both strings. Similarly, `?status=in` would match `in_progress`.

**How it was discovered:**
Code review of `taskService.js`. Confirmed with a unit test: two tasks with statuses `todo` and `done` — querying for `do` returned both.

**Fix:**
```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status: ✅ Fixed**

---

## Bug B2 — Pagination offset is off by one page

**File:** `src/services/taskService.js`, lines 11–14

**Expected behavior:**
`GET /tasks?page=1&limit=10` should return items 1–10 (the first page).

**Actual behavior:**
The offset is computed as `page * limit`, so page 1 yields `offset = 1 * 10 = 10`, which skips the first 10 results entirely. Page 1 actually returns what should be page 2.

**How it was discovered:**
Code review of the `getPaginated` function. Confirmed by integration tests: with 15 tasks, `?page=1&limit=10` returned tasks 11–15 instead of 1–10.

**Fix:**
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

**Status: ✅ Fixed**

---

## Bug B3 — `completeTask` silently resets priority to `medium`

**File:** `src/services/taskService.js`, lines 68–72

**Expected behavior:**
`PATCH /tasks/:id/complete` should mark the task as done and record `completedAt`. The task's existing `priority` should be preserved.

**Actual behavior:**
The function unconditionally overwrites `priority: 'medium'` when completing a task. A task with `priority: 'high'` will silently become `priority: 'medium'` after being marked complete, with no error or warning.

**How it was discovered:**
Code review of `completeTask`. The stray `priority: 'medium'` line appears to be a copy-paste artifact. Confirmed with a unit test: creating a `high` priority task, completing it, then checking the priority.

**Fix:**
```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

**Status: ✅ Fixed**
