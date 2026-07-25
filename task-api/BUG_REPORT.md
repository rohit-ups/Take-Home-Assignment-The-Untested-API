# Bug Report — Task Manager API

### Bug 1: Status Filtering Bypasses Pagination Entirely
* **Expected Behavior:** Requesting `GET /tasks?status=todo&page=1&limit=5` should return only the first 5 `todo` tasks (filtering and pagination should combine).
* **Actual Behavior:** An early `return res.json(tasks)` inside the `status` query check prevented pagination from running. Requesting `?status=todo&page=1&limit=5` returned all `todo` tasks, completely ignoring `page` and `limit`.
* **How Discovered:** Discovered while reading the codebase sincerely
* **Fix Strategy:** Refactor `GET /tasks` in `src/routes/tasks.js` to process filtering first, and then apply pagination slicing to the resulting array before returning the response.

---

### Bug 2: Off-by-One Calculation in `getPaginated`
* **Expected Behavior:** Requesting `page=1` with `limit=10` should return items from index `0` to `9`.
* **Actual Behavior:** The model calculated `offset = page * limit`, so `page=1` calculated an offset of `10`, skipping the first page of results entirely.
* **How Discovered:** Discovered when testing `taskService.getPaginated(1, 10)` directly in unit tests.
* **Fix Strategy:** Update offset formula from `page * limit` to `Math.max(0, (page - 1) * limit)`.

---
## bug 1 and bug 2 are together choosen to be fixed

---

### Bug 3: Overly Lenient Date Validation via `Date.parse()`
* **Expected Behavior:** Input provided for `dueDate` should strictly be a valid ISO date string (e.g., `"2026-08-01"` or `"2026-08-01T12:00:00Z"`).
* **Actual Behavior:** `Date.parse()` natively attempts to coerce loose inputs like numbers (`12345`), standard year strings (`"2026"`), or partial date formats into timestamps, allowing non-ISO date formats to bypass validation.
* **How Discovered:** Discovered during input validation unit tests when passing non-ISO string values to `dueDate`.
* **Fix Strategy:** Add an explicit format check in `src/utils/validators.js` using an ISO date Regular Expression (or ensure `typeof body.dueDate === 'string'`) before executing `Date.parse()`.

---
### Bug 4: User Can Overwrite Immutable Fields (`id` and `createdAt`)
* **Expected Behavior:** System-managed fields (`id` and `createdAt`) must remain immutable and should never be altered by client request payloads.
* **Actual Behavior:** Passing `{ "id": "custom-id", "createdAt": "2020-01-01" }` in a `PUT /tasks/:id` request overwrites the task's original `id` and creation timestamp due to unrestricted object spreading.
* **How Discovered:** Discovered while reading the codebase sincerely  and testing security edge cases with custom payloads on `PUT /tasks/:id`.
* **Fix Strategy:** Destructure `fields` inside `taskService.update()` to explicitly strip out `id` and `createdAt` before merging, or sanitize `req.body` in the controller/validator to reject or ignore system fields.

---
### Bug 5: Substring Matching in `getByStatus` Filter
* **Expected Behavior:** `GET /tasks?status=in` should return an empty array if no status string strictly equals `'in'`.
* **Actual Behavior:** `getByStatus` uses `String.prototype.includes()`, which causes `?status=in` to match tasks with `status: 'in_progress'`.
* **How Discovered:** Discovered during unit testing of `getByStatus()` when searching with partial status substrings.
* **Fix Strategy:** Replace `tasks.filter(t => t.status.includes(status))` in `src/services/taskService.js` with exact equality `tasks.filter(t => t.status === status)`.