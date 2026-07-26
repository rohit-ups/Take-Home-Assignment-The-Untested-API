# Submission Notes

## What I'd Test Next If I Had More Time

I would add comprehensive integration tests covering the full lifecycle of a task: create, assign, complete, and delete. This would help ensure the task state remains consistent across multiple operations.

I would also write unit tests specifically isolating the pagination and stats logic.

## Anything That Surprised Me in the Codebase

I was surprised that the Express app and the server listener (`app.listen`) were not separated into different files, such as `app.js` and `server.js`.

This caused Jest to hang with a `TCPSERVERWRAP` open handle during testing because the network port remained open. I used `--forceExit` to bypass it for now, but architectural separation would be the permanent fix.

## Questions I'd Ask Before Shipping This to Production

- Should we introduce a real persistence layer, such as MongoDB or PostgreSQL, so data is not lost on server restart?
- For the `PATCH /tasks/:id/assign` endpoint, should we allow users to intentionally pass `assignee: null` to unassign a task, rather than rejecting all empty values?
- Do we need to implement rate limiting or authentication before opening these routes to the public?
