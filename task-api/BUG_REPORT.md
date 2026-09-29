# Bug Report

## Bug: Pagination skips the first page

### Expected Behavior

When requesting paginated tasks using a 1-based page number, page 1 should return the first `limit` tasks.

For example:

```text
GET /tasks?page=1&limit=2
```

should return:

```text
Task 1
Task 2
```

Page 2 should then return:

```text
Task 3
Task 4
```

when those tasks exist.

### Actual Behavior

The pagination implementation calculated the offset using:

```js
const offset = page * limit;
```

This caused page 1 to start at index `limit` instead of index `0`.

For example, with 3 tasks and `limit=2`:

* Page 1 started at index `2`, skipping Task 1 and Task 2.
* Page 2 started at index `4`, returning an empty array.

### How It Was Discovered

The bug was discovered while writing unit tests for the `getPaginated()` service method.

The test for the first page expected the first two tasks but received only the third task.

A second test for page 2 also showed that the expected third task was not returned.

Integration testing confirmed the same behavior through:

```text
GET /tasks?page=1&limit=2
```

### Code Location

File:

```text
src/services/taskService.js
```

Function:

```text
getPaginated()
```

### Why It Happens

The API treats `page` as a 1-based page number, where:

```text
page 1 → first page
page 2 → second page
page 3 → third page
```

However, JavaScript array indexes are 0-based.

The original implementation calculated:

```js
const offset = page * limit;
```

For page 1 and limit 2, this produces:

```text
1 × 2 = 2
```

which starts the slice at array index 2 instead of index 0.

### Fix

The offset calculation was changed to:

```js
const offset = (page - 1) * limit;
```

This correctly converts the 1-based page number into a 0-based array offset.

Examples:

```text
page 1, limit 2 → offset 0
page 2, limit 2 → offset 2
page 3, limit 2 → offset 4
```

### Regression Tests

The following tests were added to verify the fix:

* First page returns the first `limit` tasks.
* Second page returns the next set of tasks.
* Integration test verifies pagination through the `/tasks` API endpoint.

The pagination tests now pass successfully.

### Verification

Final test results:

```text
Test Suites: 2 passed, 2 total
Tests:       40 passed, 40 total
```

Coverage:

```text
Statements: 93.37%
Branches:   81.92%
Functions:  93.1%
Lines:      92.7%
```

The pagination bug is therefore covered by regression tests and the overall test suite passes successfully.
