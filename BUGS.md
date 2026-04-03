# Bug Report — Task API

---

## Bug 01: Status Validation Logic

- **Location:** `src/utils/validators.js:8`

- **The Issue:** The validator uses strict string matching for task status.

- **Expected:** Should accept "TODO", "todo", or " todo " (normalized input).

- **Actual:** Rejects any input that isn't exactly lowercase and trimmed, returning a 400 Bad Request.

- **Fix:** Apply `.trim().toLowerCase()` to the input before validation.

---

## Bug 02: Title and Description Input Normalisation

- **Location:** `src/utils/validators.js:5`

- **The Issue:** The validator does not normalise `title` and `description` fields before storing them. Raw input is saved as-is, including leading/trailing whitespace.

- **Expected:** `"Write unit tests for auth module    "` should be stored as `"Write unit tests for auth module"` and `"     hel lo       "` should be stored as `"hel lo"`.

- **Actual:** Both fields are stored with the original whitespace intact, causing inconsistent data in the in-memory database.

- **Fix:** Apply `.trim()` to `title` and `description` before validation and storage. For collapsing internal spaces use `.trim().replace(/\s+/g, ' ')`.

---

## Bug 03: Priority Validation Logic

- **Location:** `src/utils/validators.js:11`

- **The Issue:** The validator uses strict string matching for task priority.

- **Expected:** Should accept "LOW", "lOw", or " low " (normalized input).

- **Actual:** Rejects any input that isn't exactly lowercase and trimmed, returning a 400 Bad Request.

- **Fix:** Apply `.trim().toLowerCase()` to the input before validation.

---

## Bug 04: String "null" Accepted as Valid Title

- **Location:** `src/utils/validators.js:5`

- **The Issue:** The validator only checks if `title` is falsy, meaning it catches actual `null` but does not guard against meaningless string values like `"null"`, `"undefined"`, or whitespace-only strings like `"   "`.

- **Expected:** All of the following inputs should be rejected with a 400 Bad Request:
  - `{ "title": "null" }`
  - `{ "title": "undefined" }`
  - `{ "title": "   " }`
  - `{ "title": "" }`

- **Actual:** `"null"` and `"undefined"` pass validation and get stored in the database as legitimate task titles since they are technically non-empty strings.

- **Fix:** Explicitly check for these invalid string values after normalising the input:
```javascript
const invalidTitles = ['null', 'undefined', 'none', ''];
if (!title || invalidTitles.includes(title.trim().toLowerCase())) {
  return 'Title must be a valid non-empty string';
}
```

---

## Bug 05: No Validation on dueDate Field

- **Location:** `src/utils/validators.js`

- **The Issue:** The `dueDate` field accepts any value without validating format, past dates, or unrealistically far future dates.

- **Expected:** Should reject any `dueDate` that is not in ISO 8601 format, is in the past, or is unrealistically far in the future, returning a 400 Bad Request.

- **Actual:** All of the following were accepted and stored as-is with no error thrown:
  - `"2026-03-02T12:00:00.000Z"` — past date
  - `"2026-03-02"` — past date + wrong format
  - `"10/11/2022"` — past date + completely wrong format
  - `"2091-9-10"` — unrealistically far future + wrong format

- **Fix:** Apply format checking, past date rejection, and future date capping before storage:
```javascript
const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
if (!iso8601Regex.test(dueDate)) {
  return 'dueDate must be in ISO 8601 format e.g. 2026-04-10T12:00:00.000Z';
}
if (new Date(dueDate) < new Date()) {
  return 'dueDate cannot be in the past';
}
if (new Date(dueDate) > new Date('2060-01-01T00:00:00.000Z')) {
  return 'dueDate is unrealistically far in the future';
}
```

---

## Bug 06: Duplicate Task Entries Not Rejected

- **Location:** `src/utils/validators.js:31`

- **The Issue:** The validator does not check for duplicate tasks before creating a new entry. A task with the exact same `title`, `description`, `status`, `priority`, and `dueDate` can be created multiple times without any error.

- **Expected:** If a task with the same `title` and `dueDate` already exists in the database, the API should reject the request with a 409 Conflict error.

- **Actual:** The following identical entries were both accepted and stored with different IDs, created at `2026-04-03T07:44:07.611Z` and `2026-04-03T07:46:49.644Z` with different UUIDs but otherwise identical data:
```json
{
  "title": "hey there",
  "description": "hello",
  "status": "todo",
  "priority": "low",
  "dueDate": "2091-9-10"
}
```

- **Fix:** Before creating a new task, check if a task with the same `title` and `dueDate` already exists:
```javascript
const isDuplicate = tasks.some(
  (t) => t.title.trim().toLowerCase() === title.trim().toLowerCase()
      && t.dueDate === dueDate
);
if (isDuplicate) {
  return 'A task with the same title and due date already exists';
}
```

---

## Bug 07: Incorrect Pagination Offset Calculation

- **Location:** `src/services/taskService.js`

- **The Issue:** The pagination offset is calculated as `page * limit` instead of `(page - 1) * limit`, causing page 1 to skip the first set of results entirely and return wrong data for every page.

- **Expected:** Sending `?page=1&limit=5` should return the first 5 tasks (index 0 to 4).

- **Actual:** Sending `?page=1&limit=5` skips the first 5 tasks and returns index 5 to 9 instead, meaning page 1 behaves like page 2, page 2 behaves like page 3, and so on. The actual first page of results is never accessible.

- **Example:**
```javascript
// With 10 tasks in DB, page=1, limit=5
const offset = 1 * 5;       // ❌ offset = 5, skips first 5 tasks
const offset = (1 - 1) * 5; // ✅ offset = 0, starts from beginning
```

- **Fix:** Subtract 1 from the page number before multiplying:
```javascript
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};
```

---

## Bug 08: `getByStatus` Uses Partial Match Instead of Exact Match

- **Location:** `src/services/taskService.js`

- **The Issue:** `.includes()` does partial string matching on status instead of exact matching.

- **Expected:** `?status=do` should return no results since `"do"` is not a valid status.

- **Actual:** `?status=do` returns both `todo` and `done` tasks since both strings contain the substring `"do"`.

- **Fix:**
```javascript
tasks.filter((t) => t.status === status.trim().toLowerCase());
```

---

## Bug 09: `completeTask` Forcefully Resets Priority to `medium`

- **Location:** `src/services/taskService.js`

- **The Issue:** Marking a task complete silently overwrites its existing priority with `"medium"` regardless of what it was before.

- **Expected:** A task with `priority: "high"` that is marked as complete should remain `priority: "high"`.

- **Actual:** Priority is hardcoded to `"medium"` on every task completion, losing the original priority value permanently.

- **Fix:** Remove the hardcoded priority override:
```javascript
const updated = {
  ...task,
  // priority: 'medium'  ← remove this line
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Bug 10: `PUT /:id` Allows Overwriting Protected Fields

- **Location:** `src/services/taskService.js`

- **The Issue:** The `update()` function spreads all incoming fields with no restrictions, allowing clients to overwrite fields that should never change.

- **Expected:** `id`, `createdAt`, and `completedAt` should never be overwritable by the client.

- **Actual:** Sending the following body via `PUT` gets accepted and stored without any error:
```json
{ "id": "fake-id", "createdAt": "2000-01-01" }
```

- **Fix:** Strip protected fields before merging:
```javascript
const update = (id, fields) => {
  const { id: _, createdAt, completedAt, ...safeFields } = fields;
  const updated = { ...tasks[index], ...safeFields };
  tasks[index] = updated;
  return updated;
};
```

---

## Bug 11: No Validation on `page` and `limit` Query Parameters

- **Location:** `src/routes/tasks.js`

- **The Issue:** Page and limit query parameters are never validated before being used for pagination.

- **Expected:** All of the following should be rejected with a 400 Bad Request:
  - `?page=-1&limit=5` — negative page number
  - `?page=0&limit=5` — zero is not a valid page
  - `?page=1&limit=99999` — absurdly large limit
  - `?page=abc&limit=5` — non-numeric, silently falls back to 1

- **Actual:** All of the above are accepted silently with no error thrown, causing unexpected results.

- **Fix:**
```javascript
if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
  return res.status(400).json({ error: 'Invalid page or limit value' });
}
```

---

## Bug 12: `PUT /:id` Can Set `status: done` Without Setting `completedAt`

- **Location:** `src/routes/tasks.js`

- **The Issue:** The `PUT` endpoint bypasses the `completeTask()` logic entirely, allowing a task to be marked as `done` without a `completedAt` timestamp being set.

- **Expected:** Any task with `status: "done"` should always have a `completedAt` timestamp, consistent with the behaviour of `PATCH /:id/complete`.

- **Actual:** Sending `{ "status": "done" }` via `PUT` leaves `completedAt` as `null`, creating an inconsistency in the data.

- **Fix:** Intercept the status change inside `update()` and set `completedAt` automatically:
```javascript
if (fields.status === 'done' && !tasks[index].completedAt) {
  fields.completedAt = new Date().toISOString();
}
```

---

*Total Bugs Found: 12*