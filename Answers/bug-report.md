# bug report

## bug 1 - getByStatus uses substring match instead of exact match fixed

- **expected:** `GET /tasks?status=todo` returns only tasks with status `todo`
- **what happens:** uses `.includes()` so partial strings like `?status=tod` also match `todo` tasks
- **how i found it:** reading through `taskService.js` and noticed `.includes()` on a string, wrote a test passing `tod` and it returned results
- **fix:** change `t.status.includes(status)` to `t.status === status` in `getByStatus`


## bug 2 - pagination off by one

- **expected:** `GET /tasks?page=1&limit=2` returns the first 2 tasks
- **what happens:** `offset = page * limit` so page 1 gives offset 10, skips the first results entirely
- **how i found it:** wrote a pagination test and it returned the wrong tasks, traced it back to the offset math in `getPaginated`
- **fix:** change offset to `(page - 1) * limit` in `taskService.js`, or pass `page - 1` from the route


## bug 3 - empty string passes validation on status, priority, dueDate

- **expected:** sending `status: ""` or `priority: ""` should return 400
- **what happens:** empty string is falsy so the validator skips the check, empty string gets stored on the task
- **how i found it:** wrote edge case tests for empty strings and they all returned 201 instead of 400
- **fix:** in `validators.js` change the checks from `if (body.status && ...)` to `if (body.status !== undefined && ...)`


## bug 4 - completeTask resets priority to medium unconditionally

- **expected:** completing a high priority task should keep its priority as high
- **what happens:** `completeTask` in `taskService.js` hardcodes `priority: 'medium'` so any task becomes medium after completing
- **how i found it:** wrote a test creating a high priority task then completing it, priority came back as medium
- **fix:** remove `priority: 'medium'` from the spread in `completeTask` so it keeps the original priority


## coverage summary

```
All files        |   95.36 |    90.47 |    93.1 |   94.89 |
 app.js          |   69.23 |       75 |       0 |   69.23 |
 tasks.js        |     100 |    96.29 |     100 |     100 |
 taskService.js  |     100 |    94.73 |     100 |     100 |
 validators.js   |   86.95 |    85.29 |     100 |   86.95 |
```

overall 95% statements, well above the 80% target
