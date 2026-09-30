# Submission: The Untested API

**Branch:** `jeevanreddy`  
**Stack:** Node.js, Express, Jest, Supertest

---

## Executive Summary

Over the course of this assignment, the codebase was thoroughly analyzed, tested, debugged, and extended:
1. **Full Test Coverage (Day 1):** Built a comprehensive test suite (76 tests across unit and integration levels), reaching **98.78% statement coverage** and **100% route/service coverage**.
2. **Bug Discovery & Resolution (Day 2 Part A & B):** Identified and documented 8 distinct bugs across business logic, input validation, and routing. Fixed the critical bugs including pagination offset calculations, strict status filtering, priority preservation on completion, immutable field protections, and empty-string validator bypasses.
3. **New Feature Implementation (Day 2 Part C):** Designed, tested, and implemented `PATCH /tasks/:id/assign` with robust input validation, 404 handling, and reassignment support.

---

## Test Coverage Report

Generated via `npm run coverage`:

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.78 |    94.33 |   96.66 |   98.66 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |    91.66 |     100 |     100 |                   
  tasks.js       |     100 |    91.66 |     100 |     100 |                   
 src/services    |     100 |    88.88 |     100 |     100 |                   
  taskService.js |     100 |    88.88 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       76 passed, 76 total
Snapshots:   0 total
Time:        4.644 s
```

*(Note: The only uncovered lines 17-18 in `app.js` are `app.listen()` inside `if (require.main === module)`, which is standard when importing the Express app into Supertest without binding to a physical port).*

---

## Feature Implementation: `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Path:** `PATCH /tasks/:id/assign`
- **Body:** `{ "assignee": "string" }`
- **Responses:**
  - `200 OK`: Returns the updated task object with the `assignee` set.
  - `400 Bad Request`: When `assignee` is missing, not a string, or contains only whitespace.
  - `404 Not Found`: When the task with the given `:id` does not exist.

### Design Decisions & Edge Cases
1. **Validation & Non-Empty Strings:**
   - Evaluated what should happen if `assignee` is `""` or `"   "`. An empty or whitespace-only name is rejected with `400 Bad Request` (`"assignee is required and must be a non-empty string"`). Names are trimmed before persisting.
   - Non-string types (numbers, booleans, objects, arrays) are rejected with `400 Bad Request`.
2. **Re-assignment Behavior:**
   - In real-world workflow tracking, tasks frequently change owners as work moves through stages or team availability changes. Re-assigning an already assigned task is supported seamlessly and replaces the existing `assignee`.
3. **Data Model Consistency:**
   - When new tasks are created, `assignee` defaults to `null` (consistent with `dueDate: null` and `completedAt: null`).
4. **Test-First Implementation:**
   - Unit tests for `validateAssignTask` and `taskService.assignTask` and integration tests for `PATCH /tasks/:id/assign` were authored alongside the implementation.

---

## Bug Report Reference

See the full [BUG_REPORT.md](./BUG_REPORT.md) for complete details on each bug:
1. **Off-by-one pagination offset calculation** (`src/services/taskService.js:12` & `src/routes/tasks.js:20-22`)
2. **Substring matching in `getByStatus`** (`src/services/taskService.js:9`)
3. **Task completion clobbering priority to `'medium'`** (`src/services/taskService.js:69`)
4. **Mutual exclusivity of `status` filter and pagination** (`src/routes/tasks.js:14-24`)
5. **Overwriting immutable `id` and `createdAt` on `PUT`** (`src/services/taskService.js:50`)
6. **Falsy empty string bypass in validators** (`src/utils/validators.js:8, 11, 24, 27`)
7. **Uncaught TypeError (HTTP 500) on null / non-object payload** (`src/utils/validators.js:5, 21`)
8. **Status enum discrepancy between README and code/spec** (`README.md` vs `src/utils/validators.js`)

---

## Submission Reflections

### 1. What I'd test next if I had more time
- **Concurrent Request Handling / Race Conditions:** Since the store is an in-memory array mutated synchronously in Node's event loop, synchronous calls are safe, but in a production environment with an async persistence layer (PostgreSQL / MongoDB), concurrent writes, optimistic locking, and idempotency keys (especially on `PATCH /complete` and `POST /tasks`) should be tested.
- **Query Parameter Boundary & Security Fuzzing:** Testing unexpected types in query strings (e.g. `?status[]=a&status[]=b`, `?page=NaN`, `?page=99999999999999999999`, prototype pollution vectors in JSON bodies).
- **Date Timezone and ISO Format Granularity:** Testing various ISO 8601 variations (UTC `Z`, offsets `+05:30`, leap years, end-of-month boundaries) for `dueDate` and overdue calculations.
- **Contract / OpenAPI Schema Validation:** Generating and validating requests against an automated OpenAPI/Swagger specification.

### 2. Anything that surprised you in the codebase
- **The pagination offset bug:** Calculating `offset = page * limit` combined with `parseInt(page) || 1` meant that clients could literally **never** retrieve the first page of results via the API!
- **`completeTask` resetting priority:** Hardcoding `priority: 'medium'` on complete was a subtle bug that likely happened due to copy-pasting the default properties from `create()`.
- **`t.status.includes(status)`:** Using substring search for an exact enum filter was an interesting design flaw that caused unexpected cross-matches (e.g., `'do'` matching both `'todo'` and `'done'`).
- **README vs Code disparity:** The README documented `pending | in-progress | completed`, while the code and `ASSIGNMENT.md` used `todo | in_progress | done`. This highlights the common real-world issue of documentation drifting from implementation.

### 3. Questions I'd ask before shipping this to production
1. **Persistence & Data Store:** How will we transition from this in-memory store to a persistent database (PostgreSQL, SQLite, DynamoDB)? What ORM or query layer will be used?
2. **Authentication & Authorization:** Are tasks public or multi-tenant? Should users only be allowed to see and modify their own tasks or tasks in their organization?
3. **Pagination Metadata:** Should pagination responses include metadata (e.g., `{ data: [...], pagination: { page, limit, total, totalPages } }`) rather than just raw arrays, so frontends know how many pages exist?
4. **Audit Logging & History:** Should changes to task status and assignee be tracked in an audit log or activity timeline for accountability?
5. **Rate Limiting & Security Headers:** Should we configure `helmet`, CORS, and `express-rate-limit` before deploying to public ingress?
