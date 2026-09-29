# Task Manager API — Tested & Hardened

A robust in-memory Task Manager API built with Node.js and Express, complete with an automated test suite, core bug fixes, and a new assignment feature.

---

## Quick Start

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

### Running Tests & Coverage

```bash
npm test           # run test suite (70 tests)
npm run coverage   # run test suite with coverage report
```

---

## Test Coverage Summary

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.7 |    94.38 |   96.66 |   98.57 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |    91.66 |     100 |     100 |                   
  tasks.js       |     100 |    91.66 |     100 |     100 |                   
 src/services    |     100 |    90.47 |     100 |     100 |                   
  taskService.js |     100 |    90.47 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       70 passed, 70 total
Snapshots:   0 total
```

---

## Project Structure

```
Take-Home-Assignment-The-Untested-API/
├── BUG_REPORT.md                 # Detailed bug report with root-cause analysis & fixes
├── SUBMISSION_NOTES.md           # Submission reflections & questions for production
├── ASSIGNMENT.md                 # Original assignment brief
├── README.md                     # Project overview & API documentation
└── task-api/
    ├── src/
    │   ├── app.js                # Express app setup and error middleware
    │   ├── routes/tasks.js       # Route handlers & query param handling
    │   ├── services/taskService.js # Business logic & in-memory store
    │   └── utils/validators.js   # Input validation helpers
    ├── tests/
    │   ├── unit/
    │   │   ├── taskService.test.js # Unit tests for taskService methods
    │   │   └── validators.test.js  # Unit tests for input validation
    │   └── integration/
    │       └── tasks.test.js     # Supertest integration tests for all endpoints
    ├── package.json
    └── jest.config.js
```

---

## API Reference

| Method   | Path                  | Description |
|----------|-----------------------|-------------|
| `GET`    | `/tasks`              | List all tasks. Supports filtering `?status=` and pagination `?page=&limit=` simultaneously |
| `POST`   | `/tasks`              | Create a new task (returns 201) |
| `PUT`    | `/tasks/:id`          | Update editable fields of a task (returns 200) |
| `DELETE` | `/tasks/:id`          | Delete a task (returns 204) |
| `PATCH`  | `/tasks/:id/complete` | Mark a task as done (preserves priority, sets `completedAt`) |
| `PATCH`  | `/tasks/:id/assign`   | Assign or reassign a task to a user |
| `GET`    | `/tasks/stats`        | Counts by status (`todo`, `in_progress`, `done`) + overdue count |

### Task Shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "completedAt": "ISO 8601 or null",
  "createdAt": "ISO 8601",
  "assignee": "string (optional)"
}
```

### Sample Requests

#### 1. Create a task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Write tests", "priority": "high", "dueDate": "2026-10-01T12:00:00.000Z"}'
```

#### 2. List tasks with status filter and pagination
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=5"
```

#### 3. Assign a task
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Sarah Connor"}'
```

#### 4. Mark complete
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

#### 5. Get statistics
```bash
curl http://localhost:3000/tasks/stats
```

---

## Key Fixes & Deliverables

1. **Bug Fixes:**
   - **Pagination off-by-one:** Fixed `(page - 1) * limit` offset so `page=1` returns the first page instead of skipping it.
   - **Exact status matching:** Fixed `getByStatus` to use strict equality (`===`) instead of `.includes()`.
   - **Priority preservation:** Stopped `completeTask()` from resetting existing priorities to `'medium'`.
   - **Combined query support:** Allowed filtering by `?status=` and paginating with `?page=&limit=` concurrently.
   - **Protected metadata:** Prevented `update()` from overwriting immutable `id` and `createdAt` properties.

2. **New Feature (`PATCH /tasks/:id/assign`):**
   - Implemented with validation rejecting missing, non-string, or whitespace-only assignees (`400`).
   - Returns updated task (`200`) or `404` if not found. Supports reassignment.

3. **Documentation:**
   - See [**`BUG_REPORT.md`**](./BUG_REPORT.md) for full descriptions of all bugs and their root causes.
   - See [**`SUBMISSION_NOTES.md`**](./SUBMISSION_NOTES.md) for reflections on testing, surprising findings, and production architecture questions.
