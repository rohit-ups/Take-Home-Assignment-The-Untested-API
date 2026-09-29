# Submission Notes: The Untested API

## Summary of Deliverables

1. **Comprehensive Test Suite (`task-api/tests/`):**
   - Unit tests for `taskService.js` ([`tests/unit/taskService.test.js`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/tests/unit/taskService.test.js))
   - Unit tests for validators ([`tests/unit/validators.test.js`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/tests/unit/validators.test.js))
   - Integration tests with Supertest ([`tests/integration/tasks.test.js`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/task-api/tests/integration/tasks.test.js))
   - **70 passing tests** covering happy paths and edge cases for every endpoint.
   - **98.7% statement coverage** (far exceeding the 80% threshold).

2. **Detailed Bug Report ([`BUG_REPORT.md`](file:///Users/majidullask/Desktop/assinment/Take-Home-Assignment-The-Untested-API/BUG_REPORT.md)):**
   - Documents 5 bugs identified, their exact code locations, why they occurred, how tests detected them, and their remediation.

3. **Bug Fixes:**
   - Fixed the pagination off-by-one error where `offset = page * limit` skipped page 1.
   - Fixed status filtering to use exact equality (`===`) instead of substring matching (`includes`).
   - Fixed `completeTask` so it preserves existing task `priority` instead of overwriting it to `'medium'`.
   - Fixed `GET /tasks` query handling to support combining `?status=` with pagination `?page=&limit=`.
   - Protected immutable attributes (`id`, `createdAt`) from arbitrary client overwrites in `update()`.

4. **New Feature (`PATCH /tasks/:id/assign`):**
   - Implemented in `taskService.js` and `routes/tasks.js`.
   - Full validation via `validateAssignTask` (ensures non-empty string, handles whitespace and types).
   - Returns 200 with updated task, 404 if not found, 400 on invalid payload.
   - Unit and integration tests included.

---

## Reflection & Questions

### 1. What you'd test next if you had more time
- **Concurrent requests & race conditions:** When moving from in-memory arrays to a shared persistent database, test optimistic concurrency control, transaction isolation, and idempotent operations.
- **Edge cases around date handling & timezones:** Test daylight saving transitions, UTC vs. local timezone offsets in `dueDate`, and date comparison boundaries in `getStats()`.
- **Fuzzing & load testing:** Test payloads with oversized strings, prototype pollution attempts (e.g. `{ "__proto__": ... }`), deep nesting, and high request volumes to verify performance and memory stability.
- **Strict schema rejection:** Test that unexpected extra properties in POST/PUT request bodies are either stripped or rejected (`400 Bad Request`).

### 2. Anything that surprised you in the codebase
- **Clobbering task priority upon completion:** Finding that `completeTask` silently reset `priority: 'medium'` was an interesting bug that would be very confusing for end users if it reached production.
- **`status.includes(...)`:** Using substring matching for statuses meant that filtering for `?status=progress` returned `in_progress` tasks, and `?status=do` would return both `todo` and `done` tasks.
- **The 1-based pagination offset logic:** `offset = page * limit` meant that the first page of results was always invisible to API consumers.

### 3. Any questions you'd ask before shipping this to production
- **Persistence & Architecture:** What database technology (e.g., PostgreSQL, MongoDB) will replace the in-memory array, and what ORM/query builder should be used?
- **Authentication & Authorization:** How should tasks be partitioned? Does a task belong to an organization, workspace, or user? Who is permitted to assign or delete tasks?
- **Assignment Domain Rules:** Can any user name or user ID be assigned? Should we validate the `assignee` against an existing Users table or auth service? Should tasks support multiple assignees?
- **Pagination Standard:** Should we support cursor-based pagination for large datasets to prevent missed/duplicated items when new tasks are created during browsing?
- **Soft Deletion vs Hard Deletion:** Should `DELETE /tasks/:id` permanently delete records, or should tasks be soft-deleted (`deletedAt`) to preserve history and metrics?
