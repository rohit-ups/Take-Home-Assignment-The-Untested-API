## Added assignTask service

# Unit tests

- Created 3 unit tests for this service with all tests (including edge cases) passing

# Integrated tests

- Created 5 integrated tests for this endpoint which includes some edge cases, with all passing

# New Coverage Report

File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   95.54 |    89.88 |   93.33 |   95.07 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |    91.66 |     100 |     100 |                   
  tasks.js       |     100 |    91.66 |     100 |     100 | 20-21             
 src/services    |     100 |    95.23 |     100 |     100 |                   
  taskService.js |     100 |    95.23 |     100 |     100 | 22                
 src/utils       |   88.88 |     87.5 |     100 |   88.88 |                   
  validators.js  |   88.88 |     87.5 |     100 |   88.88 | 22,28,31          
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 2 failed, 2 total
Tests:       8 failed, 48 passed, 56 total
Snapshots:   0 total
Time:        0.624 s, estimated 1 s

# Old Coverage Report

File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.77 |       88 |    92.3 |   94.26 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |       90 |     100 |     100 |                   
  tasks.js       |     100 |       90 |     100 |     100 | 20-21             
 src/services    |     100 |    94.11 |     100 |     100 |                   
  taskService.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils       |   86.95 |    85.29 |     100 |   86.95 |                   
  validators.js  |   86.95 |    85.29 |     100 |   86.95 | 22,28,31          
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 2 failed, 2 total
Tests:       8 failed, 40 passed, 48 total
Snapshots:   0 total
Time:        0.534 s, estimated 1 s

# After bug fixes

ile             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   95.67 |    90.81 |   93.33 |   95.23 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |     92.3 |     100 |     100 |                   
  tasks.js       |     100 |     92.3 |     100 |     100 | 23-24             
 src/services    |     100 |    95.65 |     100 |     100 |                   
  taskService.js |     100 |    95.65 |     100 |     100 | 23                
 src/utils       |   89.65 |    88.88 |     100 |   89.65 |                   
  validators.js  |   89.65 |    88.88 |     100 |   89.65 | 27,34,37          
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 2 passed, 2 total
Tests:       56 passed, 56 total
Snapshots:   0 total
Time:        0.654 s, estimated 1 s