# Submission Notes

## Deliverables Summary
- **Tests:** 62 tests across unit and integration suites (`npm test`).
- **Coverage:** 97.4% statement coverage across all files (`npm run coverage`).
- **Bug Report:** [`BUG_REPORT.md`](./BUG_REPORT.md)
- **Fixes Applied:** Fixed the 1-based pagination offset bug and the priority reset on complete.
- **New Feature:** Implemented `PATCH /tasks/:id/assign` with validation and tests.

---

## Bug Fixes
1. **Pagination offset (`src/services/taskService.js`):** Changed `offset = page * limit` to `offset = (page - 1) * limit`. Page 1 now properly returns the first batch of results.
2. **Priority reset on complete (`src/services/taskService.js`):** Removed `priority: 'medium'` from `completeTask`. Marking a task done now preserves its original priority (`low`, `medium`, or `high`).

---

## Feature: `PATCH /tasks/:id/assign`
- **Route:** `PATCH /tasks/:id/assign`
- **Body:** `{ "assignee": "string" }`
- **Design Decisions:**
  - `assignee` is validated as a non-empty string. Whitespace is trimmed. Empty or non-string inputs return `400 Bad Request`.
  - Reassignment is supported (calling it again replaces the previous assignee).
  - Returns `404 Not Found` if the task ID does not exist.
  - Added `assignee: null` default to task creation for consistent schema shape.

---

## Notes & Evaluation Questions

### 1. What I'd test next if I had more time
- Concurrency and race conditions (multiple rapid updates/deletes on the same task).
- Combined query parameters (e.g. `?status=todo&page=1&limit=5`, which currently ignores pagination if status is given).
- Malformed JSON body handling and payload size limits.
- UUID format validation on route params (`:id`).

### 2. Anything that surprised me in the codebase
- In `completeTask`, it forced `priority: 'medium'`, which quietly overwrites user data.
- In `getByStatus`, using `.includes()` meant `?status=do` matched both `todo` and `done`.
- `README.md` listed status values as `pending | in-progress | completed`, while the code actually uses `todo | in_progress | done`.

### 3. Questions I'd ask before shipping this to production
- **Database:** When are we moving away from in-memory storage, and what database (Postgres, Mongo) are we targeting?
- **Auth & Ownership:** Are tasks public to all users, or should they be scoped to an authenticated user/team?
- **Pagination contract:** Should pagination return metadata (e.g. `{ total, page, limit, data: [...] }`) instead of a plain array?
