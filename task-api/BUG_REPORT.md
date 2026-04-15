# Bug Report

While building out the test suite, I identified several logic errors that would have caused issues in a production environment. Here’s what I found and how I handled it:

### 1. Pagination Offset Logic
*   **Location:** `src/services/taskService.js` -> `getPaginated()`
*   **The Issue:** The offset was calculated as `page * limit`.
*   **Why it happened:** This missed the fact that array indexing starts at 0. If a user requested Page 1 with a limit of 10, the code set the offset to 10, effectively hiding the first 10 tasks.
*   **The Fix:** I updated the math to `(page - 1) * limit`.

### 2. Loose Status Filtering
*   **Location:** `src/services/taskService.js` -> `getByStatus()`
*   **The Issue:** The filter used `.includes()`.
*   **Why it happened:** This allowed for partial matches. For example, a request for tasks with a status of "do" would return both "todo" and "done" tasks. This makes the filter unreliable for categorical data.
*   **The Fix:** I switched this to a strict equality check (`===`).

### 3. Priority Reset on Completion
*   **Location:** `src/services/taskService.js` -> `completeTask()`
*   **The Issue:** Completing a task forced its priority to "medium".
*   **Why it happened:** The original code had the priority hardcoded in the update object. This meant a "high" priority task would lose its importance level as soon as it was marked finished.
*   **The Fix:** I removed the hardcoded field so the task's original priority is preserved.

### 4. Silent Failures on Bad Query Params
*   **Location:** `src/routes/tasks.js` -> `GET /`
*   **The Issue:** Invalid query parameters (like a negative page number or an unknown status) were processed without warning.
*   **Why it happened:** There was no validation layer for query strings before they hit the service layer.
*   **The Fix:** I added a validation check at the route level to return a `400` error if the user provides invalid filter or pagination values.
