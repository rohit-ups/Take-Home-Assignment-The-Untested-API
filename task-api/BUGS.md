# Bug Report — Task Manager API

## Bug 1: Status filter uses substring matching instead of exact match

- **Location**: `src/services/taskService.js`, line 9
- **Expected**: `GET /tasks?status=do` returns an empty array since no status value is `"do"`
- **Actual**: Returns tasks with status `"todo"` and `"done"` because `"todo".includes("do")` and `"done".includes("do")` are both true
- **Root Cause**: `getByStatus` uses `t.status.includes(status)` instead of `t.status === status`
- **Test**: `taskService.test.js` — "matches substrings due to .includes() bug"; `tasks.routes.test.js` — "returns too many results for partial status due to substring bug"
- **Fix**: Replace `.includes(status)` with `=== status` on line 9

---

## Bug 2: Pagination returns wrong page (off-by-one) — FIXED

- **Location**: `src/services/taskService.js`, line 12
- **Expected**: `GET /tasks?page=1&limit=2` returns the first 2 tasks (index 0-1)
- **Actual**: Returns tasks at index 2-3 (skips the entire first page)
- **Root Cause**: Offset is calculated as `page * limit` instead of `(page - 1) * limit`. For 1-based pagination, page 1 should produce offset 0, but `1 * 2 = 2`
- **Test**: `taskService.test.js` — "page 1 returns wrong slice due to off-by-one bug"; `tasks.routes.test.js` — "page 1 returns wrong items due to off-by-one bug"
- **Fix**: Change `const offset = page * limit` to `const offset = (page - 1) * limit`

---

## Bug 3: completeTask() resets priority to "medium"

- **Location**: `src/services/taskService.js`, line 69
- **Expected**: Marking a task complete preserves its original priority
- **Actual**: Priority is overwritten to `"medium"` regardless of the original value
- **Root Cause**: `completeTask` constructs the updated object with a hardcoded `priority: 'medium'` property
- **Test**: `taskService.test.js` — "resets priority to medium due to hardcoded priority bug"; `tasks.routes.test.js` — "resets priority to medium due to hardcoded priority bug"
- **Fix**: Remove the `priority: 'medium'` line from the object spread in `completeTask`

---

## Bug 4: Empty string bypasses status/priority validation

- **Location**: `src/utils/validators.js`, lines 8, 11, 24, 27
- **Expected**: `POST /tasks` with `{ "title": "T", "status": "" }` returns 400 since `""` is not a valid status
- **Actual**: Returns 201 — the task is created with an empty string as its status
- **Root Cause**: Validators use `if (body.status)` and `if (body.priority)` which evaluate to `false` for empty strings, skipping the enum check entirely
- **Test**: `tasks.routes.test.js` — "accepts empty string status due to validation bypass bug"
- **Fix**: Change truthiness checks to explicit existence checks: `if (body.status !== undefined)` and `if (body.priority !== undefined)`

---

## Bug 5: Status filter and pagination are mutually exclusive

- **Location**: `src/routes/tasks.js`, lines 14-24
- **Expected**: `GET /tasks?status=todo&page=1&limit=2` returns a paginated subset of todo tasks
- **Actual**: Returns all todo tasks — the pagination parameters are completely ignored
- **Root Cause**: The route handler checks `if (status)` first and returns immediately, so the `page`/`limit` branch is never reached when both are provided
- **Test**: `tasks.routes.test.js` — "ignores pagination when status filter is also present"
- **Fix**: Combine filtering and pagination into a single code path instead of using early returns

---

## Bug 6: PUT allows overwriting id and createdAt

- **Location**: `src/services/taskService.js`, line 50
- **Expected**: `PUT /tasks/:id` with `{ "id": "hacked-id" }` updates allowed fields but preserves the original `id` and `createdAt`
- **Actual**: The task's internal `id` is overwritten to `"hacked-id"`, making the task unreachable by its original ID
- **Root Cause**: `update()` uses `{ ...tasks[index], ...fields }` which blindly merges all client-provided fields, including system-managed metadata
- **Test**: `taskService.test.js` — "allows overwriting id due to unsanitized spread bug"
- **Fix**: Destructure and strip `id`, `createdAt`, and `completedAt` from `fields` before spreading, or use an allowlist of updatable fields
