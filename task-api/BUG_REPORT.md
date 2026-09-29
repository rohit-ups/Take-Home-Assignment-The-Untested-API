# Bug Report

## Bug 1: Pagination returns wrong results

**File:** `src/services/taskService.js`, line 12

**Expected:** `GET /tasks?page=1&limit=5` should return the first 5 tasks.

**Actual:** It skips the first 5 tasks and returns tasks 6-10. Page 1 behaves like page 2.

**Cause:** The offset formula is `page * limit` but pages are 1-based, so it should be `(page - 1) * limit`.

**Found by:** Writing a pagination test with 15 tasks — page 1 returned `Task 6` instead of `Task 1`.

**Fix:** Change `const offset = page * limit` to `const offset = (page - 1) * limit`.

---

## Bug 2: Status filter matches partial strings

**File:** `src/services/taskService.js`, line 9

**Expected:** `GET /tasks?status=in` should return nothing since `"in"` is not a valid status.

**Actual:** It returns all `in_progress` tasks because `"in_progress".includes("in")` is true.

**Cause:** `getByStatus` uses `String.includes()` instead of strict equality (`===`).

**Found by:** Testing `getByStatus('in')` — it unexpectedly matched `in_progress` tasks.

**Fix:** Change `t.status.includes(status)` to `t.status === status`.

---

## Bug 3: Completing a task resets its priority

**File:** `src/services/taskService.js`, line 69

**Expected:** `PATCH /tasks/:id/complete` should only change `status` to `done` and set `completedAt`. Priority should stay the same.

**Actual:** It hard-codes `priority: 'medium'`, so a high-priority task becomes medium after completion.

**Cause:** The `completeTask` function spreads the task and then overrides priority with `'medium'` for no apparent reason.

**Found by:** Completing a task with `priority: 'high'` and checking the result.

**Fix:** Remove the `priority: 'medium'` line from the `completeTask` function.
