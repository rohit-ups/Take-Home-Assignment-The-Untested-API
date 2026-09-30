# Implementation Notes

## New Feature: Assign Task

Added:

```text
PATCH /tasks/:id/assign
```

### Request

The endpoint accepts an `assignee` name as a string:

```json
{
  "assignee": "Amar"
}
```

### Design Decisions

* `assignee` must be a non-empty string.
* Leading and trailing whitespace is removed before storing the assignee.
* Missing, non-string, empty, or whitespace-only values return `400 Bad Request`.
* If the task does not exist, the endpoint returns `404 Not Found`.
* Reassignment is allowed. If a task is already assigned, a new assignment replaces the previous assignee.
* The existing task object is preserved and only the `assignee` field is added or updated.

### Why Reassignment Is Allowed

The assignment did not explicitly require preventing reassignment. Allowing reassignment keeps the endpoint simple and supports a common task-management workflow where responsibility can move from one user to another.

If the product required assignment history or restrictions, that would need additional requirements and data modeling.

## Testing

Both unit and integration tests were added.

### Unit Tests

The `taskService` tests cover:

* Task creation
* Retrieving all tasks
* Finding tasks by ID
* Filtering by status
* Pagination
* Updating tasks
* Removing tasks
* Completing tasks
* Task statistics
* Assigning and reassigning tasks

### Integration Tests

The API tests cover:

* `POST /tasks`
* `GET /tasks`
* `PUT /tasks/:id`
* `DELETE /tasks/:id`
* `PATCH /tasks/:id/complete`
* `GET /tasks/stats`
* `PATCH /tasks/:id/assign`

Edge cases include missing values, invalid values, unknown task IDs, empty assignees, and reassignment.

## Bug Found and Fixed

Testing uncovered an off-by-one pagination bug in `src/services/taskService.js`.

The original implementation calculated the offset as:

```js
const offset = page * limit;
```

This caused page 1 to skip the first `limit` tasks.

It was changed to:

```js
const offset = (page - 1) * limit;
```

The fix is covered by unit and integration tests.

See `BUG_REPORT.md` for the detailed bug report.

## Surprises / Tradeoffs

### Pagination

The pagination implementation used a 1-based page number at the API level but incorrectly converted it to an array offset. This was not immediately obvious from reading the implementation and was caught through tests.

### In-Memory Storage

The application stores tasks in memory, so all data is lost when the application restarts. This is acceptable for the assignment but would not be suitable for a production task-management service.

### API Documentation vs Existing Implementation

The written API description mentions status values such as `pending`, `in-progress`, and `completed`, while the existing implementation uses:

```text
todo
in_progress
done
```

I treated the existing application's implementation and validators as the source of truth rather than changing the existing behavior without a requirement to do so.

## What I Would Test Next

If more time were available, I would add tests for:

* Invalid pagination values such as negative pages or limits
* Pagination when the requested page is beyond the available data
* Invalid date formats
* More combinations of task status and priority
* Overdue tasks in `GET /tasks/stats`
* Boundary cases around due dates
* Updating a task with every supported field
* Behavior when unexpected fields are supplied

## Questions Before Production

Before deploying this API to production, I would clarify:

1. Should tasks be persisted in a database instead of memory?
2. Should users be authenticated before creating or modifying tasks?
3. Should users only be allowed to assign tasks to valid application users?
4. Should assignment changes be tracked as history?
5. What are the exact accepted status values and should the API documentation be updated to match the implementation?
6. What should happen for invalid or negative pagination parameters?
7. Should pagination responses include metadata such as total count and total pages?
8. What validation rules should apply to dates and other task fields?
9. Are there authorization rules for updating, completing, deleting, or assigning tasks?
10. What logging and error-handling requirements are expected for production?

## Final Verification

The complete test suite currently passes:

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

This meets the assignment's target of 80%+ overall coverage.
