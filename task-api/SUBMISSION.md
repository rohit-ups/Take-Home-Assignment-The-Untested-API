# Submission Notes

This document details the design decisions, codebase surprises, testing tradeoffs, and product questions for the Task Manager API submission.

---

## 1. Feature Design Decisions (`PATCH /tasks/:id/assign`)

We made the following key design decisions for implementing the task assignment feature:
* **Task Object Extension**: We initialized the `assignee` field as `null` by default on task creation (in `taskService.create`). This ensures that the field is always present in the JSON response payload, maintaining a consistent API schema.
* **Input Validation**:
  * We enforced that the request body *must* contain the key `assignee` and its value must be a non-empty string.
  * Empty strings (or whitespace-only strings) are rejected with a `400 Bad Request` code to prevent tasks from being assigned to empty/blank names.
* **Reassignment Policy**: We decided to allow tasks to be reassigned to a new assignee if they are already assigned, as this is standard behavior in task management platforms. Reassigning updates the field directly and returns the updated task object.
* **404 Handling**: If the task does not exist, we return a standard `404 Not Found` with a `{ error: 'Task not found' }` payload to remain consistent with existing routes like update/complete.

---

## 2. Surprises & Tradeoffs in the Codebase

* **In-Memory Mutability**: The service relies on directly mutating arrays (`let tasks = []` and array indices). While simple, this is susceptible to race conditions under asynchronous execution or multi-user environments. For safety in testing, we implemented `_reset()` to guarantee isolation between test cases.
* **Sub-optimal Query Filter Behavior**:
  * We were surprised that the original status filter used `.includes()` substring matching. This allowed users to fetch `'in_progress'` tasks by querying `?status=progress`. We changed this to strict string matching to prevent unexpected return lists.
* **Resetting Priority on Completion**:
  * We were surprised to find that completing a task reset its priority to `'medium'` unconditionally. In a real-world task manager, completing a task should not lose its original priority data (e.g. knowing that a completed task was high priority is valuable for reporting). We removed this mutation.
* **No Controller Folder**:
  * What surprised me the most was that there is no controller folder in the project. The code that checks inputs and runs the tasks is all written inside the routing files. Usually, it is better to keep routing and task logic in separate folders to keep the project clean.
---

## 3. What to Test Next

If we had more time, we would implement:
* **Concurrent Request Simulation**: Tests simulating multiple parallel requests updating, assigning, or completing the same task to ensure no memory corruption occurs.
* **UUID Validity Verification**: Explicit schema-validation tests asserting that all returned `id` values are valid UUIDv4 strings.
* **Stats Date Sensitivity**: Additional edge-case unit tests for the overdue logic using precise timezone transitions.
* **Test All Links with Postman**:
  * If we had more time, we would build a complete Postman collection to test and check every single link (endpoint) to make sure they all work perfectly.
---

## 4. Questions Before Shipping to Production

Before deploying this API to production, we would clarify:
1. **Persistent Storage**: Since the store is fully in-memory, all data is lost upon server restarts. Which database (e.g., PostgreSQL, MongoDB) should we integrate to persist the task data?
2. **User Identity Integration**: The assignment feature currently accepts an arbitrary string as the assignee name. Should we restrict this to valid user IDs registered in a database, and implement user authentication/authorization?
3. **Pagination Standard**: Is pagination intended to be 1-based (which we corrected it to) or 0-based? Also, should we define maximum limits for page size to prevent memory overload when fetching large arrays?
