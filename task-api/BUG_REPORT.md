# Bug Report

## Bug 1 – Pagination skips the first page

**Location:** `src/services/taskService.js`

### Expected
`GET /tasks?page=1&limit=2` should return the first two tasks.

### Actual
It starts from the third task.

### Cause
The offset was calculated as:

```js
const offset = page * limit;
```

### Fix

```js
const offset = (page - 1) * limit;
```

### How discovered
A failing Jest unit test for `getPaginated()` exposed the issue.

---

## Bug 2 – Status filter matches partial strings

**Location:** `src/services/taskService.js`

### Expected
Only exact status values (`todo`, `in_progress`, `done`) should match.

### Actual
Searching `"tod"` incorrectly returns `"todo"`.

### Cause

```js
t.status.includes(status)
```

### Fix

```js
t.status === status
```

### How discovered
A failing unit test verified that partial status values should return zero results.