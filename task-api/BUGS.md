# Bug Report

## Bug 1 — `getByStatus` uses substring match instead of exact match

**File:** `src/services/taskService.js`

**Expected:** `GET /tasks?status=todo` should return only tasks where status is exactly `"todo"`.

**Actual:** Uses `t.status.includes(status)` which does a substring match.
Querying `?status=do` returns tasks with status `"todo"` AND `"done"` — 3 tasks instead of 0.

**Discovered:** Unit test `getByStatus › does NOT return tasks whose status merely contains the query as a substring` failed.

**Fix:**
```js
// Before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
// After
const getByStatus = (status) => tasks.filter((t) => t.status === status);

Bug 2 — Pagination off-by-one error
File: src/services/taskService.js

Expected: GET /tasks?page=1&limit=10 should return the first 10 tasks.

Actual: getPaginated calculates offset = page * limit, so page=1 gives offset=10, skipping the first 10 items entirely. Page 1 returns items 11–15, page 2 returns nothing.

Discovered: Integration test GET /tasks (pagination) › page=1 returns the first 10 tasks failed.

Fix:

js


// Before
const offset = page * limit;
// After
const offset = (page - 1) * limit;

Bug 3 — completeTask silently resets priority to "medium"
File: src/services/taskService.js

Expected: Marking a task complete should only set status: "done" and completedAt. All other fields including priority should be unchanged.

Actual: completeTask hardcodes priority: 'medium' in the updated object, overwriting whatever priority the task had. A high priority task becomes medium after being completed.

Discovered: Unit test completeTask › does NOT change the priority when completing a task failed.

Fix: Remove the priority: 'medium' line from the completeTask function.

js


// Before
const updated = {
  ...task,
  priority: 'medium',  // ← this line should not be here
  status: 'done',
  completedAt: new Date().toISOString(),
};
// After
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};