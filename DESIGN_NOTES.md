# Design Notes: Assign Feature

Here is how I approached the `PATCH /tasks/:id/assign` endpoint:

- **Trimming whitespace:** I used `.trim()` on the assignee string so someone accidentally typing `" Alice "` gets saved as `"Alice"`.
- **Validation:** If the body is missing an assignee, if it's not text, or if it is just blank spaces, it sends back a `400` status with an error message. I also capped the length at 100 characters so people can't send huge blocks of text.
- **Reassigning tasks:** I decided to allow reassigning a task. If a task is assigned to Alice and Bob takes it over, calling this endpoint just updates the assignee to Bob instead of throwing an error. This matches how tools like Trello or Jira work.
- **Task not found:** If the task ID doesn't exist in our list, it returns a `404` as requested.