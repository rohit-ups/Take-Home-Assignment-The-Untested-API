# BUG_REPORT.md

# Bug Report

## Project

**Task Manager API**

---

# Bug 1 – Incorrect Pagination Offset

## Severity

**High**

---

## Description

The pagination logic in `taskService.js` calculated the starting index incorrectly. This caused the API to skip the first set of records whenever the first page was requested.

---

## Location

```
src/services/taskService.js
```

Original implementation:

```javascript
const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
};
```

---

## Expected Behaviour

For the request

```
GET /tasks?page=1&limit=2
```

the API should return:

```
Task A
Task B
```

which are the first two tasks.

The formula should calculate:

```
offset = (page - 1) × limit
```

Example:

```
page = 1
limit = 2

offset = (1 - 1) × 2

offset = 0
```

Therefore the API should return

```
tasks[0]
tasks[1]
```

---

## Actual Behaviour

The code calculated

```
offset = page × limit
```

Example

```
page = 1
limit = 2

offset = 2
```

Therefore the API returned

```
tasks[2]
tasks[3]
```

instead of the first page.

The first two tasks were skipped completely.

---

## Impact

Users requesting the first page never receive the earliest tasks.

Every page after that is shifted incorrectly, resulting in inconsistent pagination.

Applications depending on pagination (front-end tables, infinite scrolling, mobile apps) would display incorrect data.

---

## How the Bug Was Discovered

A unit test was written for the pagination function.

Test:

```javascript
const tasks = taskService.getPaginated(1, 2);

expect(tasks[0].title).toBe("A");
expect(tasks[1].title).toBe("B");
```

The test failed because the returned data began with later tasks instead of the expected first page.

The same issue was reproduced through an integration test using

```
GET /tasks?page=1&limit=2
```

---

## Root Cause

Incorrect mathematical calculation of the pagination offset.

The implementation assumed page numbers started from zero.

The API, however, expects page numbering to start from one.

---

## Fix

Changed

```javascript
const offset = page * limit;
```

to

```javascript
const offset = (page - 1) * limit;
```

---

## Verification

After the fix:

* Unit tests passed.
* Integration tests passed.
* Pagination returned the expected tasks for page 1, page 2, and later pages.

---

# Bug 2 – Completing a Task Resets Priority

## Severity

**Medium**

---

## Description

The `completeTask()` function unexpectedly modified the task priority when marking a task as completed.

Completing a task should only update completion-related information.

Priority should remain unchanged.

---

## Location

```
src/services/taskService.js
```

Original code

```javascript
const updated = {
    ...task,
    priority: "medium",
    status: "done",
    completedAt: new Date().toISOString(),
};
```

---

## Expected Behaviour

When a task is completed

```
PATCH /tasks/:id/complete
```

the API should update only

```
status

completedAt
```

All other task properties should remain unchanged.

Example

Before

```json
{
    "priority":"high",
    "status":"todo"
}
```

After

```json
{
    "priority":"high",
    "status":"done"
}
```

---

## Actual Behaviour

The API changed

```
priority = "high"
```

to

```
priority = "medium"
```

even though the request never asked to modify the priority.

---

## Impact

Users lose the original priority assigned to a task.

Any workflow that relies on task priority becomes inaccurate.

Historical information about task urgency is lost after completion.

---

## How the Bug Was Discovered

A unit test was written to ensure that completing a task does not modify unrelated fields.

Test

```javascript
const completed = taskService.completeTask(task.id);

expect(completed.priority).toBe("high");
```

Before fixing the bug, the test failed because the returned priority became

```
medium
```

instead of

```
high
```

---

## Root Cause

The service manually assigned

```javascript
priority: "medium"
```

during task completion.

This assignment was unrelated to completing a task and unintentionally overwrote existing data.

---

## Fix

Removed

```javascript
priority: "medium"
```

from the updated task object.

The completion endpoint now modifies only

```
status

completedAt
```

---

## Verification

After the fix

* Existing priority remains unchanged.
* Status changes to "done".
* completedAt is populated correctly.
* All related unit and integration tests pass.

---

# Testing Summary

The bugs were identified using automated tests rather than manual inspection.

Tests written included

* Unit tests for service functions
* Integration tests for API endpoints
* Validation tests
* Edge-case tests
* Pagination tests
* Completion tests

These tests successfully exposed hidden implementation defects before deployment.

---

# Overall Result

Both issues have been resolved.

After implementing the fixes:

* All automated tests pass.
* Pagination behaves correctly.
* Task completion preserves existing task priority.
* API behaviour matches the expected specification.
* Overall test coverage exceeds the required threshold.
