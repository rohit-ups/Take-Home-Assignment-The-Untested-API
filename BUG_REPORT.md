## Coverage Output: 

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.5 |    97.33 |   96.15 |   98.36 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |    94.11 |     100 |     100 |                   
  taskService.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 2 failed, 2 total
Tests:       9 failed, 51 passed, 60 total
Snapshots:   0 total
Time:        3.286 s, estimated 10 s


## Bug 1: Pagination skips the first page

- **Location:** `src/services/taskService.js` -> `getPaginated`

- **Expected:** `GET /tasks?page=1&limit-10` returns tasks 1-10

- **Actual:** It returns tasks 11-20 (page 1 is skipped; page 0 is unreachable because the route doest `parseInt(page) || 1)

- **Discovered by:** the test "page 1 returns the first items" failed

- **Why:** `offset = page * limit` treats pages as 0-indexed, but the API is 1-indexed

- **Fix:** `offset = (page -1) * limit`


## Bug 2: Malformed JSON body returns 500 instead of 400

- **Location:** `src/app.js` -> the error-handling middleware

- **Expected:** A request with an invalid JSON body (a client mistake) should return `400 Bad Request`

- **Actual:** It returns `500 Internal Server Error`

- **Discovered by:** Sending a request with a truncated JSON body (.send('{"title": ''}'))

- **Why:** express.json() throws a SyntaxError when it can't parse the body. That error reaches the catch-all handler, which hardcodes `res.status(500) for every error type, regardless of cause

## Bug 3: Completing a task silently resets its priority

- **Location:** `src/services/taskService.js` -> completeTask(id)

- **Expected:** Marking a task complete should only change status and completedAT. Priority shouldn't change.

- **Actual:** A task's priority is always overwritten to 'medium' when complted, even if it was 'high' or 'low'

- **Discovered by:** Creating a task with priority: 'hihg', calling completeTask, and checking the result - the returned task comes back with priority: 'medium'

- **Why:** The update object in completeTask hardcodes priority: 'medium' alongside the fields that should actaully change.

- **Fix:** Remove the priority line entirely so the spread (...task) keeps whatever priority was already set.