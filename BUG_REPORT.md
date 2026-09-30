# Bug Report

The `assignee` field is not part of the original task shape. It was added by the
`PATCH /tasks/:id/assign` feature (Part C), and is `null` until a task is assigned.

## Bugs fixed

### 1) Pagination skips the first page

- **Expected:** `GET /tasks?page=1&limit=2` returns the first 2 tasks; `page=2` returns the next 2.
- **Actual:** The offset was `page * limit`, so page 1 started at index `limit`. With 3 tasks, `page=1&limit=2` returned only the third task.
- **How discovered:** A pagination test creating 3 tasks and requesting page 1 failed.
- **Fix:** `offset = (page - 1) * limit`, with invalid page/limit values clamped to defaults.
- **Tests:** "getPaginated uses 1-based page numbers", "GET /tasks?page=1&limit=2", "GET /tasks?page=2&limit=2".

### 2) Status filter uses partial matching

- **Expected:** `GET /tasks?status=todo` returns only tasks whose status is exactly `todo`. A partial value such as `do` returns nothing.
- **Actual:** The filter used `status.includes(...)`, so partial values matched (`?status=do` returned `todo` tasks).
- **How discovered:** Found by reading the filter logic against the allowed statuses, then confirmed with a test using a partial value. A test using the full value `todo` passes under both the buggy and fixed code, so it cannot catch this bug.
- **Fix:** Use strict equality: `task.status === status`.
- **Tests:** "getByStatus does not match partial status values", "GET /tasks?status=do returns no tasks".

### 3) Completing a task resets its priority to `medium`

- **Expected:** `PATCH /tasks/:id/complete` sets `status` to `done` and sets `completedAt`. Nothing else changes.
- **Actual:** `completeTask` also forced `priority: 'medium'`, so a `high` priority task lost its priority on completion.
- **How discovered:** Writing the complete-endpoint test and comparing the task before and after. The API description only says "Mark as complete", so a priority change is unexpected.
- **Fix:** Remove the `priority: 'medium'` line from `completeTask`.
- **Tests:** "completeTask sets status/completedAt and preserves priority", "PATCH /tasks/:id/complete marks done and preserves priority".

### 4) Malformed JSON returns 500 instead of 400

- **Expected:** A request with an invalid JSON body returns `400` with a clear message.
- **Actual:** The body-parser error fell into the generic error handler and returned `500 Internal server error`.
- **How discovered:** Sending a request with a broken JSON body (`{"title": `).
- **Fix:** In the error handler in `app.js`, return `400` when `err.type === 'entity.parse.failed'`.
- **Test:** "POST /tasks with malformed JSON returns 400, not 500".

## Bugs found but not fixed

### 5) `PUT /tasks/:id` can overwrite protected fields
- **Expected:** `id`, `createdAt` and `completedAt` cannot be changed by a client.
- **Actual:** `update` spreads the request body over the task, so these fields can be overwritten.
- **Fix:** Whitelist the editable fields (`title`, `description`, `status`, `priority`, `dueDate`, `assignee`) in `update`.

### 6) `completedAt` is inconsistent between `PUT` and `PATCH /complete`
- **Expected:** `completedAt` is set whenever a task becomes `done` and cleared when it leaves `done`.
- **Actual:** Only `PATCH /complete` sets it. `PUT` with `status: 'done'` leaves it `null`, and moving a task out of `done` leaves the old timestamp.
- **Fix:** Handle `completedAt` in `update` whenever `status` changes.

### 7) Completing an already-completed task overwrites `completedAt`
- **Expected:** Completing a done task is a no-op, or is rejected.
- **Actual:** `completedAt` is reset to the current time on every call.
- **Fix:** Return the task unchanged if it is already `done`.

### 8) Empty-string `status` or `priority` passes validation
- **Expected:** `status: ""` returns 400.
- **Actual:** The validator uses truthy checks (`if (body.status && ...)`), so `""` is skipped and stored as the status (the default only applies when the value is `undefined`).
- **Fix:** Check `body.status !== undefined` instead of truthiness.

### 9) `GET /tasks` ignores pagination when `status` is provided
- **Expected:** `?status=todo&page=2&limit=5` returns page 2 of the `todo` tasks.
- **Actual:** The status filter returns early and pagination is ignored.
- **Fix:** Filter first, then paginate the filtered list.

### 10) Query parameters are not validated
- **Expected:** An invalid `status` such as `?status=banana` returns 400, and `limit` has a sensible maximum.
- **Actual:** An invalid status returns `200 []`, and `limit` has no upper bound.
- **Fix:** Validate `status` against the allowed values and cap `limit` (for example, at 100).

### 11) Inconsistent trimming
- **Expected:** `title` and `assignee` are stored in the same form on every endpoint.
- **Actual:** `PATCH /assign` stores the trimmed assignee, but `POST` and `PUT` validate the trimmed value and store the raw string.
- **Fix:** Trim in the create/update paths as well.

## Design decisions for `PATCH /tasks/:id/assign`

- Missing task: `404`.
- Empty, whitespace-only, missing or non-string `assignee`: `400`.
- Assignee is trimmed before being stored.
- Task already assigned: reassignment is allowed, the old assignee is overwritten, and the response is `200`. This is simple and matches how the other update endpoints work. If the team wants to protect existing assignments, it could return `409` instead.