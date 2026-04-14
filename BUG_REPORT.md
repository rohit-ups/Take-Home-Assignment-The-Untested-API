# Bug Report

## Bug 1: Status Filter Inexact Matching
- **Expected Behavior:** Searching by status (e.g. `?status=todo`) should strictly return tasks with exactly that status.
- **Actual Behavior:** Searching for `status="do"` returns both `"todo"` and `"done"` tasks.
- **How I discovered it:** Writing unit tests for `getByStatus` in `taskService.js`; observing that `.includes(status)` was used instead of strict `===` equality.
- **Proposed Fix:** Change `tasks.filter((t) => t.status.includes(status))` to `tasks.filter((t) => t.status === status)`.

## Bug 2: Task Completion Overwrites Priority
- **Expected Behavior:** Marking a task as complete should set its status to `"done"` and update `completedAt`, but leave its `priority` untouched.
- **Actual Behavior:** The `completeTask` method explicitly sets `priority: 'medium'`, resetting high or low priority entries to medium.
- **How I discovered it:** Writing the unit test for `completeTask()` in `taskService.js` and asserting the `priority` remains the same.
- **Proposed Fix:** Remove `priority: 'medium'` from the updated object in the `completeTask` function.

## Bug 3: Pagination Defaults to Page 1 on Page 0 Request
- **Expected Behavior:** Passing `?page=0&limit=10` should evaluate to `page=0` and return the first 10 items.
- **Actual Behavior:** The server processes `parseInt('0') || 1`, determining `0` is falsy and forcing `page = 1`. This leads to skipping the first page in 0-indexed systems.
- **How I discovered it:** Writing the integration test (`GET /tasks?page=0&limit=2`) and seeing that instead of 2 items returned, only 1 was returned (offset was shifted).
- **Proposed Fix:** Use stricter falsy checks `isNaN(parseInt(page)) ? 1 : parseInt(page)`.
