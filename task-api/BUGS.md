# Bug Report

## Bug 1 — Pagination skips the first page of tasks

### Expected behavior

When requesting page 1 with a limit of 2, the API should return the first two tasks.

For example:

- Page 1 → Task 1, Task 2
- Page 2 → Task 3, Task 4

### Actual behavior

The pagination logic calculates the offset as:

`page * limit`

For page 1 with a limit of 2, this results in an offset of 2, so the first page incorrectly returns Task 3 and Task 4.

For page 2 with a limit of 2, the offset becomes 4, which results in an empty array when only four tasks exist.

### How I discovered it

I wrote unit tests for `getPaginated()` that created four tasks and verified the expected results for page 1 and page 2.

The tests failed with:

- Page 1 expected Task 1 but received Task 3.
- Page 2 expected two tasks but received an empty array.

This showed that the pagination offset calculation was incorrect.

### Suggested fix

The offset should be calculated using:

`(page - 1) * limit`

This makes page 1 start at index 0 and page 2 start at the correct index.


## Bug 2 — Completing a task unexpectedly changes its priority

### Expected behavior

Completing a task should change its status to `done` and set `completedAt`, while preserving the task's existing priority.

For example, a high-priority task should remain high priority after it is completed.

### Actual behavior

When a task is completed, its priority is always changed to `medium`, regardless of its previous priority.

For example:

- Before completion: `priority = high`
- After completion: `priority = medium`

### How I discovered it

I wrote a unit test that created a high-priority task, completed it, and verified that its priority remained `high`.

The test failed with:

`Expected: "high"`
`Received: "medium"`

This showed that `completeTask()` was modifying the priority unexpectedly.

### Suggested fix

Remove the `priority: 'medium'` assignment from `completeTask()` so that the existing priority is preserved when the task is completed.