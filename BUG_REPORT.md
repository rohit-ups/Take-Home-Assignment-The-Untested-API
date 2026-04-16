# Bug Report

This report reflects the current codebase after implementation work. Bugs #4, #5, and #9 from the original audit have been fixed.

## Resolved During Implementation

- Bug #4: Completing a task no longer resets priority to `medium`.
- Bug #5: Re-completing a task no longer rewrites the original `completedAt` timestamp.
- Bug #9: `PATCH /tasks/:id/assign` now exists and stores `assignee` on the task.

## Open Bugs

**Bug #1: Status filter does substring matching**

- **File:** src/services/taskService.js
- **Line:** ~9
- **Expected behavior:** `GET /tasks?status=...` should return only tasks whose status exactly matches the requested enum value.
- **Actual behavior:** `getByStatus()` uses `t.status.includes(status)`, so partial values match too. For example, `status=do` returns both `todo` and `done`.
- **How discovered:** Test `getByStatus() -> does not match partial status fragments` and integration check for `GET /tasks?status=`.
- **Proposed fix:** Replace substring matching with strict equality, and validate the query status before filtering.

---

**Bug #2: Pagination skips the first page**

- **File:** src/services/taskService.js
- **Line:** ~12
- **Expected behavior:** Page 1 with limit N should return the first N tasks.
- **Actual behavior:** `getPaginated()` computes `offset = page * limit`, so page 1 starts at index `limit` and skips the first page entirely.
- **How discovered:** Test `getPaginated() -> returns the first page of tasks when page=1 and limit=2` and integration check for `GET /tasks` with pagination.
- **Proposed fix:** Use `offset = (page - 1) * limit` for 1-based pagination, and reject invalid page/limit values.

---

**Bug #3: PUT allows immutable fields like createdAt to be overwritten**

- **File:** src/services/taskService.js
- **Line:** ~50
- **Expected behavior:** Client updates should only be able to change mutable task fields.
- **Actual behavior:** `update()` merges the entire request body into the existing task object with `{ ...tasks[index], ...fields }`, so a request body containing `createdAt` or `id` overwrites those system fields.
- **How discovered:** Test `update() -> does not allow createdAt to be overwritten by client updates`.
- **Proposed fix:** Whitelist allowed update fields before merging and ignore or reject immutable properties.

---

**Bug #4: Invalid status query values are accepted instead of rejected**

- **File:** src/routes/tasks.js
- **Line:** ~14-16
- **Expected behavior:** `GET /tasks?status=...` should validate the requested status and return 400 for unsupported values.
- **Actual behavior:** The route forwards whatever string is in `req.query.status` to `getByStatus()`. Because filtering is substring-based and there is no validation step, unsupported values like `pending` are not rejected consistently.
- **How discovered:** Integration test `GET /tasks -> returns 400 for invalid status filter value`.
- **Proposed fix:** Validate the query parameter against the allowed enum before calling the service and return 400 on invalid input.

---

**Bug #5: Invalid page and limit values are silently coerced**

- **File:** src/routes/tasks.js
- **Line:** ~18-21
- **Expected behavior:** Non-numeric, zero, or negative pagination values should be rejected with 400.
- **Actual behavior:** `parseInt(page) || 1` and `parseInt(limit) || 10` coerce invalid values into defaults. That means `page=abc` becomes page 1 and `limit=0` becomes 10 instead of returning a validation error.
- **How discovered:** Integration tests `GET /tasks -> returns 400 for invalid page query value` and `GET /tasks -> returns 400 for invalid limit query value`.
- **Proposed fix:** Parse and validate query parameters explicitly, require positive integers, and return 400 when parsing fails or values are out of range.

---

**Bug #6: PUT accepts an empty payload instead of rejecting it**

- **File:** src/routes/tasks.js
- **Line:** ~37-46
- **Expected behavior:** Updating a task should require at least one valid field, or the API should reject empty bodies with 400.
- **Actual behavior:** An empty object passes validation because `validateUpdateTask({})` returns null, and `taskService.update()` simply merges nothing and returns the existing task.
- **How discovered:** Integration test `PUT /tasks/:id -> returns 400 when required update fields are missing`.
- **Proposed fix:** Add a validation rule that rejects empty update payloads and return 400 before calling the service.

---

**Bug #7: The error middleware converts all errors into a 500 response**

- **File:** src/app.js
- **Line:** ~9-11
- **Expected behavior:** Client-side validation and JSON parsing errors should return 400-class responses where appropriate.
- **Actual behavior:** The global error handler always returns `500 Internal server error`, regardless of whether the error originated from bad input or a server fault.
- **How discovered:** Manual inspection of the Express error middleware and the null/invalid-body edge cases in the tests.
- **Proposed fix:** Detect known client errors and map them to 400 responses; reserve 500 for unexpected server failures.

---

**Bug #8: Documentation status enum disagrees with the implementation**

- **File:** README.md
- **Line:** ~77
- **Expected behavior:** The API documentation should describe the same task status values that the code accepts and returns.
- **Actual behavior:** README uses `pending | in-progress | completed`, while the code and assignment use `todo | in_progress | done`.
- **How discovered:** Manual inspection of README and assignment docs.
- **Proposed fix:** Update README examples and schema to match the actual API contract, or refactor the code to match the documented values.
