# Day 2

## Bug Fix (Part B)

Primary bug fixed: pagination offset.

- Expected: `page=1&limit=2` should return the first two tasks.
- Fix: changed offset to `(page - 1) * limit` and guarded invalid page/limit values.

Additional fix applied: status filtering now uses exact match instead of substring match.

## Assign Endpoint (Part C)

Added endpoint: `PATCH /tasks/:id/assign`

### Behavior

- Stores assignee on task as `assignee`.
- Returns updated task with `200` when assignment succeeds.
- Returns `404` when task is not found.

### Validation Decisions

1. Empty or missing assignee
- Returns `400` with `assignee is required and must be a non-empty string`.

2. Already assigned task
- Returns `409` with `Task is already assigned`.
- Rationale: prevents accidental overwrite of ownership.

3. Normalization
- Assignee is stored as trimmed text (`assignee.trim()`).

![alt text](<Screenshot 2026-04-15 165034.png>)