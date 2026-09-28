# Notes

## What I'd test next

A property test on pagination — the concatenation of all pages must equal the full
task list, with no gaps or duplicates. I checked this claim rather than asserting it:
that single property returns 3 items short at every size I tried against the original
code, and holds exactly on the fixed code, so it would have caught Bug 1 outright and
would catch any future regression in the offset maths. After that I'd want concurrency
and duplicate-submission tests (two simultaneous `POST /tasks`, or a client retrying
after a timeout), and a real persistence layer — the in-memory store means
missing-row and concurrent-write semantics are entirely untested.

## Anything that surprised me

Completing a task silently downgraded its `priority` to `medium` (Bug 4) — a single
stray property in the update object, and nothing in the endpoint name hints that it
touches priority. Worse, `PUT` could rewrite a task's own `id` (Bug 5), after which
the task was permanently unreachable through its own URL. The most instructive one was
Bug 1: the route treated pages as 1-based and the service treated them as 0-based.
Two individually reasonable lines disagreeing across a boundary is exactly what unit
tests on each side in isolation miss. One thing that is *not* broken, and I checked
it specifically because it looks broken: the truthiness guard on `dueDate` in
`validators.js` is what allows `null` to clear a date — it's recorded in `DAY1.md` so
the next reader doesn't "fix" it.

## Questions I'd ask before shipping to production

Is `limit=0` a `400` or "use the default"? It silently returns 10 today, which I
flagged but deliberately left alone because it's a product decision. Should an unknown
`?status=` be a `400`? Today it returns `[]`, indistinguishable from a genuinely empty
project, so a client typo looks like "no work". Should `PUT` be a full replace rather
than a merge — right now you cannot clear a field by omitting it, and the `id`
overwrite is best blocked at the service layer. And the bigger ones: what are the auth
and rate-limit stories, neither of which exists, and is there an unassign operation
given that the new endpoint rejects an empty assignee?
