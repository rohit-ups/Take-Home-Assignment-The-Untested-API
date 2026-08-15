# Submission Notes

## What I Tested

I added Jest and Supertest tests covering the Task API endpoints, including happy paths and edge cases.

The test suite currently contains 25 tests, all passing.

Coverage:

- Statements: 93.58%
- Branches: 82.02%
- Functions: 93.33%
- Lines: 93%

## What Surprised Me

The API initially had no tests, and some behavior that looked correct at first was not working as expected. Writing the tests helped identify the issues before making changes.

## What I Would Test Next

If I had more time, I would add more unit-level tests for the service and validators, including additional invalid inputs, pagination edge cases, and date-related behavior.

## Questions Before Production

Before shipping, I would ask about:

- Expected validation rules for task fields
- Whether task data should eventually be persisted in a database
- Authentication and authorization requirements
- Expected pagination limits
- Whether assigning tasks should have any restrictions

## Final Status

- 25/25 tests passing
- 93.58% statement coverage
- Bug identified and fixed
- `PATCH /tasks/:id/assign` feature implemented
- Tests added for the new feature