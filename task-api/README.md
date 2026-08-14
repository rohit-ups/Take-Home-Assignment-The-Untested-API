# Task Manager API - Take-Home Assignment

A Node.js and Express Task Manager API completed as part of the Full Stack Developer Intern take-home assignment.

The assignment involved:

- Understanding an unfamiliar codebase
- Writing unit tests
- Writing API integration tests
- Finding bugs through testing
- Fixing bugs
- Implementing a new API feature
- Achieving high test coverage

## Tech Stack

- Node.js
- Express.js
- Jest
- Supertest
- UUID

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
│   └── tasks.api.test.js
├── BUG_REPORT.md
├── README.md
├── package.json
├── jest.config.js
└── ASSIGNMENT.md