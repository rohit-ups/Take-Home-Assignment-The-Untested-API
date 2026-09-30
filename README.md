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
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | **Assign a task to a user** _(to implement)_ |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "pending | in-progress | completed",
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
curl "http://localhost:3000/tasks?status=pending&page=1&limit=10"
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

---

## Submission Notes

### Test Coverage
![Test Coverage Summary](./test_coverage.png)

### What I'd test next if I had more time
- Performance testing/load testing, especially around the pagination logic if the array size grows.
- Test coverage for invalid UUID formats on the `/:id` paths to ensure the API handles them gracefully.
- Adding tests for cross-site scripting (XSS) and injection prevention on text fields like `title`, `description`, and `assignee`.

### Anything that surprised me in the codebase
- It was surprising to see the original `update` function use simple object spread syntax `...fields` over the task. This essentially allowed anyone to overwrite critical backend fields like `id` or `createdAt` simply by sending them in a `PUT` request payload.
- It was interesting and helpful that the bugs were already highlighted with `BUG:` prefixes in the test descriptions, acting as great test-driven documentation.

### Questions I'd ask before shipping this to production
1. **Database Strategy:** The in-memory array will eventually consume all memory and will lose data on restarts. What is the plan for migrating to a persistent database (PostgreSQL, MongoDB, etc.)?
2. **Authentication/Authorization:** Is this API meant to be public? Currently, anyone can delete, reassign, or update any task. Should we implement an authentication middleware (e.g., JWT)?
3. **Pagination Scalability:** Array `slice` pagination works for small arrays, but fetching all tasks to slice them will crash the app at scale. How big do we expect the dataset to grow?
4. **Rate Limiting & Logging:** Should we add rate-limiting for DDOS protection and a robust logging mechanism (e.g., Winston, Morgan) to monitor API usage and errors in production?

### Design Decisions for `PATCH /tasks/:id/assign`
- **Validation**: Added a strict check inside `validators.js` that `assignee` must be a defined, non-empty string. If it's empty or just whitespace, it returns a `400 Bad Request`.
- **Modularity**: I maintained the existing codebase pattern by placing validation logic in `utils/validators.js` (`validateAssignTask`) and the data manipulation logic in `services/taskService.js` (`assignTask`).
- **Idempotency**: It is safe to call the endpoint multiple times with the same assignee.
