## 🐞 Bug 01: Status Validation Logic

**Status:** ✅ Fixed

### 🔧 Resolution
Updated the validation logic in `src/utils/validators.js` to handle user input inconsistencies.  
Instead of validating raw input, status values are now normalized by trimming whitespace and converting to lowercase before validation.

### 💻 Code Change
```javascript
// Before
const isValid = ['todo', 'in_progress', 'done'].includes(status);

// After
const normalizedStatus = status?.trim().toLowerCase();
const isValid = ['todo', 'in_progress', 'done'].includes(normalizedStatus);

### Verification (Proof of Fix)

Executed the Jest test suite for this bug. All test cases passed successfully, confirming proper handling of case variations and whitespace.
Bug 01 — Status accepts case variants and whitespace
  √ should accept "TODO" (uppercase)
  √ should accept " todo " (with spaces)
  √ should accept "In_Progress" (mixed case)
  √ should still reject completely invalid status
