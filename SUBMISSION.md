# Submission Notes — Task Manager API

## Test Coverage Summary

- **Total Test Suites:** 3 passed
- **Total Tests:** 50 passed
- **Statement Coverage:** **97.4%**
- **Branch Coverage:** **95.4%**
- **Function Coverage:** **93.3%**
- **Line Coverage:** **97.14%**

---

## 1. What I'd test next if I had more time

1. **Concurrent Request Handling & Race Conditions:** Since state is stored in an in-memory array (`let tasks = []`), concurrent mutations (like deleting a task while updating or completing it) could cause index shifts or race conditions.
2. **Boundary & Load Testing:** Performance test paginated queries with large datasets (e.g. 10,000+ tasks) to ensure slicing performance and memory safety.
3. **Invalid Parameter Types & Injection Attacks:** Fuzzing string inputs (such as extremely long titles, SQL/HTML injection vectors, or special characters in `assignee`).
4. **Timezone & Date Parsing:** Further tests for `dueDate` edge cases across different time zones or leap years.

---

## 2. Anything that surprised me in the codebase

1. **1-based Pagination Offset Calculation:** Calculating `offset = page * limit` instead of `(page - 1) * limit` caused Page 1 to completely omit the first 10 items.
2. **Priority Reset on Completion:** Automatically forcing `priority: 'medium'` upon calling `completeTask()` silently modified data outside of what the user requested.
3. **`Array.includes` for Enum Filter:** Filtering task statuses using `t.status.includes(status)` meant passing a substring like `do` matched both `todo` and `done` tasks.

---

## 3. Questions I'd ask before shipping this to production

1. **Persistence Strategy:** Will we be introducing a persistent database (e.g. PostgreSQL, MongoDB) before shipping, or is this service intended to runstatelessly with an external data layer?
2. **Authentication & Authorisation:** Who is allowed to assign tasks or delete tasks? Should we add JWT/session middleware?
3. **Logging & Monitoring:** Should structured logging (e.g. `pino` or `winston`) and operational metrics (Prometheus/OpenTelemetry) be added instead of raw `console.error`?
4. **Input Sanitisation:** Should we enforce max character length limits on `title`, `description`, and `assignee`?
