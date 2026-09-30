# Bug Resolution Report

## 1. Overview

This project involved testing an existing Node.js and Express Task Manager API before making targeted bug fixes. The testing strategy used two complementary suites:

- **Unit tests for `taskService.js`** — directly testing business logic, state mutations, pagination, filtering, updates, task completion, and task assignment.
- **Integration/API tests using Jest + Supertest** — testing HTTP endpoints, query parameters, request validation, status codes, error responses, and end-to-end API behavior.

The testing process identified four behavioral defects. Two were selected for remediation, while two were intentionally left unfixed and documented with regression tests.

A required `PATCH /tasks/:id/assign` feature was also implemented and tested.

---

## 2. Testing Performed

### Unit Testing

- **Test file:** `tests/taskService.test.js`
- **Initial test count:** 48 tests
- **Initial result:** 39 passed, 9 failed
- **Underlying issues identified:** 4

The unit tests were used to test the service layer independently from HTTP routing and request handling.

### Integration/API Testing

- **Test file:** `tests/tasks.test.js`
- **Initial test count:** 35 tests
- **Initial result:** 29 passed, 6 failed
- **Underlying issues identified:** The same four behavioral issues were reproduced through the HTTP API.

The integration suite covered endpoint behavior, query parameters, validation, error responses, updates, deletion, completion, and the new task-assignment endpoint.

### Baseline

Before the selected fixes:

- **Total tests:** 83
- **Passed:** 68
- **Failed:** 15

The 15 failures represented four underlying defects rather than 15 independent bugs.

---

## 3. Bugs Discovered

### Bug 1 — Pagination Offset Calculation

#### Expected Behavior

Pagination is 1-indexed:

- `page=1, limit=2` should return Task 1 and Task 2.
- `page=2, limit=2` should return Task 3 and Task 4.
- `page=3, limit=2` should return the remaining Task 5.

#### Actual Behavior

The original implementation calculated the offset as:

```javascript
const offset = page * limit;
```

This caused:

- Page 1 to skip the first two tasks.
- Page 2 to skip ahead too far.
- Page 3 to return an empty result instead of the remaining task.

#### How It Was Discovered

The defect was discovered through both:

- Unit tests for `getPaginated()` in `tests/taskService.test.js`
- Integration tests for `GET /tasks?page=...&limit=...` in `tests/tasks.test.js`

#### Fix Applied

The calculation was changed to:

```javascript
const offset = (page - 1) * limit;
```

This correctly converts the API's 1-indexed page number into a zero-based array offset.

#### Status

**FIXED**

---

### Bug 2 — Partial Substring Matching in Status Filter

#### Expected Behavior

Status filtering should match exact status values:

- `todo`
- `in_progress`
- `done`

A partial value such as `do` or `progress` should not match any task.

#### Actual Behavior

The original implementation used:

```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

As a result:

- `status=do` matched both `todo` and `done`.
- `status=progress` matched `in_progress`.

#### How It Was Discovered

The defect was discovered through unit and integration tests covering partial status values.

#### Suggested Fix

The intended correction would be to use exact equality:

```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

#### Status

**NOT FIXED / INTENTIONALLY LEFT UNFIXED**

This bug was deliberately left in place to keep the scope focused on the two selected fixes.

---

### Bug 3 — Immutable Task Fields Can Be Modified

#### Expected Behavior

System-managed fields such as `id` and `createdAt` should remain immutable after task creation.

#### Actual Behavior

The original update implementation merged all incoming fields directly into the stored task:

```javascript
const updated = { ...tasks[index], ...fields };
```

This allowed clients to modify:

- `id`
- `createdAt`

For example, an update containing:

```json
{
  "id": "malicious-custom-id"
}
```

could overwrite the existing task ID.

#### How It Was Discovered

The defect was discovered through:

- Unit tests attempting to modify `id` and `createdAt`
- Integration tests attempting to modify the task ID through `PUT /tasks/:id`

#### Suggested Fix

A future fix could explicitly exclude immutable fields:

```javascript
const {
  id: _ignoredId,
  createdAt: _ignoredCreatedAt,
  ...allowedFields
} = fields;

const updated = {
  ...tasks[index],
  ...allowedFields
};
```

#### Status

**NOT FIXED / INTENTIONALLY LEFT UNFIXED**

This bug was documented but deliberately left outside the selected fix scope.

---

### Bug 4 — Completing a Task Overwrites Priority

#### Expected Behavior

Completing a task should update completion-related fields while preserving its existing priority.

For example:

- `high` should remain `high`
- `medium` should remain `medium`
- `low` should remain `low`

#### Actual Behavior

The original implementation unconditionally set:

```javascript
priority: 'medium'
```

This meant completing a high-priority or low-priority task changed its priority to medium.

#### How It Was Discovered

The defect was discovered through:

- Unit tests covering completion of high, medium, and low priority tasks
- Integration tests covering `PATCH /tasks/:id/complete`

#### Fix Applied

The hardcoded priority assignment was removed.

The completion update now preserves the existing task properties and only changes completion-related fields:

```javascript
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

#### Status

**FIXED**

---

## 4. Bugs Selected for Fixing

Two bugs were selected for remediation:

### Bug 1 — Pagination Offset Calculation

**Status: FIXED**

Changed:

```javascript
const offset = page * limit;
```

to:

```javascript
const offset = (page - 1) * limit;
```

This corrected the 1-indexed pagination behavior.

### Bug 4 — Complete Task Priority

**Status: FIXED**

Removed the hardcoded:

```javascript
priority: 'medium'
```

from `completeTask()` so that completing a task no longer changes its existing priority.

---

## 5. Bugs Intentionally Left Unfixed

The following discovered defects remain in the code intentionally:

### Bug 2 — Partial Status Matching

**Status: NOT FIXED / INTENTIONALLY LEFT UNFIXED**

The existing substring behavior remains documented with regression tests.

### Bug 3 — Immutable Task Fields

**Status: NOT FIXED / INTENTIONALLY LEFT UNFIXED**

The existing ability to modify `id` and `createdAt` through updates remains documented with regression tests.

The assignment scope called for targeted bug fixing rather than remediation of every discovered issue.

---

## 6. New Feature — PATCH /tasks/:id/assign

The required task-assignment feature was implemented as:

```http
PATCH /tasks/:id/assign
```

with the request body:

```json
{
  "assignee": "string"
}
```

### Behavior

#### Valid Assignment

A valid request stores the assignee on the task and returns the updated task with HTTP 200.

#### Validation

The endpoint rejects:

- Missing `assignee`
- Non-string values
- Empty strings
- Whitespace-only strings

Invalid values return HTTP 400.

#### Whitespace Trimming

Leading and trailing whitespace is removed before storing the assignee.

For example:

```json
{
  "assignee": "  Bob  "
}
```

is stored as:

```json
{
  "assignee": "Bob"
}
```

#### Missing Task

Assigning a nonexistent task returns HTTP 404:

```json
{
  "error": "Task not found"
}
```

#### Reassignment

A task that already has an assignee can be reassigned. The new valid assignee replaces the previous assignee.

#### Backwards Compatibility

Task creation does not require an assignee, so existing `POST /tasks` behavior remains compatible.

---

## 7. Final Testing and Coverage

After the selected bug fixes and implementation of the assignment feature, the final test state documented for the project is:

- **Total test suites:** 2
- **Total tests:** 100
- **Passed:** 94
- **Failed:** 6

The six remaining failures correspond to the intentionally unfixed Bug 2 and Bug 3 regression tests.

### Final Coverage

| File / Scope | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `src/routes/tasks.js` | 100% | 100% | 100% | 100% |
| `src/services/taskService.js` | 100% | 100% | 100% | 100% |
| `src/utils/validators.js` | 100% | 100% | 100% | 100% |
| **Overall** | **97.43%** | **98.86%** | **93.33%** | **97.18%** |

The remaining failing tests are intentional regression tests documenting the two defects that were discovered but not selected for remediation.

---

## 8. What I Would Test or Fix Next

With additional engineering time, the following areas would be worth addressing.

### Primary Additional Fix — Immutable Task Fields

Bug 3 would be a logical next remediation because allowing clients to modify system-managed fields such as `id` and `createdAt` can compromise data integrity.

A future implementation should explicitly protect immutable fields at both the service and validation layers.

### Additional Testing Areas

1. **Combined Query Parameters**
   - Test filtering and pagination together, such as `?status=todo&page=1&limit=10`.

2. **Pagination Boundaries**
   - Test zero, negative, very large, and non-numeric page and limit values.

3. **Malformed Request Payloads**
   - Test unsupported content types, malformed JSON, and oversized request bodies.

4. **Repeated Task Completion**
   - Verify the behavior of completing an already completed task.

5. **Immutable Field API Contracts**
   - Add explicit API-level tests for how the application should respond when clients attempt to modify system-managed fields.

6. **Assignment Authorization**
   - Once authentication exists, verify that only authorized users can assign or reassign tasks.

---

## 9. Production Questions

Before shipping the API to production, I would clarify:

1. **Persistence Strategy:** What database and ORM/query layer will replace the in-memory task array?

2. **Authentication and Authorization:** Who is allowed to create, update, assign, complete, and delete tasks?

3. **Assignee Identity:** Should `assignee` remain an arbitrary string, or should it reference an authenticated user?

4. **Pagination Contract:** Should the API return metadata such as `totalItems`, `totalPages`, `currentPage`, and `hasNextPage`?

5. **Observability:** What structured logging, request tracing, metrics, and error monitoring are required?

6. **Concurrency:** How should simultaneous updates or assignments be handled once the API uses persistent storage?

---

## 10. Conclusion

The testing process followed an evidence-based workflow:

1. **Write tests first** to establish expected service and API behavior.
2. **Run the tests** to identify actual behavioral defects.
3. **Document the discovered bugs** with reproduction evidence and likely causes.
4. **Select targeted defects for remediation.**
5. **Implement Bug 1 and Bug 4 fixes** without changing the intentionally unfixed defects.
6. **Implement and test `PATCH /tasks/:id/assign`.**
7. **Run regression tests and measure coverage.**
8. **Document the remaining known defects** so they are visible before future production work.

The final repository therefore contains comprehensive unit and integration coverage, two targeted bug fixes, the required task-assignment feature, and documented remaining defects.
