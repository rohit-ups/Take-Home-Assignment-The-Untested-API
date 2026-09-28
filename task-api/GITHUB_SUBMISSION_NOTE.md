# GitHub Submission Note

Hi,

I've completed the Task Manager API take-home assignment.

I added Jest unit tests and Supertest integration tests, documented the bugs found during review, fixed the pagination issue, and implemented `PATCH /tasks/:id/assign` with validation and edge-case coverage.

### What I'd test next

With more time, I would add property-based tests for validation and pagination, concurrency tests, broader state-transition coverage, and production-level authentication, authorization, persistence, rate limiting, and observability tests.

### What surprised me

The codebase is small, but several behavioral inconsistencies were hidden in simple service methods. In particular, pagination skipped the first page and completing a task changed its priority.

### Questions before production

I would clarify PUT/PATCH semantics, immutable task fields, reassignment behavior, completion state transitions, pagination limits, and the expected authentication, persistence, and observability model.
