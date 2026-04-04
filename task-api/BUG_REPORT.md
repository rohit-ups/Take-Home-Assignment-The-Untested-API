# Bug Report — Task Manager API

---

## Bug 1: `getByStatus` uses partial string matching instead of exact match

**File:** `src/services/taskService.js` — line 9  
**Severity:** High

### Expected behavior
Filtering by `status=todo` should return only tasks with status `"todo"`.

### What actually happens
`getByStatus` uses `t.status.includes(status)` which performs a **substring match**. This means:
- `getByStatus('do')` matches both `"todo"` and `"done"`
- `getByStatus('in')` matches `"in_progress"`

Any partial status string returns incorrect results.

### How I discovered it
Wrote a unit test that creates tasks with different statuses and filtered with a partial string `"do"` — the test revealed it matched `"todo"` and `"done"`.

### Fix
Replace `t.status.includes(status)` with `t.status === status` for strict equality.

```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status:** ✅ Fixed

---

## Bug 2: `getPaginated` has off-by-one error — page 1 skips results

**File:** `src/services/taskService.js` — line 12  
**Severity:** High

### Expected behavior
Page 1 should return the first `limit` items (offset 0).

### What actually happens
The offset is calculated as `page * limit` instead of `(page - 1) * limit`. So page 1 with limit 2 starts at index 2 (skipping the first 2 items), and page 0 would be needed to get the first page — which is not the expected API convention.

### How I discovered it
Integration test for `GET /tasks?page=1&limit=2` returned `Task 3` instead of `Task 1` as the first result.

### Fix
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

**Status:** ✅ Fixed

---

## Bug 3: `completeTask` resets priority to `"medium"`

**File:** `src/services/taskService.js` — line 69  
**Severity:** Medium

### Expected behavior
Marking a task as complete should only change `status` to `"done"` and set `completedAt`. All other fields (including `priority`) should remain unchanged.

### What actually happens
The `completeTask` function includes `priority: 'medium'` in the updated object, overwriting whatever priority the task originally had.

### How I discovered it
Created a task with `priority: 'high'`, then completed it via `PATCH /tasks/:id/complete`. The response showed `priority: 'medium'` instead of `'high'`.

### Fix
Remove the `priority: 'medium'` line from the `completeTask` function.

```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

**Status:** ✅ Fixed

---

## Bug 4: `update` allows overwriting internal fields (`id`, `createdAt`)

**File:** `src/services/taskService.js` — line 50  
**Severity:** Low

### Expected behavior
Internal/system-managed fields like `id` and `createdAt` should not be overwritable by a client update request.

### What actually happens
The update function uses a plain spread: `{ ...tasks[index], ...fields }`. If a client sends `{ id: 'hacked' }` in the PUT body, the task's ID gets overwritten, making it unreachable by the original ID.

### How I discovered it
Wrote a unit test that sends `{ id: 'hacked' }` as an update — it succeeded.

### Suggested fix
Strip protected fields before applying the spread:

```js
const { id, createdAt, ...safeFields } = fields;
const updated = { ...tasks[index], ...safeFields };
```

**Status:** ⚠️ Not fixed (documented only — low severity, not required by assignment)

---

## Summary

| # | Bug | Severity | Fixed? |
|---|-----|----------|--------|
| 1 | `getByStatus` partial matching | High | ✅ |
| 2 | `getPaginated` off-by-one | High | ✅ |
| 3 | `completeTask` resets priority | Medium | ✅ |
| 4 | `update` allows internal field overwrite | Low | ⚠️ Documented |
