# Bug Report

## Bug: Pagination returns incorrect results for page 1

### Expected Behavior

When requesting:

GET /tasks?page=1&limit=2

the API should return the first two tasks.

For example:

- Task 1
- Task 2

Page 2 should return:

- Task 3
- Task 4

### Actual Behavior

The API originally calculated the pagination offset as:

```js
const offset = page * limit;