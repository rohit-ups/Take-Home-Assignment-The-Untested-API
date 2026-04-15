# Bug Report

## Bug 1: Pagination skips first page items

- **Location:** `src/services/taskService.js` in `getPaginated(page, limit)`
- **Expected:** `page=1&limit=10` returns items 1-10.
- **Actual:** `page=1` starts from offset `10`, effectively skipping first records.
- **How discovered:** Added pagination tests in `tests/taskService.test.js` and `tests/tasks.routes.test.js`.
- **Root cause:** Offset used `page * limit` instead of `(page - 1) * limit`.
- **Fix:** Updated offset formula to `(page - 1) * limit`.

## Bug 2: Completing task resets priority unexpectedly

- **Location:** `src/services/taskService.js` in `completeTask(id)`
- **Expected:** Completing a task should not alter priority.
- **Actual:** Priority is forcibly changed to `"medium"` on completion.
- **How discovered:** Added completion tests that assert existing task fields remain stable except completion-related fields.
- **Root cause:** Hardcoded `priority: 'medium'` in completion update object.
- **Fix:** Removed the priority override so existing priority is preserved.
