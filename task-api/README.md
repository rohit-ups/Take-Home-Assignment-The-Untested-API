# Task Manager API

A simple Node.js and Express API for task management, featuring an in-memory task store, input validation, and Jest/Supertest test suites.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Running the App
```bash
npm install
npm start
```
The server will run on `http://localhost:3000`.

### Running Tests
```bash
# Run unit and integration tests
npm test

# Generate coverage report
npm run coverage
```

---

## API Endpoints

### Tasks
- `GET /tasks` - Retrieve tasks. Supports pagination (`?page=1&limit=10`) and filtering (`?status=todo`).
- `POST /tasks` - Create a task.
- `PUT /tasks/:id` - Update a task.
- `DELETE /tasks/:id` - Delete a task.
- `GET /tasks/stats` - Retrieve task stats (status counts and overdue tasks).

### Task Actions
- `PATCH /tasks/:id/complete` - Mark a task as completed.
- `PATCH /tasks/:id/assign` - Assign a task to a user.

---

## Design Decisions

### Task Assignment (`PATCH /tasks/:id/assign`)
- **Validation**: The request body must contain a non-empty, non-whitespace string `assignee`.
- **Lock Prevention**: If the task is already assigned to a different user, the API returns a `409 Conflict` to prevent accidental overwrites.
- **Idempotency**: Assigning a task to the same user returns `200 OK` and does nothing.

---

## Bug Fixes

1. **Pagination Offset**: Corrected offset calculation from `page * limit` to `(page - 1) * limit` in `taskService.js` to support conventional 1-based pagination.
2. **Task Completion Priority Downgrade**: Removed the hardcoded `priority: 'medium'` overwrite in `completeTask` so a task's original priority is preserved upon completion.
3. **Status Filtering (Exact Match)**: Changed the status filter logic from substring matching (`.includes`) to exact matching (`===`) and added validation to reject invalid status queries with a `400 Bad Request`.
4. **Read-Only Fields Protection**: Whitelisted modifiable properties at the service level and added body validator checks to reject attempts to modify `id`, `createdAt`, or `completedAt` fields.