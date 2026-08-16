# Bug Report

This document details the findings discovered through unit testing (`taskService.test.js`) and integration testing (`tasks.routes.test.js`) in the Task Manager API.

---

## 1. Status Filter Matches Partial Values (Remaining Bug)

- **Expected Behavior:** `GET /tasks?status=to` should return an empty array (`[]`) because valid status values are strictly `todo`, `in_progress`, and `done`.
- **Actual Behavior:** `GET /tasks?status=to` returns tasks with `status: "todo"`.
- **How It Was Discovered:** Discovered through unit testing (taskService.getByStatus() unit test) and integration testing.
- **Root Cause:** In `src/services/taskService.js`, `getByStatus()` filters tasks using `t.status.includes(status)` instead of checking for exact string equality.
- **Suggested Fix:** Compare status using exact equality `t.status === status`.

---

## 2. Pagination Starts from the Wrong Offset (Selected & Fixed)

- **Status:** **FIXED** (Selected as the bug to fix for Part B)
- **Expected Behavior:** With 5 tasks stored and `limit=2`:
  - `page 1` -> Task 1, Task 2
  - `page 2` -> Task 3, Task 4
- **Actual Behavior (Prior to Fix):**
  - `page 1` -> Task 3, Task 4
  - `page 2` -> Task 5
- **How It Was Discovered:** Discovered through unit testing (taskService.getPaginated() unit test) and integration testing.
- **Root Cause:** In `src/services/taskService.js`, `getPaginated()` calculated `offset = page * limit`. For 1-indexed `page = 1`, offset was calculated as `1 * 2 = 2` instead of `0`.
- **Fix Applied:** Updated the offset calculation in `src/services/taskService.js` to `(page - 1) * limit`.

---

## 3. Completing a Task Changes Its Priority (Remaining Bug)

- **Expected Behavior:** Behavior requiring clarification. (Expected/requirement is not explicitly defined in requirements; completing a task should typically preserve its original priority unless specified otherwise).
- **Actual Behavior:** A high-priority task becomes medium priority after completion.
- **How It Was Discovered:** Discovered through unit testing (taskService.completeTask() unit test).
- **Root Cause:** In `src/services/taskService.js`, `completeTask()` hardcodes `priority: 'medium'` when updating the task.
- **Suggested Fix:** If priority should be preserved, do not overwrite the existing priority in `completeTask()`.
