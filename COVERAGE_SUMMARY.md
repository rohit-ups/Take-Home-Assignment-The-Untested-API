# Coverage Summary

| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
|------|---------|----------|---------|---------|-------------------|
| **All files** | **93.58** | **82.55** | **93.33** | **92.95** | |
| src/app.js | 69.23 | 75 | 0 | 69.23 | 10-11, 17-18 |
| src/routes/tasks.js | 100 | 91.66 | 100 | 100 | 20-21 |
| src/services/taskService.js | 100 | 94.73 | 100 | 100 | 23 |
| src/utils/validators.js | 77.77 | 71.79 | 100 | 77.77 | 9,12,15,22,28,31 |

**Analysis**:
The overall project coverage stands comfortably at **92.95%**, well above the 80% requirement.
Major logic in `routes` and `services` shows 100% statement and lines coverage.
The uncovered branches mostly relate to error handling block (lines 10-11 in app.js where express sets the default error handler), main execution (lines 17-18 in app.js), edge validation errors that were omitted to not bloat the simple API tests, and fallback default values.
