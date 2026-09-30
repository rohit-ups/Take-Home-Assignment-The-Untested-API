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

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup
    routes/tasks.js         # Route handlers
    services/taskService.js # Business logic + in-memory data store
    utils/validators.js     # Input validation helpers
  tests/                    # Your tests go here
  package.json
  jest.config.js
ASSIGNMENT.md               # Full brief — read this first
```

> The data store is in-memory. It resets every time the server restarts.

---

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Update supplied editable fields          |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | Assign or reassign a task to a name       |

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

**Assign or reassign**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alex"}'
```

### Behavior and design decisions

- Status names follow ASSIGNMENT.md: `todo`, `in_progress`, `done`.
- Filtering is exact and happens before pagination. Pages start at 1; omitted
  page/limit values default to 1/10 when pagination is requested. Unsupported
  statuses and invalid positive-integer pagination values return 400.
- PUT keeps the existing merge behavior: omitted fields remain unchanged, and
  an empty object is a no-op. Editable fields are title, description, status,
  priority, and dueDate. Unknown fields and server-managed fields are rejected.
- Dates accept `null`, `YYYY-MM-DD`, or timestamps with seconds, an optional
  1–3 digit fractional second, and `Z` or a `±HH:MM` timezone. Invalid calendar
  dates and informal/local-time date strings are rejected. Date-only values
  represent midnight UTC when computing overdue tasks.
- Entering `done` sets completedAt; reopening clears it. Repeated completion
  preserves the first timestamp and does not change priority.
- Assignment accepts a nonblank string and trims surrounding whitespace.
  Reassignment replaces the old name. Successful requests return 200 with the
  task; valid requests for missing tasks return 404. Invalid bodies return 400
  before task lookup. The assignee field appears after assignment; no user
  database or authentication is introduced.
- Malformed JSON returns 400; JSON above the existing Express body limit
  returns 413. Unexpected errors return a generic 500 response.

### Implementation results

The implementation includes service unit tests, validator tests, and Supertest
integration tests for every endpoint and its edge cases. See
[BUG_REPORT.md](./BUG_REPORT.md) for reproductions, causes, fixes, coverage output,
and submission notes. Run `npm run coverage -- --runInBand` to reproduce the
recorded results. No additional dependencies were added.

---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

- **Test files** — covering the endpoints and edge cases you identified
- **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
- **At least one fix** — with a note on your approach
- **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)
