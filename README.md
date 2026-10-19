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
| `PATCH`  | `/tasks/:id/assign`       | Assign or reassign a task by name         |

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
  "assignee": "string (present after assignment)"
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

---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

- **Test files** — covering the endpoints and edge cases you identified
- **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
- **At least one fix** — with a note on your approach
- **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)

## Request behavior

- Status is `todo`, `in_progress`, or `done`. Priority is `low`, `medium`, or `high`.
- POST requires a non-blank title. PUT keeps omitted fields unchanged; an empty object is a no-op. Editable fields are `title`, `description`, `status`, `priority`, and `dueDate`. Unknown fields and server-owned metadata are rejected with 400.
- Description must be a string. Title whitespace is preserved, but whitespace-only titles are rejected.
- `dueDate` accepts null or `YYYY-MM-DDTHH:mm:ss[.SSS]Z` / a timestamp with a `±HH:mm` offset. Fractional seconds may contain 1–3 digits. Date-only strings, missing timezones, and impossible calendar dates are rejected. Null clears a deadline.
- Filtering uses exact status values. Unknown statuses return 400. Filtering happens before pagination.
- Pagination starts at page 1. Omitted page/limit default to 1/10 when pagination is requested. Supplied values must be positive decimal integers within JavaScript's safe range; leading zeros and unsafe computed offsets are rejected. Pages beyond the result return `[]`.
- Entering `done` records `completedAt`; repeated completion preserves it. Reopening clears it. Completion preserves priority and assignment.
- Assignment accepts only `{ "assignee": "name" }`, trims the name, and rejects missing, non-string, or blank names with 400. Reassignment and assignment of completed tasks are allowed. Valid input for a missing task returns 404. Invalid input is checked before task existence, consistently with PUT.
- Assignment changes use the dedicated PATCH endpoint. PUT cannot overwrite `assignee`.
- Malformed JSON returns 400; bodies above Express's default 100 KB limit return 413. Unexpected internal errors return a generic 500.

Assign a task:

```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H 'Content-Type: application/json' \
  -d '{"assignee":"Vaibhav"}'
```

For reproduced bugs, causes, fixes, and test evidence, see [BUG_REPORT.md](./BUG_REPORT.md). Run `npm run coverage` inside `task-api`; Jest enforces at least 80% coverage in every global metric.
