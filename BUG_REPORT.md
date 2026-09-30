# Bug Report

This document outlines the bugs discovered during testing of the Task Manager API on Day 1.

## Bug 1: Status filtering uses substring matching

*   **Expected behavior**: Filtering by status (e.g., `GET /tasks?status=do`) should only match tasks where the status is an exact string match (e.g., `do`). It should not match `todo` or `done`.
*   **Actual behavior**: The `getByStatus` function uses a substring search. Passing `do` returns both `todo` and `done` tasks.
*   **How it was discovered**: I wrote unit and integration tests that supplied a partial string (`do`) and expected `0` results, but received `2`.
*   **Proposed fix**: In `src/services/taskService.js`, change `task.status.includes(status)` to strict equality `task.status === status`.

## Bug 2: Pagination calculation is incorrect

*   **Expected behavior**: When requesting paginated results (e.g., `page=1&limit=2`), the API should return the first 2 tasks (index 0 and 1). Page 2 should return the next 2 tasks (index 2 and 3).
*   **Actual behavior**: The API skips or duplicates items because the starting index and ending index math is flawed.
*   **How it was discovered**: I wrote a suite of pagination tests expecting specific sequence of tasks per page, but the wrong tasks were returned.
*   **Proposed fix**: Calculate the starting index as `const startIndex = (page - 1) * limit;` and end index as `const endIndex = startIndex + limit;` in `getPaginated()`.

## Bug 3: Protected fields can be overwritten during update

*   **Expected behavior**: Users should not be able to change system-managed fields like `id` and `createdAt` through the `PUT /tasks/:id` endpoint.
*   **Actual behavior**: The `update()` method directly merges the provided updates with the existing task, allowing a malicious user to overwrite any field.
*   **How it was discovered**: Added a test passing `{ id: "hacked-id" }` in the update payload, and observed that the task's ID actually changed.
*   **Proposed fix**: Before merging the objects, strip protected fields out of the `updates` object, or explicitly pick only the fields allowed to be updated.

## Bug 4: Completing a task silently resets priority

*   **Expected behavior**: The `PATCH /tasks/:id/complete` endpoint should mark the status as `done` and set `completedAt`, but preserve all other fields.
*   **Actual behavior**: The task's `priority` is unexpectedly reset to `medium`, regardless of what it was before.
*   **How it was discovered**: I wrote a test creating a `high` priority task, completed it, and asserted that priority was still `high`. The test failed, showing it was now `medium`.
*   **Proposed fix**: Remove `priority: 'medium'` from the update payload within the `completeTask` function in `taskService.js`.
