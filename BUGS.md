# Bug Report — Task API

## Bug 1: `completeTask` overwrites task priority

**File:** `src/services/taskService.js:69`

**Expected behavior:** Completing a task should change its status to `done` and set `completedAt`, preserving all other fields including `priority`.

**What actually happens:** The `completeTask` function forcibly sets `priority: 'medium'` regardless of the task's original priority:

```js
const updated = {
  ...task,
  priority: 'medium',  // BUG: destroys original priority
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**How I discovered it:** Unit test `completeTask > should preserve the original priority` creates a task with `priority: 'high'`, completes it, then asserts the priority is still `'high'`. The test fails with `Expected: "high", Received: "medium"`.

**Impact:** High — completing a high-priority task silently degrades it to medium priority, losing important metadata. In a real system this could cause priority-based sorting/filtering to break.

**Fix:** Remove the `priority: 'medium'` line. The spread operator already preserves the original priority from `task`.

---

## Bug 2: `getPaginated` uses wrong offset formula

**File:** `src/services/taskService.js:12`

**Expected behavior:** `getPaginated(1, 10)` should return the first 10 items (indices 0–9).

**What actually happens:** The offset is calculated as `page * limit`, so for page 1 with limit 10, offset is 10, skipping the first 10 items entirely:

```js
const offset = page * limit;  // BUG: should be (page - 1) * limit
```

**How I discovered it:** Unit tests for pagination. `getPaginated(1, 10)` returns items starting at index 10 instead of index 0. `getPaginated(3, 10)` with 25 items returns an empty array instead of the last 5 items.

**Impact:** High — pagination is fundamentally broken. The first page always skips items, and subsequent pages return wrong results. Any client using pagination gets incorrect data.

**Fix:** Change to `const offset = (page - 1) * limit;`.

---

## Bug 3: `getByStatus` uses partial string matching

**File:** `src/services/taskService.js:9`

**Expected behavior:** Filtering by `?status=todo` should return only tasks where `status === 'todo'`.

**What actually happens:** Uses `String.includes()` instead of strict equality, so `?status=do` matches both `"todo"` and `"done"`:

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**How I discovered it:** When testing filtering, a search for a substring like `"do"` unexpectedly returns tasks from multiple statuses. With only the three current statuses this is a subtle bug, but it violates the principle of least surprise.

**Impact:** Medium — with the current three statuses (`todo`, `in_progress`, `done`), the only practical collision is `"do"` matching both `todo` and `done`. But it's semantically wrong and would cause real problems if new statuses were added.

**Fix:** Change to `tasks.filter((t) => t.status === status)`.

---

## Bug 4: `update` allows overwriting immutable fields

**File:** `src/services/taskService.js:50`

**Expected behavior:** `PUT /tasks/:id` should only update mutable fields (`title`, `description`, `status`, `priority`, `dueDate`).

**What actually happens:** The spread `{ ...tasks[index], ...fields }` allows the client to overwrite `id`, `createdAt`, and `completedAt` via the request body:

```js
const updated = { ...tasks[index], ...fields };
```

**How I discovered it:** Code review. Sending `{ "id": "hacked", "createdAt": "2000-01-01" }` in a PUT request would corrupt the task's identity and creation timestamp.

**Impact:** Medium — could corrupt data integrity. An attacker or buggy client could change a task's `id` (breaking references) or falsify `createdAt`.

**Fix:** Destructure allowed fields only: `const { title, description, status, priority, dueDate } = fields;` then spread only those.

---

## Bug 5: Documentation inconsistency (README vs code)

**File:** `README.md:77` vs `src/utils/validators.js:1`

**Expected behavior:** API documentation should match the actual API.

**What actually happens:** The README documents status values as `"pending | in-progress | completed"` but the code uses `"todo | in_progress | done"`. Similarly, the task shape in the README doesn't match the actual data model.

**Impact:** Low — any consumer reading the docs would send invalid status values and get 400 errors.

**Fix:** Update README to match the actual status values used in code.
