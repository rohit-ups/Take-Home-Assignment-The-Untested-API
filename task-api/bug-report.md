# Bug Report & Testing Journey

## The Journey
When I first started writing tests for this API, I wrote a standard "happy path" test for the `getByStatus` function. I created a task with the status `done`, searched for `done`, and expected it to return 1 task. The test passed perfectly!

However, I realized that I needed to test edge cases. What if a user searches for a partial status, like `do`? 
I wrote a new test:
1. Arrange: I created a task with the status `done`.
2. Act: I searched for the status `do`.
3. Assert: I expected the array length to be 0, because `do` is not a valid status, and it doesn't exactly match `done`.

Test Output (The Failure):
text
● Task Service › getByStatus() › Should not return tasks if the status is only a partial match (The Bug!)

Expected: 0
Received: 1
```

**How I realized the bug:**
Reading the Jest logs, I saw that it received `1` task instead of `0`. This meant the API was returning the `done` task even though I searched for `do`. I looked into `src/services/taskService.js` and saw this code:
`tasks.filter((t) => t.status.includes(status))`

The `.includes()` method matches partial strings! So `'done'.includes('do')` evaluated to `true`.

## The Fixes

### 1. Status Filter Bug
 Expected Behavior: Filtering by status should only return tasks that exactly match the requested status string.
 Behavior: It was returning partial matches (e.g., searching `do` returned `done` and `todo` tasks).
 The Fix: I changed `.includes(status)` to strict equality `=== status`.

### 2. Pagination Offset Bug
 Expected Behavior: Requesting page 1 should return the very first items in the database (skipping 0 items).
 Actual Behavior: The math `offset = page * limit` meant that Page 1 with a limit of 10 was skipping the first 10 items.
 The Fix: I updated the math to standard pagination logic: `const offset = (page - 1) * limit;`.

Both bugs are now fixed, and all tests are passing!
