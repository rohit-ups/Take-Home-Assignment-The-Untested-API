# Submission Notes

- **Repository:** https://github.com/Vipash/Take-Home-Assignment-The-Untested-API/tree/submission
- **Live API:** https://api-submission.onrender.com/tasks/stats
- **Test Results:** 37 passed, 0 failed (94.87% statement coverage)

## What I'd test next
- Combining `status` with `page` and `limit`. That's Bug 4, which I documented but didn't fix.
- Bad inputs like `?page=abc` or `?page=0`.
- Whether `PUT /tasks/:id` lets someone overwrite fields like `id` or `createdAt`.

## What surprised me
- `completeTask` was resetting priority to "medium" every time, which quietly loses data.
- The README lists statuses as `pending | in-progress | completed`, but the code and ASSIGNMENT.md use `todo | in_progress | done`.

## Questions before production
- Tasks live in memory and disappear on restart. What database should we use?
- There's no authentication. Who should be allowed to view or change a task?
- Should assignee be free text, or checked against a real list of users?

## A note on AI use
I used AI to help draft tests and review the code. I ran everything myself, read each failure, and can explain each fix.