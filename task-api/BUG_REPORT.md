# Bug Report

## 1. Pagination Offset Logic Error
- **File & Function:** `src/services/taskService.js` / `getPaginated`
- **Expected behaviour:** Pagination should skip `(page - 1) * limit` tasks to return the correct items for a requested page (e.g., page 1 skips 0, page 2 skips `limit`).
- **Actual behaviour:** Pagination skipped `page * limit` tasks. E.g., page 1 with limit 10 would skip the first 10 items.
- **How the test exposed it:** The integration test `GET /tasks?page=&limit=` checked the items returned for page 1 and expected the first items created in the test data, but got nothing or subsequent items instead.
- **Root cause:** The math logic for pagination offset was incorrect.
- **Fix:** Changed `const offset = page * limit;` to `const offset = (page - 1) * limit;`.

## 2. Complete Task Overwrites Priority
- **File & Function:** `src/services/taskService.js` / `completeTask`
- **Expected behaviour:** Completing a task should set its status to 'done' and completedAt to the current timestamp while leaving its priority unchanged.
- **Actual behaviour:** It forcefully changed the task's priority to 'medium'.
- **How the test exposed it:** The unit test `describe('completeTask') -> test('preserves the original priority')` created a 'high' priority task and completed it, expecting it to remain 'high'.
- **Root cause:** The object spread defining the updated task manually included `priority: 'medium'`.
- **Fix:** Removed the `priority: 'medium'` line from the updated object.

## 3. Status Filtering is Too Broad
- **File & Function:** `src/services/taskService.js` / `getByStatus`
- **Expected behaviour:** Filtering by status (e.g., `todo`) should only return tasks that exactly match that status.
- **Actual behaviour:** It used `.includes()`, meaning `todo` could potentially match other non-existent strings, or a substring check would incorrectly match tasks.
- **How the test exposed it:** The integration test `should not match partial status` demonstrated that searching for `in_pro` returned tasks with the status `in_progress`.
- **Root cause:** Used `tasks.filter((t) => t.status.includes(status))` instead of exact equality.
- **Fix:** Changed the logic to `t.status === status`.

## 4. PUT Allows Overwriting Protected Fields
- **File & Function:** `src/services/taskService.js` / `update`
- **Expected behaviour:** Updating a task shouldn't allow overwriting system-controlled fields like `id` and `createdAt`.
- **Actual behaviour:** The raw incoming fields were merged directly, allowing clients to overwrite the ID and creation date.
- **How the test exposed it:** The `PUT /tasks/:id` integration test sent a new `id` and `createdAt` and verified they were NOT applied to the returned object.
- **Root cause:** The updated task object was created using `...tasks[index], ...fields`, indiscriminately applying all provided fields.
- **Fix:** Destructured `fields` to remove `id` and `createdAt` before merging: `const { id: _, createdAt: __, ...allowedFields } = fields;`.

## 5. Pagination Parameters Not Validated
- **File & Function:** `src/routes/tasks.js` / `GET /`
- **Expected behaviour:** Non-integer or invalid pagination parameters (e.g. `page=abc` or `page=-1`) should return a 400 Bad Request error.
- **Actual behaviour:** Invalid parameters were passed into `parseInt()`, which resulted in `NaN` or negative numbers, potentially causing the app to crash or return incorrect values.
- **How the test exposed it:** The integration test `should return 400 for invalid pagination parameters` sent a request with `page=invalid` and expected a 400 status code.
- **Root cause:** Missing validation checks on the parsed pagination parameters before querying the service.
- **Fix:** Added validation checks to ensure `pageNum` and `limitNum` are numbers greater than 0, otherwise returning 400 with `Invalid pagination parameters`.
