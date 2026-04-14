# Bug Report

This report documents each bug found in the Task Manager API, why it happened, the impact, and exactly what code was changed.

## 1) Pagination Off-By-One

- Location: src/services/taskService.js (getPaginated)
- Expected behavior:
	Page 1 should start from index 0, so page=1 and limit=10 returns the first 10 tasks.
- Actual behavior:
	The service calculated offset as page * limit, so page=1 started at index 10 and skipped the first page entirely.
- Why this happened:
	The implementation mixed one-based page semantics (API contract) with zero-based offset math (array slicing).
- Risk/impact:
	Clients received incomplete or empty lists for first-page requests, causing incorrect UI rendering and misleading pagination.
- How it was discovered:
	Integration test for GET /tasks?page=1&limit=2 returned the wrong rows.
- What changed:
	Offset was corrected to (page - 1) * limit.
	Additional safety was added by clamping page and limit to minimum 1 in the service.
- Validation added:
	Unit tests now assert one-based page behavior and clamp behavior for invalid numeric inputs.

## 2) Status Filter Matched Partial Strings

- Location: src/services/taskService.js (getByStatus)
- Expected behavior:
	Status filtering should only match exact status values: todo, in_progress, done.
- Actual behavior:
	Filtering used string includes, so partial fragments (for example, "pro") could match in_progress.
- Why this happened:
	Substring matching was used for a field that is categorical/enumerated, not free text.
- Risk/impact:
	Incorrect task subsets were returned, which can inflate or hide work items in dashboards.
- How it was discovered:
	Unit test intentionally passed a status fragment and observed false-positive matches.
- What changed:
	Matching was switched from includes to strict equality.
- Validation added:
	Service test now verifies partial status values produce zero matches.

## 3) Completing a Task Overwrote Priority

- Location: src/services/taskService.js (completeTask)
- Expected behavior:
	Completing a task should set status to done and set completedAt, without mutating unrelated fields.
- Actual behavior:
	The function forcibly reset priority to medium.
- Why this happened:
	Completion logic included an unrelated field mutation, likely from an earlier assumption that completed tasks should be normalized.
- Risk/impact:
	Business-critical prioritization data was silently lost when users completed tasks.
- How it was discovered:
	Route-level test for PATCH /tasks/:id/complete asserted original priority should remain unchanged and failed.
- What changed:
	Priority overwrite was removed from completion flow.
	Completion timestamp logic now sets completedAt only when needed and preserves existing completion timestamps.
- Validation added:
	Unit and integration tests verify completion does not change priority.

## 4) Unsafe Update Allowed Immutable Field Overrides

- Location: src/services/taskService.js (update)
- Expected behavior:
	Immutable fields (id, createdAt) must never be client-overwritable.
- Actual behavior:
	Update merged arbitrary request payload keys into persisted task objects.
- Why this happened:
	Broad object spread was used without a field allow-list.
- Risk/impact:
	Data integrity and traceability could break (identity spoofing, createdAt tampering).
- How it was discovered:
	Unit test passed id and createdAt in update payload and observed persisted values change.
- What changed:
	Update now uses a strict mutable-field allow-list:
	title, description, status, priority, dueDate, assignee.
	Unknown or immutable keys are ignored.
	Mutable string fields are normalized (trimmed) before persistence.
- Validation added:
	Unit tests verify immutable fields remain unchanged and normalization is applied.

## 5) Missing List Query Validation

- Location: src/routes/tasks.js and src/utils/validators.js
- Expected behavior:
	Invalid list query params should fail fast with clear 400 responses.
- Actual behavior:
	Invalid status/page/limit values were accepted, causing inconsistent behavior and ambiguous API responses.
- Why this happened:
	Route accepted raw query params and only loosely parsed page/limit defaults.
- Risk/impact:
	Clients could send logically invalid requests and receive inconsistent data, making troubleshooting difficult.
- How it was discovered:
	Integration tests for status=invalid, page=0, and limit=999 failed expected validation behavior.
- What changed:
	Added validateListQuery with strict checks:
	status must be one of todo/in_progress/done,
	page and limit must be positive integers,
	limit has an upper bound of 100.
	Route now validates before data access.
- Validation added:
	Route and validator tests now cover valid and invalid query combinations.

## 6) Assignment Endpoint Missing

- Location: src/routes/tasks.js and src/services/taskService.js
- Expected behavior:
	PATCH /tasks/:id/assign should exist and support safe assignment behavior.
- Actual behavior:
	Endpoint did not exist in initial codebase.
- Why this happened:
	Feature was defined in assignment scope but never implemented in source.
- Risk/impact:
	API contract was incomplete and downstream clients could not assign ownership.
- How it was discovered:
	Contract review against assignment requirements during integration test planning.
- What changed:
	Added PATCH /tasks/:id/assign route and service implementation with:
	payload validation (non-empty string assignee),
	404 on missing task,
	409 on reassignment to a different user,
	idempotent success when assigning the same user again.
	Design decision rationale:
	409 Conflict is used for reassignment because the request conflicts with current task ownership state (rather than being a malformed payload), and repeated assignment to the same user returns success to preserve idempotency.
- Validation added:
	Integration tests cover happy path, empty assignee, missing task, idempotent repeat, and conflict behavior.

## 7) Additional Quality Fixes (Non-functional Defects)

- Added GET /tasks/:id for direct single-task retrieval.
- Added case-insensitive assignee filtering for GET /tasks to avoid client-casing mismatches.
- Added consistent JSON 404 response for unknown routes.
- Added defensive copy behavior from service methods to prevent accidental external mutation of in-memory state.
- Added explicit comments in updated source sections for maintainability and reviewer clarity.
