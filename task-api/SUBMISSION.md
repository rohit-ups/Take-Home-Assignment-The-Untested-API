
## What I'd Test Next

If I had more time I'd focus on:
- **Load testing** — the in-memory array has no size limit, so I'd test 
  how the API behaves under a large number of tasks (1000+) and whether 
  pagination holds up under stress
- **Concurrent requests** — since JavaScript is single-threaded but async, 
  I'd test whether two simultaneous POST requests with the same title and 
  dueDate could both slip past the duplicate check
- **Edge cases on the assign endpoint** — specifically what happens when 
  you try to assign a task that has already been marked as done

---

## What Surprised Me in the Codebase

A few things stood out:
- The `completeTask()` function silently resets priority to `"medium"` 
  regardless of the original value — this looked intentional at first 
  but is almost certainly a bug
- The `getPaginated()` offset used `page * limit` instead of 
  `(page - 1) * limit`, meaning page 1 always skipped the first set 
  of results and the true first page was never accessible
- The `getByStatus()` filter used `.includes()` instead of strict 
  equality, so querying `?status=do` would return both `todo` and 
  `done` tasks

---

## Questions I'd Ask Before Shipping to Production

- **Persistence** — the data lives in memory and resets on every server 
  restart. Is a database like PostgreSQL or MongoDB planned, or is this 
  intentionally ephemeral?
- **Authentication** — there's no auth layer. Should endpoints be 
  protected? Who is allowed to assign, complete, or delete tasks?
- **Assignee as a string vs a user reference** — right now assignee is 
  a free-text name. Should it reference an actual user ID from an auth 
  system instead?
- **Concurrent write safety** — if two requests hit the server at the 
  same time, can the duplicate check be bypassed due to a race condition?
- **Rate limiting** — should the API have rate limiting before going live 
  to prevent abuse?