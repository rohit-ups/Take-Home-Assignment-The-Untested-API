# Bug Report

During the testing phase, I identified three bugs in the API logic. I fixed the first one (Pagination Bug) as part of this assignment.

---

## 1. Pagination Offset Calculation Bug (Fixed)

- **Expected Behavior**: When requesting `GET /tasks?page=1&limit=10`, the API should return the first 10 items (items 0 to 9).
- **Actual Behavior**: The API skips the first 10 items and returns items 10 to 19.
- **How it was discovered**: I noticed the formula `const offset = page * limit` in `src/services/taskService.js`. Since `page` safely defaults to `1` in the route handler, `offset` becomes `10` instead of `0`.
- **Fix Applied**: Changed the offset calculation in `getPaginated` to: `const offset = (page - 1) * limit;`

---

## 2. Invalid Status Matching in getByStatus

- **Expected Behavior**: Filtering by status like `GET /tasks?status=todo` should return exactly tasks that have the status `todo`.
- **Actual Behavior**: If a user submits `?status=o`, it matches both `todo` and `in_progress` because the code uses `.includes(status)`.
- **How it was discovered**: Reviewing the `taskService.getByStatus` method, it uses `tasks.filter((t) => t.status.includes(status))`. 
- **Proposed Fix**: Use exact equality matching in `getByStatus`: `t.status === status`.

---

## 3. completeTask Overwrites Priority

- **Expected Behavior**: Marking a task as complete (`PATCH /tasks/:id/complete`) should update the status to `done` and set `completedAt` without modifying other unconnected properties like `priority`.
- **Actual Behavior**: The method hardcodes `priority: 'medium'`, which overwrites any `high` or `low` priority that the task originally had.
- **How it was discovered**: Reviewing `taskService.completeTask()`.
- **Proposed Fix**: Remove the `priority: 'medium'` line from the updated object payload in `completeTask`.
