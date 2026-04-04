# Submission Notes

## Coverage Summary

```
-|---------|----------|---------|---------|-------------------
 | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-|---------|----------|---------|---------|-------------------
 |   97.41 |    97.67 |   93.33 |   97.16 |
-|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       85 passed, 85 total
```

## What I'd test next if I had more time

- **Concurrency / race conditions:** The in-memory store uses direct array mutation. Concurrent requests could cause data corruption (e.g., two updates to the same task at once).
- **Request body edge cases:** Sending deeply nested objects, extremely long strings, or unexpected content types (XML, form-data).
- **Error handler middleware:** The global error handler in `app.js` is currently uncovered. I'd test it by forcing an unhandled error in a route.
- **Performance/load testing:** How does the in-memory store handle thousands of tasks? Pagination would become critical.

## What surprised me in the codebase

- The `completeTask` function silently resetting `priority` to `"medium"` — this is the kind of bug that would be extremely hard to catch visually in production, since tasks still get marked as "done" correctly.
- The `getByStatus` using `.includes()` for string matching — it works for exact status names by coincidence (e.g., "todo" doesn't contain the substring "done"), but breaks for partial matches like "do".
- The `update` function allows overwriting `id` and `createdAt` via the spread, which could cause data integrity issues.

## Questions I'd ask before shipping to production

1. **Authentication/Authorization:** Who can create/assign/complete tasks? Should there be user accounts?
2. **Persistence:** The in-memory store means all data is lost on restart. What database should back this?
3. **Rate limiting:** Should we add rate limiting to prevent abuse?
4. **Input sanitization:** Should we sanitize title/description for XSS if they're ever rendered in a frontend?
5. **Assignee validation:** Should `assignee` be validated against a list of known users, or is it freeform text?
6. **Idempotency:** What should happen if you `PATCH /complete` on a task that's already done? Currently it overwrites `completedAt`.

## Design decisions for `PATCH /tasks/:id/assign`

- **Validation:** Requires `assignee` to be a non-empty string (whitespace-only is rejected). Non-string values (like numbers) are also rejected.
- **Re-assignment:** Allowed. If a task is already assigned, sending a new assignee simply overwrites the previous one. This keeps the API simple and follows the principle of least surprise.
- **Trimming:** The assignee name is trimmed before storage to normalize whitespace.
- **No unassign:** To unassign, we'd need a separate mechanism (or allow `null`). I chose not to allow empty strings as an unassign action since the assignment explicitly asks about empty string validation.
