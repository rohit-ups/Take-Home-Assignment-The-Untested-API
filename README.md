# Take-Home Assignment — The Untested API

A take-home assignment focused on reading unfamiliar code, writing comprehensive tests, diagnosing root-cause bugs, and shipping a production-ready feature.

- **[ASSIGNMENT.md](./ASSIGNMENT.md)** — Original assignment brief
- **[BUG_REPORT.md](./BUG_REPORT.md)** — Detailed bug report (7 identified & resolved defects)
- **[SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md)** — Feature design decisions, coverage summary, and submission reflections

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Running Tests & Coverage:**

```bash
cd task-api
npm test           # runs test suite (83 tests)
npm run coverage   # runs tests with full coverage report (>98% coverage)
```

---

## Test & Coverage Summary

The test suite contains **83 automated tests** across 3 test suites:
- `tests/validators.test.js` — Unit tests for input validation schemas & boundary edge cases
- `tests/taskService.test.js` — Unit tests for task state management, pagination, stats, completion, and assignment
- `tests/tasks.test.js` — End-to-end integration tests using Supertest for all HTTP endpoints

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.82 |    93.45 |   96.66 |   98.71 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18 (listen)    
 src/routes      |     100 |     92.3 |     100 |     100 |                   
  tasks.js       |     100 |     92.3 |     100 |     100 |                   
 src/services    |     100 |       84 |     100 |     100 |                   
  taskService.js |     100 |       84 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       83 passed, 83 total
```

---

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup and error middleware
    routes/tasks.js         # Route handlers (CRUD + /stats + /complete + /assign)
    services/taskService.js # Business logic + in-memory data store
    utils/validators.js     # Input validation helpers
  tests/                    # Test suite (83 tests)
    validators.test.js
    taskService.test.js
    tasks.test.js
  package.json
  jest.config.js
ASSIGNMENT.md               # Assignment brief
BUG_REPORT.md               # Detailed Bug Report
SUBMISSION_NOTES.md         # Submission notes & architecture questions
```

---

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | **Assign / reassign a task to a user**   |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "assignee": "string or null",
  "completedAt": "ISO 8601 or null",
  "createdAt": "ISO 8601"
}
```

### Sample requests

**Create a task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Write tests", "priority": "high"}'
```

**List tasks with filter and pagination**
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=10"
```

**Assign a task**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alex Rivera"}'
```

**Mark complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```
