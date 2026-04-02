# Bug Report

## Bug 1: Pagination skips the first page

**Expected behavior:** 
Fetching `/tasks?page=1&limit=10` should return the first 10 items (indexes 0 through 9). The offset should be `(page - 1) * limit`. Also, requesting `page=0` should ideally default to `page=1` or behave as the first page.

**What actually happens:**
Due to `parseInt(page) || 1` in `routes/tasks.js`, `page=0` becomes `1`. Then in `taskService.js` `getPaginated`, `offset` is calculated as `page * limit`.
If `limit` is 10 and `page` is 1, `offset` becomes 10. The `slice` operates from 10 to 20, missing the first 10 items.
As a result, no matter if you use `page=0` or `page=1`, the API skips the first batch of items and starts from the second page.

**How I discovered it:**
While running the integration test `should paginate tasks` with `page=0` and expecting to get the first elements, I received elements from the next page.

**How to fix it:**
1. In `src/services/taskService.js`, change the offset calculation to:
   `const offset = (page - 1 < 0 ? 0 : page - 1) * limit;` OR
   have `routes/tasks.js` continue passing `pageNum` and adjust calculation as `const offset = Math.max(0, (page - 1)) * limit;`
