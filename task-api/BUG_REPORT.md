# Bug Report - Task Manager API

**Date:** 2026-14-16  
**Author:** Simranjit Kaur

---

## Summary

Through comprehensive testing, I identified **3 bugs** in the codebase:

| Bug | Severity | Location |
|-----|----------|----------|
| `getByStatus` uses `.includes()` instead of `===` | High | `src/services/taskService.js:9` |
| `getPaginated` has off-by-one pagination error | High | `src/services/taskService.js:12` |
| `completeTask` incorrectly resets task priority | Medium | `src/services/taskService.js:69` |

---

## Bug 1: `getByStatus` uses `.includes()` instead of strict equality

### Location
`src/services/taskService.js`, line 9

### Code
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

### Expected Behavior
Should return only tasks whose status **exactly matches** the provided status value.

### Actual Behavior
Uses `.includes()` which matches **partial strings**. For example:
- `getByStatus('to')` returns all tasks with status `'todo'` (incorrect match)
- `getByStatus('in')` returns all tasks with status `'in_progress'` (incorrect match)
- `getByStatus('do')` returns all tasks with status `'todo'` AND `'done'` (incorrect match)

### How Discovered
Unit test `taskService - getByStatus › BUG: should not match partial status strings` and integration test `GET /tasks?status= › BUG: should not match partial status strings`

### Fix
Change `.includes()` to strict equality `===`:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 2: `getPaginated` has off-by-one pagination error

### Location
`src/services/taskService.js`, line 12

### Code
```javascript
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};
```

### Expected Behavior
Page 1 should return the **first 10 items** (items 1-10), page 2 should return items 11-20, etc.

### Actual Behavior
The formula `offset = page * limit` causes page 1 to skip the first 10 items:
- Page 1 with limit 10: `offset = 1 * 10 = 10` → returns items 11-20 (WRONG)
- Page 0 with limit 10: `offset = 0 * 10 = 0` → returns items 1-10 (correct)

This is inconsistent with standard pagination conventions where page 1 is the first page.

### How Discovered
Unit test `taskService - getPaginated › BUG: page 1 should return first 10 items, not skip them` and integration test `GET /tasks?page=&limit= › BUG: page 1 should return first items, not skip them`

### Fix
Change the offset formula to `(page - 1) * limit`:
```javascript
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};
```

---

## Bug 3: `completeTask` incorrectly resets task priority

### Location
`src/services/taskService.js`, line 69

### Code
```javascript
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    priority: 'medium',  // <-- BUG: Why is this here?
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  // ...
};
```

### Expected Behavior
Completing a task should only change:
- `status` → `'done'`
- `completedAt` → current timestamp

All other fields (including `priority`) should be **preserved**.

### Actual Behavior
The function **unnecessarily resets** the priority to `'medium'`, losing the original priority value.

### How Discovered
Unit test `taskService - completeTask › BUG: should preserve original priority when completing` and integration test `PATCH /tasks/:id/complete › BUG: should preserve original priority`

### Fix
Remove the `priority: 'medium'` line:
```javascript
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  // ...
};
```

---

## Additional Observations

### Not a Bug: Validation allows empty description
The `validateCreateTask` function doesn't require a description, allowing empty strings. This appears intentional based on the default value `description = ''` in the `create` function.

### Potential Issue: No validation for `assignee` field
The API doesn't currently have an `/assign` endpoint, but when implemented, it should validate:
- Assignee name is non-empty
- Assignee name is a string
- Assignee name length is reasonable

---

## Fixes Applied

All three bugs have been fixed in this submission. See the fixed `src/services/taskService.js` for the corrected implementation.
