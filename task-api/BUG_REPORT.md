# Bug Report

## Bug 1: Pagination skips the first page

### Location

`src/services/taskService.js`

### Problem

The `getPaginated()` function calculated the offset using:

```js
const offset = page * limit;