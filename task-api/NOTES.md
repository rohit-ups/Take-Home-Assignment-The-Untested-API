# Submission notes

**What I'd test next with more time**
- Concurrency: the store is a plain in-memory array with no locking; two near-simultaneous writes to the same task (e.g. `PUT` racing `PATCH /complete`) aren't tested.
- Unicode/very-long `title` and `description` values, and whether trimming should apply to `title` the same way it now does to `assignee`.
- `GET /tasks/stats` when `dueDate` is an invalid-but-parseable edge case (e.g. far-future or far-past dates, timezone edge cases around "now").
- Load/perf behaviour once the array holds thousands of tasks, since `getByStatus`/`getPaginated`/`getStats` are all O(n) full scans with no indexing.

**What surprised me**
- The README and `ASSIGNMENT.md` disagree on the status enum (`pending/in-progress/completed` vs. `todo/in_progress/done`) — the code uses the latter, so this is really a docs bug, not a code bug, but worth flagging since it'd trip up an API consumer reading only the README.
- Several bugs (priority reset on complete, substring status filter) are easy to miss by reading the code casually — they only surfaced once I wrote tests that pinned down *exact* expected values instead of just checking "does this endpoint return 200."

**What I'd ask before shipping this to production**
- Is persistence (a real DB) already planned, or is in-memory intentional for this stage? Everything above assumes a single server instance — no horizontal scaling story yet.
- What's the intended behavior when a task is completed via `PUT` vs. only via the dedicated `/complete` endpoint (BUG-8) — is `PUT` supposed to be able to set `status: 'done'` at all?
- Is there an actual user/auth model coming, or is `assignee` meant to stay a free-text name indefinitely?

**Design decisions for `PATCH /tasks/:id/assign`**
- `assignee` must be a non-empty string after trimming (rejects `""`, whitespace-only, `null`, numbers, arrays/objects) — mirrors the existing `title` validation pattern in `validators.js`.
- Capped at 100 characters to avoid using the field to smuggle oversized payloads.
- Re-assigning an already-assigned task is allowed and just replaces the assignee — treated as a normal "reassign" workflow rather than an error; assigning the same person twice is idempotent (200, no error).
- 404 (not 400) when the task id doesn't exist, matching the existing pattern used by `PUT`/`DELETE`/`/complete`.
- Assigning doesn't touch any other field (status, priority, completedAt) — verified with a dedicated test.
