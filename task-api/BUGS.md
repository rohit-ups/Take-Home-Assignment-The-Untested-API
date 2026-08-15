# Bug Report — task-api

Bugs found by writing unit tests (`tests/taskService.test.js`) and integration
tests (`tests/tasks.routes.test.js`) against the real behavior of the code.

---

## Bug #1 — `getPaginated`: page 1 skips the first page (FIXED)

**File:** `src/services/taskService.js`

**Expected behavior:** `getPaginated(1, limit)` should return the first page of
results, starting from the very first task.

**Actual behavior:** The offset was calculated as `page * limit`. With
`page=1, limit=2`, this gives `offset=2`, which skips the first 2 tasks
entirely and starts from the 3rd task instead.

**How discovered:** Wrote a test that created 5 tasks and called
`getPaginated(1, 2)`, expecting the first result to be `"Task 1"`. The test
failed — it returned `"Task 3"` instead, revealing that page 1 wasn't actually
returning the first page.

**Fix applied:**
```javascript
// Before
const offset = page * limit;
// After
const offset = (page - 1) * limit;
```
This aligns the 1-indexed `page` parameter (page 1, 2, 3...) with the
0-indexed array, so page 1 now correctly starts at offset 0.

---

## Bug #2 — `completeTask` resets priority to 'medium' (FIXED)

**File:** `src/services/taskService.js`

**Expected behavior:** Marking a task complete should only change its
`status` and `completedAt` — its `priority` should stay whatever it was
before.

**Actual behavior:** `completeTask` hardcoded `priority: 'medium'` into the
updated task object, overwriting the original priority every time, even if
the task was `'high'` priority.

**How discovered:** Created a task with `priority: 'high'`, called
`completeTask`, and expected the priority to still be `'high'` afterward. The
test failed — the returned task had `priority: 'medium'` instead.

**Fix applied:** Removed the hardcoded `priority: 'medium'` line from the
update object, so the original priority (already copied in via `...task`) is
preserved.

---

## Bug #3 — `getByStatus` matches by substring, not exact value (NOT FIXED)

**File:** `src/services/taskService.js`

**Expected behavior:** `getByStatus('done')` should return only tasks whose
status is exactly `'done'`.

**Actual behavior:** The filter uses `t.status.includes(status)`, which
checks for a substring match, not exact equality. Since `'todo'`, `'done'`,
and `'in_progress'` all happen to contain the letter `'o'`, calling
`getByStatus('o')` — a value that isn't even a valid status — incorrectly
returns all three tasks instead of none.

**How discovered:** Created three tasks with statuses `'todo'`,
`'in_progress'`, and `'done'`, then called `getByStatus('o')`. Expected 0
results since `'o'` isn't a real status; got back all 3 tasks instead.

**Why not fixed:** This affects a public, documented query parameter
(`GET /tasks?status=`). Changing the matching logic to exact equality is the
right fix, but it's a behavior change to a public endpoint that should be
confirmed with the team first, in case any existing client is (even
accidentally) relying on the current substring-matching behavior.

**Suggested fix:**
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Summary

| Bug | Status |
|---|---|
| Pagination offset off-by-one | Fixed |
| `completeTask` resets priority | Fixed |
| `getByStatus` substring matching | Documented, not fixed (needs a product decision) |