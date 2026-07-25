# Submission Notes — Task Manager API

## Feature Implementation Details (`PATCH /tasks/:id/assign`)

### Endpoint Specification
- **Method:** `PATCH`
- **Path:** `/tasks/:id/assign`
- **Body:** `{ "assignee": "string" }`

### Design & Architecture Decisions
1. **Input Validation:**
   - Evaluated via `validateAssignTask(body)` helper in `src/utils/validators.js`.
   - Rejects missing body, non-string types, empty strings, and strings containing only whitespace. Returns `400 Bad Request` with message `'assignee is required and must be a non-empty string'`.
   - Automatically trims leading and trailing whitespace before persisting (e.g., `"  Jane Doe  "` -> `"Jane Doe"`).
2. **Error & Response Handling:**
   - If the task ID does not exist in memory, returns `404 Not Found` with `{ "error": "Task not found" }`.
   - On success, returns `200 OK` with the full updated task object payload.
3. **Re-assignment & Idempotency:**
   - Allows reassignment of tasks from one assignee to another without restriction.

---

## Reflection & Discussion Points

### 1. What I'd test next given more time
- **Concurrency & Mutex Locks:** In-memory array operations (`splice`, `push`, index lookups) in a single-threaded Event Loop are non-atomic across async boundaries. Under high concurrency or clustering, state corruption or lost updates can occur.
- **Contract & OpenAPI Validation:** Implement automated schema validation against an OpenAPI 3.0 specification using tools like `express-openapi-validator` or `supertest` contract checks.
- **Input Sanitization & XSS Protection:** Test for script injection in `title`, `description`, and `assignee` fields to prevent stored XSS vulnerabilities when rendered in frontend dashboards.
- **Large Dataset Load & Memory Benchmarking:** Profile memory footprint and array lookup latency (`findIndex`/`filter`) when holding 100k+ tasks in memory.

### 2. Anything that surprised you in the codebase
- **Silent Business Logic Corruption in `completeTask`:** The `completeTask` function explicitly overwrote task priority to `'medium'`, silently degrading high-priority items without caller knowledge or warnings.
- **Substring Matching for Enums:** Using `t.status.includes(status)` meant querying status `'do'` would unexpectedly return both `'todo'` and `'done'` tasks.
- **Pagination Off-By-One Indexing:** Computing `offset = page * limit` instead of `(page - 1) * limit` was a classic zero/one-index mismatch that silently dropped the first page of results.

### 3. Questions to ask before shipping to production
- **Persistence & Migration Strategy:** What database (e.g. PostgreSQL, MongoDB) will replace the in-memory array store, and how will indexing be set up for status/dueDate filtering?
- **Authentication & RBAC:** How will multi-tenancy and authorization be handled? Can any user assign tasks to anyone, or should assignment be scoped to team members/roles?
- **Observability & Audit Trail:** Do we need structured log events (e.g. Winston/Pino) or domain event streaming (Kafka/RabbitMQ) when task status changes or when tasks are assigned?
- **Rate Limiting & DDoS Safeguards:** What rate-limiting policy (e.g., `express-rate-limit`) should be enforced per client IP/token?
