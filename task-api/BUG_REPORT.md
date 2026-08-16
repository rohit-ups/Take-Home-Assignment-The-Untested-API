# Bug Report

## Bug #1 — Pagination Returns Incorrect Results for Page 1 and Page 2

Bug ID: BUG-001
Title: GET /tasks pagination returns incorrect results for page 1 and page 2
Severity: Medium
Priority: High
Status: Closed
Affected functionality: Task pagination
Found by: API Integration Tests and Unit Tests


## Description

The task pagination logic initially used an incorrect offset calculation.

The API uses 1-based pagination, where:

- Page 1 should contain Task 1–10
- Page 2 should contain Task 11–15

The original implementation calculated the offset using:

const offset = page * limit;

This caused the API to skip the first page.

As a result:

- page=1 returned Task 11–15 instead of Task 1–10.
- page=2 returned an empty array instead of Task 11–15.


## Steps to Reproduce

### 1. Create 15 tasks

Create the following tasks:

Task 1
Task 2
Task 3
Task 4
Task 5
Task 6
Task 7
Task 8
Task 9
Task 10
Task 11
Task 12
Task 13
Task 14
Task 15


### 2. Test Page 1

Send the request:

GET /tasks?page=1&limit=10


### Expected Result

The API should return:

Task 1
Task 2
Task 3
Task 4
Task 5
Task 6
Task 7
Task 8
Task 9
Task 10

Expected response length:

10


### Actual Result Before Fix

The API returned:

Task 11
Task 12
Task 13
Task 14
Task 15

Actual response length:

5


### 3. Test Page 2

Send the request:

GET /tasks?page=2&limit=10


### Expected Result

The API should return:

Task 11
Task 12
Task 13
Task 14
Task 15

Expected response length:

5


### Actual Result Before Fix

The API returned:

[]

Actual response length:

0


## Test Evidence Before Fix

The pagination bug was detected at two levels:

1. API Integration Tests
2. Service Unit Tests


### API Test — Page 1

Test:

GET /tasks?page=1&limit=10

Expected:

10 tasks
Task 1 to Task 10

Received:

5 tasks
Task 11 to Task 15


### API Test — Page 2

Test:

GET /tasks?page=2&limit=10

Expected:

5 tasks
Task 11 to Task 15

Received:

0 tasks
[]


### Unit Test — Page 1

Test:

taskService.getPaginated(1, 10)

Expected:

10 tasks
Task 1 to Task 10

Received:

5 tasks
Task 11 to Task 15


### Unit Test — Page 2

Test:

taskService.getPaginated(2, 10)

Expected:

5 tasks
Task 11 to Task 15

Received:

0 tasks
[]


## Root Cause

The problem was in:

src/services/taskService.js

The original pagination logic was:

const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
};

The problem was the calculation:

page * limit

The API uses 1-based page numbers, while JavaScript arrays use zero-based indexes.

For example:

page = 1
limit = 10

The original calculation was:

offset = 1 * 10
       = 10

Then:

tasks.slice(10, 20)

Array index 10 represents the 11th task.

Therefore, page 1 incorrectly started from Task 11.


## Page 2 Root Cause

For:

page = 2
limit = 10

The original calculation was:

offset = 2 * 10
       = 20

Then:

tasks.slice(20, 30)

Only 15 tasks existed.

Therefore, the result was:

[]


## Expected Pagination Logic

For 1-based pagination, the offset should be:

const offset = (page - 1) * limit;


For page 1:

page = 1
limit = 10

offset = (1 - 1) * 10
       = 0

Then:

tasks.slice(0, 10)

returns:

Task 1 to Task 10


For page 2:

page = 2
limit = 10

offset = (2 - 1) * 10
       = 10

Then:

tasks.slice(10, 20)

returns:

Task 11 to Task 15.


## Fix Applied

Changed:

const offset = page * limit;

to:

const offset = (page - 1) * limit;


The corrected function is:

const getPaginated = (page, limit) => {
    const offset = (page - 1) * limit;

    return tasks.slice(offset, offset + limit);
};


## Test Results After Fix

After applying the fix, the complete test suite was executed using:

npm test

Result:

Test Suites: 3 passed, 3 total
Tests:       70 passed, 70 total
Snapshots:   0 total


All tests passed successfully.


## Coverage Results After Fix

Coverage was also verified using:

npm run coverage

Coverage result:

All files        97.29% Statements
                 95.49% Branches
                 94.87% Functions
                 97% Lines


## Verification After Fix

### API Integration Test — Page 1

Request:

GET /tasks?page=1&limit=10

Result:

Task 1 to Task 10

Response length:

10

Status:

PASSED


### API Integration Test — Page 2

Request:

GET /tasks?page=2&limit=10

Result:

Task 11 to Task 15

Response length:

5

Status:

PASSED


### Unit Test — Page 1

Test:

taskService.getPaginated(1, 10)

Result:

Task 1 to Task 10

Status:

PASSED


### Unit Test — Page 2

Test:

taskService.getPaginated(2, 10)

Result:

Task 11 to Task 15

Status:

PASSED


## Impact

Before the fix, users using task pagination could not correctly navigate between pages.

The issue caused:

- Page 1 to skip the first 10 tasks.
- Page 1 to incorrectly display tasks from page 2.
- Page 2 to return an empty array.
- Incorrect task results when navigating through paginated data.

After the fix, pagination correctly returns the expected tasks for each page.


## Severity and Priority

Severity: Medium

The application and other task operations continued to work, but pagination returned incorrect results.

Priority: High

Pagination is a core API feature and must return the correct set of tasks for each requested page.


## Test Coverage

The bug was tested at two levels.

### API Integration Testing

Test file:

tests/taskAPI.test.js

Tests:

GET /tasks?page=1&limit=10
GET /tasks?page=2&limit=10


### Unit Testing

Test file:

tests/taskService.test.js

Tests:

taskService.getPaginated(1, 10)
taskService.getPaginated(2, 10)


Testing at both levels confirmed the pagination issue originated in the service pagination logic and was exposed through the API.


## Testing Workflow

1. API Testing       DONE
2. Unit Testing      DONE
3. Bug Report        DONE
4. Fix Bug           DONE
5. Run npm test      DONE
6. Verify all pass   DONE
7. Commit fix        DONE
8. Push changes      PENDING


## Bug Status

Bug ID: BUG-001

Issue: Incorrect pagination offset

API Test: PASSED

Unit Test: PASSED

Fix: APPLIED

Test Suite: PASSED

Status: CLOSED


## Conclusion

The API and service tests successfully identified a real pagination defect in the existing implementation.

The root cause was the use of:

page * limit

instead of:

(page - 1) * limit

Because the API uses 1-based pagination and JavaScript arrays use zero-based indexes, the original implementation skipped the first page and caused the second page to return an empty result.

The pagination logic was corrected to:

const offset = (page - 1) * limit;

After applying the fix, all 70 tests passed across the API, service, and validator test suites.

The bug is now CLOSED and VERIFIED.