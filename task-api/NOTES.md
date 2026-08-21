# Submission Notes

## What I'd test next if I had more time

- **Concurrent writes** — the in-memory store is a plain array with no locking.
  Two simultaneous `POST /tasks` requests could race and corrupt state. I'd write
  async concurrency tests to surface this.

- **Pagination edge cases** — what happens with `page=0`, `page=-1`, `limit=0`,
  or `limit=9999`? Currently the API doesn't validate these values and will
  silently return unexpected results.

- **`GET /tasks?status=` with an invalid status value** — right now passing
  `?status=banana` returns an empty array with a 200. It might be cleaner to
  return a 400 with a helpful error message, similar to how `POST` validates status.

- **`dueDate` edge cases** — boundary conditions like a due date of exactly "now",
  tasks created with `dueDate` in the past, and timezone handling in the overdue
  count.

- **The error-handler middleware in `app.js`** — the global 500 handler is never
  exercised by any test. I'd add a test that forces a thrown error through a route
  to confirm it returns `{ error: 'Internal server error' }`.

---

## What surprised me in the codebase

The most surprising thing was **Bug 3 — `completeTask` silently resetting priority
to `'medium'`**. It's the kind of bug that would be nearly invisible in manual
testing because you'd naturally test completing a medium-priority task. A high-
priority task losing its priority after being marked done is a real data-integrity
issue that would be very confusing in production.

The pagination bug (Bug 2) also stood out — `page=1` returning the *second* page
is a classic off-by-one, but because the default is `|| 1` in the route and `0`
would be the correct 0-based first page, it means page 0 and page 1 return the
same results while the last page is unreachable.

---

## Questions I'd ask before shipping to production

1. **Persistence** — the in-memory store resets on every restart. Is that
   intentional for this stage, or do we need a database before going live? If
   so, which one (Postgres, MongoDB)? The service layer is clean enough to swap
   in a real DB adapter, but that's a significant change.

2. **Authentication & authorisation** — any user can currently update, delete,
   or complete any task. Is there a concept of ownership? Should `PATCH /:id/assign`
   be restricted to certain roles?

3. **Input size limits** — there's no cap on title or description length. A
   1 MB title would be accepted today. Should we add `express-validator` or a
   schema library like Zod to enforce limits?

4. **Pagination defaults** — the default `limit` is 10 and default `page` is 1,
   but these are undocumented. What are the agreed-upon maximums? Letting a client
   pass `limit=100000` could be a DoS vector once real data is involved.

5. **Error response shape** — some errors return `{ error: "..." }` and that's
   consistent, but there's no HTTP status code inside the body, no error code
   enum, and no request-id for tracing. Worth aligning on a standard error
   contract before other teams start consuming this API.