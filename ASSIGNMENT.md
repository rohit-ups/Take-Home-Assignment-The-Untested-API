# Take-Home Assignment: The Untested API

**Estimated time:** 2 days
**Stack:** Node.js, Express, Jest, Supertest

---

## Overview

You've been handed the codebase for a small Task Manager API. It was written quickly, has no tests, and is heading to production. Your job: write the tests, find what's broken, fix something, and add a feature.

This mirrors the actual work — reading unfamiliar code, deciding what to test, catching bugs through testing rather than guessing, and shipping something new with confidence.

---

## Setup

```bash
cd task-api
npm install
npm start        # runs on port 3000
npm test         # run tests
npm run coverage # run tests + coverage report
```

The API uses an in-memory store — no database setup needed. Data resets on restart.

---

## The API

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks | List all tasks |
| GET | /tasks?status=todo | Filter by status |
| GET | /tasks?page=1&limit=10 | Paginated list |
| POST | /tasks | Create a task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| PATCH | /tasks/:id/complete | Mark as complete |
| GET | /tasks/stats | Counts by status + overdue count |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO string | null",
  "completedAt": "ISO string | null",
  "createdAt": "ISO string"
}
```

---

## Day 1 — Read & Test

1. Read through the source code in `src/`. Get familiar with it.
2. Run the server and poke at the endpoints manually if that helps.
3. Write tests in the `tests/` folder covering:
   - Unit tests for `taskService.js` functions directly
   - Integration tests for the API routes (use Supertest)
   - At minimum: happy path for each endpoint + at least 2 edge cases
4. Aim for **80%+ coverage** — run `npm run coverage` to check.

**Deliverable:** Committed tests with coverage output (paste the summary or attach a screenshot).

---

## Day 2 — Find & Build

### Part A: Bug Report

Review your test results. Write a short bug report (markdown file or inline comments) for any bugs you found. For each bug include:

- What the expected behavior is
- What actually happens
- How you discovered it
- What a fix would look like (you don't have to fix them all)

### Part B: Fix one bug

Pick one bug and fix it. Update any tests that should now pass.

### Part C: New feature

Add this endpoint:

```
PATCH /tasks/:id/assign
Body: { "assignee": "string" }
```

- Accepts a name (string) and stores it on the task object
- Returns the updated task
- Should return 404 if the task doesn't exist
- Think about what validation makes sense. What should happen if `assignee` is an empty string? What if the task is already assigned?

Write tests for the new endpoint before or alongside the implementation.

**Deliverable:** Bug report, fix, and new endpoint with tests.

---

## Submission

Push your work to a branch or fork and share the link. Include a short note (a few sentences) on:

- What you'd test next if you had more time
- Anything that surprised you in the codebase
- Any questions you'd ask before shipping this to production

---

## Notes

- Don't worry about perfecting the codebase beyond what's asked.
- Tests should test behavior, not implementation details.
- There's no trick setup — what you see is what you get.
