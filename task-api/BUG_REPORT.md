# Task API Test and Bug Report

## Test results

The suite contains 32 Jest tests across direct service unit tests and Supertest API integration tests.

```text
Test Suites: 2 passed, 2 total
Tests:       32 passed, 32 total

File             | % Stmts | % Branch | % Funcs | % Lines
All files        |   95.42 |     91.2 |   92.85 |   94.92
```

Run the same checks with:

```bash
npm test
npm run coverage
```

## Bugs found and fixed

### 1. Page 1 skipped the first page

- **Location:** `src/services/taskService.js`, `getPaginated()`.
- **Expected:** `getPaginated(1, 10)` returns items at indexes 0–9.
- **Actual:** The original `page * limit` offset started page 1 at index 10, making the first ten tasks unreachable through pagination.
- **Cause:** The offset formula treated the public 1-based page number as a 0-based page number.
- **Discovery:** A unit test created six tasks and expected page 1 with a limit of five to begin with `Task 1`; it began with `Task 6`.
- **Fix:** Calculate the offset with `(page - 1) * limit`.

### 2. Status filtering used partial matches

- **Location:** `src/services/taskService.js`, `getByStatus()`.
- **Expected:** A status filter returns only tasks whose status exactly equals the requested status.
- **Actual:** `getByStatus('progress')` matched `in_progress`; other substrings could also return unrelated tasks.
- **Cause:** `String.prototype.includes()` performs substring matching.
- **Discovery:** A unit test expected `getByStatus('progress')` to return an empty array but received the `in_progress` task.
- **Fix:** Compare with strict equality and reject unsupported status query values at the API boundary.

### 3. Completing a task reset its priority

- **Location:** `src/services/taskService.js`, `completeTask()`.
- **Expected:** Completion changes lifecycle fields only: `status` and `completedAt`.
- **Actual:** Every completed task was assigned `priority: 'medium'`, corrupting the original priority used for reporting and audit history.
- **Cause:** The update object contained an unrelated hard-coded priority, likely left over from copied update logic.
- **Discovery:** A test completed a high-priority task and received a medium-priority task.
- **Fix:** Remove the priority assignment so the existing value is preserved.

## Additional hardening

- Titles and descriptions are trimmed before create/update storage.
- Invalid status filters return `400` instead of misleading results.
- Nonnumeric, zero, and negative pagination values use the documented defaults.
- Generic updates cannot overwrite `id`, `createdAt`, or `completedAt`.

## Assignment feature

`PATCH /tasks/:id/assign` accepts a non-empty string, trims it, and stores it as `assignee`. Invalid or whitespace-only values return `400`, missing tasks return `404`, and a later valid assignment replaces the previous assignee. Unassigned tasks omit the optional field until they are assigned; adding `assignee: null` to every task was unnecessary for the requested endpoint.

## Notes before production

### What I would test next

With more time, I would connect this API to a small frontend and add full-stack end-to-end tests for the main user journey: create a task, filter and paginate the list, assign it, complete it, refresh the page, and verify that the state is still correct. I would run those tests against a database-backed version so they also cover the UI/API contract, persistence, network failures, and concurrent updates rather than only the in-memory happy path.

### What surprised me

The pagination offset surprised me because `page * limit` looks reasonable at a glance but silently makes the entire first page unreachable in a 1-based API. `completeTask()` changing priority was also unexpected because completion and prioritization are separate concerns. On the positive side, the separation between routes, validators, and the service made it straightforward to test business logic directly and API behavior through Supertest.

### Tradeoffs

The implementation keeps the existing in-memory store, plain-array pagination response, single assignee, and `204` delete contract. It adds no dependencies or speculative persistence layer. The assignment README also uses status names that conflict with the source and assignment brief; the implementation retains `todo`, `in_progress`, and `done`, which are used by the running API.

### Questions for the team

- Should pagination remain 1-based, as the public API now assumes?
- Is the in-memory store intentional beyond the MVP? If not, what database and migration strategy should be used?
- Should assignment remain single-owner, or will the schema need multiple assignees?
- Which backend frameworks and technologies would interns get to work with and test during the internship?
- Would the internship focus mainly on writing tests, or would interns also contribute to full-stack feature development?
