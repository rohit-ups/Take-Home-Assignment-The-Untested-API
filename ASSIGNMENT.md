# Task Manager API - Assignment Documentation

## Part 1: Bug Report
During the initial code review of `routes/tasks.js`, `services/taskService.js`, and `utils/validators.js`, several logical bugs and missing requirements were identified.

### Bug 1: Pagination Logic Flaw
- **Location:** `services/taskService.js` (function `getPaginated`)
- **Technical Explanation:** The previous logic calculated the pagination offset as `page * limit`. Since the route sets `page = 1` by default for the first page, requesting the first page effectively skipped the first `limit` items (e.g. `1 * 10 = 10`, starting at index 10). Pages should be 1-indexed relative to an offset starting at 0.

### Bug 2: Status Filter Inaccuracy
- **Location:** `services/taskService.js` (function `getByStatus`)
- **Technical Explanation:** The filter evaluated statuses using `t.status.includes(status)` instead of strict equality `===`. This loose match meant searching for the status 'do' would accidentally return tasks marked as both 'todo' and 'done', undermining accurate filtering. 

### Bug 3: Unintended Priority Reset on Completion
- **Location:** `services/taskService.js` (function `completeTask`)
- **Technical Explanation:** When completing a task, the function hardcoded a status change to `done` but simultaneously hardcoded `priority: 'medium'`. This was an unintended side-effect, as marking a critical (high priority) task as complete shouldn't rewrite its priority severity.

### Bug 4: Missing Task Retrieval by ID
- **Location:** `routes/tasks.js`
- **Technical Explanation:** A standard REST API requires the ability to fetch a single entity. While the service implementation `findById` existed, the router missed a `GET /tasks/:id` endpoint exposing this functionality.

### Bug 5: Data Injection Vulnerability (Over-posting)
- **Location:** `services/taskService.js` (function `update`) and `utils/validators.js`
- **Technical Explanation:** `validateUpdateTask` only checked known keys but didn't strip unknown ones. `taskService.update` then spread `fields` blindly into the task object (`{ ...tasks[index], ...fields }`). This allowed users to inject arbitrary data properties (e.g., `isAdmin: true`) or overwrite system-managed fields like `id` and `createdAt`.

---

## Part 2: Bug Fix Approaches

**Fix 1: Pagination:**
Changed the calculation to `const offset = (page - 1) * limit;` to ensure the first page correctly starts at index 0 without skipping data.

**Fix 2: Status Filter:**
Refactored the method to check `t.status === status`.

**Fix 3: Completion Logic:**
Removed `priority: 'medium'` from the mutated object, preserving the task's original priority when marked as done.

**Fix 4: Read by ID Route:**
Created `router.get('/:id')` checking if the task exists and returning a 404 if not found (with a slight guard to pass `/stats` properly in the router stack).

**Fix 5: Safe Property Assigning:**
Updated `taskService.update` to instantiate an iterating loop that verifies keys against a localized `allowedFields` array (`['title', 'description', 'status', 'priority', 'dueDate', 'assignee']`). This sanitizes the payload directly before spreading, securing the entity structure.

---

## Part 3: Design Decisions for `PATCH /tasks/:id/assign`

**Feature Objective:** Implement the ability to assign a task to a user securely.

**Decisions:**
1. **Schema Update:** I added an `assignee` field to the object creation schema initialized to `null`.
2. **Dedicated Route vs. Put Update:** While a `PUT /tasks/:id` could technically update the assignee due to Fix #5 explicitly adding it to `allowedFields`, adding `PATCH /tasks/:id/assign` provides better semantic design and API clarity for explicit assignment events.
3. **Route Extraction & Validation:** The handler strips `req.body.assignee`. Instead of leaning fully into the global validator where the field is optional, the route enforces that `assignee` must be a non-empty string. This returns a `400 Bad Request` if skipped.
4. **Resiliency Validation Update:** I also updated `validators.js` so that `validateUpdateTask` and `validateCreateTask` correctly restrict `assignee` to be a non-empty string *if provided at all*, closing any loopholes during broad `PUT` requests.
5. **Handling "Not Found":** Similar to other specific patches, the route checks if `taskService.update` returned `null` and successfully dispatches a `404 Not Found`.
