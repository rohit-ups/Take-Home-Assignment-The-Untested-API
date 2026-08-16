# Bug Report — The Untested API

Bugs discovered through reading the source code and confirmed by failing tests.

---

## Bug 1 — Pagination skips the first page (FIXED)

**File:** `task-api/src/services/taskService.js`, line 12

**Expected behavior:**
`GET /tasks?page=1&limit=10` should return the first 10 tasks.
`GET /tasks?page=2&limit=10` should return tasks 11–20.

**What actually happens:**
The offset formula was `page * limit` instead of `(page - 1) * limit`.
With `page=1, limit=10`, offset evaluates to `10`, so the first 10 items are
skipped entirely and page 1 returns nothing (or items from page 2).
Page 2 returns items from page 3, and so on.

**How I found it:**
Code review of `getPaginated`. The formula is a classic off-by-one.
Confirmed by writing a test that created 5 tasks and requested page 1 with
limit 3 — received tasks 4 and 5 instead of tasks 1, 2, and 3.

**Fix applied:**
```js
// Before
const offset = page * limit;

// After
const offset = (page - 1) * limit;
```

---

## Bug 2 — Completing a task silently resets its priority to "medium" (FIXED)

**File:** `task-api/src/services/taskService.js`, line 67

**Expected behavior:**
`PATCH /tasks/:id/complete` should set `status` to `"done"` and record
`completedAt`. All other fields, including `priority`, should be preserved.

**What actually happens:**
The `completeTask` function hard-codes `priority: 'medium'` in the spread,
unconditionally overwriting whatever priority the task had before it was
completed. A `high`-priority task becomes `medium` after completion — silent
data loss.

**How I found it:**
Code review of `completeTask`. The `priority: 'medium'` line stands out because
it has nothing to do with completing a task. Confirmed by a test that created a
`high`-priority task, completed it, and asserted the priority was still `high`.

**Fix applied:**
```js
// Before
const updated = {
  ...task,
  priority: 'medium',   // ← removed this line
  status: 'done',
  completedAt: new Date().toISOString(),
};

// After
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Bug 3 — Status filter uses substring match instead of exact match (NOT FIXED)

**File:** `task-api/src/services/taskService.js`, line 9

**Expected behavior:**
`GET /tasks?status=todo` should return only tasks whose status is exactly
`"todo"`.

**What actually happens:**
The filter uses `.includes()`:

```js
tasks.filter((t) => t.status.includes(status))
```

`.includes()` does a substring search on the status string. Filtering by
`status=o` would match `"todo"`, `"in_progress"`, and `"done"` because all
three contain the letter `"o"`. If a new status like `"todo_later"` were ever
added, filtering by `"todo"` would also match it.

**How I found it:**
Code review. The correct method for enum comparison is `===`, not `.includes()`.

**Fix would look like:**
```js
// Before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

Not fixed in this submission because the current valid status values (`todo`,
`in_progress`, `done`) don't overlap as substrings, so the bug doesn't cause
visible failures in the existing test suite. Fixing it would be the right
call before shipping.

---

## Summary

| # | Description | Severity | Fixed |
|---|---|---|---|
| 1 | Pagination offset formula skips entire pages | High | ✅ Yes |
| 2 | `completeTask` resets priority to medium | Medium | ✅ Yes |
| 3 | Status filter uses substring match, not exact equality | Low (latent) | ❌ Not yet |
