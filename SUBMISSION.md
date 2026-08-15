# Take-Home Assignment Submission: Task Manager API

**Candidate:** Senior Full-Stack Node.js / SDET  
**Date:** August 2026  
**Repository:** [Task Manager API](.)  

---

## 1. Test Coverage Summary

Full test suite execution with Jest and Supertest across all unit and route integration test files (`tests/taskService.test.js`, `tests/tasks.routes.test.js`, `tests/tasks.assign.test.js`):

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.73 |    98.87 |   96.66 |   98.61 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |      100 |     100 |     100 |                   
  taskService.js |     100 |      100 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       80 passed, 80 total
Snapshots:   0 total
Time:        5.119 s
```

> **Note on uncovered lines in `src/app.js` (lines 17–18):**  
> Lines 17–18 contain `if (require.main === module) { app.listen(PORT, ...); }`. In the automated test environment, `app` is imported directly into Supertest without binding a live TCP socket port, which is the intended design for clean test isolation.

---

## 2. Discovered Bugs & Fix

A comprehensive bug report detailing all 5 discovered bugs is documented in **[`BUGS.md`](./BUGS.md)**.

### Summary of Bugs:
1. **Bug 1 (Critical / High — FIXED):** `taskService.getPaginated` calculated `offset = page * limit`, causing `page=1` to skip the first 10 items.
2. **Bug 2 (High):** `taskService.completeTask` silently reset task `priority` to `'medium'`.
3. **Bug 3 (High - Data Integrity):** `taskService.update` allowed client payloads to overwrite internal `id` and `createdAt` timestamps.
4. **Bug 4 (Medium):** `taskService.getByStatus` used `.includes()` substring matching instead of exact equality.
5. **Bug 5 (Medium):** Express global error handler returned HTTP 500 on client malformed JSON syntax errors.

### Implemented Fix: Bug 1 (Pagination Offset Math)
- **Location:** `src/services/taskService.js` (`getPaginated`)
- **Fix:** Replaced `page * limit` with `const pageNum = Math.max(1, page); const offset = (pageNum - 1) * limit;`.
- **Rationale:** Highest impact and lowest blast radius. It ensures `page=1` correctly maps to offset 0 while defensively guarding against 0 or negative page numbers.

---

## 3. New Feature: `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Method & Route:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "string" }`
- **Response Codes:**
  - `200 OK`: Returns the updated task object with `assignee` populated.
  - `400 Bad Request`: Validation failure (missing `assignee`, non-string, empty or whitespace-only, or exceeding 100 characters).
  - `404 Not Found`: Task with the given `:id` does not exist.

### Design Decisions

1. **Reassignment Policy (Idempotent PATCH Semantics):**  
   We decided to **allow free reassignment** of already-assigned tasks rather than returning a 409 Conflict. In task management domains (e.g. Jira, Linear, Asana), tickets are frequently handed off between team members. Modeling reassignment as an idempotent `PATCH` mutation adheres to standard REST semantics and avoids requiring clients to perform an artificial unassign-then-assign round trip.

2. **Validation & Guards:**  
   - The validator `validateAssignTask` requires `assignee` to be present and of `string` type.
   - It strips leading/trailing whitespace (`.trim()`) and rejects empty or whitespace-only strings.
   - A maximum length guard of **100 characters** is enforced to comfortably accommodate personal names, full names with titles, or email identifiers (`user@company.com`), while guarding the in-memory store against memory bloat or DoS attacks.
   - The stored value is the sanitized (trimmed) string.

3. **Task Shape & `assignee: null` Default:**  
   We updated `taskService.create()` to initialize `assignee: null` by default on new tasks. Maintaining a predictable, uniform object schema prevents client-side `undefined` property errors and ensures consistent serialization across API responses.

---

## 4. Documentation Inconsistencies Identified

1. **Status Enum Inconsistency (`README.md` vs `ASSIGNMENT.md` / Code):**  
   - `README.md` lists status values as `"pending | in-progress | completed"`.
   - `ASSIGNMENT.md` and the actual runtime validators (`src/utils/validators.js`) enforce `"todo | in_progress | done"`.  
   - *Resolution:* All tests and features conform to `"todo | in_progress | done"`, which is what the server actively enforces.

2. **`PUT` Endpoint Semantics (`README.md` vs Implementation):**  
   - `README.md` describes `PUT /tasks/:id` as a *"Full update of a task"*.
   - However, `src/routes/tasks.js` and `src/utils/validators.js` allow partial updates (all fields in `PUT` are optional), and `taskService.update` performs a shallow merge (`{ ...tasks[index], ...fields }`).  
   - *Recommendation:* In a future iteration, either rename `PUT` to `PATCH /tasks/:id` for partial updates or make all mandatory fields required for `PUT` to enforce strict REST full replacement semantics.

---

## 5. What I'd Test Next (Given More Time)

1. **In-Memory Store Concurrency & Race Conditions:**  
   Simulate high-concurrency scenarios (e.g. 50 parallel requests creating, updating, and deleting tasks) to evaluate race conditions on the mutable module-level `tasks` array.
2. **Missing Single-Resource Endpoint (`GET /tasks/:id`):**  
   Currently, there is no route to retrieve a single task by its ID (`GET /tasks/:id`), forcing clients to fetch all tasks and filter client-side. Adding and testing this endpoint is a high-priority gap.
3. **Request Payload Size & Rate Limiting:**  
   Test payload size limits (`express.json({ limit: '100kb' })`) and add rate-limiting integration tests (`express-rate-limit`) to protect public endpoints.
4. **Timezone & Date Parsing Edge Cases:**  
   Deep testing of edge cases around ISO 8601 dates: UTC offsets, leap years, daylight saving transitions, and invalid calendar dates like `2026-02-30`.
5. **Combined Query Filters (`GET /tasks?status=todo&page=1&limit=10`):**  
   Currently, the route handler evaluates `if (status)` before `if (page || limit)`, meaning status filtering completely ignores pagination query parameters. Testing and supporting combined filtering + pagination is essential.

---

## 6. What Surprised Me in the Codebase

- **Substring Matching for Status Filtering:** `taskService.getByStatus` used `t.status.includes(status)` rather than `===`. This caused queries like `status=do` to match both `todo` and `done` tasks simultaneously.
- **Unintended Side Effect in `completeTask`:** `completeTask` explicitly hardcoded `priority: 'medium'`, silently wiping out `'high'` or `'low'` priority settings whenever a task was completed.
- **Direct Multiplier for Pagination:** `getPaginated` computed `offset = page * limit` without converting 1-based page numbers to 0-based index offsets, meaning page 1 immediately started at index 10 and skipped the first 10 items.
- **Global Error Handler Masking 400s:** The error middleware caught Express `body-parser` JSON syntax errors and unconditionally returned HTTP 500 instead of HTTP 400.

---

## 7. Questions I'd Ask Before Shipping to Production

1. **Storage & Durability Strategy:**  
   *What database will replace the in-memory array (e.g. PostgreSQL, DynamoDB, MongoDB), and what transaction isolation level is needed for atomic task state transitions?*
2. **User Identity & Assignee Relation:**  
   *Should `assignee` remain a free-form string, or should it validate against a real User Service / Auth provider with UUID foreign keys?*
3. **Pagination Semantics & Contract:**  
   *Should we standardize on 1-indexed offset pagination with total count metadata in the response headers/envelope (`{ data: [...], total, page, totalPages }`), or migrate to cursor-based pagination for large datasets?*
4. **API Versioning & Breaking Changes:**  
   *Before fixing `PUT` full update semantics and status enum documentation mismatches, are there existing mobile or web clients in production that rely on the partial merge behavior or existing enum strings?*
5. **Authentication & Authorization:**  
   *What authentication mechanism (e.g. JWT, OAuth2) and permission model (e.g. can any user assign/complete any task, or only task creators and assignees?) should be integrated before public deployment?*
