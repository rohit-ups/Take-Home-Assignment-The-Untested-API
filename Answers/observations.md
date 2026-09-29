## checking my manual testing notes

- working endpoints are correct
  - checked the routes file they are all wired up properly
- `GET /:id` - yes its not implemented
  - `findById` exists in the service but no route uses it
  - its just sitting there doing nothing
- pagination - yeah its broken
  - route defaults page to `1` but service does `offset = page * limit`
  - so page 1 skips the first 10 items
  - should be `(page - 1) * limit`
- `/reset` - correct its not a route
  - `_reset()` only exists in the service for internal use
- try catch - yes confirmed
  - global error handler in app.js only works if u pass error to `next(err)`
  - if somthing throws inside a route it just crashes
- the missing return thing - returns are actually there in most places
  - the ones without explicit return like in put and delete are fine in express
  - more of a style thing than a real bug



## extra stuff i noticed

- `getByStatus` uses `.includes()` which is substring match not exact
  - so `?status=tod` would match `todo` tasks
  - should be `===`
- `status: ""` and `priority: ""` both pass validation
  - bcz empty string is falsy so the validator just skips the check
  - same issue with `dueDate: ""`
- `completeTask` always resets priority back to `medium`
  - doesnt matter what it was before
  - high priority task becomes medium after completing
  - prob not intentional
- no validation on the status query param when filtering
  - `?status=anyrandomthing` just returns empty array with no error
- title has no max lenght check
  - u can send a massive string and it just gets stored



## fields quick notes

- `title`
  - empty/null rejected ok
  - no max length
  - no sanitization
- `status` / `priority`
  - invalid values rejected ok
  - but empty string `""` slips through
- `dueDate`
  - invalid string rejected ok
  - `""` slips through and gets stored as empty string instead of null
  - passing a number like `123` acutally works bcz `Date.parse` reads it as a timestamp



## need to remeber for writing tests

- call `taskService._reset()` in `beforeEach`
  - or tasks from one test will leak into the next one
  - this will cause alot of random failures
- `/tasks/stats` route is declared before `/:id` in the file
  - its fine bcz express matches literal strings first
  - just good to know
