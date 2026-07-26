# Bug Report

## Bug 1: PUT `/tasks/:id` Returns 404 on Existing Tasks

### Expected Behavior

Sending a PUT request with valid update data to an existing task ID should successfully update the task and return a `200 OK` response containing the updated object.

### Actual Behavior

The server returns a `404 Not Found` error, even when the task ID definitively exists in the current data store.

### How I Discovered It

Testing the endpoint in Postman using a recently generated UUID returned a `404`. Reviewing the router code revealed a destructuring error:

```js
const { id } = req.params.id;
```

This caused an undefined ID to be passed to the service layer.

### Proposed Fix

Update the route handler to correctly extract the ID and evaluate the updated task:

```js
const { id } = req.params;
const updatedTask = taskService.editTask(id, req.body);

if (!updatedTask) {
  return res.status(404).json({ error: 'Task not found' });
}
```

## Bug 2: Partial Status Matching Returns Incorrect Tasks

### Expected Behavior

Filtering tasks by a specific status string should return only the tasks that match that exact status.

### Actual Behavior

The filter relies on substring matching. If a client filters for the string `"do"`, the API accidentally returns tasks with both `"todo"` and `"done"` statuses.

### How I Discovered It

Conducting a code review of the `getByStatus` utility function in the service layer revealed the use of the `.includes()` method rather than strict equality.

### Proposed Fix

Replace `.includes()` with the strict equality operator (`===`) inside the filter callback:

```js
const getByStatus = (status) => db.tasks.filter((t) => t.status === status);
```
