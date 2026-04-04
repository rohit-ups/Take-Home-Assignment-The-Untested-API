# Coverage Summary

Command used (works on this Windows setup):

```bash
node ./node_modules/jest/bin/jest.js --coverage --runInBand
```

Output:

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |     100 |    96.42 |     100 |     100 |
 src             |     100 |      100 |     100 |     100 |
  app.js         |     100 |      100 |     100 |     100 |
  server.js      |     100 |      100 |     100 |     100 |
 src/routes      |     100 |    91.66 |     100 |     100 |
  tasks.js       |     100 |    91.66 |     100 |     100 | 20-21
 src/services    |     100 |    94.73 |     100 |     100 |
  taskService.js |     100 |    94.73 |     100 |     100 | 22
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
PASS tests/server.test.js
PASS tests/tasks.api.test.js
PASS tests/taskService.test.js

Test Suites: 3 passed, 3 total
Tests:       27 passed, 27 total
Snapshots:   0 total
Time:        1.866 s, estimated 2 s
Ran all test suites.
```
