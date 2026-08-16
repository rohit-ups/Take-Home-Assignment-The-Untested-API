# Bug Report

## Bug 1: Pagination returns the wrong page

### Location

`src/services/taskService.js`

### Problem

The `getPaginated()` function calculated the pagination offset as:
js
const offset = page * limit;

The API uses one-based page numbers, so page 1 should start at index 0.

For example:

Page 1, limit 2 → expected indexes 0-1
Page 2, limit 2 → expected indexes 2-3

`The original implementation calculated:`

Page 1: 1 × 2 = 2
Page 2: 2 × 2 = 4

This caused the first page to skip the first two tasks and the second page to return no tasks when only three tasks existed.

`How it was discovered`

A unit test was written for getPaginated():

Page 1 with limit 2 should return Task 1 and Task 2.
Page 2 with limit 2 should return Task 3.

The tests failed against the original implementation.

`Fix`

The offset was changed to:

const offset = (page - 1) * limit;

This correctly converts the one-based page number into a zero-based array offset.

Bug 2: Status filtering performs partial matching
Location

`src/services/taskService.js`

## Problem

The original implementation used:

`const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));`

This performs a substring match instead of an exact status match.

For example:

'todo'.includes('to') // true

Therefore:

GET /tasks?status=to

could incorrectly return tasks whose status is todo.

The API defines specific status values:

todo
in_progress
done

Therefore status filtering should use an exact match.

# How it was discovered

An integration test was added that created a todo task and requested:

GET /tasks?status=to

The expected response was an empty array.

The test failed against the original implementation because includes() matched the partial value.

Fix

The filtering logic was changed to:

const getByStatus = (status) => tasks.filter((t) => t.status === status);

This ensures that only tasks with the exact requested status are returned.

Verification

Both bugs were reproduced with automated tests before fixing them.

# After applying the fixes:

Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total

Both regression tests now pass.



### Step 2

