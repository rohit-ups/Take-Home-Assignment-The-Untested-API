# Final Submission Notes

This document provides additional context regarding design tradeoffs, production readiness, and future testing strategies.

## Surprises in the Codebase

- **Initial State:** The core logic was largely functional but lacked automated tests, which allowed critical bugs (like the pagination offset) to persist.
- **Service Layer Design:** The `taskService` was well-structured, which made implementing the `assignTask` feature straightforward without needing to refactor the entire system.

## Technical Tradeoffs

- **In-Memory Store:** For a take-home assignment, an in-memory array is sufficient for demonstrating logic. However, it lacks persistence and would be replaced by a database (e.g., MongoDB/PostgreSQL) in a real-world scenario.
- **Synchronous Logic:** Most operations are currently synchronous due to the in-memory store. In production, these would be `async` to handle database I/O without blocking the event loop.
- **Validation Library:** I used custom validation functions to keep dependencies minimal. For a larger project, I would typically use a library like `Joi` or `Zod` for more declarative and complex schemas.

## Production Considerations

Before deploying to production, the following questions and improvements should be addressed:

1.  **Concurrency:** How should the system handle simultaneous updates to the same task? (e.g., using optimistic locking or database transactions).
2.  **Scalability:** The current in-memory store is not suitable for horizontal scaling. A shared database is required.
3.  **Security:** The API lacks authentication. Who is allowed to assign tasks? Who can delete them?
4.  **Logging & Monitoring:** Implement structured logging to track errors and performance metrics.

## Future Testing Strategies

- **Property-Based Testing:** Use a library like `fast-check` to generate random inputs for the `create` and `update` methods to discover edge cases in validation.
- **Load Testing:** Benchmark the `getPaginated` and `getStats` endpoints with thousands of tasks to ensure performance remains within acceptable limits.
- **E2E Testing:** Implement a small frontend or use a tool like Cypress to test the entire user flow from task creation to completion.
