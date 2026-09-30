# Bug report and submission notes

## Objective and verification

This submission implements the ASSIGNMENT.md requirements: service unit tests,
Supertest integration tests, a bug report, bug fixes, and task assignment with
tests. The in-memory store and existing project structure are preserved.

The first two test suites were run before source changes: 49 tests failed and
17 passed (66 total). These failures include missing-feature tests and explicit
policy choices, not 49 distinct bugs. Further validator and error-handling tests
were added alongside the implementation. Tests reset the store between cases;
time-sensitive service tests use a fixed clock.

## 1. Conflicting documented statuses

- Location: README.md task shape and filtered-list example; ASSIGNMENT.md task shape.
- Expected: both documents describe the accepted status values.
- Actual: README used pending/in-progress/completed, while the assignment and
  implementation use todo/in_progress/done.
- Discovery: reading both documents and the validators/service defaults.
- Fix: align README with the assignment and existing implementation.

## 2. Pagination skips page one

- Location: src/services/taskService.js, getPaginated.
- Expected: page 1, limit 2 returns tasks 1 and 2.
- Actual: it returned tasks 3 and 4.
- Cause: offset was page * limit instead of (page - 1) * limit.
- Discovery: direct service reproduction and the pagination unit test.
- Fix: subtract one before computing the offset. Tests cover the first, middle,
  final partial, empty, and out-of-range pages.

## 3. Status filtering accepts substrings

- Location: src/services/taskService.js, getByStatus.
- Expected: filter by the complete status value.
- Actual: `do` matched todo and done because filtering called includes().
- Discovery: direct service reproduction and the exact-status unit test.
- Fix: strict equality. The route also returns 400 for unsupported query statuses;
  that response policy was unspecified and is documented in README.

## 4. Filtering ignores pagination and query parsing is permissive

- Location: src/routes/tasks.js, GET /tasks.
- Expected: combined filters/pagination work as shown in README; supplied page
  and limit values are valid positive integers.
- Actual: the status branch returned before pagination. Four todo tasks queried
  with status=todo&page=1&limit=2 returned all four. page=1abc was also accepted;
  zero values silently selected defaults and negative values reached slice().
- Cause: early return, parseInt() prefix parsing, and truthiness-based defaults.
- Discovery: Supertest reproductions and query regression tests.
- Fix: filter first, validate query values, then paginate the resulting array.
  Omitted pagination values default to page 1 and limit 10. Invalid supplied
  values return 400; pages beyond the result set return an empty array.

## 5. Completion resets priority

- Location: src/services/taskService.js, completeTask.
- Expected: completing a task preserves its priority.
- Actual: high/low priorities became medium.
- Cause: completeTask explicitly wrote priority: 'medium'.
- Discovery: direct reproduction, service tests for low/high priorities, and an
  integration regression test.
- Fix: remove the priority override and update completion-related fields only.

## 6. General updates overwrite server fields

- Location: src/services/taskService.js, update; src/utils/validators.js.
- Expected: task identity and server-managed timestamps remain controlled by the server.
- Actual: PUT accepted a replacement id, fake timestamps, and arbitrary extra fields.
- Cause: unvalidated fields were spread directly into the stored task.
- Discovery: PUT reproduction and identity-protection regression tests.
- Fix: an editable-field allowlist in the service protects internal fields even
  on direct calls. Request validation rejects unsupported fields with 400.
  Assignment is changed through its dedicated endpoint.

## 7. Validation permits values outside the task schema

- Location: src/utils/validators.js, create/update validation.
- Expected: status/priority follow their enums; description is a string; dates
  are ISO strings or null; a body is an object rather than an array.
- Actual: empty/null status, false priority, numeric descriptions/dates, informal
  dates, and update arrays were accepted. A stored null status then caused
  filtered listing to return 500 when includes() was called on it.
- Cause: truthiness checks skipped invalid falsy values, Date.parse() accepted
  informal strings, description had no validation, and arrays passed typeof object.
- Discovery: POST/PUT reproductions and parameterized API/validator tests.
- Fix: validate property presence, field types, enums, body shape, and supported
  ISO formats. Round-trip the calendar date to reject normalized invalid dates.
  Preserve the existing local body guards while adding array rejection.
- Tradeoff: support common calendar dates and timezone-qualified timestamps,
  not every ISO 8601 representation. The exact accepted forms are in README.

## 8. Request parsing errors become server errors

- Location: src/app.js, global error handler.
- Expected: malformed JSON returns 400 and oversized JSON returns 413.
- Actual: both returned 500.
- Cause: all errors were unconditionally converted to 500.
- Discovery: malformed/oversized body integration tests (failed before the fix).
- Fix: handle the parser's known error types while keeping generic 500 responses
  for unexpected failures. Integration tests also verify internal details do
  not leak through an unexpected-error response.

## 9. Completion timestamps contradict status

- Location: src/services/taskService.js, create/update/completeTask.
- Actual: creating/updating to done left completedAt null; reopening retained
  an old timestamp; repeated completion replaced the timestamp.
- Cause: only the complete endpoint managed completion time.
- Discovery: service/API transition tests; service tests use a fixed clock.
- Policy: the brief does not specify timestamp transition rules. This submission
  treats completedAt as the completion time of the current completed state.
- Fix: entering done sets the timestamp; updates/repeated completion while done
  preserve it; reopening clears it. README documents this decision.

## Required feature: task assignment

Previously PATCH /tasks/:id/assign had no route and returned 404 even for an
existing task. Added a small service function, validator, and route:

- Require a nonblank string, trim surrounding whitespace, reject extra fields.
- Store assignee and return the updated task with 200.
- Return 404 for a missing task with a valid request body.
- Allow reassignment by replacing the name, including on completed tasks.
- Preserve every unrelated task field. Assignee appears only after assignment.
- Validate before lookup, consistent with the existing PUT route.

No user database, authentication, or new dependencies were added because the
assignment asks for a stored name. Tests cover persistence, reassignment,
missing tasks, invalid types, blank/missing names, and field preservation.

## PUT clarification

README originally called PUT a full update, while the implementation merged
fields and ASSIGNMENT.md only called it an update. This submission preserves
merge behavior and corrects the README description. Empty objects remain
valid no-op updates; implementing replacement semantics would require a
separate contract decision.

## Coverage output

Verified with Node.js v22.19.0 on 2026-09-30:

```text
npm run coverage -- --runInBand

File             | % Stmts | % Branch | % Funcs | % Lines
All files        |   98.45 |    97.56 |   97.29 |   98.78
 app.js          |   84.21 |       80 |      50 |   88.88
 tasks.js        |     100 |      100 |     100 |     100
 taskService.js  |     100 |    96.55 |     100 |     100
 validators.js   |     100 |      100 |     100 |     100

Test Suites: 3 passed, 3 total
Tests:       102 passed, 102 total
```

Coverage exceeds the 80% target. Remaining uncovered behavior includes direct
server startup, forwarding an error after headers have been sent, and the
statistics guard for unsupported statuses injected through direct service calls.
The HTML coverage report is generated under task-api/coverage and ignored by Git;
the summary above is included for submission. Coverage is not a guarantee that
all possible production failures are covered.

## Submission note

With more time, I would test concurrent updates and server startup/shutdown,
and discuss durable storage and authentication. The conflicting status names,
PUT description, and completion's priority reset were the main surprises.
Before production, I would clarify PUT replacement semantics, supported date
formats/timezone rules, whether assignments should reference real users, and
whether reopening should preserve completion history. In-memory persistence is
intentional for this assignment. Review and commit the changes, then push a
branch or fork and share its link as requested by ASSIGNMENT.md.
