# Submission Notes

## What you'd test next if you had more time

- **Concurrent request handling**: Test multiple simultaneous requests to ensure the in-memory store handles race conditions properly
- **Data persistence**: Add database integration tests once the API moves from in-memory storage to a real database
- **Pagination edge cases**: Test with very large datasets to verify pagination performance and accuracy
- **Date/timezone handling**: Test dueDate and completedAt with different timezone scenarios to catch potential bugs
- **Bulk operations**: Add batch update/delete endpoints and thoroughly test their edge cases


## Anything that surprised you in the codebase

The in-memory data store works well for testing but revealed two critical bugs that only surface during state transitions: the `PATCH /tasks/:id/complete` endpoint wasn't clearing the `dueDate` field when marking tasks as complete, and the PUT endpoint for updating tasks wasn't properly replacing fields when they were omitted from the request body. These bugs highlight how important comprehensive testing is—manual testing might miss these subtle state management issues. The validator functions are well-structured but could benefit from more granular error messages for debugging.


## Any questions you'd ask before shipping this to production

1. **Data persistence**: When moving to a database, will we need migration logic for existing in-memory tasks? How should we handle the transition?
2. **User authentication**: The API currently has no user context or permissions. Should tasks be scoped to users? Who can assign tasks to whom?
3. **Concurrency**: The in-memory store doesn't handle concurrent writes. What database/locking strategy will we use in production?
4. **Error handling**: Should we return consistent error codes? Currently mixing custom messages with minimal HTTP status codes (e.g., 404, 400, 500).
5. **Audit logging**: Do we need to track who modified tasks and when? The current schema doesn't support audit trails.
6. **Rate limiting**: Should we add rate limits to prevent abuse of the API endpoints?

