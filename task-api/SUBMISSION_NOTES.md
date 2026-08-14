# Submission Notes

## What I'd test next

- Invalid pagination values (`page=0`, negative numbers)
- Invalid date formats
- Large page/limit values
- Concurrent updates to the same task
- API contract/schema validation

## What surprised me

The API had no tests despite having several endpoints. The pagination and status filter bugs were easy to miss manually but were immediately revealed by unit tests.

## Questions before production

1. Should completing a task change its priority?
2. Should reassignment overwrite an existing assignee?
3. Should pagination include metadata like `total`, `page`, and `pages`?
4. Should `PUT` behave as full replacement or partial update?