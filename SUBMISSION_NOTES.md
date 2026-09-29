# Submission Notes

## What I'd test next with more time

- **Concurrency tests** — the in-memory store has no locking; simultaneous requests could race
- **Input fuzzing** — very long strings, unicode, special characters in title/assignee
- **Pagination edge cases** — negative page numbers, zero limit, very large page values
- **Status transition validation** — e.g., should you be able to set status back from 'done' to 'todo'? Should `completedAt` be cleared?
- **Load testing** — how does the in-memory store perform with thousands of tasks?

## What surprised me

- The `completeTask` method silently resetting priority to `'medium'` — this is the kind of "helpful" side effect that causes production bugs because it's invisible to the caller
- The pagination off-by-one was subtle — `page * limit` instead of `(page - 1) * limit` — the kind of bug that passes a quick manual check (you get *results*, just the wrong ones) but breaks real pagination
- The `update` method using a blind spread (`{ ...tasks[index], ...fields }`) allowing `id` and `createdAt` to be overwritten — a data integrity issue that could corrupt references

## Questions I'd ask before shipping

1. **Should `assignee` be a free string or reference a user system?** If there's a user store, we should validate the assignee exists.
2. **Should completing an already-completed task be idempotent or return an error?** Currently it re-sets `completedAt` and overwrites it.
3. **Should `update` allow changing `status` to/from `'done'` without managing `completedAt`?** There's an inconsistency: `completeTask` sets `completedAt`, but `update` can set `status: 'done'` without it.
4. **Is there a soft-delete requirement?** Currently `DELETE` is hard — should there be an audit trail?
5. **What's the expected behavior for pagination beyond the last page?** Currently returns an empty array — should it return 422 or a custom response?
