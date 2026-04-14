# Bug Report – Task Manager API

This document lists bugs discovered during testing, how they were found, and their fixes.

---

## Bug 1: Missing GET /tasks/:id

**Status:** ✅ **FIXED**

### Expected Behavior
API should return a task by ID:
```
GET /tasks/:id → 200 OK
```

### Actual Behavior
Endpoint was missing and always returned 404.

### How It Was Discovered
While writing integration tests using Supertest, the GET by ID test failed.

### Root Cause
Route handler was not implemented in `src/routes/tasks.js`.

### Fix Implemented

```javascript
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});
```

---

## Bug 2: Priority Overwritten on Task Completion

**Status:** ⚠️ **IDENTIFIED**

### Expected Behavior
Completing a task should not change its priority.

### Actual Behavior
Priority is always set to "medium" when a task is completed.

### How It Was Discovered
While reviewing the `completeTask` function.

### Root Cause
Hardcoded priority assignment in the completion logic:
```javascript
priority: 'medium'
```

### Fix Suggested

```javascript
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Bug 3: Pagination Logic Incorrect

**Status:** ⚠️ **IDENTIFIED**

### Expected Behavior
Page 1 should return the first set of results.

### Actual Behavior
Page 1 skips initial tasks.

### Root Cause
Incorrect offset calculation:
```javascript
const offset = page * limit;
```

### Fix

```javascript
const offset = (page - 1) * limit;
```

---

## Bug 4: Incorrect Status Filtering

**Status:** ⚠️ **IDENTIFIED**

### Expected Behavior
Filter should match exact status values only.

### Actual Behavior
Partial matches are allowed (e.g., "do" matches both "done" and "todo").

### Root Cause
Using `includes()` for string matching:
```javascript
t.status.includes(status)
```

### Fix

```javascript
t.status === status
```

---

## Bug 5: Priority Accepts Empty String

**Status:** ⚠️ **IDENTIFIED**

### Expected Behavior
Priority should only accept: `"low"`, `"medium"`, or `"high"`

### Actual Behavior
Empty string (`""`) is accepted as a valid priority.

### How It Was Discovered
During manual API testing.

### Root Cause
- Default value only applies to `undefined`
- No validation for empty string values

### Fix

```javascript
const allowed = ['low', 'medium', 'high'];

if (!priority || !allowed.includes(priority)) {
  return res.status(400).json({ error: 'Invalid priority' });
}
```

---

## Summary

| Bug | Description | Status |
|-----|-------------|--------|
| #1 | Missing GET /tasks/:id | ✅ Fixed |
| #2 | Priority overwritten on completion | ⚠️ Identified |
| #3 | Pagination logic incorrect | ⚠️ Identified |
| #4 | Status filter too permissive | ⚠️ Identified |
| #5 | Priority accepts empty string | ⚠️ Identified |

---

## Testing Methodology

Bugs were identified through:

- **Integration Testing** — Supertest for endpoint validation
- **Unit Testing** — Function behavior verification
- **Manual API Testing** — Real-world request scenarios
- **Code Review** — Static analysis of implementation

---

## Next Steps

- [ ] Review and implement fixes for Bugs #2–#5
- [ ] Write unit tests for priority validation
- [ ] Write unit tests for pagination logic
- [ ] Add status filter tests
- [ ] Perform regression testing after fixes