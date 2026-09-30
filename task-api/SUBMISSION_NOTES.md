# Submission Notes

## What I Tested

I tested the existing Task Manager API at both service and integration levels.

### Unit Tests

The following service functionality was tested:

- Creating tasks
- Default task values
- Custom task values
- Getting all tasks
- Finding tasks by ID
- Filtering tasks by status
- Pagination
- Updating tasks
- Removing tasks
- Completing tasks
- Task statistics
- Overdue task calculation

### Integration Tests

The following API endpoints were tested:

- `GET /tasks`
- `GET /tasks?status=todo`
- `GET /tasks?page=1&limit=10`
- `POST /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `PATCH /tasks/:id/complete`
- `PATCH /tasks/:id/assign`
- `GET /tasks/stats`

Both successful requests and error/edge cases were covered.

## New Feature

Added:

```text
PATCH /tasks/:id/assign