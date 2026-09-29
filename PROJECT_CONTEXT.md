# Project Context — Take-Home Assignment: The Untested API

## Overview
- **Project Name**: Task Manager REST API
- **Repository**: `Take-Home-Assignment-The-Untested-API`
- **Branch**: `internshipAssignment`
- **Technology Stack**: Node.js, Express.js, JavaScript (CommonJS), Jest, Supertest, npm

## Architecture & Request Lifecycle
- `src/app.js`: Express initialization, JSON middleware, router mounting (`/tasks`), global error handler middleware (`(err, req, res, next)`).
- `src/routes/tasks.js`: Express router handling HTTP endpoints (`GET /tasks`, `GET /tasks/stats`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`, `PATCH /tasks/:id/complete`).
- `src/services/taskService.js`: Business logic and in-memory data store (`tasks` array). Implements CRUD operations and state calculations.
- `src/utils/validators.js`: Payload validators (`validateCreateTask`, `validateUpdateTask`). Validates title string non-emptiness, status enum, priority enum, and ISO date string format for `dueDate`.

## Endpoint Behavior & Verified Contracts
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/tasks` | List tasks (supports `?status=`, `?page=`, `?limit=`) | 200 |
| `GET` | `/tasks/stats` | Counts by status + overdue count | 200 |
| `POST` | `/tasks` | Create new task | 201, 400 |
| `PUT` | `/tasks/:id` | Full update task | 200, 400, 404 |
| `DELETE` | `/tasks/:id` | Delete task | 204, 404 |
| `PATCH` | `/tasks/:id/complete` | Mark task as complete (`status='done'`) | 200, 404 |
| `PATCH` | `/tasks/:id/assign` | Assign task to user (Implemented) | 200, 400, 404 |

## Verified Bug Register
1. **BUG-01 (CONFIRMED)**: Substring status matching in `getByStatus` (`taskService.js` L9). Filtering by `status=do` matches `todo` and `done`. Expected: exact equality `t.status === status`.
2. **BUG-02 (CONFIRMED)**: Off-by-one / 1-based pagination offset calculation in `getPaginated` (`taskService.js` L11-14). For `page=1, limit=10`, offset calculated is `1 * 10 = 10`, skipping items 0–9. `page=0` evaluates to `1` via `parseInt(page) || 1`. Expected: `offset = (page - 1) * limit` for 1-based pagination.
3. **BUG-03 (FIXED)**: Completing task previously reset `priority` to `'medium'`. Fixed by removing hardcoded `priority: 'medium'` in `completeTask` service function. Preserves original task priority (`low`, `medium`, `high`).
4. **BUG-04 (SUSPECTED)**: Reference leak in `getAll` (`taskService.js` L5). Array clone `[...tasks]` holds references to mutable task objects.
5. **BUG-05 (SUSPECTED)**: Uncaught `TypeError` in `validators.js` when `req.body` is `null` or `undefined`.

## Implemented Feature: `PATCH /tasks/:id/assign`
- Request body: `{ "assignee": "string" }`
- Validation: `validateAssignTask` verifies `assignee` is a non-empty, trimmed string (400 Bad Request if missing, invalid type, empty string, or whitespace-only).
- Task lookup: 404 Not Found if task ID does not exist.
- State: `assignee` field defaults to `null` on creation; updated via `assignTask(id, assignee.trim())` returning 200 OK with updated task object.

## Testing Conventions & Isolation
- Jest framework with Node test environment.
- Supertest for integration testing Express endpoints.
- Isolated test state achieved via `taskService._reset()` in `beforeEach()`.
- Baseline coverage target: **80%+** (Current coverage achieved: **97.41% Statements, 95.45% Branches, 97.16% Lines** across 58 tests).
