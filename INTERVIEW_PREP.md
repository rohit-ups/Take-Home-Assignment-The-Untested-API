# Interview Preparation & Codebase Mastery Guide

This guide covers everything you need to know about **The Untested API** codebase, the changes made, the bugs fixed, the new feature implemented, how testing was approached, and how to confidently answer any technical or architectural question an interviewer might ask.

---

## Table of Contents
1. [High-Level Architecture & Tech Stack](#1-high-level-architecture--tech-stack)
2. [Complete API Endpoints Reference](#2-complete-api-endpoints-reference)
3. [Step-by-Step Methodology Executed](#3-step-by-step-methodology-executed)
4. [Deep-Dive: The 4 Bugs Discovered & Fixed](#4-deep-dive-the-4-bugs-discovered--fixed)
5. [Deep-Dive: New Feature (`PATCH /tasks/:id/assign`)](#5-deep-dive-new-feature-patch-tasksidassign)
6. [Testing Strategy & Achieving 100% Coverage](#6-testing-strategy--achieving-100-coverage)
7. [Mock Interview Q&A (How to Answer Key Questions)](#7-mock-interview-qa-how-to-answer-key-questions)

---

## 1. High-Level Architecture & Tech Stack

- **Stack:** Node.js, Express (v4), Jest, Supertest, UUID (v9).
- **Data Persistence:** In-memory array (`let tasks = []` inside `src/services/taskService.js`). Resets whenever the server restarts.
- **Directory Breakdown:**
  - [`src/app.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/app.js): Express app configuration, JSON middleware, route mounting (`/tasks`), and global 500 error handler.
  - [`src/routes/tasks.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/routes/tasks.js): Express Router containing all HTTP handlers for `/tasks`.
  - [`src/services/taskService.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/services/taskService.js): Business logic, task mutations, stats calculations, pagination, and in-memory store management. Includes `_reset()` helper for test isolation.
  - [`src/utils/validators.js`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/src/utils/validators.js): Request payload validation functions (`validateCreateTask`, `validateUpdateTask`, `validateAssignTask`).
  - [`tests/`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/task-api/tests): Contains unit tests (`validators.test.js`, `taskService.test.js`) and integration tests (`tasks.test.js`).

---

## 2. Complete API Endpoints Reference

| Method | Endpoint Path | Query Params / Body | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | `?status=todo`, `?page=1&limit=10` | `200 OK` | List all tasks. Supports filtering by status, pagination, or both combined. |
| `GET` | `/tasks/stats` | None | `200 OK` | Returns counts by status (`todo`, `in_progress`, `done`) and count of `overdue` tasks. |
| `POST` | `/tasks` | Body: `{ title, description?, status?, priority?, dueDate? }` | `210 Created` | Creates a new task with default status `'todo'`, priority `'medium'`, and auto-generated UUID & ISO timestamp. |
| `PUT` | `/tasks/:id` | Body: `{ title?, description?, status?, priority?, dueDate? }` | `200 OK` | Updates allowed task fields. Returns `404` if task ID not found. |
| `DELETE` | `/tasks/:id` | None | `204 No Content` | Removes task from store. Returns `404` if not found. |
| `PATCH` | `/tasks/:id/complete` | None | `200 OK` | Sets status to `'done'`, records `completedAt` timestamp, and preserves original priority. Returns `404` if not found. |
| `PATCH` | `/tasks/:id/assign` | Body: `{ "assignee": "string" }` | `200 OK` | **(NEW FEATURE)** Assigns a task to a non-empty name string. Returns `400` for invalid/empty input, `404` if not found. |

---

## 3. Step-by-Step Methodology Executed

If an interviewer asks *"How did you tackle this assignment from start to finish?"*, summarize these 5 steps:

1. **Exploration & Schema Verification:** 
   - Inspected `src/` to map out dependencies between `app.js`, `tasks.js`, `taskService.js`, and `validators.js`.
   - Identified schema discrepancies (e.g. `README.md` listed status as `pending` while code enforced `todo`).

2. **Writing Initial Test Suite (Day 1 Objective):**
   - Built modular unit tests for validators and `taskService`.
   - Built Supertest integration tests for every REST route.
   - Used test failures to catch hidden bugs scientifically instead of manually guessing.

3. **Bug Identification & Fixing (Day 2 Part A & B):**
   - Cataloged 4 critical bugs in [`BUG_REPORT.md`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/BUG_REPORT.md).
   - Applied precise code fixes in `taskService.js` and `routes/tasks.js`.

4. **Implementing the Feature (Day 2 Part C):**
   - Added `validateAssignTask`, `assignTask` service function, and `PATCH /tasks/:id/assign` route handler.
   - Wrote tests for happy path (200), non-existent task (404), and validation edge cases (400).

5. **Refining Coverage to 100%:**
   - Exercised uncovered branches (error handler middleware, default parameter fallbacks, edge-case statuses) to hit **100% statement, branch, function, and line coverage**.

---

## 4. Deep-Dive: The 4 Bugs Discovered & Fixed

### Bug 1: 1-Indexed Pagination Offset Formula
- **Location:** `src/services/taskService.js` (lines 11–15)
- **Problem:** Formula was `const offset = page * limit;`. Requesting `page=1` with `limit=10` resulted in `offset = 10`, which skipped items 0–9 and returned items 10–19.
- **Root Cause:** Assumed 0-indexed page parameter instead of 1-indexed.
- **Fix:** Changed to `const offset = (pageNum - 1) * limitNum;`.

### Bug 2: Priority Overwrite on Completion
- **Location:** `src/services/taskService.js` (lines 63–77)
- **Problem:** Completing a high-priority task forcibly mutated `priority` to `'medium'`.
- **Root Cause:** `priority: 'medium'` was hardcoded in `completeTask`'s return payload spread.
- **Fix:** Removed `priority: 'medium'` so task's existing priority is preserved.

### Bug 3: Loose Substring Matching in `getByStatus`
- **Location:** `src/services/taskService.js` (line 9)
- **Problem:** `getByStatus` used `.includes(status)`. Querying `status=do` returned both `todo` and `done` tasks.
- **Root Cause:** String `.includes()` substring comparison instead of exact equality.
- **Fix:** Changed filter condition to `t.status === status`.

### Bug 4: Mutually Exclusive Status Filter & Pagination Query Handling
- **Location:** `src/routes/tasks.js` (lines 11–28)
- **Problem:** Requesting `GET /tasks?status=todo&page=1&limit=2` ignored pagination and returned all `todo` tasks.
- **Root Cause:** Two independent `if` blocks; `if (status)` returned early without evaluating `page` or `limit`.
- **Fix:** Refactored route handler to filter by status first, then pass the filtered list into `getPaginated()`.

---

## 5. Deep-Dive: New Feature (`PATCH /tasks/:id/assign`)

### Requirements
Endpoint: `PATCH /tasks/:id/assign` | Body: `{ "assignee": "string" }`

### Key Design Decisions & Trade-offs
1. **Validation Rules (`validateAssignTask`)**:
   - `assignee` must exist, be a `string`, and be non-empty after trimming (`assignee.trim() !== ''`).
   - If missing, non-string (e.g. number/boolean), or whitespace-only (`"   "`), return `400 Bad Request` with: `'assignee is required and must be a non-empty string'`.
2. **Empty String Trade-off**:
   - *Why empty string is an error:* In REST API design, passing an empty string as a name is almost always a front-end form error. If unassigning tasks is needed in the future, an explicit `DELETE /tasks/:id/assign` or `{ "assignee": null }` is a much clearer API contract.
3. **Task Not Found Handling**:
   - Returns `404 Not Found` with `{ "error": "Task not found" }`.

---

## 6. Testing Strategy & Achieving 100% Coverage

- **Isolation Strategy:** Called `taskService._reset()` in `beforeEach()` blocks across test suites to prevent test leakage between test runs.
- **Supertest for Integration Tests:** Simulated real HTTP requests against `app` instance without needing to bind to network ports.
- **Branch Coverage Mastery:**
  - Added tests for `app.js` error handling middleware by directly invoking the error layer.
  - Used `/* istanbul ignore next */` on `if (require.main === module)` in `app.js` (standard Node.js pattern for server startup scripts).
  - Tested default fallbacks in `getPaginated` (`page=undefined`, `limit=undefined`) and uncounted task statuses in `getStats`.

---

## 7. Mock Interview Q&A (How to Answer Key Questions)

### Q1: "How did you get familiar with this unfamiliar codebase?"
> *"I started by mapping the data flow from `app.js` into route handlers (`routes/tasks.js`), business logic (`services/taskService.js`), and input helpers (`utils/validators.js`). I checked for discrepancies between documentation and code, and then wrote unit and integration tests to verify assumptions empirically before modifying any code."*

### Q2: "Tell me about a bug you found and how you fixed it."
> *"One interesting bug was in `taskService.completeTask`. When completing a task, it hardcoded `priority: 'medium'`. If a task had `priority: 'high'`, completing it unexpectedly downgraded its priority. I caught this by writing an integration test asserting that priority remained unchanged after completion, and fixed it by removing `priority: 'medium'` from the update payload."*

### Q3: "Why did you choose to reject empty strings on the assign endpoint?"
> *"The assignment asked what should happen if `assignee` is an empty string. In web application APIs, submitting an empty string or whitespace string for a person's name is typically a client-side validation failure. Treating it as `400 Bad Request` prevents garbage data. If unassigning is required later, an explicit endpoint like `DELETE /tasks/:id/assign` provides a cleaner RESTful interface."*

### Q4: "What would you do before shipping this API to production?"
> *"Four key things: First, replace the in-memory array with a persistent database like PostgreSQL or MongoDB. Second, add Authentication and Role-Based Access Control so only authorized users can assign or complete tasks. Third, enforce maximum pagination limits (e.g. `limit=100`) and rate-limiting middleware to prevent DoS attacks. Fourth, add audit logging to track state transitions over time."*

---

**Summary File Link:** [`INTERVIEW_PREP.md`](file:///Users/ishanroy/Desktop/client%20work/TakeHomeAssignment/INTERVIEW_PREP.md)
