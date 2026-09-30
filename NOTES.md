# Development Notes — The Untested API

## Approach Summary

My approach to auditing and expanding the Task Manager API followed a test-driven, evidence-based methodology:

1. **Static Analysis & Inspection:** Read all source files in `src/` to understand execution paths, route routing, data structures, and edge cases.
2. **Baseline Verification:** Executed manual requests to map real runtime responses against specifications.
3. **Comprehensive Test Suite:** Built direct unit tests (`tests/taskService.test.js`) and Supertest integration tests (`tests/tasks.routes.test.js`), capturing both expected behavior and edge cases.
4. **Bug Isolation:** Leveraged Jest's `it.failing` capability to prove bugs through failing assertions before documenting root causes in `BUGS.md`.
5. **Targeted Bug Fix & Feature Expansion:** Fixed the high-severity pagination bug with minimal diffs and built `PATCH /tasks/:id/assign` following test-first principles.

---

## `/assign` Design Decisions

- **Validation & Input Sanitization:**
  - **400 Bad Request:** Enforced for missing `assignee` key, non-string types (numbers, booleans, null, arrays, objects), empty strings, or whitespace-only strings.
  - **Trimming:** Whitespace surrounding assignee names is automatically trimmed before storage (`'  Alice Smith  '` -> `'Alice Smith'`).
  - **Max Length:** Enforced a maximum string length of 100 characters to protect against payload bloat or memory abuse.
- **Reassignment & Idempotency:**
  - Reassignment to a new user overwrites the existing `assignee` field and returns `200 OK`.
  - Reassigning a task to the same user returns `200 OK` with no state mutation (idempotent operation).
- **Default Task Shape & Persistence:**
  - Newly created tasks default `assignee` to `null`.
  - Full task updates via `PUT /tasks/:id` preserve the existing `assignee` value if `assignee` is omitted from the request payload.
- **Route Hierarchy:**
  - Registered `PATCH /tasks/:id/assign` alongside `PATCH /tasks/:id/complete` under `routes/tasks.js` to prevent route shadowing by generic parameter patterns.

---

## What I'd Test Next

1. **Description Field Type Validation:** Test `POST /tasks` and `PUT /tasks/:id` with non-string `description` payload types (numbers, booleans, arrays, objects) to prevent invalid data types from leaking into memory.
2. **Explicit `limit=0` Pagination Behavior:** Test query handling for `limit=0` to ensure falsy OR expressions (`parseInt(limit) || 10`) do not override explicit zero-limit requests with the default limit of 10.
3. **Strict Date Parsing & ISO Formats:** Test edge case date strings (e.g. leap years, out-of-range dates like `2026-02-31`, unix timestamps, relative strings) to enforce strict ISO 8601 compliance.
4. **String Sanitization & XSS Input:** Test XSS / script tag injection vectors in `title`, `description`, and `assignee` fields to protect downstream frontend applications.

---

## Surprises in the Codebase

1. **Status Enum Mismatch:** `README.md` documented status as `pending | in-progress | completed`, whereas `ASSIGNMENT.md` and the actual validator/service code use `todo | in_progress | done`.
2. **Pagination Off-By-One Indexing:** `taskService.getPaginated` calculated `offset = page * limit` instead of `(page - 1) * limit`, causing `page=1` to skip the first batch of tasks completely.
3. **Unintended Priority Reset on Completion:** `completeTask()` hardcoded `priority: 'medium'`, resetting high-priority tasks to medium priority whenever marked as complete.
4. **Direct Store Reference Leaks:** `findById()` returned direct references to in-memory array objects without shallow cloning, allowing callers to bypass service mutation methods.

---

## Questions Before Shipping to Production

1. **Authentication & Authorization:** How will caller identities be verified, and should task assignment or deletion be restricted to specific user roles?
2. **Data Persistence:** What database engine (e.g., PostgreSQL, MongoDB) will replace the in-memory array store for data durability across process restarts?
3. **Pagination Rules:** What are the hard caps on `limit` (e.g. max 100) to prevent memory exhaustion from giant queries?
4. **Timezone Policy:** How should overdue tasks be evaluated relative to caller timezones versus server UTC?
5. **Id Validation:** Should string IDs be validated against strict UUID v4 regex schemas to return immediate 400 Bad Request responses for malformed IDs?

---

AI agent (Antigravity) was used to draft tests/code; I reviewed and verified the findings.
