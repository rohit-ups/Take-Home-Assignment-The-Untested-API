# Bug report

Baseline: `2b32db7dc6144bb0c15171886db7e324fec9333d`. All locations below refer to the original code. Findings were first reproduced with service calls and Supertest, then converted into regression tests. No existing tests were supplied.

## Fixed defects

| Bug and original location | Expected / actual behavior | Cause and fix | Regression coverage |
| --- | --- | --- | --- |
| First page skipped — `taskService.js:12` | Page 1 should contain the first task; `page=1&limit=1` returned the second. | `page * limit` assumes page zero. Changed to `(page - 1) * limit`. | Service pagination; API first/second/beyond-end pages. |
| Partial status matches — `taskService.js:9` | Filtering should match a complete status; `do` matched `todo`. | String `.includes()` matches substrings. Replaced with strict equality; API rejects invalid status filters. | Service exact-status test; API list query cases. |
| Filter ignores pagination — `routes/tasks.js:14-16` | Combining `status=todo&limit=1` should return one matching task; it returned all matches. | The filter branch returned before pagination. Pagination now operates on the selected status list. | Service filtered pagination; API combined filter/page tests. |
| Completion resets priority — `taskService.js:69` | Completing a high/low-priority task should preserve priority; it became medium. | Hardcoded priority overwrote the original. Completion now uses the normal status update operation. | Parameterized service priority test and HTTP completion test. |
| Falsy values bypass enum checks — `validators.js:8,11,24,27` | Supplied status/priority must belong to their enum; null, false, zero, and empty strings were stored. A stored null status caused filtering to return 500. | Truthiness checks confuse omitted values with invalid supplied values. Check for undefined, then require enum membership. | POST and PUT invalid-field cases, with storage unchanged after rejection. |
| Clients replace identity/metadata — `taskService.js:50` | ID and timestamps should remain server-owned; PUT replaced ID and accepted fake timestamps/extra fields. | Arbitrary spreading trusted client fields. Request validation rejects unknown fields; service update copies only editable fields. | Direct service metadata test; HTTP ID/timestamp/unknown-field cases. |
| Invalid body shape and description — `validators.js:20` | Update body should be an object and description a string; an array added numeric properties, and non-string descriptions were accepted. | No shape/type checks. Validate object shape before reading fields and validate description when supplied. | Non-object HTTP bodies and invalid description cases. |
| Date validation accepts invalid input — `validators.js:14,30` | Declared ISO date field should accept valid timestamps/null; natural-language dates, false and zero were accepted. | Truthiness plus permissive Date.parse. Require an explicit timezone-qualified ISO format, calendar validity, and a parseable instant. | Both write endpoints; leap years, impossible dates, offset and fractional-second cases. |
| Malformed JSON becomes 500 — `app.js:9-11` | Bad client JSON should return 400; posting `{` returned 500. | All errors were treated as internal failures. Recognize parser errors as 400 and oversized bodies as 413; keep unexpected errors generic. | Malformed JSON, oversized body, and controlled unexpected-error tests. |
| Invalid pagination silently succeeds — `routes/tasks.js:20-21` | Invalid supplied values should be rejected; negative values were accepted and zero/non-numeric values silently defaulted. | Permissive parseInt and truthy defaults. Require positive decimal integers, safe numeric values/offsets, and use defaults only when omitted. | Query cases for zero, negative, fractional, trailing text, repeated/structured parameters, unsafe values and offsets. |

## Corrected inconsistencies with documented decisions

Completion metadata was inconsistent: creating a done task left completedAt null, reopening retained the timestamp, and repeated completion changed it. The brief does not define all these transitions. The chosen rule is that done tasks have a timestamp, reopening clears it, and repeat completion preserves the original time. Service and API tests cover these decisions; they are not presented as explicit requirements from the brief.

The README used pending/in-progress/completed while the assignment and implementation use todo/in_progress/done. Corrected the README to agree with the brief. The README also described PUT as full replacement while the implementation performed partial updates; preserved partial updates and documented that behavior.

## New feature

The absent `PATCH /tasks/:id/assign` endpoint was the assigned feature, not an accidental defect. It is implemented and tested. Missing/blank/non-string names return 400; valid assignment to a missing task returns 404; reassignment replaces the name. Names are trimmed. Completion and subsequent updates preserve the assignment.

## Remaining limits

The in-memory store is intentionally unchanged. Service functions assume validated callers; direct create calls can bypass HTTP validation, and returned objects still share references with storage. Those helpers are internal, and HTTP clients receive serialized values. Persistent storage, authentication, user identity lookup, and a uniform JSON response for every unknown route remain outside this assignment.
