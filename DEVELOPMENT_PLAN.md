# Complete Development Plan - The Untested API

## Objective

Deliver a production-ready submission for the take-home assignment by:

- Writing unit and integration tests
- Reaching at least 80% test coverage
- Discovering and documenting bugs
- Fixing one confirmed bug
- Implementing `PATCH /tasks/:id/assign` with tests
- Providing clear submission notes

---

## Scope and Deliverables

### Required Deliverables

1. Test suite in `task-api/tests/`
   - Unit tests for `src/services/taskService.js`
   - Integration tests for routes using Supertest
2. Coverage report output (`npm run coverage`)
3. Bug report file (recommended: `BUG_REPORT.md`)
4. One implemented bug fix in source code
5. New endpoint: `PATCH /tasks/:id/assign`
6. Tests for new endpoint
7. Final short note with:
   - What to test next
   - What was surprising
   - Questions before production release

### Out of Scope

- Database migration or external persistence
- Large refactor unrelated to assignment goals
- UI or frontend work

---

## Project Understanding Checklist

Read and map behavior in:

- `task-api/src/app.js`
- `task-api/src/routes/tasks.js`
- `task-api/src/services/taskService.js`
- `task-api/src/utils/validators.js`

Build a quick endpoint contract table while reading:

- Expected request shape
- Validation rules
- Success status code and response
- Error paths (`400`, `404`, etc.)
- Data mutation side effects

Note and track any spec mismatch:

- `ASSIGNMENT.md` task status: `todo | in_progress | done`
- `README.md` task status: `pending | in-progress | completed`

Record this as a clarification risk and keep implementation consistent with actual code behavior and tests.

---

## Implementation Plan by Phase

## Phase 1 - Environment and Baseline (Day 1, 1-2 hours)

1. Setup
   - `cd task-api`
   - `npm install`
   - `npm start` (verify server boots)
2. Baseline tests
   - `npm test`
   - `npm run coverage`
3. Capture initial status
   - Existing failures (if any)
   - Initial coverage percentage

Exit criteria:

- App runs successfully
- Tests/coverage commands execute locally

## Phase 2 - Unit Tests for Service Layer (Day 1, 2-3 hours)

Create tests for core service behaviors in `taskService.js`:

- Create task
  - valid input
  - missing/invalid fields
- List tasks
  - no filters
  - status filter
  - pagination behavior
- Update task
  - task exists
  - task missing
  - invalid updates
- Delete task
  - success path
  - missing task
- Complete task
  - transitions status and completion timestamp
  - idempotency/duplicate completion behavior (if applicable)
- Stats
  - counts by status
  - overdue logic

Test design rules:

- Keep tests deterministic (especially dates)
- Reset in-memory data between tests
- Validate observable behavior, not private internals

Exit criteria:

- Service-level tests cover happy paths and edge conditions

## Phase 3 - Integration Tests for API Routes (Day 1, 3-4 hours)

Create route tests with Supertest:

- `GET /tasks`
  - returns list
  - accepts valid query params
  - rejects/handles invalid params
- `POST /tasks`
  - creates task
  - rejects invalid body
- `PUT /tasks/:id`
  - updates existing task
  - returns not found for missing id
  - rejects invalid payload
- `DELETE /tasks/:id`
  - returns `204` on success
  - handles missing id
- `PATCH /tasks/:id/complete`
  - marks complete and returns updated task
  - handles missing id / invalid state transitions
- `GET /tasks/stats`
  - verifies correct counts and overdue calculation

Minimum quality bar per endpoint:

- At least one happy path
- At least two edge/error scenarios

Exit criteria:

- All primary endpoints covered by integration tests

## Phase 4 - Coverage Hardening to 80%+ (End of Day 1, 1-2 hours)

Use coverage report to target weak branches:

- Validation branches
- Not-found branches
- Date boundary logic
- Pagination bounds/defaults
- Optional-field handling

Add only meaningful tests; avoid synthetic coverage padding.

Exit criteria:

- Total coverage >= 80%
- Branch coverage is reasonably strong in critical modules

## Phase 5 - Bug Discovery and Report (Day 2, 1-2 hours)

From failing tests or suspicious behavior, document bugs in `BUG_REPORT.md`.

Template per bug:

1. Title
2. Expected behavior
3. Actual behavior
4. Reproduction steps
5. Where it lives (file/function)
6. Why it happens (root cause)
7. Proposed fix

Prioritize bugs with:

- Incorrect API behavior
- Data integrity risk
- Spec/contract violation

Exit criteria:

- Clear, reproducible bug report tied to tests

## Phase 6 - Fix One Bug (Day 2, 1-2 hours)

Pick one bug from the report and implement the smallest correct fix:

1. Add or keep a failing test that reproduces the bug
2. Implement source fix
3. Verify test now passes
4. Run full suite to ensure no regressions

Exit criteria:

- One bug fixed with regression protection tests

## Phase 7 - Implement New Endpoint `/tasks/:id/assign` (Day 2, 2-3 hours)

Endpoint contract:

- Method: `PATCH /tasks/:id/assign`
- Body: `{ "assignee": "string" }`
- Success: returns updated task
- Not found: `404` if task id does not exist

Validation decisions (recommended):

- `assignee` must exist
- `assignee` must be a string
- Trim whitespace and reject empty result (`400`)
- Reassignment is allowed; latest valid value overwrites old value

Test cases:

- Assign success
- Missing `assignee`
- Non-string `assignee`
- Empty/whitespace-only `assignee`
- Task id not found (`404`)
- Reassign existing assignee (if policy allows)

Implementation touchpoints:

- `src/services/taskService.js`
- `src/routes/tasks.js`
- `src/utils/validators.js` (if centralized validation is used)

Exit criteria:

- Endpoint implemented and fully tested

## Phase 8 - Final Verification and Submission (Day 2, 1 hour)

Final commands:

- `npm test`
- `npm run coverage`

Final checks:

- All tests pass
- Coverage target achieved
- Bug report included
- One bug fix included
- New assign endpoint + tests included
- Final reflection note included

Submission package should contain:

- Test files
- `BUG_REPORT.md`
- Source updates
- Short final note for reviewers

---

## Suggested File Plan

- `task-api/tests/taskService.test.js`
- `task-api/tests/tasks.routes.test.js`
- `BUG_REPORT.md`
- `DEVELOPMENT_PLAN.md` (this file)
- `FLOW_DIAGRAMS.md` (process + endpoint flows)

---

## Risks and Mitigations

1. Inconsistent status enums across docs
   - Mitigation: enforce one enum in tests, note mismatch in final notes.
2. Flaky time-based assertions
   - Mitigation: use fixed dates/mocked time and explicit timezone handling.
3. Shared in-memory state leaking across tests
   - Mitigation: reset service state per test suite/test case.
4. Over-testing internals
   - Mitigation: assert API/service behavior and contracts only.

---

## Definition of Done

The assignment is complete when:

- Tests are comprehensive and stable
- Coverage is at or above target
- Bugs are documented with root causes
- One real bug is fixed with test proof
- Assign endpoint is implemented with robust validation
- Final submission notes are clear and technically grounded
