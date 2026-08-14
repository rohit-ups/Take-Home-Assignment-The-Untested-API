# Bug Report

## Bug 1: Pagination returned the wrong page

### Location

`src/services/taskService.js`

Function:

`getPaginated(page, limit)`

### Expected behavior

When requesting page 1 with a limit of 2, the API should return the first two tasks.

Example:

```text
GET /tasks?page=1&limit=2