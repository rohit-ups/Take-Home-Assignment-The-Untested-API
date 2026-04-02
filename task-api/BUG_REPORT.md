# Bug Report — Task Manager API

---

## Bug 1 — `getByStatus` uses substring matching instead of exact match

**File:** `src/services/taskService.js` — `getByStatus` function

**Expected behavior:**
`GET /tasks?status=todo` should return only tasks whose status is exactly `"todo"`.

**What actually happens:**
The function uses `.includes()` for matching:
```js
tasks.filter((t) => t.status.includes(status))
```
`.includes()` on a string does substring matching, not exact matching.
So searching for `"tod"` returns tasks with status `"todo"` because `"todo"` contains `"tod"`.

**How discovered:**
Unit test in `tests/taskService.test.js`:
```
getByStatus › does not return tasks with partially matching status
Expected length: 0, Received length: 1
```

**Fix:**
Change `.includes()` to strict equality:
```js
// Before
tasks.filter((t) => t.status.includes(status))

// After
tasks.filter((t) => t.status === status)
```

---

## Bug 2 — `getPaginated` uses wrong offset formula

**File:** `src/services/taskService.js` — `getPaginated` function

**Expected behavior:**
`GET /tasks?page=1&limit=10` should return the first 10 tasks.
`GET /tasks?page=2&limit=10` should return tasks 11–20.

**What actually happens:**
The offset is calculated as:
```js
const offset = page * limit;
```
This means page 1 with limit 10 skips the first 10 items (offset = 10),
so users can **never see the first page of results**. Every page is shifted by one.

| page | limit | current offset | correct offset |
|------|-------|---------------|----------------|
| 1    | 10    | 10 (wrong)    | 0              |
| 2    | 10    | 20 (wrong)    | 10             |
| 3    | 10    | 30 (wrong)    | 20             |

**How discovered:**
Three unit tests failed in `tests/taskService.test.js`:
```
getPaginated › page 1 with limit 2 returns first 2 tasks
Expected: "Task 1", Received: "Task 3"

getPaginated › page 2 with limit 2 returns next 2 tasks
Expected length: 2, Received length: 1

getPaginated › page 1 with limit 10 returns all tasks when total is less than limit
Expected length: 5, Received length: 0
```
Also confirmed at the HTTP level in `tests/tasks.test.js`.

**Fix:**
Change the offset formula to use 1-based pagination:
```js
// Before
const offset = page * limit;

// After
const offset = (page - 1) * limit;
```

---

## Bug 3 — `completeTask` silently resets priority to `"medium"`

**File:** `src/services/taskService.js` — `completeTask` function

**Expected behavior:**
`PATCH /tasks/:id/complete` should mark the task as done and set `completedAt`.
It should not modify any other fields, especially not `priority`.

**What actually happens:**
The function hardcodes `priority: 'medium'` in the updated task object:
```js
const updated = {
  ...task,
  priority: 'medium',   // ← this should not be here
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
A task with `priority: "high"` silently becomes `priority: "medium"` after being completed.
The user never requested this change — it is invisible data corruption.

**How discovered:**
Unit test in `tests/taskService.test.js`:
```
completeTask › does not change the priority when completing a task
Expected: "high", Received: "medium"
```
Also confirmed at the HTTP level in `tests/tasks.test.js`.

**Fix:**
Remove the `priority` line from the updated object:
```js
// Before
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};

// After
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Summary

| # | Function | Severity | Fixed |
|---|----------|----------|-------|
| 1 | `getByStatus` | Medium | No |
| 2 | `getPaginated` | High | Yes |
| 3 | `completeTask` | High | No |

> Bug 2 (`getPaginated`) was selected for the fix because it is the most
> impactful — it makes the first page of results completely inaccessible,
> which would break any frontend or client relying on pagination.