# Submission: The Untested API

## Day 1: Test & Bug Report
I began by writing integration tests against the provided API Reference. This test-driven approach surfaced several discrepancies between the expected behavior and the actual implementation. 

**Bugs Discovered:**
1.  **Pagination Offset is 0-indexed (Fixed):**
    *   **Expected:** `?page=1&limit=10` should return items 0-9.
    *   **Actual:** `page * limit` results in an offset of `10`, entirely skipping the first page.
    *   **Discovery:** My pagination integration test expected item `0` but received item `10`.
    *   **Proposed Fix:** Update offset calculation to `(page - 1) * limit`.

2.  **Status Filtering overrides Pagination:**
    *   **Expected:** `?status=todo&page=1&limit=10` should return 10 todo items.
    *   **Actual:** `router.get('/')` returns early if `status` exists, completely ignoring `page` and `limit`.
    *   **Discovery:** My combined parameters integration test returned an unpaginated array.
    *   **Proposed Fix:** Unify the filtering and slicing logic in `taskService.js` so both parameters can be applied to the same dataset before returning.

3.  **Inexact Status Filtering:**
    *   **Expected:** `?status=in` should return 0 tasks.
    *   **Actual:** Returns tasks with `in_progress` because `getByStatus()` uses `.includes()`.
    *   **Discovery:** Searching for a partial string falsely returned full matches.
    *   **Proposed Fix:** Change `t.status.includes(status)` to strict equality (`===`).

4.  **Task Completion mutates Priority:**
    *   **Expected:** Completing a high-priority task leaves its priority untouched.
    *   **Actual:** `completeTask()` spontaneously forces priority to `medium`.
    *   **Discovery:** Explicitly tested state preservation on completion.
    *   **Proposed Fix:** Remove the hardcoded priority mutation from `completeTask()`.

5.  **PUT allows System Field Mutation:**
    *   **Expected:** `id` and `createdAt` cannot be modified by the client.
    *   **Actual:** `update()` uses an unprotected object spread, allowing system field overwrites.
    *   **Discovery:** Sent a malicious `id` string via PUT, which successfully overwrote the internal UUID.
    *   **Proposed Fix:** Explicitly map client fields to a new object while preserving the existing `id` and `createdAt`.

---

## Day 2: Fix & Feature

**Part B: Bug Fix**
I implemented the fix for the **Pagination Offset** bug. I updated `getPaginated` in `taskService.js` to use `(page - 1) * limit`. My failing Jest test now correctly passes.

**Part C: New Feature (`PATCH /tasks/:id/assign`)**
I implemented the task assignment endpoint with the following design decisions:
*   **Validation:** Added strict validation to ensure `assignee` is a string. I rejected empty strings or whitespace-only strings to prevent accidental "silent unassignments."
*   **Data Preservation:** Used object spread in the service layer to ensure assigning a user only updates the `assignee` field, leaving system fields, statuses, and timestamps strictly untouched.
*   **Edge Cases:** Added test coverage for 404s (non-existent task) and 400s (invalid input).

---

## Final Thoughts & Questions
*   **Next Steps:** If I had more time, I would abstract the in-memory data store behind an interface. Right now, `taskService.js` mixes business logic directly with data access, which will make swapping to a real database (like PostgreSQL) painful later. 
*   **Surprises:** I was surprised that the internal status vocabulary (`todo`, `in_progress`, `done`) was entirely different from the vocabulary documented in the API Reference (`pending`, `in-progress`, `completed`). I would prioritize fixing that mismatch, as it immediately breaks client integrations.
*   **Production Questions:** Before shipping, I would ask: *What is our strategy for concurrent updates?* Since the store is entirely memory-based, what happens if two users try to `PATCH` the same task at the exact same millisecond? We need a database with transaction locks before this handles real traffic.