# Final Notes

## What I Would Test Next

- More validation cases for task creation and updates.
- Invalid pagination values such as negative page or limit values.
- Reassigning a task that already has an assignee.
- Overdue task calculation with different date formats and time zones.
- API behavior with unexpected request bodies and malformed JSON.

## What Surprised Me

The pagination bug was easy to miss because the implementation looked correct at first glance. Writing a test for page 1 exposed that the offset calculation skipped the first page.

I also found that the existing `completeTask()` behavior changes the task priority to `medium`, which would be worth clarifying with the product requirements.

## Questions Before Production

- Should tasks be persisted in a database instead of in-memory storage?
- What authentication and authorization rules should be used?
- Who is allowed to assign or reassign a task?
- What should happen when an already assigned task is assigned to someone else?
- Should pagination parameters be strictly validated?
- What logging and monitoring should be added?
- What are the expected performance and concurrency requirements?