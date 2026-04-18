# Submission Notes

## Approach

I started by exploring the codebase to understand how the service and routing layers interact.  
Since the project had no existing tests, I followed a test-first approach — writing unit and integration tests to validate current behavior before making any changes.

This helped uncover issues naturally through failing test cases instead of manually inspecting the code.

---

## What I did

- Added unit tests for service layer and integration tests for API routes
- Achieved ~86% test coverage across the codebase
- Covered both happy paths and edge cases (invalid input, missing data, non-existent IDs)
- Identified bugs through failing tests and fixed one of them
- Implemented the `/assign` endpoint with validation and proper error handling

---

## Bugs Identified

### 1. Pagination Issue
- **Problem:** Page 1 skipped initial tasks  
- **Cause:** Incorrect offset calculation (`page * limit`)  
- **Fix:** Updated to `(page - 1) * limit`  

### 2. Status Filtering
- **Problem:** Partial matches were allowed  
- **Cause:** Use of `.includes()` instead of strict equality  

### 3. Task Completion
- **Problem:** Completing a task unintentionally modified unrelated fields (priority)  
- **Cause:** Incorrect update logic in `completeTask`  

---

## Bug Fix Implemented

I chose to fix the pagination issue since it directly affects API correctness and user-facing behavior.

---

## Feature Added

### Assign Task

- **Endpoint:** `PATCH /tasks/:id/assign`
- Accepts an `assignee` string and attaches it to the task
- Validates:
  - Empty or whitespace-only values are rejected
  - Non-existent task returns 404
- Overwrites existing assignee (kept simple, but noted as a design decision)

---

## Testing Strategy

- Unit tests for all service layer functions
- Integration tests using Supertest for API endpoints
- Focused on behavior rather than implementation details

### Edge cases covered:
- Invalid input data
- Missing required fields
- Non-existent task IDs
- Pagination boundaries

---

## Test Coverage

- Statements: 86.84%
- Branches: 73.49%
- Functions: 89.65%
- Lines: 86.95%

Coverage generated using Jest.

---

## If I had more time

- Replace in-memory store with a persistent database
- Introduce schema validation (Joi/Zod)
- Improve centralized error handling
- Add authentication and authorization
- Add more edge case coverage for stats and filtering

---

## Open Questions

- Should assigning a task overwrite an existing assignee or return a conflict?
- Should completed tasks be assignable, or should that be restricted?