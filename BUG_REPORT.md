# Bug Report

Three bugs were found while writing the test suite. All three have been fixed.

---

## Bug 1: Status filter does partial string matching

**Expected behavior:**
`GET /tasks?status=todo` should return only tasks with status exactly equal to `"todo"`.

**Actual behavior:**
The original `getByStatus` implementation used `.includes(status)`, which matches substrings. A query like `?status=do` would incorrectly return both `"todo"` and `"done"` tasks.

**How I found it:**
While writing a unit test for `getByStatus` in `taskService.js`, I added a case that searched for the partial string `"do"` and expected zero results. The test failed — both `todo` and `done` tasks came back.

**Fix applied** (`src/services/taskService.js` line 9):
```js
// Before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 2: Completing a task silently resets its priority

**Expected behavior:**
Marking a task complete should update `status` to `"done"` and set `completedAt`. All other fields — including `priority` — should stay exactly as they were.

**Actual behavior:**
The `completeTask` function was spreading the task and then hardcoding `priority: 'medium'`. So a `"high"` priority task would silently become `"medium"` when completed. No error, no warning — just quiet data corruption.

**How I found it:**
I wrote a test that created a task with `priority: 'high'`, called `completeTask`, and asserted the priority hadn't changed. The assertion failed. I traced it back to a stray field in the return object inside `completeTask`.

**Fix applied** (`src/services/taskService.js` lines 63–76):
```js
// Removed the line:
priority: 'medium',
// from the updated task spread inside completeTask()
```

---

## Bug 3: Page 0 is treated as page 1

**Expected behavior:**
The API uses zero-based pagination internally (offset = page × limit). A request with `?page=0&limit=10` should return results starting at index 0.

**Actual behavior:**
The original route handler used `parseInt(page) || 1`. Since `0` is falsy in JavaScript, `parseInt('0') || 1` evaluates to `1`, silently skipping to the second page. So page 0 and page 1 would return the same results.

**How I found it:**
I wrote an integration test for `GET /tasks?page=0&limit=2` that expected the first two tasks. The test returned the wrong set — offset was one page ahead.

**Fix applied** (`src/routes/tasks.js` lines 20–22):
```js
// Before
const pageNum = parseInt(page) || 1;

// After
const parsedPage = parseInt(page);
const pageNum = isNaN(parsedPage) ? 1 : parsedPage;
```

This correctly defaults to `1` when the query param is missing or non-numeric, while allowing `0` through as a valid page number.
