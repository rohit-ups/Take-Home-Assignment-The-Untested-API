# Submission Notes & Engineering Reflections

This document records the implementation details for the newly added `PATCH /tasks/:id/assign` endpoint and provides responses to the engineering reflection questions outlined in `ASSIGNMENT.md`.

---

## 1. Feature Implementation: `PATCH /tasks/:id/assign`

### Overview
The `PATCH /tasks/:id/assign` endpoint allows assigning a task to a specified user by storing an `assignee` string on the task object.

### Endpoint Contract
* **HTTP Route**: `PATCH /tasks/:id/assign`
* **Request Body**: `{ "assignee": "string" }`
* **Response Body**: Updated task object (JSON)

### Key Design Decisions & Validation Rules
1. **Input Validation (`validateAssignTask`)**:
   * Evaluates whether `req.body.assignee` is present, of type `string`, and non-empty after trimming whitespace (`!body.assignee || typeof body.assignee !== 'string' || body.assignee.trim() === ''`).
   * Returns `400 Bad Request` with `{ error: "assignee is required and must be a non-empty string" }` if validation fails.
   * Whitespace surrounding valid names is automatically trimmed (`req.body.assignee.trim()`).
2. **Task Existence Verification**:
   * Looks up the task by `:id` via `taskService.assignTask()`.
   * Returns `404 Not Found` with `{ error: "Task not found" }` matching the existing API response structure if the ID does not exist.
3. **Data Field Preservation**:
   * Updates only `assignee` on the target task.
   * Preserves all other task fields (`id`, `title`, `description`, `status`, `priority`, `dueDate`, `completedAt`, `createdAt`).
4. **Task Schema Consistency**:
   * Initialized default `assignee: null` on task creation in `taskService.create()`.

---

## 2. Engineering Reflections

### Q1: What would you test next if you had more time?
1. **Concurrent Request Race Conditions**: Test behavior when multiple concurrent requests perform updates or assignment changes on the same task ID simultaneously in the in-memory store.
2. **Payload Edge Cases & Extreme Inputs**: Test behavior with large strings, special Unicode/emoji characters in `title`, `description`, and `assignee`, as well as malformed JSON payloads.
3. **Overdue Boundary Conditions**: Test `getStats()` overdue calculations around exact millisecond boundaries relative to `Date.now()`.
4. **Load & Performance Testing**: Benchmark in-memory array operation latencies (`findIndex`, `slice`, `filter`) when operating on datasets of 10,000+ tasks.

### Q2: Anything that surprised you in the codebase?
1. **Off-by-One Pagination Calculation**: `getPaginated` calculates `offset = page * limit` instead of `(page - 1) * limit`. For `page=1, limit=10`, `offset = 10`, which skips the first 10 tasks entirely. Because `parseInt('0') || 1` defaults `0` to `1`, the first page of items (0–9) is completely unretrievable.
2. **Priority Reset on Completion**: `completeTask()` previously contained a hardcoded `priority: 'medium'` property, causing any completed task to silently lose its original priority (e.g. `'high'`).
3. **Substring Matching in Status Filter**: `getByStatus()` uses `String.prototype.includes()` instead of strict equality `===`, causing queries like `status=do` to return both `todo` and `done` tasks.

### Q3: Any questions you'd ask before shipping this to production?
1. **Data Persistence Strategy**: "What database (e.g., PostgreSQL, MongoDB) should replace the in-memory store before launching to production?"
2. **Pagination API Specification**: "Should pagination use 1-based indexing (`page=1`), 0-based indexing (`page=0`), or cursor-based pagination?"
3. **Authentication & Authorization**: "Should task assignment be restricted to authenticated users or specific project roles, and how should user identity be validated?"
4. **Observability & Logging**: "What logging/APM library (e.g. Winston, Datadog) should replace `console.error` in the Express error handling middleware?"
