# Day 1 Test and Coverage Summary

- Command run: npm run coverage
- Test suites: 2 failed, 2 total
- Tests: 4 failed, 28 passed, 32 total

## Coverage

- Statements: 94.77%
- Branches: 89.33%
- Functions: 92.3%
- Lines: 94.26%

## Bugs Found by Tests

1. Status filter bug: partial value like do matches tasks due to substring logic.
2. Pagination bug: page 1 starts at wrong offset and skips first items.

![alt text](<Screenshot 2026-04-15 164037.png>) 
![alt text](<Screenshot 2026-04-15 164021.png>)