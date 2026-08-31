# Task Manager API — Take-Home Assignment

A RESTful Task Manager API built with Node.js and Express. The objective of this assignment was to understand an unfamiliar codebase, build a test suite, identify bugs through testing, fix one bug, and implement a new feature.

## Tech Stack

- Node.js
- Express.js
- Jest
- Supertest
- In-memory data store


# Task Manager API

## Project Structure

```text
task-api/
├── src/
│   ├── app.js
│   ├── routes/
│   │   └── tasks.js
│   ├── services/
│   │   └── taskService.js
│   └── utils/
│       └── validators.js
├── tests/
│   ├── taskService.test.js
│   ├── tasks.test.js
│   └── validators.test.js
├── BUGS.md
├── jest.config.js
├── package.json
└── README.md
````

## Testing Approach

The test suite contains both unit and integration tests.

### Unit Tests

The service layer is tested directly, including:

* Task creation
* Fetching all tasks
* Finding tasks by ID
* Status filtering
* Pagination
* Task statistics
* Updating tasks
* Deleting tasks
* Completing tasks

Input validation functions are also tested independently.

### Integration Tests

Supertest is used to test the Express API through HTTP requests.

The following endpoints are covered:

* `GET /tasks`
* `GET /tasks?status=...`
* `GET /tasks?page=...&limit=...`
* `POST /tasks`
* `PUT /tasks/:id`
* `DELETE /tasks/:id`
* `PATCH /tasks/:id/complete`
* `GET /tasks/stats`
* `PATCH /tasks/:id/assign`

Tests include successful requests, invalid input, nonexistent task IDs, filtering, pagination, and other edge cases.

## Test Coverage

Latest coverage:

| Metric     | Coverage |
| ---------- | -------: |
| Statements |   96.22% |
| Branches   |   91.11% |
| Functions  |   93.33% |
| Lines      |   95.86% |

## Bug Report

See [`BUGS.md`](./BUGS.md) for the expected behavior, actual behavior, discovery method, root cause, and proposed fix for each issue.

## What I Would Test Next

If I had more time, I would test some more edge cases, especially around pagination, dates, and completing a task more than once. I would also test how the API behaves when something unexpected goes wrong internally. If the project were later connected to a real database, I would add tests for database errors and multiple requests happening at the same time.

## What Surprised Me

What surprised me most was that some small parts of the code had bugs that were easy to overlook at first. For example, the first page of pagination was skipping tasks, and the status filter could match part of a status instead of the exact value. Writing tests helped me find these issues instead of assuming the existing code was working correctly.

## Questions I Would Ask Before Shipping to Production

Before putting this into production, I would want to clarify a few things. For example, what exact task statuses should the API support? Should a task be allowed to be reassigned? Should completing a task change anything besides its status and completion time? I would also want to understand the authentication requirements, database plans, error-handling expectations, and whether things like logging, monitoring, and rate limiting are needed.


