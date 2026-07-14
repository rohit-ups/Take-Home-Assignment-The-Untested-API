# Bug Report – Task Manager API

**Author:** Himesh
**Date:** 2026-07-15

## Overview

While writing unit and integration tests for the Task Manager API, I identified several issues related to pagination, task filtering, and task completion. The bugs below were discovered through a combination of code review and automated testing.

---

## Summary

| Bug                                      | Severity | Status  |
| ---------------------------------------- | -------- | ------- |
| Pagination offset calculation            | Critical | Fixed   |
| Status filtering uses substring matching | Medium   | Fixed   |
| Task completion resets priority          | Medium   | Fixed   |

---

# Bug #1 – Pagination Returns Incorrect Results

**Severity:** Critical

## Expected Behavior

Pagination should treat the `page` parameter as **1-indexed**.

Example:

```
GET /tasks?page=1&limit=5
```

should return the first five tasks.

---

## Actual Behavior

The pagination offset was calculated using:

```javascript
const offset = page * limit;
```

As a result:

| Request         | Expected Items | Actual Items |
| --------------- | -------------- | ------------ |
| page=1, limit=5 | 1–5            | 6–10         |
| page=2, limit=5 | 6–10           | 11–15        |

Every paginated request skipped the first page of results.

---

## How It Was Discovered

While writing pagination tests, the first task returned for page 1 did not match the expected data. Reviewing the pagination logic revealed an incorrect offset calculation.

---

## Fix

Changed:

```javascript
const offset = page * limit;
```

to:

```javascript
const offset = (page - 1) * limit;
```

---

## Test Coverage

Verified by:

* Unit tests for `taskService.getPaginated()`
* Integration tests for `GET /tasks?page=&limit=`

---

# Bug #2 – Status Filtering Used Substring Matching

**Severity:** Medium

## Expected Behavior

Filtering tasks by status should return only tasks whose status exactly matches the requested value.

Example:

```
GET /tasks?status=todo
```

should only return tasks with status `"todo"`.

---

## Actual Behavior

The filtering logic used substring matching.

Example:

```
GET /tasks?status=do
```

incorrectly returned tasks whose status was `"done"`.

---

## How It Was Discovered

A unit test querying `"do"` unexpectedly matched `"done"` tasks. Code review showed that the implementation used `String.prototype.includes()` instead of strict equality.

---

## Fix

Changed:

```javascript
task.status.includes(status)
```

to:

```javascript
task.status === status
```

---

## Test Coverage

Verified by:

* Unit tests for `taskService.getByStatus()`
* Integration tests for `GET /tasks?status=`

---

# Bug #3 – Completing a Task Reset Priority

**Severity:** Medium

## Expected Behavior

Completing a task should only update:

* `status`
* `completedAt`

All other task properties should remain unchanged.

---

## Actual Behavior

Completing a task overwrote the existing priority, causing a task marked as `"high"` priority to become `"medium"` after completion.

This resulted in unintended modification of task data unrelated to completion.

---

## How It Was Discovered

A unit test created a high-priority task, completed it, and verified that the priority should remain unchanged. The test exposed the issue during implementation.

---

## Fix

Updated the completion logic to preserve all existing task properties and modify only:

* `status`
* `completedAt`

The original priority is now retained after task completion.

---

## Test Coverage

Verified by:

* Unit tests for `taskService.completeTask()`
* Integration tests for `PATCH /tasks/:id/complete`

---

# Conclusion

Automated testing helped uncover issues that were not immediately visible during manual inspection. These tests now serve as regression tests to ensure that the corrected behavior remains intact in future changes.

The identified issues have been documented, reproduced through automated tests, and fixed as part of this submission.
