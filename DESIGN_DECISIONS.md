# Design Decisions – Task API

## Assign Task Endpoint Design

I implemented the `PATCH /tasks/:id/assign` endpoint to allow assigning a task to a user by storing an `assignee` field on the task object.

### Decisions made

**1. Assignee validation**

I required the assignee to be a non-empty string. This prevents invalid values like empty strings or null while keeping validation simple.

**2. Allow reassignment**

I allowed reassignment instead of preventing it. This keeps the API flexible and avoids adding unnecessary complexity such as tracking assignment history.

**3. Error handling**

I returned:
- 404 if the task does not exist
- 400 if the assignee is invalid

This keeps error behavior consistent with the rest of the API.

**4. Default value**

I initialized `assignee` as `null` when creating a task so the field always exists and the data shape remains consistent.

---

## Tradeoffs

To keep the implementation simple, I used a string for assignee instead of a user ID. In a real system, this would likely reference a user entity.

I also allowed reassignment instead of enforcing assignment rules because the assignment did not specify constraints.

---

## What surprised me

The biggest surprise was how many logic issues appeared once tests were written. For example, the pagination bug and priority reset during completion were not obvious without tests.

This showed the importance of writing tests early when working with unfamiliar code.

---

## What I would test next

If I had more time I would test:

Edge cases around pagination (negative values, large limits)

Invalid query parameters

Concurrent updates

Data consistency after multiple updates

---

## Improvements I would make before production

Add stricter validation for update operations

Prevent modification of system fields like id and createdAt

Allow combining filters and pagination

Add proper error response structure

Replace in-memory storage with database persistence

---

## Questions I would ask before shipping

Should tasks support multiple assignees?

Should reassignment be restricted?

Should completed tasks be allowed to change?

What are the expected limits for pagination?

Should overdue tasks automatically change status?

---

## Summary

My main focus was improving test coverage, identifying bugs through testing, and implementing the assign feature with simple and consistent validation while keeping the API behavior predictable.