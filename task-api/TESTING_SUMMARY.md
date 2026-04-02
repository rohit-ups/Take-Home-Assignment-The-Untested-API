## Task API – Test Coverage Submission

### Overview

The project includes comprehensive testing using **Jest** and **Supertest**, covering both:

- Unit tests for the service layer (`taskService.js`)
- Integration tests for API routes

---

### Test Results

- Test Suites: **2 total**  
  - 1 passed  
  - 1 failed  

- Tests: **34 total**  
  - 32 passed  
  - 2 failed  

---

### Coverage Summary

- Statements: **91.79%**  
- Branches: **80%**  
- Functions: **92.3%**  
- Lines: **90.98%**

---

### Coverage Highlights

- `taskService.js`: **100% coverage** (statements, branches ~94%, functions, lines)  
- API routes (`tasks.js`): **~95% coverage**  
- Validators: **~78% coverage**

---

### Identified Edge Case Failures

The two failing tests highlight important edge cases:

#### 1. Pagination Handling
- Scenario: Negative `page` and `limit` values  
- Current behavior: Returns an empty result  
- Expected behavior: Should return a normalized non-empty response  

#### 2. Update Operation Integrity
- Scenario: Attempt to overwrite immutable field (`id`)  
- Current behavior: Allows modification  
- Expected behavior: `id` should remain unchanged  

---

### Notes

- The majority of functionality and edge cases are covered with high test coverage (>90%).  
- The failing tests highlight areas for improving robustness and data integrity.  
- Overall, the system demonstrates strong coverage across both service logic and API endpoints.  

---

```bash
npm install
npm test
npm run coverage