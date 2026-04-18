# Bug Report

The issues below were identified while writing the service and API tests in `task-api/tests/`.

## 1. Pagination skipped the first page of results

- Location: `task-api/src/services/taskService.js:11-13`
- Expected behavior: `GET /tasks?page=1&limit=2` should return the first two tasks.
- Actual behavior: page 1 returned tasks starting at index 2, so the first page skipped the earliest results.
- How I discovered it: the regression tests in `tests/taskService.test.js` and `tests/tasks.routes.test.js` both failed when asserting that page 1 should contain the first created tasks.
- Why it happened: the pagination offset used `page * limit` instead of `(page - 1) * limit`.
- Fix: updated the offset calculation to `(page - 1) * limit`.
- Status: fixed.

## 2. Status filtering matched partial strings

- Location: `task-api/src/services/taskService.js:9`
- Expected behavior: filtering with `status=todo` should only return tasks whose status is exactly `todo`.
- Actual behavior: filtering used `String.prototype.includes`, so partial strings like `progress` matched `in_progress`.
- How I discovered it: a service-level characterization test showed `getByStatus('progress')` incorrectly returning `in_progress` tasks.
- Why it happened: the filter compared by substring rather than strict equality.
- Fix: changed the comparison to `t.status === status`.
- Status: fixed.

## 3. Completing a task reset its priority

- Location: `task-api/src/services/taskService.js:75-79`
- Expected behavior: marking a task complete should update its status and completion timestamp without changing unrelated fields like priority.
- Actual behavior: `completeTask` forced `priority` to `'medium'`, overwriting the task's existing value.
- How I discovered it: both the service and route tests for `PATCH /tasks/:id/complete` failed when a high-priority task came back as medium priority after completion.
- Why it happened: the completion logic rebuilt the task and hard-coded a new priority value.
- Fix: removed the priority overwrite and preserved the task's current priority.
- Status: fixed.
