# Bug Report

This document reports the issues found in the Task Manager API codebase during the Day 1 testing phase.

---

## 1. Pagination Offset Calculation Bug

* **Component**: `src/services/taskService.js` (inside `getPaginated(page, limit)` function)
* **How Discovered**: Discovered while writing integration tests for the `GET /tasks` endpoint. When querying `/tasks?page=1&limit=10`, the first 10 items (indices 0 to 9) were completely skipped, and only tasks from index 10 onward were returned.
* **Expected Behavior**: In standard API pagination, pages are 1-indexed. `page=1` with `limit=10` should return the first page containing tasks from index 0 to 9.
* **Actual Behavior**: The offset calculation was written as `offset = page * limit`. Since `page` was parsed as `1`, `offset` calculated to `10`, which skipped page 1 completely and returned page 2 tasks.
* **Proposed Fix**: Change the offset formula to subtract 1 from page first:
  ```javascript
  const offset = (page - 1) * limit;
  ```

---

## 2. Status Filtering Substring Matching Bug

* **Component**: `src/services/taskService.js` (inside `getByStatus(status)` function)
* **How Discovered**: Discovered during code review and service unit testing. When querying tasks by status, passing a partial string like `'progress'` or `'do'` matched `'in_progress'` and `'todo'` respectively.
* **Expected Behavior**: Filtering by status should only return tasks matching the query status exactly (e.g. `status === 'todo'`, `status === 'in_progress'`, or `status === 'done'`).
* **Actual Behavior**: The service uses `tasks.filter((t) => t.status.includes(status))`. This matches any substring, allowing incorrect statuses or partial strings to filter tasks.
* **Proposed Fix**: Replace the `.includes()` substring match with strict equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

## 3. Resetting Task Priority on Completion Bug

* **Component**: `src/services/taskService.js` (inside `completeTask(id)` function)
* **How Discovered**: Discovered while writing unit tests for `taskService.completeTask()`. When completing a task created with `'high'` priority, the completed task's priority unexpectedly changed to `'medium'`.
* **Expected Behavior**: Marking a task as complete using `PATCH /tasks/:id/complete` should only update the task's `status` to `'done'` and set the `completedAt` timestamp. It should preserve the existing task priority.
* **Actual Behavior**: The code explicitly overwrites the priority to `'medium'`:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
* **Proposed Fix**: Remove the `priority: 'medium'` reassignment:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

## 4. Missing Health Route

* **Component**: `src/app.js`
* **How Discovered**: Found while checking the code manually.
* **Expected Behavior**: There should be a simple route (like `/health` or `/status`) to check if the server is up and working.
* **Actual Behavior**: There is no route to check the server status.
* **Proposed Fix**: Add a simple health route in `src/app.js` that returns a status message:
  ```javascript
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });
  ```