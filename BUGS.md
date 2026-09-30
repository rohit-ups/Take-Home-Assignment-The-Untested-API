# Bug Report

This document lists the bugs I found while testing.

## How I found these
I had an AI tool help draft the first version of the test suite, then ran it
and went through each failure. For every bug below I opened the source,
confirmed the cause myself, and then fixed it (or documented it).

---

### Bug 1: Pagination skips the first page (off-by-one)
- **Where:** `src/services/taskService.js` → `getPaginated`
- **How I found it:** Unit test `getPaginated › should return the first page starting at index 0` and integration test `GET /tasks › should paginate tasks with page and limit query params` both failed.
- **Expected:** `/tasks?page=1&limit=10` returns the first 10 tasks.
- **Actual:** It skips the first page and starts from the 11th task.
- **Why it happens:** Pages start at 1, but array positions start at 0. The code used `page * limit`, so page 1 started at item 10 instead of item 0.
- **Fix (applied):** `const offset = (page - 1) * limit;`

---

### Bug 2: Status filter matches partial text
- **Where:** `src/services/taskService.js` → `getByStatus`
- **How I found it:** Unit test `getByStatus › should not return tasks on partial substring matches` failed.
- **Expected:** `/tasks?status=do` returns nothing, because `do` isn't a valid status.
- **Actual:** It returns both `todo` and `done` tasks.
- **Why it happens:** `.includes()` checks whether a string contains some text, not whether it equals it. Both `todo` and `done` contain `do`.
- **Fix (applied):** Changed `t.status.includes(status)` to `t.status === status`.

---

### Bug 3: Completing a task resets its priority
- **Where:** `src/services/taskService.js` → `completeTask`
- **How I found it:** Unit test `completeTask › should preserve original priority when marking a task complete` failed.
- **Expected:** `PATCH /tasks/:id/complete` sets `status` to `done` and sets `completedAt`, and leaves everything else (like `priority`) unchanged.
- **Actual:** The priority was always reset to `medium`, so a `high` or `low` priority was lost.
- **Why it happens:** The updated task object had `priority: 'medium'` written into it, which replaced the task's real priority.
- **Fix (applied):** Removed the `priority: 'medium'` line.

---

### Bug 4: Status filter and pagination can't be used together (not fixed)
- **Where:** `src/routes/tasks.js` → `GET /tasks`
- **How I found it:** *(use whichever is true)*
  - *Found by reading the route code. There's no test for this yet.*
  - *Found by calling `GET /tasks?status=todo&page=1&limit=5` and seeing that `page` and `limit` were ignored.*
- **Expected:** `/tasks?status=todo&page=1&limit=5` returns the first 5 tasks with status `todo`.
- **Actual:** When `status` is present the handler returns right away, so `page` and `limit` are ignored.
- **Suggested fix:** Filter by status first (if it's given), then apply pagination to the filtered list.
- **Why I didn't fix it:** It needs a change to how the route handler is structured, and the assignment only asked for one fix. I fixed the three simpler bugs instead.