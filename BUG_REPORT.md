# Bug Report — Task API

## Overview

While writing unit and integration tests for the Task API, several issues were discovered relating to correctness and expected API behavior. These were identified through failing tests and manual code review.

---

## Bug 1 — Incorrect Pagination Offset

### Location

`src/services/taskService.js`

### Problematic Code

```js
const offset = page * limit;
```

### Expected Behavior

Pagination should start at the correct index. For example:

```js
getPaginated(1, 10)
// Should return tasks 1–10.
```

### Actual Behavior

Page 1 skips the first tasks because the offset is calculated as:

```
page * limit = 10
```

So results start from task 11 instead of task 1.

### How Discovered

A pagination test failed when verifying the first item returned for page 1.

### Fix Applied

```js
const offset = (page - 1) * limit;
```

This ensures page numbering starts correctly from index 0, so page 1 maps to offset 0, page 2 to offset 10, and so on.

---

## Bug 2 — Status Filtering Allows Partial Matches

### Location

`src/services/taskService.js`

### Problematic Code

```js
tasks.filter(t => t.status.includes(status));
```

### Expected Behavior

Filtering should match exact status values. For example:

```js
getByStatus("todo")
// Should only return tasks with status "todo".
```

### Actual Behavior

Partial matches are allowed. For example:

```js
getByStatus("do")
// Returns tasks with status "todo" and "done".
```

### How Discovered

Found while writing status filtering tests.

### Suggested Fix

```js
tasks.filter(t => t.status === status);
```

---

## Bug 3 — Completing a Task Resets Priority

### Location

`src/services/taskService.js`

### Problematic Code

```js
priority: "medium"
```

### Expected Behavior

Completing a task should only update:

- `status`
- `completedAt`

Priority should remain unchanged.

### Actual Behavior

Priority is always reset to `"medium"` when a task is completed.

### Suggested Fix

Remove the priority overwrite from the completion logic.

---

## Bug 4 — Inconsistent Status Values Between Documentation and Implementation

### Location

API documentation vs. service/validators implementation.

### Documentation Shows

```
pending | in_progress | completed
```

### Implementation Uses

```
todo | in_progress | done
```

### Problem

This inconsistency could confuse API consumers and lead to incorrect usage.

### Suggested Fix

Standardize status values across the codebase, or update the documentation to match the implementation.

---

## Bug 5 — Status Filtering and Pagination Cannot Be Combined

### Location

`src/routes/tasks.js`

### Problem

A request like:

```
/tasks?status=todo&page=1
```

Only applies status filtering — pagination is ignored.

### Expected Behavior

Filtering should be applied first, then pagination should be applied to the filtered results.

### Suggested Fix

Apply filters before paginating, so that pagination operates on the filtered result set rather than the full dataset.

---

## Bug Fix Implemented

The pagination offset bug (Bug 1) was fixed as it directly affects API correctness and was straightforward to verify through tests.

### If More Time Were Available

The following improvements would also be addressed:

- Improve validation for update operations
- Prevent overwriting system-managed fields (e.g., priority on task completion)
- Allow combining filters and pagination
- Improve validation consistency across the API
- Add more edge case handling
