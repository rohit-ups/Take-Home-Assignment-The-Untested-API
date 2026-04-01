# Bug Report

## Bug #1: getByStatus() matches substring instead of exact status
**Severity:** High  
**Affected Function:** `taskService.getByStatus()`  
**Affected Endpoint:** `GET /tasks?status=<status>`

### Expected Behavior
Filter tasks by exact status match. When filtering for status "progress", should return 0 results.

### Actual Behavior
Returns tasks with status "in_progress" when searching for "progress" because the function uses `.includes()` which checks for substring match.

### Root Cause
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

The code uses `includes()` which treats the status as a substring search. The status field contains "in_progress", so `.includes('progress')` returns true.

### How It Was Discovered
- Created test: "should return tasks with 'in_progress' status without matching 'progress' substring"
- Test filtered for status "progress" expecting 0 results  
- Actually returned 2 tasks with status "in_progress"

### Fix
Replace `includes()` with exact equality check:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug #2: getPaginated() uses incorrect offset calculation
**Severity:** High  
**Affected Function:** `taskService.getPaginated()`  
**Affected Endpoint:** `GET /tasks?page=<page>&limit=<limit>`

### Expected Behavior
- Page 0, limit 10 → return items 0-9 (Task 1-10)
- Page 1, limit 10 → return items 10-19 (Task 11-20)

### Actual Behavior
- Page 0, limit 10 → returns items 10-19 (Task 11-20)
- Pagination is off by one page

### Root Cause
The offset calculation `(page * limit)` doesn't account for 0-based indexing properly. When a user requests page 0 with limit 10, they expect the first 10 items, but the code calculates:
```
offset = 0 * 10 = 0 (skips items 0-9, expects pagination to start at page 1)
```

Actually, looking more carefully, the issue is that page numbers are being treated as 0-indexed but the logic assumes 1-indexed pagination. The test shows page 0 returns items 11-20, meaning the offset is being calculated as 10 instead of 0.

### How It Was Discovered
- Created test: "should support pagination"
- Page 0, limit 10 should return Task 1-10 (first item titled "Task 1")
- Actually returned Task 11-20 (first item titled "Task 11")

### Fix
The offset calculation is correct for 0-indexed pages. The actual issue is in the integration test - when `page` is undefined, it defaults to 1 in the route, not 0:
```javascript
const pageNum = parseInt(page) || 1;
```

The service expects 0-indexed pages, but the route provides 1-indexed pages. Either:
- Option A: Change service to use 1-indexed: `const offset = (page - 1) * limit`
- Option B: Change route to use 0-indexed and document it

**Recommended Fix (Option B):** Keep service consistent, change route to pass 0-indexed page:
```javascript
const pageNum = parseInt(page) || 0;
```

---

## Feature Gap: GET /tasks/:id not implemented
**Severity:** Medium  
**Type:** Missing Endpoint

### Expected Behavior
`GET /tasks/:id` should return a single task by ID, returning 200 with the task or 404 if not found.

### Actual Behavior
Endpoint is not implemented. Hitting it returns 404.

### Why It Matters
API is incomplete - cannot fetch individual tasks by ID. This is essential functionality.

### Implementation
Add route handler in `routes/tasks.js`:
```javascript
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});
```

Note: Must be placed AFTER the `/stats` route handler to avoid matching `/stats` as an ID.
