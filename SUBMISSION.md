# Submission Notes

## Coverage Summary

All 32 tests pass. Here's the final coverage output:

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.26 |    84.88 |   93.33 |    93.70 |
 src             |   69.23 |    75.00 |    0.00 |   69.23 | 10-11,17-18
  app.js         |   69.23 |    75.00 |    0.00 |   69.23 | 10-11,17-18
 src/routes      |  100.00 |    91.66 |  100.00 |  100.00 |
  tasks.js       |  100.00 |    91.66 |  100.00 |  100.00 | 21-23
 src/services    |  100.00 |    94.73 |  100.00 |  100.00 |
  taskService.js |  100.00 |    94.73 |  100.00 |  100.00 | 22
 src/utils       |   81.48 |    76.92 |  100.00 |   81.48 | 9,15,25,28,31
  validators.js  |   81.48 |    76.92 |  100.00 |   81.48 | 9,15,25,28,31
-----------------|---------|----------|---------|---------|-------------------
```

The lower coverage in `app.js` is expected — those uncovered lines are the `app.listen` block that only runs when the file is invoked directly, not during testing. The gap in `validators.js` is a few defensive branches (e.g. `dueDate` validation) that aren't exercised by the current test suite.

---

## Bugs Found and Fixed

All three bugs from the bug report were fixed. A quick summary:

- **Partial status matching** — `getByStatus` used `.includes()` instead of `===`, so searching for `"do"` would match both `"todo"` and `"done"`. Fixed with an exact equality check.
- **Priority reset on complete** — `completeTask` was hardcoding `priority: 'medium'` in the returned object, silently overwriting whatever priority the task had. Removed that line.
- **Page 0 treated as page 1** — The route used `parseInt(page) || 1`, and since `0` is falsy, page 0 defaulted to page 1. Fixed by checking `isNaN` explicitly instead of relying on truthiness.

See [BUG_REPORT.md](./BUG_REPORT.md) for the full breakdown including where each bug lives in the code and what the fix looks like.

---

## The Assign Endpoint

`PATCH /tasks/:id/assign` accepts `{ "assignee": "string" }` and stores it directly on the task object.

A few decisions worth noting:

**Validation:** I required `assignee` to be a non-empty string. An empty string or a missing field returns a 400. I didn't validate against a list of known users — since there's no user table, that would require assumptions about architecture that aren't in scope here.

**Overwriting:** Re-assigning a task to someone new just overwrites the current `assignee`. There's no history or ownership check. That felt right for a simple task manager — if you want to reassign it, you reassign it.

**Field placement:** The `assignee` field is stored alongside the other task fields and returned in the response. It wasn't in the original task shape, so it won't appear on tasks that haven't been assigned yet (it'll just be absent rather than `null`). A production version might want to initialize `assignee: null` in `create()` for consistency.

---

## What I'd Test Next With More Time

- **Boundary conditions on pagination** — what happens with `limit=0`, `limit=999999`, or `page=-1`? The service would behave oddly and there are no guards for it.
- **Validator edge cases** — the `dueDate` validation branches in `validators.js` aren't fully covered. I'd add tests for things like `dueDate: "not-a-date"` or `dueDate: 12345` (a number, not a string).
- **Concurrency / ordering guarantees** — the in-memory store is a plain array. In a real environment you'd want tests that verify behavior under concurrent writes, but that's more relevant once there's a real database behind it.

---

## Surprises in the Codebase

The priority override in `completeTask` was the most surprising thing. It wasn't obviously intentional — there's no comment explaining why completing a task would reset priority to medium, and it's the kind of silent data mutation that's easy to miss in manual testing. It would only surface once you actually checked the priority field after completion, which you'd only do if you thought to test it. That's exactly the kind of bug that a test suite catches.

I also appreciated the `require.main === module` guard in `app.js`. It's a small thing, but it makes the app cleanly importable by tests without accidentally starting a server on port 3000 every time a test file loads.

---

## Questions Before Shipping to Production

- **What database are we targeting?** The in-memory store means all data disappears on restart. The schema (UUIDs, ISO dates, status enum) would map to Postgres reasonably well, but `assignee` and `status` would want indexes if we're filtering on them at scale.
- **Should `assignee` map to real users?** Right now it's a free-text string. If this connects to an auth system, you'd want to validate against actual user IDs and handle cases like "assigned user's account is deleted."
- **Is there any rate limiting?** The API currently has no throttling. A client could hammer `POST /tasks` indefinitely. Worth adding `express-rate-limit` before putting this in front of real traffic.
