# Bug Report — The Untested API

### Bug 1: Pagination Offset Calculation Error
- **Location**: `src/services/taskService.js` inside `getPaginated()`
- **Expected Behavior**: `GET /tasks?page=1&limit=10` returns items 1 to 10 (indices 0 to 9).
- **Actual Behavior**: Calculated offset as `page * limit` (`1 * 10 = 10`), skipping page 1.
- **Root Cause**: Treated 1-based page index as a 0-based offset multiplier.
- **Fix**: Updated offset calculation to `(page - 1) * limit`.

### Bug 2: Substring Matching in Status Filter
- **Location**: `src/services/taskService.js` inside `getByStatus()`
- **Expected Behavior**: `GET /tasks?status=todo` strictly returns tasks where `status === 'todo'`.
- **Actual Behavior**: Used `.includes()`, causing `status=do` to match both `todo` and `done`.
- **Fix**: Replaced `.includes()` with exact equality `===`.

### Bug 3: Priority Overwrite on Task Completion
- **Location**: `src/services/taskService.js` inside `completeTask()`
- **Expected Behavior**: Marking a task complete updates `status` to `'done'` and sets `completedAt`, leaving `priority` unchanged.
- **Actual Behavior**: `priority: 'medium'` was hardcoded in the update object, mutating high/low priority tasks.
- **Fix**: Removed `priority: 'medium'` from the returned update object.