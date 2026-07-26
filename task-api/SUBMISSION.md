# Submission Notes

## What was done

- Added a test suite under `tests/` covering the service layer and the API routes.
- Fixed two bugs (pagination offset and substring status matching). See `BUG_REPORT.md`.
- Documented three more bugs with proposed fixes.
- Implemented `PATCH /tasks/:id/assign`.

## Test coverage

Run with `npm run coverage`.

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
All files        |   94.33 |    88.76 |   93.33 |   93.79
 src/routes      |     100 |    91.66 |     100 |     100
 src/services    |     100 |    94.73 |     100 |     100
 src/utils       |   82.75 |    85.71 |     100 |   82.75

Test Suites: 3 passed, 3 total
Tests:       1 skipped, 49 passed, 50 total
```

The one skipped test documents Bug 3 (priority reset on complete), which was
reported but intentionally left unfixed so the suite stays green.

## Feature: PATCH /tasks/:id/assign

**Request:** `PATCH /tasks/:id/assign` with body `{ "assignee": "string" }`
**Response:** the updated task.

### Design decisions

1. **New field on the task shape.** Tasks now carry an `assignee` field that
   defaults to `null` on creation. This keeps the shape consistent whether or
   not a task has ever been assigned, so clients do not have to guard against a
   missing key.

2. **404 is checked before validation.** The path identifies a resource, so if
   the task does not exist the request returns 404 before the body is inspected.
   Validating the body of a request aimed at a non existent task did not seem
   useful. The tradeoff is that a malformed body on a missing task still returns
   404 rather than 400; that felt like the more intuitive contract for a path
   based resource.

3. **Assignee validation.** `assignee` is required and must be a non empty
   string. A missing field, a non string value, or a string that is only
   whitespace all return 400. This mirrors the existing `title` validation in
   `validators.js` for consistency.

4. **Whitespace is trimmed before storing.** `"  Alice  "` is stored as
   `"Alice"` so the same person does not show up as several distinct assignees.

5. **Re-assignment is allowed and overwrites.** Assigning a task that already
   has an assignee simply replaces the value and returns 200. Re-assignment is a
   normal operation (handing work to someone else), so blocking it with a 409
   would have been hostile. If the product needed an audit trail or an explicit
   unassign step, that would be a separate decision.

### Edge cases covered by tests

- Happy path assignment returns 200 with the updated task.
- Missing task returns 404.
- Missing, empty, whitespace only, and non string `assignee` return 400.
- Surrounding whitespace is trimmed.
- Re-assigning overwrites the previous assignee.

## If I had more time

- Combine status filtering with pagination and return pagination metadata
  (total, page, limit) instead of a bare array.
- Add a concurrency test around the read modify write in `update` and
  `completeTask`, since the in memory store is not atomic.
- Validate unknown query params and reject clearly invalid `page` or `limit`
  values rather than silently coercing them.

## What surprised me

- The status filter used `String.includes`, so `?status=do` quietly returned
  both `todo` and `done`. It looks correct until you query a partial string.
- `completeTask` resets priority to `medium`. It reads like leftover copy paste
  rather than intended behavior.

## Questions before shipping to production

- Should `assignee` reference a real user record, or is a free text name
  acceptable for now?
- Is the in memory store only for local development, and what is the real
  persistence layer?
- Should completing an already completed task be a no op, or should it refresh
  `completedAt`?
