# The Untested API - Task Management

## Project Overview
This project is a RESTful API for managing tasks. It provides standard CRUD operations along with filtering by status, pagination, task completion, and assigning tasks to users. The primary goal of this iteration was to thoroughly document, test, and fix bugs in a previously untested application, following best practices for software quality assurance.

## Known Limitations
**IMPORTANT**: The application currently uses an in-memory data store (`taskService.js`). This means all created tasks and modifications will be lost once the server stops or restarts. This is acceptable for the assignment context but completely unsuitable for a production environment.

## Installation Steps
1. Clone the repository or extract the project files.
2. Navigate to the project root directory.
3. Install dependencies by running:
   ```bash
   npm install
   ```

## How to Run the API
To start the API on the default port 3000, run:
```bash
npm start
```
The server will be running at `http://localhost:3000`.

## How to Run Tests
The project uses Jest and Supertest for unit and integration testing.
To execute the test suite, run:
```bash
npm test
```

## How to Run Coverage
To run tests and generate a coverage report, use:
```bash
npm run coverage
```
The test coverage achieves a passing threshold (>80%), securing both business logic (services) and request/response mapping (controllers).

## API Endpoint List
- `GET /tasks` - Retrieve all tasks
- `GET /tasks?status={status}` - Filter tasks by a specific status (`todo`, `in_progress`, `done`)
- `GET /tasks?page={page}&limit={limit}` - Paginate tasks
- `GET /tasks/stats` - Retrieve statistics on tasks (counts and overdue tasks)
- `POST /tasks` - Create a new task
- `PUT /tasks/:id` - Update an existing task's properties
- `DELETE /tasks/:id` - Remove a task
- `PATCH /tasks/:id/complete` - Mark a task as done
- `PATCH /tasks/:id/assign` - Assign a task to a user (or reassign)

## Assignment Endpoint Example
**Endpoint:** `PATCH /tasks/:id/assign`

**Request:**
```http
PATCH /tasks/550e8400-e29b-41d4-a716-446655440000/assign
Content-Type: application/json

{
  "assignee": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Complete assignment",
  "description": "",
  "status": "todo",
  "priority": "medium",
  "dueDate": null,
  "assignee": "John Doe",
  "completedAt": null,
  "createdAt": "2026-07-27T12:00:00.000Z"
}
```

## Bugs Fixed
1. **Pagination offset logic:** Corrected offset calculation from `page * limit` to `(page - 1) * limit`.
2. **Complete task overrides priority:** Modified `completeTask` so it no longer forces the priority to `medium`.
3. **Status filtering:** Updated `.includes()` to strict equality `===` for accurate status filtering.
4. **Protected fields overwritten via PUT:** Filtered out `id` and `createdAt` from the request body in the `update` function so they cannot be overwritten.
5. **Pagination parameter validation:** Added checks to return `400 Bad Request` when invalid (NaN or negative) values are passed for `page` or `limit`.

## Design Decisions
- **Modularity:** Maintained the existing structure, dividing responsibilities among `app.js` (Express configuration), `routes` (HTTP routing), `services` (business logic), and `utils` (validation).
- **Validation Centralization:** Reused and extended the `utils/validators.js` module for the newly added endpoints to keep the controllers thin and readable.
- **RESTful Best Practices:** Added `PATCH /tasks/:id/assign` instead of merging assignment logic into the generic `PUT` to reflect a specialized atomic state change.
- **Testing Approach:** Added exhaustive unit tests testing pure functions in `taskService.test.js` and combined integration tests hitting endpoints directly in `tasks.integration.test.js` covering happy paths, edge cases, and missing properties.

## Why Reassignment is Allowed
The system permits a task to be reassigned to a new user by replacing the previous `assignee` value. In a task management lifecycle, employee absences, team restructuring, or workload balancing naturally require tasks to shift between people. Limiting assignment to only once would contradict standard agile workflow behavior.

## What I Would Test Next
If I had more time or a larger scope, I would add tests for:
- **Load / Stress Testing:** To verify how the API behaves when flooded with requests.
- **Concurrency Testing:** Testing for race conditions (though muted by the Node.js single-threaded event loop, race conditions against shared resources still happen in asynchronous environments).
- **Security Testing:** Identifying potential NoSQL injection (if a database was used), or testing input lengths for potential Denial of Service (DoS) memory overloads.

## Production Questions
Before releasing this into a live environment, we should address:
1. **Database:** Which persistent storage (PostgreSQL, MongoDB) should we adopt to replace the in-memory array?
2. **Authentication / Authorization:** How are users authenticated? Are all users allowed to assign/delete tasks, or should we implement Role-Based Access Control (RBAC)?
3. **Data Constraints:** What are the hard limits for a task's title and description to prevent abuse?
4. **Environment Configuration:** Do we need different `.env` files for staging vs. production?
5. **Monitoring & Alerting:** How are we tracking errors (e.g., Sentry, Datadog)?
