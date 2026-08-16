# Bug Report

## 1. Incorrect pagination offset

### Expected behavior
`GET /tasks?page=1&limit=10` should return the first 10 tasks, and `page=2` should return tasks 11 through 20.

### Actual behavior
The first page returned tasks 11 through 20, while the second page started at task 21.

### How it was discovered
Unit and integration tests were written for pagination using the expected page-numbering behavior. Both tests failed.

### Cause
The pagination offset was calculated as:

```js
const offset = page * limit;
```

This skips the first `limit` items when `page` is 1.

### Fix
The offset was changed to:

```js
const offset = (page - 1) * limit;
```

---

## 2. Completing a task unexpectedly changed its priority

### Expected behavior
Marking a task as complete should change its status to `done` and set `completedAt`, while preserving existing task properties such as `priority`.

### Actual behavior
Completing a high-priority task silently changed its priority to `medium`.

### How it was discovered
Unit and API integration tests created a high-priority task, completed it, and verified that the priority was preserved. Both failed.

### Cause
`completeTask()` explicitly set:

```js
priority: 'medium',
```

on every completion, regardless of the task's existing priority.

### Fix
The hard-coded priority assignment was removed so the existing priority is preserved.

---

## Notes on behavior left unchanged (documented, not fixed)

These were flagged during testing but are debatable product decisions rather than clear-cut bugs, so they were left as-is:

- **`getByStatus` uses substring matching (`String.includes()`)** rather than exact equality, so a query for `"in"` also matches `"in_progress"`.
- **The `status` query param on `GET /tasks` is not validated** against the known status values — an unrecognized status returns `200` with an empty array instead of a `400`.
- **`page=0` is silently coerced to `page=1`** because `parseInt(page) || 1` treats `0` as falsy.