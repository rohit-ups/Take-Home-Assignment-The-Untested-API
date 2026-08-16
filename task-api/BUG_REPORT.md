# Bug Report

## Bug: Incorrect Pagination Offset

### Expected Behavior

When requesting page 1 with a limit of 2:

`GET /tasks?page=1&limit=2`

the API should return the first two tasks.

For example:

- Task 1
- Task 2

Page 2 should then return:

- Task 3
- Task 4

### Actual Behavior

Page 1 with a limit of 2 skips the first two tasks and starts from Task 3.

The API returned only Task 3 when three tasks were available.

### How It Was Discovered

The issue was discovered through automated unit and integration tests.

The unit test for `taskService.getPaginated()` expected page 1 to return Task 1 and Task 2 but received Task 3.

The integration test for `GET /tasks?page=1&limit=2` reproduced the same issue through the API.

The test suite currently reports:

- 33 tests
- 31 passing
- 2 failing

Both failures are caused by the same pagination calculation.

### Root Cause

The pagination offset is calculated as:

```javascript
const offset = page * limit;