# Bug Report — Untested Task Manager API

## Review scope

I reviewed the existing `src/` implementation and added tests around observable API behavior. Existing source files were intentionally left unchanged; the selected fix is applied through the submission layer.

---

## BUG-01 — Pagination skips the first page

**Severity:** High

### Expected

`GET /tasks?page=1&limit=10` should return the first ten tasks.

### Actual

The service calculates:

```js
const offset = page * limit;
```

So page 1 begins at index 10 rather than index 0.

### How discovered

An integration test creates multiple tasks and requests page 1 with a small limit. The returned items begin after the first page.

### Fix

The submission translates the public one-based page number to the zero-based page expected by the existing service. The original `src/services/taskService.js` remains unchanged.

---

## BUG-02 — Status filtering uses substring matching

**Severity:** Medium

The service uses:

```js
tasks.filter((t) => t.status.includes(status));
```

Therefore a filter such as `status=do` can match `todo`.

### Suggested fix

Use exact comparison and validate allowed values:

```js
t.status === status
```

---

## BUG-03 — Pagination values are weakly validated

**Severity:** Medium

`parseInt()` accepts values such as `10abc`, while negative and otherwise invalid page/limit values can reach `Array.slice()`.

### Suggested fix

Require positive integers and define a maximum page size.

---

## BUG-04 — PUT can overwrite protected task fields

**Severity:** High

The service merges arbitrary fields:

```js
const updated = { ...tasks[index], ...fields };
```

A client can potentially overwrite `id`, `createdAt`, or other internal fields.

### Suggested fix

Whitelist updateable fields before calling the service.

---

## BUG-05 — Completion state can become inconsistent

`PATCH /tasks/:id/complete` sets `completedAt`, but changing status through `PUT` does not synchronize `completedAt`.

Possible inconsistent state:

```json
{
  "status": "done",
  "completedAt": null
}
```

### Suggested fix

Centralize status-transition rules so `status` and `completedAt` remain consistent.

---

## BUG-06 — Completing a task changes its priority

`completeTask()` sets:

```js
priority: 'medium'
```

This silently changes a high-priority task when it is completed. The assignment does not describe this as a business rule.

### Suggested fix

Preserve priority unless the product explicitly requires completion to change it.

---

## BUG-07 — Empty `dueDate` can bypass validation

The validators only parse the date when the value is truthy. An empty string can therefore pass validation even though the error message says the value must be a valid ISO date string.

### Suggested fix

If `dueDate` is supplied, validate it explicitly; use `null` to represent no due date.

---

# New feature — PATCH /tasks/:id/assign

## Validation decisions

| Input | Response |
|---|---|
| Valid non-empty string | 200 |
| Missing `assignee` | 400 |
| Empty string | 400 |
| Whitespace-only string | 400 |
| Non-string | 400 |
| Unknown task | 404 |
| Existing assignee | Reassignment allowed |

Reassignment is allowed because the assignment says the endpoint stores an assignee but does not state that assignment is immutable. This should be confirmed if the product has a different business rule.

## Tests added

- Valid assignment
- Whitespace trimming
- Missing assignee
- Empty assignee
- Whitespace-only assignee
- Non-string values
- Unknown task
- Reassignment

---

# Additional testing I'd do

1. Property/fuzz testing for pagination and validation.
2. More complete task state-transition tests.
3. Malformed JSON and unusual body tests.
4. Concurrent update/delete scenarios.
5. Maximum request-size and rate-limit tests.
6. Persistence integration tests when a database is introduced.
7. Authentication and authorization tests.
8. Logging, monitoring, tracing, and audit tests.

# Questions before production

1. Is `PUT` replacement or partial-update semantics?
2. Which fields are immutable?
3. Is reassignment allowed?
4. Can a completed task become active again?
5. Should `completedAt` be cleared when status changes away from `done`?
6. Is changing priority during completion intentional?
7. What are the pagination limits?
8. Should invalid filters return 400 or an empty result?
9. Will the in-memory store be replaced with persistent storage?
10. What authentication/authorization model is required?
11. What observability and audit requirements exist?
12. What concurrency guarantees are required?
