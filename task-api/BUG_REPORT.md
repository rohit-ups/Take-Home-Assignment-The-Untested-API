# Bug Report

## 1) Pagination returns the wrong page (fixed)

- **What should happen:** `/tasks?page=1&limit=2` should return the first two tasks. Page 2 should return the next two.
- **What happens now:** Page 1 starts too late, so it returns tasks 3-4.
- **How found:** Tests for pagination failed.
- **Where:** `task-api/src/services/taskService.js` in `getPaginated`.
- **Why:** It used `page * limit` instead of `(page - 1) * limit`.
- **Fix applied:** Use `(page - 1) * limit`.

## 2) Status filter matches part of a word (fixed)

- **What should happen:** `/tasks?status=todo` should only return tasks with `todo`.
- **What happens now:** `/tasks?status=do` would match both `todo` and `done`.
- **How found:** While writing tests for the status filter.
- **Where:** `task-api/src/services/taskService.js` in `getByStatus`.
- **Why:** It used `includes` instead of exact match.
- **Fix applied:** Use exact match only.

## 3) Completing a task resets priority (fixed)

- **What should happen:** A task should keep its priority when completed.
- **What happens now:** The priority is forced to `medium`.
- **How found:** While adding tests for completing a task.
- **Where:** `task-api/src/services/taskService.js` in `completeTask`.
- **Why:** It set `priority: 'medium'` every time.
- **Fix applied:** Do not change priority when completing.

## 4) README status values were wrong (fixed)

- **What should happen:** The README should match the real status values.
- **What happens now:** README listed different status names.
- **How found:** Comparing README with the code and tests.
- **Where:** `README.md` vs `task-api/src/utils/validators.js`.
- **Fix applied:** README now matches the real status values.
