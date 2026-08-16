# Submission Notes

## What I would test next

If I had more time, I would add tests for:

- Pagination edge cases such as invalid page/limit values.
- Status filtering with each supported status.
- Overdue task calculation using controlled dates.
- Invalid date values and date boundary cases.
- Updating protected or immutable task fields.
- Repeated completion of an already completed task.
- Additional validation combinations for create and update requests.
- Assigning tasks with whitespace around the assignee name.

## What surprised me

The main issue I found was that pagination appeared correct at first glance, but the offset calculation treated the page number as zero-based while the API usage was one-based.

I also found that status filtering used `String.includes()`, which allowed partial status matches instead of requiring an exact status value.

Both issues were identified through automated tests rather than changing the implementation based only on code inspection.

## Questions I would ask before shipping to production

1. Should pagination reject invalid or negative page and limit values?
2. Should an already assigned task be allowed to be reassigned?
3. Should assignees reference users from a user system instead of storing a free-form string?
4. What are the expected rules for completing an already completed task?
5. Should task data remain in memory, or will a persistent database be introduced?
6. What authentication and authorization rules should protect the API?
7. What are the expected maximum values for pagination limits?