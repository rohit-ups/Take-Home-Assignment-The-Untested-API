# Submission Notes — The Untested API

## Feature Design Decisions (`PATCH /tasks/:id/assign`)
- **Validation**: Added `validateAssignTask` requiring `assignee` to be a non-empty string. Whitespace-only strings are rejected with HTTP 400.
- **Task Schema**: Extended task creation defaults to include `assignee: null`.
- **Re-assignment**: Re-assigning an already assigned task gracefully overwrites the assignee name.

## What I'd Test Next with More Time
- Stress testing route handlers under concurrent load.
- Input sanitization against script tag insertion and prototype pollution vectors.
- End-to-end integration tests backed by a real database layer.

## What Surprised Me
- `completeTask` silently mutated task priorities to `medium`, which was completely undetected due to missing test coverage.
- Status filtering and pagination had separate `if` conditions in `routes/tasks.js`, preventing combined filtering and pagination requests.

## Questions Before Shipping to Production
1. **Persistence & Concurrency**: Which database layer (e.g., PostgreSQL or MongoDB) are we moving to before production deployment?
2. **Authentication & Roles**: Should task assignment and deletion be protected by JWT middleware and role-based access controls?
3. **Rate Limiting**: Are rate-limiting middleware (`express-rate-limit`) and error monitoring tools configured for high-traffic scenarios?