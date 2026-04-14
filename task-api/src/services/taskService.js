/*
 * File Role:
 * This service owns the in-memory task state and all business rules that mutate or
 * derive task data. Routes delegate to this module so HTTP concerns stay separate
 * from domain behavior.
 */

const { v4: uuidv4 } = require('uuid');

/*
 * In-memory store intentionally keeps the assignment simple (no database wiring)
 * while still allowing full API behavior and testing of business rules.
 */
let tasks = [];

// Only these keys can be changed through update operations.
const MUTABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'assignee'];

/**
 * WHY: Returning direct task references would let external callers mutate internal state
 * without going through service rules.
 * HOW: Creates a shallow copy for read responses.
 *
 * @param {object} task - Internal task object from in-memory store.
 * @returns {object} Cloned task object safe for external consumption.
 * @behavior Prevents accidental out-of-band mutation by route/tests/callers.
 */
// Return shallow copies so callers cannot mutate in-memory state by reference.
const cloneTask = (task) => ({ ...task });

/**
 * WHY: Ensures only explicitly provided object keys are considered for mutable updates.
 * HOW: Uses safe hasOwnProperty invocation.
 *
 * @param {object} obj - Candidate update object.
 * @param {string} key - Field to test for direct ownership.
 * @returns {boolean} True when update payload directly provides key.
 * @behavior Avoids inherited/prototype key leakage into update flow.
 */
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * WHY: Normalizes mutable text fields at a single boundary so downstream reads are consistent.
 * HOW: Trims known string fields while preserving other values.
 *
 * @param {object} fields - Candidate mutable fields extracted from user input.
 * @returns {object} Normalized field object for safe merge into persisted state.
 * @behavior Applies whitespace normalization consistently for title/description/assignee.
 */
const normalizeMutableFields = (fields) => {
  const normalized = { ...fields };

  if (typeof normalized.title === 'string') {
    normalized.title = normalized.title.trim();
  }

  if (typeof normalized.description === 'string') {
    normalized.description = normalized.description.trim();
  }

  if (typeof normalized.assignee === 'string') {
    normalized.assignee = normalized.assignee.trim();
  }

  return normalized;
};

/**
 * WHY: List endpoints should expose data but never the raw backing store references.
 * HOW: Clones every task before returning.
 *
 * @param {void} _unused - No direct input; reads current in-memory state.
 * @returns {object[]} Snapshot array of cloned tasks.
 * @behavior Keeps read operations side-effect free for callers.
 */
const getAll = () => tasks.map(cloneTask);

/**
 * WHY: Routes need single-task lookup without exposing mutable in-store references.
 * HOW: Finds by id then clones if present.
 *
 * @param {string} id - Task identifier from route parameter.
 * @returns {object|undefined} Cloned task when found, otherwise undefined.
 * @behavior Non-throwing lookup keeps route-level 404 handling straightforward.
 */
const findById = (id) => {
  const task = tasks.find((t) => t.id === id);
  return task ? cloneTask(task) : undefined;
};

/**
 * WHY: Status filtering is categorical, not fuzzy text search.
 * HOW: Uses strict equality and returns clones.
 *
 * @param {string} status - Exact status value requested by caller.
 * @returns {object[]} Matching task list by exact status.
 * @behavior Avoids partial-string false positives in filtered responses.
 */
const getByStatus = (status) => tasks.filter((t) => t.status === status).map(cloneTask);

/**
 * WHY: Assignee filters are commonly user-entered and should be tolerant of case/spacing.
 * HOW: Normalizes query and compares lower-cased assignee values.
 *
 * @param {string} assignee - Assignee search term from query string.
 * @returns {object[]} Tasks assigned to matching normalized assignee.
 * @behavior Case-insensitive exact match prevents subtle user-facing filter misses.
 */
const getByAssignee = (assignee) => {
  // Case-insensitive matching keeps filtering user-friendly across clients.
  const normalizedAssignee = assignee.toLowerCase().trim();
  return tasks
    .filter((t) => typeof t.assignee === 'string' && t.assignee.toLowerCase() === normalizedAssignee)
    .map(cloneTask);
};

/**
 * WHY: Paging is part of API contract and uses 1-based page numbers for client ergonomics.
 * HOW: Clamps invalid values, converts page to zero-based offset, slices source list.
 *
 * @param {number} page - 1-based page index requested by caller.
 * @param {number} limit - Maximum items per page.
 * @param {object[]} [sourceTasks=tasks] - Optional pre-filtered source list.
 * @returns {object[]} Cloned paginated task slice.
 * @behavior Invalid page/limit values are clamped so service remains deterministic.
 */
const getPaginated = (page, limit, sourceTasks = tasks) => {
  // Clamp to safe minimums so service stays deterministic for bad numeric inputs.
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;

  return sourceTasks.slice(offset, offset + safeLimit).map(cloneTask);
};

/**
 * WHY: Stats endpoint gives quick operational visibility without requiring client-side aggregation.
 * HOW: Iterates task store once and accumulates status counts plus overdue count.
 *
 * @param {void} _unused - No direct input; derives from in-memory state.
 * @returns {{todo:number, in_progress:number, done:number, overdue:number}} Aggregate stats payload.
 * @behavior Overdue excludes done tasks so historical completed work does not inflate active risk.
 */
const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

/**
 * WHY: Central creation function enforces defaults and normalized shape for all new tasks.
 * HOW: Applies defaults, trims text inputs, sets identifiers/timestamps, persists to in-memory store.
 *
 * @param {object} payload - Task creation data from route layer.
 * @param {string} payload.title - Required task title.
 * @param {string} [payload.description=''] - Optional descriptive text.
 * @param {string} [payload.status='todo'] - Initial status.
 * @param {string} [payload.priority='medium'] - Priority level.
 * @param {string|null} [payload.dueDate=null] - Optional due date.
 * @param {string|null} [payload.assignee=null] - Optional assignee.
 * @returns {object} Cloned created task.
 * @behavior completedAt is auto-set only when initial status is done.
 */
const create = ({
  title,
  description = '',
  status = 'todo',
  priority = 'medium',
  dueDate = null,
  assignee = null,
}) => {
  const task = {
    id: uuidv4(),
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate,
    assignee: typeof assignee === 'string' ? assignee.trim() : null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  if (task.status === 'done') {
    // Keep create() consistent with completion semantics used elsewhere.
    task.completedAt = new Date().toISOString();
  }

  tasks.push(task);
  return cloneTask(task);
};

/**
 * WHY: Update flow must allow partial business-field edits while preventing identity/timestamp tampering.
 * HOW: Extracts allow-listed fields, normalizes strings, merges into existing record,
 * and synchronizes completedAt with status transitions.
 *
 * @param {string} id - Task identifier to update.
 * @param {object} fields - Requested field changes from caller.
 * @returns {object|null} Cloned updated task or null when task is missing.
 * @behavior Silently ignores immutable/non-allowed keys such as id and createdAt.
 */
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const safeUpdates = {};
  // Ignore unknown keys so immutable fields cannot be overridden by clients.
  for (const key of MUTABLE_FIELDS) {
    if (hasOwn(fields, key)) {
      safeUpdates[key] = fields[key];
    }
  }

  const normalizedUpdates = normalizeMutableFields(safeUpdates);
  const updated = { ...tasks[index], ...normalizedUpdates };

  // Keep completion timestamp aligned with status transitions.
  if (hasOwn(normalizedUpdates, 'status')) {
    if (updated.status === 'done') {
      updated.completedAt = tasks[index].completedAt || new Date().toISOString();
    } else {
      updated.completedAt = null;
    }
  }

  tasks[index] = updated;
  return cloneTask(updated);
};

/**
 * WHY: Delete endpoint needs simple existence-based removal result for 204/404 mapping.
 * HOW: Removes by index when present.
 *
 * @param {string} id - Task identifier to remove.
 * @returns {boolean} True when a task was removed, false when id was not found.
 * @behavior No throw path keeps route error mapping explicit and predictable.
 */
const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

/**
 * WHY: Dedicated completion action standardizes done-state behavior.
 * HOW: Finds task, sets status to done, and preserves existing completion timestamp if already set.
 *
 * @param {string} id - Task identifier to complete.
 * @returns {object|null} Cloned completed task or null when task is missing.
 * @behavior Does not alter unrelated business fields such as priority or assignee.
 */
const completeTask = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const task = tasks[index];

  const updated = {
    ...task,
    status: 'done',
    completedAt: task.completedAt || new Date().toISOString(),
  };

  tasks[index] = updated;
  return cloneTask(updated);
};

/**
 * WHY: Assignment operation needs richer outcomes than success/failure without using exceptions
 * for expected business conflicts (missing task or already assigned).
 * HOW: Returns an envelope containing either an error code or updated/current task snapshot.
 *
 * @param {string} id - Task identifier to assign.
 * @param {string} assignee - Requested assignee name.
 * @returns {{error: 'not_found'|'already_assigned'|null, task: object|null}} Outcome envelope.
 * @behavior Idempotent when assigning the same user; conflict when assigning a different user.
 */
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return { error: 'not_found', task: null };
  }

  const normalizedAssignee = assignee.trim();
  const current = tasks[index];

  // Prevent accidental reassignment via assign endpoint.
  if (current.assignee && current.assignee !== normalizedAssignee) {
    return { error: 'already_assigned', task: cloneTask(current) };
  }

  // Repeating same assignee is treated as an idempotent success.
  if (current.assignee === normalizedAssignee) {
    return { error: null, task: cloneTask(current) };
  }

  const updated = {
    ...current,
    assignee: normalizedAssignee,
  };

  tasks[index] = updated;
  return { error: null, task: cloneTask(updated) };
};

/**
 * WHY: Tests require deterministic isolation because store is process-global state.
 * HOW: Clears in-memory collection between tests.
 *
 * @param {void} _unused - No input.
 * @returns {void} Nothing returned.
 * @behavior Intended for test setup; not part of external API contract.
 */
const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getByAssignee,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
