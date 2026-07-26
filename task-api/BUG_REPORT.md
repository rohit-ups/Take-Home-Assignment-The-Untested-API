# Bug Report

## Bug 1: `getByStatus` uses substring match instead of exact match

- **File:** `src/services/taskService.js`, line 9
- **Expected behavior:** Filtering by status `"todo"` should return only tasks with status exactly `"todo"`.
- **Actual behavior:** `t.status.includes(status)` performs a substring match. Filtering by `"do"` matches `"done"`, filtering by `"in"` matches `"in_progress"`, etc.
- **How I discovered it:** Wrote a unit test that filters by the partial string `"do"` and verified it incorrectly returned `"done"` tasks.
- **Fix:** Change `t.status.includes(status)` to `t.status === status`. ✅ **Fixed.**

---

## Bug 2: `getPaginated` offset calculation is wrong

- **File:** `src/services/taskService.js`, line 12
- **Expected behavior:** `page=1` should return the first `limit` items (items 0 through `limit-1`).
- **Actual behavior:** The offset is calculated as `page * limit`, which for page 1 skips the first `limit` items entirely. Page 1 returns items that should be on page 2.
- **How I discovered it:** Wrote a unit test creating 5 tasks and requesting page 1 with limit 2. The test expected `Task 1` and `Task 2` but received `Task 3` and `Task 4`.
- **Fix:** Change `page * limit` to `(page - 1) * limit`. ✅ **Fixed.**

---

## Bug 3: `completeTask` resets priority to `'medium'`

- **File:** `src/services/taskService.js`, lines 67–76
- **Expected behavior:** Completing a task should set `status` to `"done"` and add a `completedAt` timestamp, without modifying other fields.
- **Actual behavior:** The spread object includes `priority: 'medium'`, which overwrites the task's original priority regardless of what it was.
- **How I discovered it:** Wrote a unit test that creates a task with priority `"high"`, completes it, and then asserts the priority is still `"high"`. The test failed because the priority was reset to `"medium"`.
- **Fix:** Remove the `priority: 'medium'` line from the `completeTask` function. ✅ **Fixed.**

---

## Bug 4: `update` allows overwriting protected fields (`id`, `createdAt`)

- **File:** `src/services/taskService.js`, line 50
- **Expected behavior:** The `PUT /tasks/:id` endpoint should only update user-controlled fields (title, description, status, priority, dueDate).
- **Actual behavior:** `{ ...tasks[index], ...fields }` blindly merges whatever fields are in the request body, meaning a caller can overwrite `id`, `createdAt`, or `completedAt` by including them in the PUT body.
- **How I discovered it:** Code review — the route layer performs validation on known fields but does not strip unknown or protected fields before passing to the service layer.
- **Fix:** Either destructure only allowed fields in the service's `update` function, or strip protected fields (`id`, `createdAt`, `completedAt`) before merging. **Not fixed** — lower severity and requires a design decision about which fields to protect.

---

## Bug 5: `completeTask` lacks idempotency

- **File:** `src/services/taskService.js` (Original implementation)
- **Expected behavior:** Calling `PATCH /tasks/:id/complete` on a task that is already completed should be idempotent (it shouldn't change the task's state).
- **Actual behavior:** It updates the `completedAt` timestamp to the current time on every request.
- **How I discovered it:** Reviewed the API behavior for idempotency principles.
- **Fix:** Added an early return `if (task.status === 'done') return task;` before updating the timestamp. ✅ **Fixed in**

---

## Bug 6: Strict case sensitivity for enums

- **File:** `src/utils/validators.js`
- **Expected behavior:** Sending `priority: "HIGH"` or `status: "IN_PROGRESS"` should be accepted and normalized.
- **Actual behavior:** The validators do a strict equality check against `['low', 'medium', 'high']`, so uppercase or mixed case strings fail validation.
- **How I discovered it:** Testing API robustness against slightly irregular but semantically valid inputs.
- **Fix:** Converted `req.body.priority` and `req.body.status` to lowercase in the controller before passing them to the validators and service. ✅ **Fixed in**

---

## Bug 7: Pagination limits and bounds are not validated

- **File:** `src/routes/tasks.js` (Original implementation)
- **Expected behavior:** The API should reject invalid pagination bounds like negative numbers or excessively large limits to prevent memory bloat (DoS).
- **Actual behavior:** `parseInt(page) || 1` accepts negative values (e.g. `?page=-5`), and there is no cap on `limit`.
- **How I discovered it:** Investigating security around query parameter injection.
- **Fix:** Added validation in the controller ensuring `page >= 1` and `1 <= limit <= 100`. ✅ **Fixed in**

---

## Architectural & Security Limitations

- **Concurrency:** Because this API uses an in-memory array and Node.js is single-threaded, it is inherently safe from traditional race conditions. However, if migrating to a real database, transactions or optimistic locking would be required.
- **Scalability:** The in-memory array will not scale across multiple server instances (e.g., in a load-balanced environment), as each instance would maintain its own isolated array. A centralized database is required for true scalability.
- **Modularity:** Originally, the routing file contained all the request/response logic. This was improved by adding a `taskController.js` layer. ✅ **Fixed in**
- **SQL Injection:** The current system is completely safe from SQL injections because there is no SQL database—everything is stored in memory.
