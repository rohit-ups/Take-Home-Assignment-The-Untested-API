### UNIT TESTS

## Initial Unit Test Coverage Report

File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   40.29 |    21.33 |   61.53 |   34.42 |                   
 src             |       0 |        0 |       0 |       0 |                   
  app.js         |       0 |        0 |       0 |       0 | 1-22              
 src/routes      |       0 |        0 |       0 |       0 |                   
  tasks.js       |       0 |        0 |       0 |       0 | 1-72              
 src/services    |     100 |    94.11 |     100 |     100 |                   
  taskService.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils       |       0 |        0 |       0 |       0 |                   
  validators.js  |       0 |        0 |       0 |       0 | 1-36              
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 1 failed, 1 total
Tests:       3 failed, 19 passed, 22 total
Snapshots:   0 total
Time:        0.72 s, estimated 1 s
Ran all test suites.

## 3 BUGS

---------------------
# completeTask() service

EXPECTED BEHAVIOR : calling completeTask service providing a task's id should only change the status to 'done' and not affect any other field in the task

WHAT ACTUALLY HAPPENS : calling the completeTask service changes the status to done, but also changes the priority to medium everytime its called

DISCOVERY : via manual testing and code overview at first, confirmed while running tests

FIX : remove the line that changes the priority everytime the service is called

----------------------

# getByStatus() service

EXPECTED BEHAVIOR : calling getByStatus service providing a valid status argument should return every task that has that status

WHAT ACTUALLY HAPPENS : providing a portion of a valid status still returns data. In worst possible scenarios, it may provide tasks from 2 or all valid status

DISCOVERY : via manual testing and code overview at first, confirmed while running tests

FIX : instead of using .includes(), it is to compare them directly with '===' and see if they match so there will be no loophole

---------------------

# getPaginated() service

EXPECTED BEHAVIOR : returns a specific group of tasks which was retrieved via the split method from the main tasks array using the limit and page values that are provided by the user

WHAT ACTUALLY HAPPENS : setting the page query to 1 does not return the first 2 items of task array and is offsetted

DISCOVERY : via manual testing and code overview at first, confirmed while running tests

FIX : subtract the page value by 1 so it matches with the actual tasks that the user is trying to find (this is what I fixed)

----------------------

## Coverage Report after fixing Bug 3

File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   40.29 |    21.33 |   61.53 |   34.42 |                   
 src             |       0 |        0 |       0 |       0 |                   
  app.js         |       0 |        0 |       0 |       0 | 1-22              
 src/routes      |       0 |        0 |       0 |       0 |                   
  tasks.js       |       0 |        0 |       0 |       0 | 1-72              
 src/services    |     100 |    94.11 |     100 |     100 |                   
  taskService.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils       |       0 |        0 |       0 |       0 |                   
  validators.js  |       0 |        0 |       0 |       0 | 1-36              
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 1 failed, 1 total
Tests:       2 failed, 20 passed, 22 total
Snapshots:   0 total
Time:        0.691 s, estimated 1 s

### INTEGRATION TESTS

## Initial Integration Test Coverage Report

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
Test Suites: 1 failed, 1 total
Tests:       6 failed, 20 passed, 26 total
Snapshots:   0 total
Time:        0.532 s, estimated 1 s


## BUGS

Majority are found in the unit tests, however there a few validation checks like empty strings that are missing that lets some unwanted data to be registered in the app


### OVERALL COVERAGE REPORT

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

## After bug fixes

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



