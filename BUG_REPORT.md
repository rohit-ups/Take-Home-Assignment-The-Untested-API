# Bug Report

While writing tests for this API, I found a couple of issues in the existing behavior.

## 1. Pagination skips the first page

**Expected behavior**

When I request `GET /tasks?page=1&limit=2`, I expect to get the first two tasks.

**Actual behavior**

The original code skipped the first two tasks and started from the wrong position.

**How I found it**

I wrote a unit test for the pagination logic in `taskService.js` and an integration test for the `GET /tasks` endpoint with `page` and `limit` query parameters. Both showed that page 1 was not behaving correctly.

**Why it happens**

The pagination offset was calculated as `page * limit`. That treats page numbers like they start at 0, but the API is clearly using page numbers that start at 1.

**Fix**

I changed the offset calculation to `(page - 1) * limit`.

## 2. Status filtering was too loose

**Expected behavior**

When I request `GET /tasks?status=todo`, I expect the API to return only tasks with the exact status `todo`.

**Actual behavior**

The original code used partial string matching, which means the filter was broader than it should be.

**How I found it**

I noticed this while writing tests for the status filter in the service layer.

**Why it happens**

The code used `.includes(status)` instead of checking for exact equality.

**Fix**

I changed the filter to use an exact match.

## 3. Invalid JSON currently returns a server error

**Expected behavior**

If a client sends malformed JSON in the request body, the API should return a `400 Bad Request` response.

**Actual behavior**

Right now, malformed JSON falls into the generic error handler and returns a `500 Internal Server Error`.

**How I found it**

I saw this while reviewing request validation and error handling around the Express app setup.

**Why it happens**

`express.json()` throws a parsing error, but the current error middleware treats it like a general server error.

**Suggested fix**

Handle JSON parsing errors separately in the error middleware and return a `400` response with a clearer message.

## 4. The original documentation did not match the implemented status values

**Expected behavior**

The README and sample requests should use the same status values the API actually accepts.

**Actual behavior**

The original project docs used values like `pending`, `in-progress`, and `completed`, while the code accepts `todo`, `in_progress`, and `done`.

**How I found it**

I noticed this while comparing the sample request documentation with the validation rules and route behavior during test writing.

**Why it happens**

The documentation and implementation were out of sync.

**Fix**

I updated the README examples so they match the real API behavior.
