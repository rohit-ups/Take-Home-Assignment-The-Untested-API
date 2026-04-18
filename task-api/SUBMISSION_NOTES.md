# Submission Notes

## What I'd Test Next

- **Concurrency / race conditions**: The in-memory store has no locking. If this were deployed with `cluster` mode or moved to a real database, concurrent writes to the same task could produce stale reads. I'd add stress tests with parallel requests.
- **Input sanitisation**: The API currently trusts string inputs (title, description, assignee) without length limits or content filtering. I'd test with very long strings (10k+ characters), unicode edge cases, and potential XSS payloads to verify the API either truncates or rejects them.
- **Error handler coverage**: The global error handler in `app.js` (lines 9–12) is never triggered by the current test suite because no route throws an unhandled error. I'd add a test that forces an internal error to verify the 500 response.
- **Pagination boundary conditions**: Negative page/limit values, `page=0`, `limit=0`, extremely large values.

## What Surprised Me

- **The `completeTask` priority reset** was the most surprising bug. It's the kind of defect that silently corrupts data without producing any visible error — users would only notice if they checked a completed task's priority later. It was clearly an accidental leftover from a copy-paste or refactoring.
- **The `getByStatus` substring bug** is subtle. For the three valid statuses (`todo`, `in_progress`, `done`), strict full-status queries like `?status=todo` happen to work because `"todo"` is not a substring of `"in_progress"` or `"done"`. The bug only surfaces with partial inputs — which makes it hard to catch without deliberate edge-case testing.
- **No request-body size limit**: There's no `express.json({ limit: ... })` option, so the server accepts arbitrarily large payloads. In production, this would be a denial-of-service vector.

## Questions Before Shipping to Production

1. **Persistence**: The in-memory store means all data is lost on restart. Is that intentional for a demo, or do we need to add a database (PostgreSQL, MongoDB, etc.) before go-live?
2. **Authentication & authorisation**: There's no auth layer at all. Who should be able to create, update, delete, and assign tasks? Are there roles (admin vs. member)?
3. **Rate limiting**: Should we add rate limiting to prevent abuse?
4. **Status enum consistency**: README says `"pending | in-progress | completed"`, but the code uses `"todo | in_progress | done"`. Which is the source of truth? This should be aligned before any client is built against the API.
5. **Validation of `id` and `createdAt` on update**: The current `PUT` endpoint allows overwriting system-managed fields. Is that a feature or a bug? (I've documented it as a bug in my report.)
6. **Idempotency**: Should `PATCH /tasks/:id/complete` be idempotent (no-op if already done) or should it return a 409 Conflict?
