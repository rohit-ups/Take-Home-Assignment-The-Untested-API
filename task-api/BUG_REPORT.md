# Task API Bug Report

## 1. Status Filtering Matched Partial Strings
- **Expected Behavior**: `GET /tasks?status=todo` should only return tasks with `status === "todo"`.
- **Actual Behavior**: Filtering used partial matching, so values like `"o"` matched both `"todo"` and `"done"`.
- **How Discovered**: Unit test added for partial string input in `taskService.getByStatus`.
- **Suggested Fix**: Use strict equality (`===`) for status matching.

## 2. Pagination Started From Wrong Offset
- **Expected Behavior**: Page 1 with limit 10 should return tasks 0-9.
- **Actual Behavior**: Pagination used `offset = page * limit`, which skipped the first page of items.
- **How Discovered**: Unit + integration tests for pagination.
- **Suggested Fix**: Use `offset = (page - 1) * limit`.

## 3. Assignment Endpoint Needs Strong Input Validation
- **Expected Behavior**: `PATCH /tasks/:id/assign` should reject invalid payloads (missing or non-string assignee).
- **Actual Behavior**: Initial coverage focused on happy path + empty string, but missing/non-string cases needed explicit test coverage.
- **How Discovered**: API test review.
- **Suggested Fix**: Validate `assignee` as a required non-empty string and cover missing/non-string cases in integration tests.
