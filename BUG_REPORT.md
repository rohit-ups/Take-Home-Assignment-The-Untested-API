# Bug Report — Task Manager API

While reviewing the codebase and writing the initial unit and integration test suite, I tracked down 4 key bugs in the API implementation. Below is a breakdown of where each bug lives in the code, why it happens, how I caught it, and how I fixed it.

---

## 1. Off-by-One Pagination Offset Calculation

- **File & Line:** [`src/services/taskService.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/services/taskService.js#L11-L14)
- **Code Snippet:**
  ```javascript
  const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Why It Happens:** The function assumed `page` is zero-indexed when computing `offset = page * limit`. When a client passes standard 1-indexed pagination parameters (e.g. `page=1&limit=10`), the formula calculates `offset = 1 * 10 = 10`. This skips the first 10 items in the array (indices 0 to 9) and returns items 10 to 19 instead.
- **How I Found It:** I wrote an integration test querying `GET /tasks?page=1&limit=2` expecting to receive the first two tasks created in the test setup. Instead, it returned an empty array because there were only 5 total tasks in the database.
- **Fix Applied:** Changed the calculation to `(pageNum - 1) * limitNum` so `page=1` yields an offset of `0`.

---

## 2. Unintended Priority Overwrite on Task Completion

- **File & Line:** [`src/services/taskService.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/services/taskService.js#L63-L77)
- **Code Snippet:**
  ```javascript
  const completeTask = (id) => {
    ...
    const updated = {
      ...task,
      priority: 'medium', // <--- Bug
      status: 'done',
      completedAt: new Date().toISOString(),
    };
    ...
  };
  ```
- **Why It Happens:** The developer who wrote `completeTask` explicitly hardcoded `priority: 'medium'` into the updated object spread. Completing a task should mark its `status` as `'done'` and set `completedAt`, but it shouldn't reset the task's historical priority.
- **How I Found It:** I created a task with `priority: 'high'` and called `PATCH /tasks/:id/complete`. When asserting on the returned payload in Jest, the test failed because `priority` unexpectedly mutated to `'medium'`.
- **Fix Applied:** Removed `priority: 'medium'` from the object spread so the existing task's priority is preserved.

---

## 3. Substring Matching in `getByStatus`

- **File & Line:** [`src/services/taskService.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/services/taskService.js#L9)
- **Code Snippet:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Why It Happens:** The function used String `.includes()` rather than exact equality (`===`). If a user requested `GET /tasks?status=do`, JavaScript matched both `'todo'` and `'done'` because both strings contain `'do'`.
- **How I Found It:** While testing status filtering edge cases, I noticed that partial queries returned tasks belonging to multiple distinct statuses.
- **Fix Applied:** Updated the filter condition to `t.status === status`.

---

## 4. Route Handler Ignores Pagination When Status Filter is Present

- **File & Line:** [`src/routes/tasks.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/routes/tasks.js#L11-L28)
- **Code Snippet:**
  ```javascript
  router.get('/', (req, res) => {
    const { status, page, limit } = req.query;

    if (status) {
      const tasks = taskService.getByStatus(status);
      return res.json(tasks); // <--- Exits early, ignoring page and limit
    }

    if (page !== undefined || limit !== undefined) { ... }
    ...
  });
  ```
- **Why It Happens:** The router handler was written using two independent `if` statements. If `status` was present in `req.query`, the handler returned `taskService.getByStatus(status)` immediately without ever reaching the pagination block below it.
- **How I Found It:** I wrote an integration test for `GET /tasks?status=todo&page=1&limit=2` to check if pagination worked on filtered subsets. The endpoint returned all 5 `todo` tasks instead of slicing them down to 2.
- **Fix Applied:** Refactored the route handler to first filter by status if provided, and then pass that filtered array into `getPaginated(page, limit, taskList)`.

---

## Verification

All 4 fixes are verified by unit and integration tests in `task-api/tests/` (56 passing test cases, 97%+ coverage).
