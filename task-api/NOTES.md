## Submission Notes

**What I'd test next if I had more time:**
Load/stress testing the pagination endpoint now that the offset bug is fixed,
since the original bug would have gotten worse under high traffic. I'd also
add tests for edge cases like `limit=0`, negative page numbers, and
non-numeric `page`/`limit` query values — right now these get silently
coerced via `parseInt(...) || 1` rather than validated, which could hide bad
input instead of rejecting it clearly.

**What surprised me in the codebase:**
The `completeTask` bug was the most interesting one — it wasn't an obvious
typo, it was a deliberate-looking line (`priority: 'medium'`) that silently
overwrote a task's real priority every time it was marked done. It's the kind
of bug that's easy to miss just by reading the code, but jumps out
immediately once you write a test that checks the value survives. It also
made me realize how much of debugging is just "read the actual error
message carefully" rather than guessing — I ran into this literally, with
real errors along the way (a broken `uuid` dependency version, PowerShell
quoting issues with curl, files created in the wrong folder), and each one
was solved by reading the exact error text rather than assuming.

**Questions I'd ask before shipping to production:**
1. Is the `completeTask` priority reset intentional, or genuinely a bug? (I
   fixed it as a bug, but wanted to flag that the line looked deliberate,
   not like a copy-paste mistake.)
2. Should the `getByStatus` filter validate against the status enum the same
   way `POST`/`PUT` bodies do, instead of silently substring-matching on
   whatever string is passed in?
3. Is a `GET /tasks/:id` route needed before shipping? Right now there's no
   way to fetch a single task directly by id.