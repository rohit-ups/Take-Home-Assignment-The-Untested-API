# Bug Report

During test coverage development, four bugs were identified in the Task Manager API. Since all application state is held in memory, fixing data integrity bugs was highly prioritized. I've repaired all 4 issues codebase-wide.

## 1. Substring Matching in Status Filter
**Location:** `src/services/taskService.js` (line 9)
- **Expected behavior:** Filtering tasks by `?status=do` should return 0 tasks if no tasks have exactly that status.
- **Actual behavior:** It returned tasks with statuses `todo` and `done` because it uses `.includes()` instead of strict equality `===`.
- **How I discovered it:** Writing a unit test filtering for the substring `do` and realizing it incorrectly populated the result list.
- **Fix Applied:** Changed `t.status.includes(status)` to `t.status === status`.

## 2. Pagination Offset Skips First Page
**Location:** `src/services/taskService.js` (line 12)
- **Expected behavior:** Requesting `?page=1&limit=10` should return items 0 through 9 of the array.
- **Actual behavior:** It returned items 10 through 19 because the offset calculation was `page * limit` instead of `(page - 1) * limit`. The first page was completely unreachable unless `page=0` was requested (which isn't conventionally expected).
- **How I discovered it:** While setting up pagination integration tests, page 1 failed returning tasks 3 and 4 instead of tasks 1 and 2 (with a limit of 2).
- **Fix Applied:** Changed the calculation to `const offset = (page > 0 ? page - 1 : 0) * limit;`

## 3. Unprotected Field Overwrite (Data Integrity Issue)
**Location:** `src/services/taskService.js` (line 50)
- **Expected behavior:** Clients should not be able to change internal tracking fields like the Task's `id`, `createdAt`, or `completedAt` timestamps using standard update operations (`PUT`).
- **Actual behavior:** The update function used spread operators (`...tasks[index], ...fields`) directly on user-provided input, allowing the user to overwrite any field (e.g., swapping out the task UUID for an arbitrary string). 
- **How I discovered it:** Security validation check during testing by deliberately attempting to overwrite the Task ID.
- **Fix Applied:** Manually sanitizing `fields` by deleting protected keys (`id`, `createdAt`, `completedAt`) before applying the merge.

## 4. Priority Reset on Task Completion
**Location:** `src/services/taskService.js` (line 69)
- **Expected behavior:** Marking a task as complete (`PATCH /tasks/:id/complete`) should only change its completion status and timestamp, while maintaining user-assigned priority flags.
- **Actual behavior:** `completeTask()` hard-coded `priority: 'medium'`, permanently resetting high or low priority tasks as medium once finished.
- **How I discovered it:** Wrote an integration test that checks multiple fields inside a completed task constraint and asserted priority remained original.
- **Fix Applied:** Removed the `priority: 'medium'` line from the object initialization block in `completeTask`.
