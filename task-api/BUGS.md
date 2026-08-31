# Bug Report

## BUG-001 — Pagination starts from the wrong offset

### Location

`src/services/taskService.js` — `getPaginated()`

### Expected behavior

For page-based pagination, page 1 should return the first `limit` tasks.

For example:

* `page=1&limit=2` → tasks 1–2
* `page=2&limit=2` → tasks 3–4

### Actual behavior

The implementation calculates the offset as:


const offset = page * limit;


For `page=1&limit=2`, this produces an offset of `2`, causing the first page to start with the third task.

### How it was discovered

A unit test called:


taskService.getPaginated(1, 2)


after creating three tasks and expected the first two tasks. The test instead received only the third task.

The same behavior was reproduced through the integration test API using:

http
GET /tasks?page=1&limit=2


### Root cause

The pagination calculation treats the page number as zero-based, while the API uses page numbers starting at 1.

### Fix

Change the offset calculation to:


const offset = (page - 1) * limit;


A regression test will verify that page 1 starts with the first task.

---

## BUG-002 — Status filtering performs partial matching

### Location

`src/services/taskService.js` — `getByStatus()`

### Expected behavior

A status filter should match the requested task status exactly.

For example:

text
status=todo


should return tasks whose status is exactly `todo`.

A value such as `progress` should not match `in_progress`.

### Actual behavior

The implementation uses:


t.status.includes(status)


As a result:


"in_progress".includes("progress")


evaluates to `true`.

Therefore, requesting `progress` returns tasks with status `in_progress`.

### How it was discovered

A unit test created an `in_progress` task and called:


taskService.getByStatus("progress")


The test expected an empty array but received the `in_progress` task.

The same behavior was reproduced through integration testing:

http
GET /tasks?status=progress


### Root cause

`String.prototype.includes()` performs substring matching rather than exact status comparison.

### Proposed fix

Use an exact strict comparasion operator:

js
t.status === status


This bug was identified and documented but was not selected as the bug to fix for this assignment.

---

## BUG-003 — Completing a task changes its priority

### Location

`src/services/taskService.js` — `completeTask()`

### Expected behavior

Completing a task should change its completion state only and not its priority.

For example, a high-priority task should remain high priority after completion.

### Actual behavior

The implementation  sets:

js
priority: 'medium'


when completing a task.

Therefore:

text
high → medium


when the task is completed.

### How it was discovered

A test created a task with:

js
priority: "high"


and then called `completeTask()`.

The test expected the priority to remain `high`, but the returned task had priority `medium`.

The same behavior was reproduced through:

http
PATCH /tasks/:id/complete


### Root cause

`completeTask()` overwrites the existing priority instead of preserving it.

### Proposed fix

Remove the priority assignment from the completion update so that the existing priority is preserved.

This bug was identified and documented but was not selected as the bug to fix for this assignment.

---

## Selected Fix

BUG-001 (pagination) was selected because it is a clear off-by-one error in the pagination calculation and has a straightforward, isolated fix.

The fix will be accompanied by the existing failing unit and integration tests, which will act as regression tests.
