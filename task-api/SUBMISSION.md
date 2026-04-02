# Submission Notes

## Summary
Added comprehensive unit and integration tests for all existing endpoints,
identified and documented 3 bugs through testing, fixed the pagination bug,
and implemented the new `PATCH /tasks/:id/assign` endpoint with full validation and tests.

## What I'd test next
Pagination edge cases like page 0 or negative numbers, and what happens 
when status filter gets an invalid value.

## What surprised me
The `completeTask` function resetting priority to "medium" was the most 
unexpected as it is not mentioned anywhere and would be completely invisible 
without tests since no error is thrown.

## Questions before shipping
1) Is the in-memory store intentional or is a real database coming?
2) Should assignee be validated against actual users or is any string fine?
3) Any plans for authentication? Right now anyone can delete anyone's tasks.

## Coverage Report
```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.7  |   85.71  |   93.1  |   94.16 |                   
 src/app.js      |   69.23 |      75  |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |   92.59  |     100 |     100 | 20-21             
 src/services    |     100 |   94.73  |     100 |     100 | 22                
 src/utils       |    82.6 |   76.47  |     100 |    82.6 | 15,25,28,31       
-----------------|---------|----------|---------|---------|-------------------
Tests: 3 failed (intentional — document unfixed bugs), 47 passed, 50 total
```