# Submission Notes

## What I would test next

With more time, I would add tests for invalid pagination values (negative numbers, non-numeric strings), invalid task status and priority values passed via query params, malformed dates in more edge-case formats, concurrent updates to the same task, and more boundary cases around overdue task calculations (e.g. a due date exactly equal to "now").

## What surprised me

The initial implementation contained issues that were not immediately obvious from manually reading the code, including an incorrect pagination offset and an unexpected mutation of task priority when completing a task. Writing tests first made these issues straightforward to identify.

## Questions before production

Before shipping, I would clarify the API contract for pagination and filtering (should invalid `status` values be rejected with a 400?), validation requirements for task fields, reassignment behavior for the new `assign` endpoint, error response formats, and whether the in-memory store should be replaced with persistent storage.