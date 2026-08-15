# Bug Report

## Bug 1: Completing a task did not preserve priority

### Expected Behavior
When a task is marked as completed, its status should change to `done` and its existing priority should remain unchanged.

### Actual Behavior
The task priority was changed from its original value to `medium` when completing the task.

### How It Was Discovered
An integration test was added for:

`PATCH /tasks/:id/complete`

The test created a task with `priority: "high"` and then completed it. The test initially received `"medium"` instead of `"high"`.

### Fix
Updated the task completion logic so that it changes only the status and `completedAt` fields while preserving the existing task properties.