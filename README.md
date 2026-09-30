# My Submission — The Untested API

**Live API:** https://task-api-z9hh.onrender.com (try [`/tasks`](https://task-api-z9hh.onrender.com/tasks) and [`/tasks/stats`](https://task-api-z9hh.onrender.com/tasks/stats))


> **Note on Data Store:** The API uses an in-memory data store. All data resets when the server restarts or sleeps on Render free tier.

---

## Submission Overview

### How to Run Tests & Server

```bash
cd task-api
npm install
npm test           # Run Jest test suite (65 tests across service & routes)
npm run coverage   # Run Jest tests with coverage report
npm start          # Start server locally on process.env.PORT (default 3000)
```

### Real Test Coverage Summary

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.51 |    98.92 |   93.33 |   97.27 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |      100 |     100 |     100 |                   
  taskService.js |     100 |      100 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```

### Key Submission Files

- [`task-api/tests/taskService.test.js`](./task-api/tests/taskService.test.js): Comprehensive unit tests for all service methods and edge cases.
- [`task-api/tests/tasks.routes.test.js`](./task-api/tests/tasks.routes.test.js): Supertest integration tests for all Express HTTP routes.
- [`task-api/coverage-summary.txt`](./task-api/coverage-summary.txt): Recorded raw Jest coverage output.
- [`BUGS.md`](./BUGS.md): Detailed bug report documenting 7 proven bugs with root causes and fixes.
- [`NOTES.md`](./NOTES.md): Design decisions, surprise analysis, and production considerations.
- [`render.yaml`](./render.yaml): Render Blueprint deployment configuration.

---

## Discovered Bugs (Summary)

See [`BUGS.md`](./BUGS.md) for full root causes, line numbers, and reproduction steps:

1. **[FIXED] [BUG-1: Pagination Off-By-One Indexing](./BUGS.md#bug-1-pagination-off-by-one-offset-calculation-skips-page-1-items)** (High) — `getPaginated` calculated `offset = page * limit` instead of `(page - 1) * limit`, skipping page 1 items.
2. **[BUG-2: Status Filter Substring Matching](./BUGS.md#bug-2-status-filtering-uses-substring-matching-instead-of-exact-enum-match)** (High) — `getByStatus` uses `.includes()`, allowing partial matches like `?status=do`.
3. **[BUG-3: Task Priority Reset on Completion](./BUGS.md#bug-3-completing-task-unintentionally-resets-priority-to-medium)** (Medium) — `completeTask` hardcodes `priority: 'medium'` when marking tasks complete.
4. **[BUG-4: Shared Store Reference Leak](./BUGS.md#bug-4-in-memory-data-store-leaks-object-references-allowing-unsafe-external-mutations)** (Low) — `findById` returns direct object references, enabling unsafe direct mutations.
5. **[FIXED] [BUG-5: README Status Enum Mismatch](./BUGS.md#bug-5-documentation-mismatch-for-status-enum-values-in-readmemd)** (Low) — README documented `pending|in-progress|completed` instead of `todo|in_progress|done`.
6. **[BUG-6: `?limit=0` Overridden to Default 10](./BUGS.md#bug-6-limit0-pagination-parameter-overridden-to-default-10-due-to-falsy-fallback)** (Low) — `parseInt('0') || 10` overrides explicit limit 0 with default limit 10.
7. **[BUG-7: Missing Type Validation for Description](./BUGS.md#bug-7-missing-data-type-validation-for-description-field-on-post-and-put)** (Low) — POST and PUT omit `description` type checking, allowing non-strings into store.

---

## New Endpoint: `PATCH /tasks/:id/assign`

Assigns or reassigns a user to a task.

### Endpoint Details

- **Method:** `PATCH`
- **Path:** `/tasks/:id/assign`
- **Request Body:** `{ "assignee": "string" }`
- **Success Response:** `200 OK` with updated task object.
- **Error Responses:**
  - `400 Bad Request` if `assignee` is missing, non-string, empty string, whitespace-only, or >100 characters.
  - `404 Not Found` if task ID does not exist.

### Curl Examples

**Assign a task to a user:**
```bash
curl -X PATCH http://localhost:3000/tasks/<task-id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alice Smith"}'
```

```bash
curl -X PATCH http://localhost:3000/tasks/<task-id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Bob Jones"}'
```
``
**Try it on the live API:**
curl -X POST https://task-api-z9hh.onrender.com/tasks -H "Content-Type: application/json" -d '{"title":"Demo","priority":"high"}'
**Reassign a task to another user:**
```
---

# Original Assignment Documentation

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | Assign a task to a user                  |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "assignee": "string | null",
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

**List tasks with filter**
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=10"
```

**Mark complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```
