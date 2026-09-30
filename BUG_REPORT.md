# Bug Report

### Bug 1: Pagination skips the first page
- **Location:** `src/services/taskService.js` (line 11)
- **What happens:** `offset` is calculated as `page * limit`. For `page=1&limit=10`, `offset` is 10 instead of 0, so the first 10 tasks are skipped.
- **Expected:** `page=1` should return the first page (items 0 to 9). Offset should be `(page - 1) * limit`.
- **How found:** Tested `GET /tasks?page=1&limit=2` on 5 tasks; it returned tasks 3 and 4 instead of tasks 1 and 2.
- **Fix:** Update formula to `offset = (page - 1) * limit`.

---

### Bug 2: `completeTask` overwrites task priority to `medium`
- **Location:** `src/services/taskService.js` (line 69)
- **What happens:** `completeTask()` sets `priority: 'medium'` unconditionally. Any `high` or `low` priority task loses its priority when marked done.
- **Expected:** Completing a task should only update `status` to `done` and set `completedAt`. Existing priority must be kept.
- **How found:** Wrote a test completing a `high` priority task; the returned task had `priority: 'medium'`.
- **Fix:** Remove `priority: 'medium'` from the update object.

---

### Bug 3: `getByStatus` matches partial strings
- **Location:** `src/services/taskService.js` (line 9)
- **What happens:** Uses `tasks.filter(t => t.status.includes(status))`. Querying `?status=do` matches both `todo` and `done`.
- **Expected:** Exact match (`t.status === status`).
- **How found:** Tested filtering with substring `do`; tasks with both `todo` and `done` were returned.
- **Fix:** Replace `.includes(status)` with `=== status`.

---

### Bug 4: README status values don't match validator
- **Location:** `README.md` (line 77) vs `src/utils/validators.js` (line 1)
- **What happens:** `README.md` documents statuses as `pending | in-progress | completed`, but the validator requires `todo | in_progress | done`. Calling the API with README examples returns 400.
- **Expected:** Documentation should match valid schema values.
- **How found:** Compared `README.md` curl examples with `VALID_STATUSES` in `validators.js`.
- **Fix:** Update `README.md` to reflect `todo | in_progress | done`.
