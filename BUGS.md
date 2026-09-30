# Bug Report

## Testing Approach

- Wrote integration tests using Supertest for all endpoints
- Wrote unit tests for the service layer
- Covered happy paths and edge cases
- Used failing tests to identify bugs before fixing them

---

## Bugs Identified

### 1. Incorrect Pagination Logic

- **Issue:** Page 1 skipped the first set of tasks
- **Root cause:** Offset was calculated using `page * limit`
- **Fix:** Updated to `(page - 1) * limit`

---

### 2. Incorrect Status Filtering

- **Issue:** Partial matches were allowed (e.g., "do" matched "todo")
- **Root cause:** Used `.includes()` instead of exact comparison
- **Fix:** Replaced with strict equality (`===`)

---

### 3. Priority Modified on Completion

- **Issue:** Completing a task reset its priority to "medium"
- **Root cause:** Priority was hardcoded inside `completeTask`
- **Fix:** Removed the priority override

---

### 4. Invalid Query Parameters Handling

- **Issue:** Invalid `page` or `limit` values caused incorrect pagination
- **Root cause:** Pagination logic executed even with invalid values
- **Fix:** Added validation and fallback defaults for query parameters

---

## What I Would Test Next

- Input sanitization (large strings, unexpected formats)
- Concurrent updates/deletes
- Behavior with large datasets (pagination at scale)