## which bug

`getByStatus` in `taskService.js` uses `.includes()` instead of strict equality `===`



## what i expected

- `GET /tasks?status=todo` should return only tasks with status exactly `todo`

## what actually happens

- `.includes()` is a substring match not exact match
- so `?status=tod` matches `todo` tasks
- `?status=in` matches `in_progress` tasks
- any partial string that exists inside a valid status will return wrong results

## how i found it

- was reading through the service functions and noticed `.includes()` on a string
- `.includes()` on a string checks if the value is a substring, not if its equal
- wrote a test passing `tod` as status and it returned todo tasks, confirmed the bug

## the fix

in `taskService.js` change this:

```js
// before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

```js
// after
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

one word change, `includes` to `===`

## what the fix does

- now only exact status strings match
- `?status=tod` returns empty array
- `?status=todo` returns todo tasks only
