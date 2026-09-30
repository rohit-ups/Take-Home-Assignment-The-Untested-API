# Submission Notes: The Untested API

## 1. What would you test next if you had more time?

- **Concurrency & Race Conditions:** Test simultaneous updates, concurrent status transitions, and race conditions on `PATCH /tasks/:id/complete` and `PATCH /tasks/:id/assign` under high load.
- **Query Parameter Edge Cases:** Thoroughly test combination queries (e.g., combining `?status=...` with `?page=...&limit=...`), invalid negative or zero page values, and large pagination limits (DoS potential).
- **Persistence & Reconnection:** Once backed by a persistent database (PostgreSQL/MongoDB), write integration tests covering connection drops, transaction rollbacks, unique constraints, and schema migrations.
- **Contract & Schema Testing:** Implement automated OpenAPI / JSON schema contract tests to prevent API drift between documentation and responses.

---

## 2. What surprised you in the codebase?

- **Silent Overwrites in completeTask():** `completeTask()` silently hardcoded `priority: 'medium'` during completion, which altered an unrelated business attribute and downgraded high-priority tasks upon resolution.
- **Partial Substring Matching on Enums:** `getByStatus()` used `includes()` instead of strict equality `===`, causing a query like `status=do` to return both `todo` and `done` tasks.
- **Unrestricted Object Spreading on Updates:** In `update()`, the entire request body was merged directly over the stored task (`{ ...tasks[index], ...fields }`), allowing clients to mutate internal read-only fields like `id` and `createdAt`.
- **High Baseline Modularity:** Despite having zero automated tests initially, the separation into `routes`, `services`, and `validators` made writing direct unit tests and Supertest integration tests clean and straightforward.

---

## 3. What questions would you ask before shipping this to production?

1. **Persistence Strategy:** What database and ORM/query builder will replace the in-memory array, and what are our backup, migration, and read/write scaling requirements?
2. **User Identity & Assignee Validation:** Currently, `assignee` is an arbitrary string. Should assignees be validated against an authenticated User model or directory service?
3. **Authentication & Authorization:** Who is permitted to create, reassign, complete, or delete tasks? Are there role-based access controls (RBAC) or tenant isolation requirements?
4. **Pagination Envelope:** Does the frontend/API consumer need pagination metadata (such as `totalItems`, `totalPages`, `currentPage`, `hasNextPage`) rather than receiving a bare array slice?
5. **Observability & Logging:** What structured logging, request tracing (e.g., Correlation IDs), metrics (Prometheus), and error monitoring (e.g., Sentry) need to be configured for production readiness?
