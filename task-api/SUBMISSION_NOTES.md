# Submission Notes

## New assign route decisions

- `assignee` must be a real name (not empty). Extra spaces are trimmed.
- You can change the assignee later. The route always returns the updated task.
- The task stores `assignee` and starts as `null` when created.

## What I would test next

- Two requests at the same time (for example: update and complete).
- Very long titles/descriptions and very large `page`/`limit` values.
- Make sure `completedAt` is set when a task is set to `done` using `PUT`.

## Anything that surprised me

- The README used different status names than the code.
- Pagination was off by one because of the math.

## Questions before shipping

- Should `PUT /tasks/:id` replace the whole task, or only the fields sent?
- Should changing assignee be allowed, or should it fail if already assigned?
- Should we block moving from `done` back to `in_progress`?
