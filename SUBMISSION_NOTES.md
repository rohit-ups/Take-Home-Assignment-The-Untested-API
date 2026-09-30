# Submission Notes — The Untested API

## 1. Summary of Work Delivered

- **Comprehensive Test Suite**:
  - Developed **83 automated unit and integration tests** covering `taskService`, `validators`, and all Express HTTP endpoints via Supertest.
  - Achieved **98.82% Statement Coverage** and **98.71% Line Coverage** (surpassing the 80%+ threshold).
- **Bug Discovery & Resolution**:
  - Documented 7 distinct issues in [`BUG_REPORT.md`](./BUG_REPORT.md).
  - Resolved the critical 1-based pagination offset error, the completion priority reset defect, the substring status filter bug, and input validation vulnerabilities.
- **New Feature (`PATCH /tasks/:id/assign`)**:
  - Implemented the assignment endpoint with validation, edge-case handling, and full test coverage.

---

## 2. New Feature: `PATCH /tasks/:id/assign`

### Implementation & Design Decisions

- **Validation Rules**:
  - The request body must be a JSON object containing an `assignee` field.
  - `assignee` must be a string and cannot be empty or purely whitespace. Invalid payloads return HTTP `400 Bad Request` with descriptive error messages.
- **Trimming & Normalization**:
  - Input values are trimmed (e.g., `"  Alice Smith  "` is stored as `"Alice Smith"`) to avoid whitespace pollution.
- **Handling Reassignment**:
  - Reassigning an already assigned task is explicitly supported. In real-world team workflows, tasks are frequently reassigned to balance capacity. The endpoint updates the assignee and returns the updated task with HTTP `200 OK`.
- **404 Handling**:
  - If the task ID does not exist, the endpoint returns HTTP `404 Not Found` with `{ "error": "Task not found" }`.
- **Schema Consistency**:
  - Added `assignee: null` default to `create()` in `taskService.js` so that all tasks share a uniform shape from creation.

---

## 3. Reflection & Submission Questions

### What would you test next if you had more time?

1. **Concurrency and Race Conditions**:
   - In a production environment with persistent storage or multi-replica deployments, concurrent updates (e.g. two users completing or reassigning a task simultaneously) require optimistic locking (`version` or `updatedAt` checks) or transactional isolation.
2. **Security & Payload Fuzzing**:
   - Property injection attacks (prototype pollution via `req.body`), excessively large string payloads (memory exhaustion attacks), and strict Content-Type enforcement.
3. **Pagination Edge Cases & Cursor-Based Pagination**:
   - Performance of offset-based pagination at scale (e.g., page 10,000). Evaluating whether cursor-based pagination (e.g., `?cursor=<taskId>`) would be better suited for real-time task lists where tasks are frequently inserted or completed.
4. **Performance & Load Testing**:
   - Stress testing under heavy read/write concurrency with tools like k6 or Artillery.

### Anything that surprised you in the codebase?

1. **`priority: 'medium'` in `completeTask`**:
   - It was surprising to see `priority: 'medium'` hardcoded during completion. This was likely an accidental artifact copied from the default parameters of `create()`, demonstrating why unit testing edge cases and state transformations is vital.
2. **`status.includes()` in `getByStatus`**:
   - Using `.includes()` on enum values instead of strict equality was an interesting bug, allowing queries like `?status=do` to match both `todo` and `done`.
3. **Spec Discrepancy between README and Code**:
   - The initial `README.md` listed status values as `pending | in-progress | completed`, while `ASSIGNMENT.md` and the actual implementation used `todo | in_progress | done`. Catching discrepancies between documentation and implementation early is a common real-world challenge.

### Questions to ask before shipping to production

1. **Data Persistence & Database Architecture**:
   - What database should replace the in-memory array (PostgreSQL, MongoDB, etc.)? Will we need database migrations and connection pooling?
2. **Authentication & Authorization**:
   - Currently, all endpoints are unauthenticated. Who is allowed to create, complete, or reassign tasks? Should users only be allowed to view tasks assigned to them or their team?
3. **User Identity & Assignee References**:
   - Should `assignee` be a validated foreign key / user ID (e.g., `userId: uuid`) instead of an arbitrary string name?
4. **Audit Logging & History**:
   - Do business requirements require an activity log (who assigned the task, when was status changed, previous assignees)?
5. **Observability, Healthchecks, & Rate Limiting**:
   - Before deployment, what monitoring/APM (Prometheus, Datadog), structured logging (Winston/Pino), rate limiting, and `/health` endpoints are needed?
