# Submission notes

These are the notes submitted with the take-home (same content as the Pull Request description). Keeping this file in the repo makes the submission easy to find and review.

## How to run

```bash
cd task-api
npm install
npm test
npm run coverage
```

## Coverage

Last run from `task-api` (`npm run coverage`), above the 80% target:

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.23 |     86.2 |   93.33 |   93.66 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |     100 |    91.66 |     100 |     100 |
  tasks.js       |     100 |    91.66 |     100 |     100 | 20-21
 src/services    |     100 |    94.73 |     100 |     100 |
  taskService.js |     100 |    94.73 |     100 |     100 | 22
 src/utils       |   82.75 |       80 |     100 |   82.75 |
  validators.js  |   82.75 |       80 |     100 |   82.75 | 9,12,25,28,31
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 2 passed, 2 total
Tests:       32 passed, 32 total
```

## What I would test next with more time

- Invalid `page` / `limit` (zero, negative, non-numeric) and consistent error responses across list endpoints.
- Concurrent requests against the in-memory store (race conditions are possible without a DB).
- Contract tests for response JSON schema (e.g. with a small schema validator).
- Load or soak tests if this were headed to production traffic.

## What surprised me

- The README status labels differ from `ASSIGNMENT.md` / code (`todo`, `in_progress`, `done` in code and validators).
- Pagination is easy to get wrong with off-by-one page indexing; tests caught that quickly.

## Questions before shipping to production

- Persistence: where should tasks live (Postgres, etc.) and what migration strategy?
- Auth: who can create, update, delete, or assign tasks?
- Idempotency and audit: should assign/complete be logged; do we need `ETag` / versioning?
- SLA and deployment: hosting, health checks, rate limits, and observability (metrics/traces).
