# Final Submission Notes

## What I'd test next if I had more time
- **Performance and Load Testing**: The in-memory array operation (`slice`, `findIndex`) is fast for a small list but will block the main thread loop for huge lists of tasks. I would load test this.
- **Deeper Edge Case Validation**: I would test how the API handles malicious inputs (SQL injections, though irrelevant for in-memory, still good), exceedingly long string payloads, or invalid JSON structures.
- **End-to-End Scenarios**: I would test more complex sequences, such as creating a task, updating it, completing it, and assigning it, ensuring the state remains consistent throughout.

## Anything that surprised me in the codebase
- **The JavaScript truthiness quirk**: I saw `const pageNum = parseInt(page) || 1;` in the pagination logic. This immediately caused an issue where `page=0` evaluated to `1` because `0 || 1` is `1`. This was the root cause of the pagination bug I identified, where the offset skipped the very first elements in the list!
- **Date parsing edge cases**: In the validators, `isNaN(Date.parse(body.dueDate))` is a clever check, but native Date parsing can be inconsistent across environments. Using a library or strict regex might be safer for API guarantees.

## Questions I'd ask before shipping this to production
- **Where will the data persist?** The app currently uses an in-memory array that resets on restart. Before deploying, we absolutely need a durable data store (e.g., PostgreSQL or MongoDB).
- **How are we handling security and authorization?** Currently, anyone can delete, modify, or create tasks. Are there user accounts? Can anyone assign a task to anyone? We likely need JWT or session-based authentication.
- **Should we implement rate limiting?** The API appears entirely open with no request throttling, which makes it easy to bring down the Node.js server via a denial-of-service attack.
