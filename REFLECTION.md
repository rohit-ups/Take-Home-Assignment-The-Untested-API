# Reflection

### What would you test next?
If I were to expand the testing suite further:
1. **Mocking External Dependencies:** For a real application, I'd integrate a SQLite or PostgreSQL testing database or mock out the data persistence layer using a proper mocking library.
2. **Stress/Load Testing:** Introduce a tool like Artillery or K6 to test API stability under a high concurrent load.
3. **Validation logic specifics:** I would add further test scenarios in validation to guarantee dates follow strict schema parameters for time zones.

### What surprised you?
It was surprising/intriguing to see a very subtle bug implemented into `taskService.getPaginated`. Pagination bugs involving $1$-based arrays versus $0$-based bounds (`offset = page * limit`) trick developers almost constantly! Also, seeing `.includes()` for an exact enumeration match showed why unit tests shouldn't assume the implementation acts accurately to expectations without checking edge cases specifically (like `progress` vs `in_progress`).

### Questions before production release?
1. **Data Persistence:** Before production, should we connect this to an actual database (e.g. Postgres or MongoDB)? The `in-memory` array isn't durable over restarts.
2. **Authentication/Authorization:** Who can use the `/assign` or `/complete` routes? Is there an expected security middleware implementation?
3. **Concurrency:** Are there scenarios where a race condition on `tasks.findIndex` + array mutation can leave state inconsistent?
