# Bug Report & Submission Notes

This document contains the comprehensive bug audit for the Task Manager API, documentation of design decisions for the `PATCH /tasks/:id/assign` feature, and final submission notes.

---

## Part 1: Bug Audit & Findings

Every bug below was identified and verified by writing behavioral tests reflecting expected API behavior. For the bugs left unfixed (to adhere strictly to the "fix one bug" constraint), tests are included in the test suite and marked with `test.failing(...)` and `// BUG:` comments to keep the suite green while documenting the defects.

---

### Bug 1: Pagination Offset Calculation Off-by-One (FIXED)
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `getPaginated`
- **Root Cause:** Line 12 originally calculated offset as `const offset = page * limit;`. Because pages are 1-indexed (page 1 is the first page), `offset = 1 * limit` evaluated to skipping the first page of results entirely (indexes `0` through `limit - 1`).
- **Expected Behavior:** Requesting page 1 with limit 2 (`page=1&limit=2`) should calculate `offset = 0` and return the first 2 tasks (indexes 0 and 1).
- **Actual Behavior:** Offset evaluated to 2, omitting items 0 and 1 and returning item 2 instead. Page 2 then skipped items 2 and 3.
- **How Discovered:**
  - Unit test `taskService.getPaginated(1, 2)` returned 1 item (Item 3) instead of 2 items (Item 1 and Item 2).
  - Integration test `GET /tasks?page=1&limit=2` returned the 3rd task instead of the first 2 tasks.
- **Fix Applied:** Changed offset math to `const offset = (page - 1) * limit;`.

---

### Bug 2: Status Filtering Uses Substring Matching Instead of Exact Match
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `getByStatus`
- **Root Cause:** Line 9 filters tasks using `tasks.filter((t) => t.status.includes(status));`. Using `String.prototype.includes` matches any substring rather than exact string equality.
- **Expected Behavior:** Querying `/tasks?status=do` should match only tasks whose status is exactly `"do"` (i.e. zero results, since valid statuses are `"todo"`, `"in_progress"`, `"done"`).
- **Actual Behavior:** Querying `status=do` matches both `"todo"` and `"done"`. Querying `status=in` matches `"in_progress"`.
- **How Discovered:**
  - Unit test `taskService.getByStatus('do')` returned 2 tasks instead of an empty array.
  - Integration test `GET /tasks?status=do` returned tasks with status `todo` and `done`.
- **Fix:** Change line 9 to:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### Bug 3: `completeTask` Resets Task Priority to `'medium'`
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `completeTask`
- **Root Cause:** Line 69 hardcodes `priority: 'medium'` into the updated object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Expected Behavior:** Marking a task complete via `PATCH /tasks/:id/complete` should only modify `status` and `completedAt`. The original priority (`high` or `low`) should remain untouched.
- **Actual Behavior:** Any task completed has its priority unconditionally rewritten to `'medium'`.
- **How Discovered:**
  - Unit test `completeTask` on a task created with `priority: 'high'` returned a task with `priority: 'medium'`.
  - Integration test `PATCH /tasks/:id/complete` returned `priority: 'medium'` for a `high` priority task.
- **Fix:** Remove `priority: 'medium'` from the `updated` task object in `completeTask`.

---

### Bug 4: `completeTask` Overwrites `completedAt` on Already-Completed Tasks
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `completeTask`
- **Root Cause:** Line 71 unconditionally sets `completedAt: new Date().toISOString()`, without checking if the task was already completed.
- **Expected Behavior:** Completing an already-completed task should be idempotent: the original completion timestamp should be preserved.
- **Actual Behavior:** Subsequent calls to `PATCH /tasks/:id/complete` generate and overwrite `completedAt` with a new current timestamp each time.
- **How Discovered:**
  - Calling `completeTask` twice with a slight time delay yielded different `completedAt` values.
- **Fix:** Check if task is already completed before updating:
  ```javascript
  if (task.status === 'done') return task;
  ```

---

### Bug 5: `PUT /tasks/:id` Overwrites Protected System Fields (`id`, `createdAt`)
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `update`, and [`task-api/src/utils/validators.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/utils/validators.js) — `validateUpdateTask`
- **Root Cause:** `taskService.update` performs an unrestricted object spread:
  ```javascript
  const updated = { ...tasks[index], ...fields };
  ```
  Neither `validateUpdateTask` nor `taskService.update` strips or rejects system fields like `id` and `createdAt`.
- **Expected Behavior:** Immutable audit/system fields (`id`, `createdAt`) should not be editable by clients via `PUT /tasks/:id`.
- **Actual Behavior:** A client can supply `{ "id": "hacked-id", "createdAt": "2000-01-01T00:00:00.000Z" }` in the PUT body and mutate the primary key and creation timestamp.
- **How Discovered:**
  - Integration test `PUT /tasks/:id` with custom `id` and `createdAt` successfully changed both in the store.
- **Fix:** Whitelist mutable fields or explicitly strip protected keys:
  ```javascript
  const { id, createdAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### Bug 6: `PUT` with `status: 'done'` Does Not Set `completedAt`
- **Location:** [`task-api/src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) — `update`
- **Root Cause:** When updating a task through `PUT /tasks/:id` with `status: 'done'`, `update` does not handle state transitions to set `completedAt`.
- **Expected Behavior:** If a task's status transitions to `'done'` via PUT, `completedAt` should be recorded (or vice versa, cleared if moving back to `'todo'`).
- **Actual Behavior:** The task status becomes `'done'`, but `completedAt` remains `null`.
- **How Discovered:**
  - Integration test `PUT /tasks/:id` with `{ status: 'done' }` returned `completedAt: null`.
- **Fix:** In `taskService.update`, synchronize `completedAt` when `fields.status` is set to `'done'`.

---

### Bug 7: Validators Skip Falsy Values Like Empty String `status: ""` or `priority: ""`
- **Location:** [`task-api/src/utils/validators.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/utils/validators.js) — `validateCreateTask` and `validateUpdateTask`
- **Root Cause:** Validation checks use truthiness:
  ```javascript
  if (body.status && !VALID_STATUSES.includes(body.status))
  ```
  When `body.status` is `""` (empty string), `""` is falsy in JavaScript, bypassing the `if` block entirely and returning `null` (valid).
- **Expected Behavior:** `POST /tasks` with `{ "title": "Task", "status": "" }` should fail validation with HTTP 400 (`status must be one of: todo, in_progress, done`).
- **Actual Behavior:** The validator permits empty strings, creating a task with `status: ""`.
- **How Discovered:**
  - Integration test `POST /tasks` with `{ status: "" }` returned HTTP 201 Created instead of HTTP 400.
- **Fix:** Check for existence using `!== undefined` rather than truthiness:
  ```javascript
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  ```

---

### Bug 8: Status Filter and Pagination Parameters Do Not Work Together
- **Location:** [`task-api/src/routes/tasks.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/routes/tasks.js) — Route `GET /`
- **Root Cause:** Lines 14-24 check query parameters sequentially:
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }
  if (page !== undefined || limit !== undefined) { ... }
  ```
  If `status` is present, the handler immediately returns `getByStatus(status)`, ignoring `page` and `limit`.
- **Expected Behavior:** Querying `GET /tasks?status=todo&page=1&limit=2` should return a paginated subset of tasks that have status `'todo'`.
- **Actual Behavior:** It ignores pagination parameters and returns all tasks with status `'todo'`.
- **How Discovered:**
  - Integration test `GET /tasks?status=todo&page=1&limit=2` with 3 todo tasks returned all 3 tasks.
- **Fix:** Compose filtering and pagination together in `routes/tasks.js` or in a unified `taskService.query({ status, page, limit })` method.

---

### Bug 9: Non-Positive / Invalid Pagination Parameters Produce Erratic Slices
- **Location:** [`task-api/src/routes/tasks.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/routes/tasks.js) — Route `GET /`
- **Root Cause:**
  ```javascript
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  ```
  If `limit="0"`, `parseInt("0")` is 0 (falsy), so it silently defaults to 10. If `limit="-5"`, `parseInt("-5")` is -5 (truthy), so `limitNum = -5`, causing `tasks.slice(offset, offset - 5)` which slices backwards from the end of the array.
- **Expected Behavior:** Non-positive integers (`page <= 0` or `limit <= 0`) should be rejected with HTTP 400 Bad Request.
- **Actual Behavior:** API returns 200 with slice artifacts or silently overrides 0.
- **How Discovered:**
  - Integration test `GET /tasks?page=0&limit=-5` returned 200 instead of 400.
- **Fix:** Add validation in `routes/tasks.js` ensuring `pageNum >= 1` and `limitNum >= 1`, returning 400 if invalid.

---

### Bug 10: Express Error Handler Returns HTTP 500 for Malformed JSON
- **Location:** [`task-api/src/app.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/app.js) — lines 9-12
- **Root Cause:** Express `body-parser` generates a `SyntaxError` (status 400, type `'entity.parse.failed'`) when it receives invalid JSON syntax. The global error handler catches all errors and unconditionally sends HTTP 500:
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- **Expected Behavior:** Client-side syntax errors (malformed JSON) should return HTTP 400 Bad Request.
- **Actual Behavior:** API responds with HTTP 500 Internal Server Error.
- **How Discovered:**
  - Integration test sending broken JSON `'{"title": "Unclosed'` received HTTP 500.
- **Fix:** Handle `SyntaxError` in the error middleware:
  ```javascript
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```

---

## Part 2: Design Decisions for `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Method & Route:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "string" }`
- **Responses:**
  - `200 OK`: Returns the updated task object with the trimmed `assignee`.
  - `400 Bad Request`: When `assignee` is missing, not a string, empty after trimming, or exceeds 100 characters.
  - `404 Not Found`: When the task ID does not exist in the store.

### Key Design Decisions & Rationale

1. **Existence Checked Before Body Validation (404 Before 400):**
   - The route handler checks whether the target task exists (`taskService.findById(req.params.id)`) before running `validateAssignee(req.body)`.
   - **Rationale:** If a resource does not exist, validating client payloads against a non-existent entity is unnecessary and leaks less internal validation state. A 404 cleanly tells the caller that the URL is invalid.

2. **Reassigning an Already-Assigned Task is Allowed and Overwrites Assignee:**
   - Tasks can be reassigned to a different person at any time.
   - **Rationale:** In standard task management systems (e.g., Jira, Linear, GitHub Issues), tasks frequently transition between team members during different stages of review, development, and QA. Requiring an explicit unassignment step before reassigning would add artificial latency and friction to standard workflows without adding safety.

3. **Whitespace Trimming & Max Length (100 Characters):**
   - `validateAssignee` trims leading/trailing whitespace and rejects strings that are empty after trimming. The trimmed string is stored on the task.
   - **Rationale:** Prevents accidental storage of whitespace artifacts (e.g., copy-pasting names with trailing spaces) and protects the in-memory data store from unbounded payload abuse by enforcing a 100-character ceiling.

4. **Default Value on Creation:**
   - All newly created tasks now default to `assignee: null`.
   - **Rationale:** Explicitly represents an unassigned task in JSON responses, maintaining consistent schema shape across all tasks.

---

## Part 3: Submission Notes

### 1. What to Test Next (Given More Time)
- **Concurrency & Race Conditions:** Testing concurrent updates and reassignments (e.g., using `Promise.all` with multiple simultaneous PATCH requests to verify consistency).
- **Security & Authorization:** Role-based access control (can user A assign a task to user B?), input sanitization against XSS/injection in titles and assignees.
- **Database Persistence & Migrations:** Moving from in-memory array storage to a real database (PostgreSQL / SQLite) with transactional integrity, foreign key constraints (e.g., verifying `assignee` exists in a `users` table), and indexing on `status`, `dueDate`, and `assignee`.
- **Date Boundary & Timezone Handling:** Edge cases around leap years, daylight saving time transitions, and UTC vs local time offsets for `dueDate` and `overdue` calculations.

### 2. Surprises in the Codebase
- **Status Value Mismatch between Documentation and Code:**
  - The [README.md](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/README.md) specification lists statuses as: `pending | in-progress | completed`.
  - The actual source code in [`src/utils/validators.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/utils/validators.js) and [`src/services/taskService.js`](file:///c:/Users/aggis/Desktop/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js) enforces: `todo | in_progress | done`.
  - We followed the actual code implementation (`todo`, `in_progress`, `done`) and validated strictly against it.
- **Side Effect in `completeTask`:**
  - It was surprising to find that `completeTask` silently altered a completely unrelated field (`priority: 'medium'`), which could silently downgrade critical issues when marked done.

### 3. Questions to Ask Before Shipping to Production
1. **Persistence & Scalability:** What database engine will replace the current in-memory store, and what are the expected read/write loads and indexing requirements?
2. **User & Identity Integration:** Should `assignee` be a freeform display name string or a foreign key reference to an authenticated User ID/UUID?
3. **Status Taxonomy Standardization:** Should we align the API statuses with the README (`pending`, `in-progress`, `completed`) or keep the code's (`todo`, `in_progress`, `done`)? This should be finalized before publishing external API contracts.
4. **Soft Delete vs Hard Delete:** Should `DELETE /tasks/:id` permanently delete tasks or perform a soft delete (`deletedAt` timestamp) to allow audit recovery?
5. **Observability & Logging:** What structured logging (e.g., Winston, Pino) and metrics/tracing (OpenTelemetry, Prometheus) should be introduced for production monitoring?
