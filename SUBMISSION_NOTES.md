# Submission Notes: The Untested API

## Summary of Accomplishments

1. **Comprehensive Test Suite**:
   - Developed modular test architecture: unit tests (`taskService.test.js`, `validators.test.js`) and integration tests (`tasks.test.js`).
   - Covered 68 total tests across all happy paths and edge cases (invalid formats, out-of-bound pages, boundary conditions, null inputs, 500 error middleware).
   - Achieved **>98% line coverage** and **>96% branch coverage**.

2. **Bug Discovery & Fixing**:
   - Documented 5 distinct bugs in [`BUG_REPORT.md`](file:///Users/vivansharma/Desktop/Take-Home-Assignment-The-Untested-API-main/BUG_REPORT.md).
   - Fixed core logic defects:
     - **Pagination calculation bug**: Fixed 0-based offset `(pageNum - 1) * limitNum`.
     - **Priority reset bug**: Preserved task priority on `completeTask`.
     - **Substring status filter**: Enforced exact match `t.status === status`.
     - **Validator null-safety**: Guarded against null/non-object payloads to avoid uncaught 500 errors.

3. **Feature Implementation (`PATCH /tasks/:id/assign`)**:
   - Added validation ensuring `assignee` is provided as a non-empty, trimmed string.
   - Handled 404 for non-existent tasks, 400 for bad input, and 200 with updated task body.
   - Added complete unit and integration tests.

---

## Design Decisions for `PATCH /tasks/:id/assign`

- **Validation & Sanitization**:
  - `assignee` must be a non-empty string; leading and trailing whitespace are trimmed.
  - Non-string values, empty strings, whitespace-only strings, and missing fields return `400 Bad Request`.
  - Passing a non-existent task ID returns `404 Not Found`.
- **Reassignment**:
  - Re-assigning an already assigned task updates the `assignee` field cleanly without modifying other metadata.

---

## Codebase Surprises & Observations

1. **Documentation vs Code Schema Discrepancy**:
   - In `README.md`, the task schema listed statuses as `pending | in-progress | completed`, but the actual codebase implementation and validator enforce `todo | in_progress | done`.
2. **Missing `GET /tasks/:id` Endpoint**:
   - `taskService.findById` was implemented in the service layer, but there was no corresponding `GET /tasks/:id` route exposed in `routes/tasks.js`.
3. **Independent Query Parameters**:
   - `GET /tasks` handled either `status` or pagination (`page`/`limit`) exclusively via `if ... else if` branches, preventing users from paginating filtered results.

---

## What to Test Next (With More Time)

1. **Concurrent Request Race Conditions**:
   - In-memory array operations (`splice`, `findIndex`) in asynchronous Express handlers under high concurrency.
2. **Fuzzing & Payload Limits**:
   - Huge string payloads in `title` and `description` to test memory consumption and payload length limits.
3. **Timezone & ISO Date Boundary Tests**:
   - Leap years, daylight saving transitions, and different timezone offsets (`+05:30`, `-07:00`) for `dueDate` comparisons against `now`.
4. **Combined Filtering & Sorting**:
   - Combining status filtering, priority filtering, sorting (`sortBy=dueDate&order=asc`), and pagination.

---

## Questions Before Shipping to Production

1. **Persistence & Database Migration**:
   - What database (PostgreSQL, MongoDB, DynamoDB) will replace the in-memory array, and what indexing strategy should be applied for `status`, `dueDate`, and `assignee`?
2. **Authentication & Authorization**:
   - Who is allowed to assign or delete tasks? Should tasks belong to specific tenants/users (`userId`, `orgId`)?
3. **Idempotency & Concurrent Updates**:
   - Do we need optimistic locking (e.g. `version` field or `updatedAt` check) to prevent overwriting concurrent updates?
4. **Rate Limiting & Security Headers**:
   - Should we configure `helmet`, CORS policies, request size limits, and rate limiters (`express-rate-limit`)?
