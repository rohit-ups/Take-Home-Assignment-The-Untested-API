Bug Report

The issues below were identified while writing the service and API tests in `task-api/tests/`.

1. Pagination skipped the first page of results

* Location: `task-api/src/services/taskService.js:11-13`
* Expected behavior: `GET /tasks?page=1&limit=10` should return the first ten tasks, starting from the earliest created.
* Actual behavior: page 1 returned tasks starting at index 10 (e.g. `Task 11`), so the first page skipped the earliest results entirely.
* How I discovered it: `tests/unit/taskService.unit.test.js` (`getPaginated` / `Bugs` suite) asserted that `page[0].title` should be `'Task 1'` for `getPaginated(1, 10)`, and it failed — the first item returned was `'Task 11'`.
* Why it happened: the pagination offset was calculated as `page * limit` instead of `(page - 1) * limit`, so page 1 already applied a full page's worth of offset.
* Fix: updated the offset calculation to `(page - 1) * limit`.
* Status: fixed. Re-ran `npm test` after the change — `page 1 returns the first 10 items` and the rest of the `getPaginated` suite pass.

2. Completing a task reset its priority

* Location: `task-api/src/services/taskService.js` (`completeTask`)
* Expected behavior: marking a task complete via `PATCH /tasks/:id/complete` should update its `status` and `completedAt` without changing unrelated fields like `priority`.
* Actual behavior: `completeTask` hard-coded `priority: 'medium'` on the returned/stored task, silently overwriting whatever priority the task already had (e.g. a `high` priority task came back as `medium` after completion).
* How I discovered it: `tests/unit/taskService.unit.test.js` (`Bugs` suite, `save the original priority when completing a task`) created a task with `priority: 'high'`, called `completeTask`, and asserted the priority was still `'high'` — it failed, returning `'medium'` instead.
* Why it happened: the completion logic rebuilt the task object and hard-coded a new `priority` value as part of that rebuild, instead of only setting `status` and `completedAt`.
* Fix: removed the `priority: 'medium'` override so `completeTask` preserves the task's existing priority.
* Status: fixed. Re-ran `npm test` after the change — `save the original priority when completing a task` and the `PATCH /tasks/:id/complete` route tests pass.

---

Before adding new Feature,
Both fixes were verified with the full suite:

```
Test Suites: 2 passed, 2 total
Tests:       47 passed, 47 total
```

and coverage remained high after the fixes (`taskService.js` at 100% statements / 94.11% branches).