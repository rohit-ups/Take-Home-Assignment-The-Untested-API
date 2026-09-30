# Bug Report

## Bug 1: Pagination skips the first page

### Location

`src/services/taskService.js`

`getPaginated()`

### Expected behavior

When requesting page 1 with limit 10, the API should return the first 10 tasks.

### Actual behavior

Page 1 skips the first 10 tasks and returns tasks 11 onward.

### How it was discovered

A unit test created 15 tasks and requested page 1 with limit 10. The test expected 10 tasks starting with Task 1 but received only Tasks 11–15.

### Why it happens

The offset was calculated as:

`page * limit`

For page 1 and limit 10, this produces an offset of 10. Since arrays are zero-indexed, this starts at Task 11.

### Fix

The offset was changed to:

`(page - 1) * limit`

This makes page 1 start at index 0.

### Verification

After applying the fix, the pagination tests for page 1 and page 2 passed successfully.