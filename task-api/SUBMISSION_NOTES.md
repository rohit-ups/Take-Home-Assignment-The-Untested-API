# Submission Notes

## What I'd test next with more time

- Concurrent writes: the in-memory store is a plain array with no locking, so
  two requests racing to update/delete the same task could interleave
  unexpectedly. Worth a test once there's any async work in the write path.
- `getStats` with malformed `dueDate` values that somehow got past creation
  (e.g. if Bug #4 were exploited to inject one via `PUT`).
- Load/shape tests for very large task lists (pagination performance,
  `getAll()`'s `[...tasks]` copy cost).
- Assign endpoint: whether `assignee` should eventually validate against a
  real list of known users rather than accepting any string.

## What surprised me

- `completeTask` resetting `priority` to `'medium'` (Bug #3) was the most
  surprising — it's the kind of bug that's easy to miss by hand-testing (you
  don't usually check priority right after completing a task) but would show
  up immediately once someone starts asserting on the full response shape in
  tests.
- The pagination bug (Bug #2) was subtle: `page=1` "worked" in the sense of
  not erroring and returning a plausible-looking page of results, it just
  wasn't the *first* page. That's the kind of bug that survives casual manual
  testing.

## Questions I'd ask before shipping this to production

- Is the in-memory store intentional for now (early prototype), or is a real
  database already planned? That changes how much effort is worth investing
  in things like the field-allowlist fix for Bug #4.
- Should `assignee` reference a real user (e.g. a user ID with a lookup),
  rather than accepting an arbitrary free-text string?
- Is there an expected authentication/authorization layer coming? Right now
  any caller can complete, delete, or reassign any task.
