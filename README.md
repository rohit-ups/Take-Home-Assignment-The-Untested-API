# Take-Home Assignment — The Untested API

A 2-day take-home assignment. You'll read unfamiliar code, write tests, track down bugs, and ship a small feature.

Read **[ASSIGNMENT.md](./ASSIGNMENT.md)** for the full brief before you start.

### Submission

| | |
|---|---|
| **Submission notes** | [SUBMISSION.md](./SUBMISSION.md): summary, coverage, design decisions, answers to the brief's questions |
| **Bug report** | [BUG_REPORT.md](./BUG_REPORT.md): 10 bugs found, 8 fixed |
| **Tests** | `task-api/tests/`: 121 tests, ~99% coverage |
| **Live API** | https://take-home-assignment-the-untested-api-iopg.onrender.com |

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

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup
    routes/tasks.js         # Route handlers
    services/taskService.js # Business logic + in-memory data store
    utils/validators.js     # Input validation helpers
  tests/
    taskService.test.js     # Unit tests for the service layer
    tasks.api.test.js       # Integration tests for /tasks (Supertest)
    app.test.js             # Landing, health and 404 routes
  package.json
  jest.config.js
ASSIGNMENT.md               # Full brief — read this first
BUG_REPORT.md               # Bugs found by the tests, and their fixes
SUBMISSION.md               # Submission notes
```

> The data store is in-memory. It resets every time the server restarts.

---

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=`, which can be combined |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Partial update: only the fields sent are changed |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | Assign a task to a person, or unassign it (see below) |
| `GET`    | `/`                       | API name and list of endpoints           |
| `GET`    | `/health`                 | Health check: `{ "status": "ok" }`       |

`PUT` can change `title`, `description`, `status`, `priority` and `dueDate`.
Other fields (`id`, `createdAt`, `completedAt`, `assignee`) are ignored.
Pages start at 1, and `limit` defaults to 10.

### Task shape

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
  "assignee": "string or null"
}
```

New tasks default to `status: "todo"`, `priority: "medium"`, `assignee: null`.
`completedAt` is set when a task becomes `done` (through `/complete` or `PUT`)
and cleared if it is moved back to another status.

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

**Assign / unassign**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Asha"}'        # use {"assignee": null} to unassign
```

| Situation | Response |
|-----------|----------|
| Task is unassigned, or assigned to the same person | `200` with the updated task |
| Task is assigned to someone else | `409` `{ "error": "Task is already assigned to Asha" }`. Unassign first to hand it over. |
| `assignee` missing, not a string, empty/whitespace, or over 100 characters | `400` |
| Task doesn't exist | `404` |

Names are trimmed. Design reasoning is in [SUBMISSION.md](./SUBMISSION.md).

---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

- **Test files** — covering the endpoints and edge cases you identified
- **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
- **At least one fix** — with a note on your approach
- **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)
