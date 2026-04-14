# Submission Notes

Here are my notes for the conclusion of this take-home assignment:

## Next Steps with More Time
- **Pagination Boundary Assertions:** Add tests to catch extreme boundaries on limit (e.g. `limit=100000`) and ensure negative pages fail gracefully.
- **Data Store Modularity:** I would mock an external data provider or database to test `taskService.js` under simulated delay/rejection conditions instead of tight coupling. 
- **Validation Combinations:** Test deeper combinations like completing tasks without updating `completedAt`, or verifying `assignee` doesn't break standard `createdAt` tracking.

## Surprises in the Codebase
- **Priority Override:** Noticing that the `completeTask` function forcefully reset priority to `"medium"` was unexpected — and arguably quite jarring to user experience!
- **Idempotency Holes:** `update()` could overwrite internal structure components since it carelessly merged `...fields` over top of the task rather than isolating permitted keys.
- **Node Start Strategy:** Seeing `require.main === module` inside `app.js` was a neat addition not generally seen in bare-bone setups; great for isolating testing safely!

## Questions Before Shipping to Production
- **Database & Migration:** Which database are we targeting (e.g., MongoDB, Postgres)? This entirely changes the indexing approach for the `assignee` and `status` fields.
- **Authentication/Ownership:** Should endpoints enforce authentication boundaries? Should `assignee` map against a table of known users?
- **Rate-Limiting:** Do we expect burst submissions? We might need rate limiters (`express-rate-limit`) to prevent server crashes since there's no capping.
