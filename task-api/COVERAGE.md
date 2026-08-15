# Test Coverage Report

Run via `npm run coverage`.

```
PASS  tests/taskService.test.js
PASS  tests/tasks.routes.test.js
-----------------|---------|----------|---------|---------|---------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|---------------------
All files        |   93.95 |    85.88 |   92.85 |   93.43 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |   98.11 |     87.5 |     100 |   98.11 |
  tasks.js       |   98.11 |     87.5 |     100 |   98.11 | 43
 src/services    |     100 |    94.11 |     100 |     100 |
  taskService.js |     100 |    94.11 |     100 |     100 | 22
 src/utils       |    86.2 |     82.5 |     100 |    86.2 |
  validators.js  |    86.2 |     82.5 |     100 |    86.2 | 22,25,28,31
-----------------|---------|----------|---------|---------|---------------------

Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total
Snapshots:   0 total
```