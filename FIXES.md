# Fixes Implemented

## 1. Pagination Logic

- Corrected offset calculation to ensure proper pagination
- Updated from `page * limit` to `(page - 1) * limit`
- This ensures page 1 starts from the first record

---

## 2. Status Filtering

- Replaced partial matching with exact comparison
- Prevents incorrect matches like `"do"` matching `"todo"`
- Improved accuracy of filtered results

---

## 3. Task Completion Behavior

- Removed unintended priority modification when marking a task as complete
- Task priority now remains unchanged
- Ensures data consistency

---

## 4. Query Parameter Handling

- Added validation for `page` and `limit` query parameters
- Invalid values now fallback to defaults (`page = 1`, `limit = 10`)
- Prevents incorrect or empty pagination results

---

## 5. Test Coverage Improvements

- Added comprehensive API tests using Supertest
- Added unit tests for service layer
- Covered edge cases and regression scenarios
- Achieved >90% test coverage across the codebase



## Assign Endpoint Design

Implemented `PATCH /tasks/:id/assign` to assign a user to a task.

### Validation
- `assignee` must be a non-empty string
- Input is trimmed to remove extra whitespace
- Maximum length limited to 100 characters

### Edge Cases
- Returns 404 if task does not exist
- Returns 400 for invalid input (empty, non-string, too long)
- Allows reassignment by overwriting existing assignee

### Design Decision
The endpoint keeps validation simple while ensuring clean data.  
Allowing reassignment avoids unnecessary restrictions and keeps the API flexible.