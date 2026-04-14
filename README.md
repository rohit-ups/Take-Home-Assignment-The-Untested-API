# Take-Home Assignment — The Untested API

A 2-day take-home assignment. You'll read unfamiliar code, write tests, track down bugs, and ship a small feature.

Read **[ASSIGNMENT.md](./ASSIGNMENT.md)** for the full brief before you start.

---

## A note on AI tools

You're welcome to use AI tools. What we're evaluating is your ability to read and reason about unfamiliar code — so your submission should reflect your own understanding, not just generated output.

Concretely:
- For each bug you report: include where in the code it lives and why it happens
- For the feature you implement: briefly explain the design decisions you made
- If something surprised you or you had to make a tradeoff, say so

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Tests:**

```bash
npm test           # run test suite
npm run coverage   # run with coverage report
```

---

## Current Status

- Test suites: 4 passed
- Tests: 47 passed
- Coverage: 100% statements, 100% branches, 100% functions, 100% lines
- In-memory data model with deterministic test reset support

---

## Project Structure

```
.
  ASSIGNMENT.md
  README.md
task-api/
  BUG_REPORT.md
  src/
    app.js                     # Express app setup, middleware, error handling, startup helper
    routes/tasks.js            # All /tasks route handlers and HTTP status mapping
    services/taskService.js    # In-memory store + business rules
    utils/validators.js        # Pure request/query validation functions
  tests/
    app.bootstrap.test.js      # startServer() behavior and logging
    tasks.routes.test.js       # Integration tests with supertest
    taskService.test.js        # Service unit tests
    validators.test.js         # Validator unit tests
  package.json
  jest.config.js
```

> The data store is in-memory. It resets every time the server restarts.

---

## Request Flow

The API request lifecycle is:

1. Express app receives request in `src/app.js`
2. `/tasks` routes dispatch in `src/routes/tasks.js`
3. Route-level validation runs via `src/utils/validators.js`
4. Business logic/state mutation happens in `src/services/taskService.js`
5. Route maps service output to HTTP response codes and payloads

---

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List tasks. Supports `?status=`, `?assignee=`, `?page=`, `?limit=` |
| `GET`    | `/tasks/:id`              | Get a single task by ID                  |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | Assign a task to a user                  |

### Endpoint Behavior Notes

- `GET /tasks`
  - Applies validation before processing query values
  - Applies filtering first (`status`, then `assignee`), then pagination (`page`, `limit`)
  - Assignee filtering is case-insensitive to tolerate client-side casing differences
- `PUT /tasks/:id`
  - Validates request body before existence lookup
  - Ignores immutable fields (like `id` and `createdAt`) at the service layer
- `PATCH /tasks/:id/complete`
  - Sets `status` to `done`
  - Sets `completedAt` when needed
  - Preserves unrelated fields like `priority`
- `PATCH /tasks/:id/assign`
  - `400` for invalid payload
  - `404` when task does not exist
  - `409` when already assigned to a different user (state conflict; prevents silent ownership overwrite)
  - `200` idempotent success when assigning to the same user (repeat call does not change resource state)
- `GET /tasks/stats`
  - Returns `todo`, `in_progress`, `done`, and `overdue`
  - Overdue count excludes tasks already marked `done`

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

Additional model notes:

- `id` and `createdAt` are treated as immutable once created
- `dueDate` can be `null` to represent no deadline
- `assignee` can be `null` in general update flows (unassignment)

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

**List tasks by assignee**
```bash
curl "http://localhost:3000/tasks?assignee=alice"
```

**Mark complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

**Assign task**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee":"Alice"}'
```

If a task is already assigned to a different person, `/tasks/:id/assign` returns `409 Conflict` to prevent accidental reassignment.

---

## Testing

The suite is split by responsibility:

- `tests/validators.test.js` validates pure request/query validation rules
- `tests/taskService.test.js` validates in-memory business logic and edge cases
- `tests/tasks.routes.test.js` validates HTTP contract and route-service integration
- `tests/app.bootstrap.test.js` validates startup helper behavior

Run commands:

```bash
cd task-api
npm test
npm run coverage
```

---

## Bug Report

This repository now includes:

- `task-api/BUG_REPORT.md` with expected vs actual behavior for discovered defects
- Detailed root-cause analysis, impact, and fix rationale for each resolved issue

---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

- **Test files** — covering the endpoints and edge cases you identified
- **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
- **At least one fix** — with a note on your approach
- **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)


## Feature

## The primary new feature added is the task assignment endpoint:

- PATCH /tasks/:id/assign
- Accepts body with assignee as a non-empty string
- Stores assignee on the task and returns the updated task
- Returns 404 if the task does not exist
- Returns 409 if the task is already assigned to a different user
- Is idempotent for the same assignee (repeating the same assign request keeps returning success)

**Design decisions for assignment behavior:**

- `409 Conflict` is used for reassignment attempts because the payload is valid, but the request conflicts with current resource ownership state.
- Repeating assignment to the same assignee returns `200 OK` to keep the endpoint idempotent and safe for retries.
- Assignee filtering for `GET /tasks?assignee=` is case-insensitive so clients with mixed casing still get consistent results.

**Alongside that, we also added related enhancements:**

- GET /tasks/:id for single-task fetch
- Optional assignee filtering on GET /tasks via query params