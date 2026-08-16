# Submission Notes

## What I Would Test Next

If I had more time, I would add tests for additional edge cases and invalid inputs, including:

- Invalid or negative pagination values.
- Pagination with different `limit` values.
- Pagination when the requested page is beyond the available tasks.
- Combining pagination with filters such as status, priority, assignee, and search.
- Updating a task with invalid or unexpected fields.
- Assigning tasks with different invalid input types.
- Completing, updating, or deleting tasks with malformed IDs.
- Additional edge cases around due dates and overdue task statistics.

I would also add more API-level tests for combinations of filters and error-handling scenarios.

## What Surprised Me

One thing that surprised me was the pagination bug. The API uses 1-based page numbers, but the service used `page * limit` as the offset. This caused page 1 to start at the 11th task instead of the first task.

The issue was easy to miss because the pagination implementation itself looked reasonable at first glance. Writing both service unit tests and API integration tests made the incorrect behavior clear.

I also found it useful to test the same functionality at different levels. The service tests helped identify the root cause, while the API tests confirmed how the bug affected the actual endpoint.

## Questions I Would Ask Before Shipping to Production

Before shipping this API to production, I would ask:

1. Should pagination always use 1-based page numbers?
2. What should happen when `page` or `limit` is zero, negative, or not a number?
3. Should pagination and filters be supported together?
4. Should task assignees be validated against actual users?
5. Should an already assigned task be allowed to be reassigned?
6. Should the API return pagination metadata such as total tasks, current page, and total pages?
7. What authentication and authorization rules should be applied to task operations?
8. What persistence/database should replace the current in-memory data store?
9. What logging and monitoring should be added for production errors?
10. What API response format and error structure should be standardized?

## Final Verification

The final test suite passed successfully:

- Test Suites: 3 passed
- Tests: 70 passed
- Statements: 97.29%
- Branches: 95.49%
- Functions: 94.87%
- Lines: 97%

The pagination bug was fixed and verified through both unit and API integration tests.