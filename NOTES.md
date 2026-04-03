# BELOW IS A SIMPLE OVERVIEW OF THE FLOW OF WHAT I FOUND AND DID 
# Assignment Notes

## What I did
- Explored the codebase and tested all endpoints manually -> Used ThunderClient extension / can use POSTMAN too
- Wrote unit tests for taskService functions -> can be found in tests/
- Wrote integration tests for API routes using Supertest
- Achieved over 90% test coverage -> checked through supertest -> npm run coverage

## Bugs Found
- Found an issue in pagination where offset was calculated incorrectly
- Fixed it by updating the logic to (page - 1) * limit

## Feature Added
- Implemented PATCH /tasks/:id/assign
- Added validation for empty assignee --> src/routes/tasks.js
- Handled cases for invalid task ID --> src/services/taskService.js and also at src/routes/tasks.js

## Learnings I got from this
- Writing tests helped me understand the code better
- Found that small logic issues can affect API behavior
- Learned how to debug and verify fixes properly

## If I had more time
- Improve validation logic further
- Add more edge case tests