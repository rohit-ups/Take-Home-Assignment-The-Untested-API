Bug Report

## Pagination off-by-one bug in `getPaginated`
- Expected: `page=1` should return first page items (items 1..limit), `page=2` should return next slice.
- Actual: page was treated as 0-based in service (`offset = page * limit`), so `page=1` returned second page.
- Discovered by: automated unit test `taskService.test.js` with expected first-page items failing.
- Fix implemented: normalize page to 1-based in `getPaginated`, i.e. `offset = (page - 1) * limit` with safe defaults.
 