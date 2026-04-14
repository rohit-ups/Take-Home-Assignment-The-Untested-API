While working through this codebase, I focused on understanding behavior through testing, identifying issues systematically, and improving reliability before adding new features.

## 🚀 My Contributions

### 1) Fixed Pagination Offset Logic

**File:** `task-api/src/services/taskService.js` ([line 12](./task-api/src/services/taskService.js#L12))

**Issue:**
Pagination skipped the first page because the offset was calculated as `page * limit`. For `page=1`, this starts at index `limit` instead of `0`.

**Before**

```js
const offset = page * limit;
```

**After**

```js
const offset = (page - 1) * limit;
```

**Why this fix works:**
It aligns page numbering (1-based) with array indexing (0-based), so page 1 starts from the first record.

### 2) Added Status Query Validation

**File:** `task-api/src/routes/tasks.js` ([lines 14-18](./task-api/src/routes/tasks.js#L14-L18))

**Issue:**
`GET /tasks?status=invalid` returned `200` with an empty array. Invalid query values were not validated before calling the service layer.

**Added Validation**

```js
const VALID_STATUSES = ["todo", "in_progress", "done"];

if (status) {
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const tasks = taskService.getByStatus(status);
  return res.json(tasks);
}
```

**Why this fix works:**
Invalid status filters are rejected early with `400 Bad Request`, making API behavior explicit and predictable.

### 3) Implemented `PATCH /tasks/:id/assign`

**File:** `task-api/src/routes/tasks.js` ([lines 78-94](./task-api/src/routes/tasks.js#L78-L94))

**What I implemented:**

- Added an `assignee` field update endpoint.
- Reused existing `taskService.update()` for persistence.
- Added request validation and proper error handling.

**Implementation Snippet**

```js
router.patch("/:id/assign", (req, res) => {
  const { assignee } = req.body;

  if (!assignee || typeof assignee !== "string" || assignee.trim() === "") {
    return res
      .status(400)
      .json({ error: "Assignee must be a non-empty string" });
  }

  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const updated = taskService.update(req.params.id, { assignee });
  res.json(updated);
});
```

**Validation behavior:**

- Missing `assignee` → `400`
- Empty/blank `assignee` → `400`
- Unknown `:id` → `404`
- Valid request → `200` with updated task

### Design Decisions

- Kept validation in the route layer to maintain separation of concerns (request validation vs. business/data logic).
- Reused `taskService.update()` to avoid duplicating update logic and reduce maintenance overhead.
- Allowed reassignment by design (`assignee` can be overwritten) to support real-world task handoffs.
- Used REST-aligned status codes (`400`, `404`, `200`) for consistent API semantics.

### Observations

- Query parameter validation was missing for filters like `status`, which can lead to silent failures.
- The pagination bug was subtle but high-impact for client-side paging correctness.
- `taskService.update()` currently allows overwriting immutable fields (e.g., `id`, `createdAt`), which is a potential integrity risk and a good candidate for a hardening follow-up.

### Test Coverage

**File:** `task-api/tests/tasks.test.js`

I added endpoint-focused tests to validate both expected behavior and edge cases for the changes above:

- `GET /tasks` returns `[]` initially.
- Pagination regression test: `GET /tasks?page=1&limit=2` returns the first two created tasks (`Task 1`, `Task 2`).
- Invalid status validation: `GET /tasks?status=invalid` returns `400` with an error payload.
- Assign endpoint happy path: `PATCH /tasks/:id/assign` sets `assignee` and returns `200`.
- Assign endpoint validation: empty assignee returns `400`.
- Assign endpoint not found case: non-existent task id returns `404`.

---

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

| Method   | Path                  | Description                                              |
| -------- | --------------------- | -------------------------------------------------------- |
| `GET`    | `/tasks`              | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`              | Create a new task                                        |
| `PUT`    | `/tasks/:id`          | Full update of a task                                    |
| `DELETE` | `/tasks/:id`          | Delete a task (returns 204)                              |
| `PATCH`  | `/tasks/:id/complete` | Mark a task as complete                                  |
| `GET`    | `/tasks/stats`        | Counts by status + overdue count                         |
| `PATCH`  | `/tasks/:id/assign`   | **Assign a task to a user** _(to implement)_             |

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
