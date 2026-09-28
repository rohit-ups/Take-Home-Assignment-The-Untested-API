# Bug Report

## Bug #1: Pagination Off-by-One Error

**Location**: `src/services/taskService.js`, line 12

**Expected Behavior**: 
When requesting page 1 with a limit of 10, the API should return the first 10 tasks (items 0-9).

**Actual Behavior**: 
When requesting page 1 with a limit of 10, the API returns tasks 10-19 (the second page). The pagination uses `offset = page * limit`, which means:
- page=0 returns items 0-9 (first page)
- page=1 returns items 10-19 (second page)

This is confusing as most APIs use 1-based pagination where page=1 returns the first page.

**How Discovered**: 
During integration testing of the GET /tasks endpoint with pagination parameters. The test `should return paginated tasks with only page` failed because it expected 10 items but only received 5 (the remaining items after the first 10 were skipped).

**Fix**: 
Change the offset calculation in `getPaginated` from:
```javascript
const offset = page * limit;
```
to:
```javascript
const offset = (page - 1) * limit;
```

Or alternatively, document that the API uses 0-based pagination.

---

## Bug #2: Inconsistent Return Type for Not Found Cases

**Location**: `src/services/taskService.js`, line 7

**Expected Behavior**: 
When a task is not found, functions should consistently return `null` to indicate absence.

**Actual Behavior**: 
The `findById` function returns `undefined` when a task is not found, while other functions like `remove` return `false` and `update` returns `null`. This inconsistency makes the API harder to use and predict.

**How Discovered**: 
During unit testing of the `findById` function. The test expected `null` but received `undefined`.

**Fix**: 
Change the `findById` function to explicitly return `null`:
```javascript
const findById = (id) => tasks.find((t) => t.id === id) || null;
```

---

## Bug #3: getByStatus Uses Partial String Matching

**Location**: `src/services/taskService.js`, line 9

**Expected Behavior**: 
The `getByStatus` function should exactly match the status value (e.g., 'todo' should only match tasks with status 'todo').

**Actual Behavior**: 
The function uses `includes()` which performs partial string matching. This means:
- Searching for 'progress' will match 'in_progress'
- Searching for 'o' will match both 'todo' and 'done'

This can lead to unexpected results and data leakage.

**How Discovered**: 
During unit testing of the `getByStatus` function. The test for partial matching revealed that searching for 'progress' returned tasks with status 'in_progress'.

**Fix**: 
Change the comparison from:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```
to:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug #4: Uncovered Error Handling Code

**Location**: `src/app.js`, lines 10-11

**Expected Behavior**: 
The error handler should be tested to ensure it properly handles errors and returns the expected error response.

**Actual Behavior**: 
The error handling middleware is not covered by tests (69.23% coverage in app.js). This means we don't know if it works correctly when an error occurs.

**How Discovered**: 
Reviewing the coverage report which showed lines 10-11 as uncovered.

**Fix**: 
Add tests that trigger errors to verify the error handler works correctly. This could be done by:
- Adding a test that causes an error in a route
- Creating a test that directly calls the error middleware

---

## Notes

- The branch coverage in `taskService.js` line 22 is due to the condition `counts[t.status] !== undefined` not being tested with an invalid status. This is low priority since the status is validated at the API level.
- Overall test coverage is 97.01%, which exceeds the 80% requirement.
- Most of the core functionality is well-tested and working correctly.
