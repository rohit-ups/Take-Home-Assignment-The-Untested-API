# Bugs Found

While writing the test suite and going through the code, I ran into a few bugs. Here is what was broken and how I fixed them:

### 1. Pagination skips the first page (`taskService.js`)
When I wrote the pagination tests, requesting page 1 was returning items 11–20 instead of 1–10. 
In `taskService.getPaginated`:
```javascript
const offset = page * limit;
```
For `page = 1` and `limit = 10`, `offset` calculated to 10 right away, so it immediately sliced past the first 10 items.
I changed the offset calculation to `(page - 1) * limit` and added `Math.max(1, ...)` so invalid or negative page numbers default to 1.

### 2. Marking a task complete wipes its priority (`taskService.js`)
Inside `completeTask`, there was a line hardcoding `priority: 'medium'`:
```javascript
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
If a user created a high-priority task and finished it, it silently got demoted to medium priority. I removed that line so `completeTask` only updates `status` and `completedAt`, leaving the existing priority untouched.

### 3. Status filter matches substrings (`taskService.js`)
`getByStatus` was using `.includes(status)`:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```
Because of this, filtering for `?status=progress` or `?status=do` would return `in_progress` and `todo` tasks. I changed it to an exact check (`t.status === status`).

### 4. Can't paginate filtered tasks (`routes/tasks.js`)
In `GET /tasks`, the route returned early whenever a `status` query was passed:
```javascript
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks);
}
```
This meant if someone called `GET /tasks?status=todo&page=1&limit=5`, the `page` and `limit` params were completely ignored. I refactored the route so it filters first and then applies pagination on the resulting list.

### 5. `PUT /tasks/:id` allows changing `id` and `createdAt` (`taskService.js`)
`taskService.update` was just spreading whatever came in `req.body`:
```javascript
const updated = { ...tasks[index], ...fields };
```
If a client sent an `id` or `createdAt` in the PUT body, it would overwrite them. I updated it to strip out `id` and `createdAt` so internal metadata can't be modified by clients.

### 6. README had wrong status values (`README.md`)
The README mentioned statuses were `pending | in-progress | completed`, and even had an example `curl` with `status=pending`. But the validator in `validators.js` only accepts `todo | in_progress | done`. Calling the example curl in the README resulted in a 400 error. I updated the README to match what the code actually expects.
