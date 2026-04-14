/*
 * File Role:
 * This router translates HTTP requests into task service operations. It is the boundary
 * where validation, status-code mapping, and response shaping happen before data is
 * returned to API consumers.
 */

const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
} = require('../utils/validators');

/**
 * WHY: Stats path must be registered before '/:id' so Express does not treat 'stats'
 * as an id parameter and route it incorrectly.
 * HOW: Declared first to preserve static-route precedence.
 *
 * @param {import('express').Request} req - Incoming GET /tasks/stats request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends aggregate stats JSON.
 * @behavior Delegates aggregation to service and responds with 200 on success.
 */
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

/**
 * WHY: Listing supports combined querying so clients can narrow and page task collections
 * in one call rather than orchestrating multiple requests.
 * HOW: Validation happens first, then data flows from service getAll -> in-route filters
 * (status then assignee) -> service pagination -> JSON response.
 *
 * @param {import('express').Request} req - Incoming GET /tasks request with optional query params.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends filtered/paginated task list or 400 validation error.
 * @behavior Filtering is applied before pagination so pages are based on filtered results.
 */
router.get('/', (req, res) => {
  const { status, assignee, page, limit } = req.query;

  // Validate all list query params up-front to keep error semantics predictable.
  const queryError = validateListQuery(req.query);
  if (queryError) {
    return res.status(400).json({ error: queryError });
  }

  // Build result set in stages so filters and pagination can be combined.
  let tasks = taskService.getAll();

  if (status) {
    tasks = tasks.filter((task) => task.status === status);
  }

  if (assignee) {
    const normalizedAssignee = assignee.trim().toLowerCase();
    tasks = tasks.filter(
      (task) => typeof task.assignee === 'string' && task.assignee.toLowerCase() === normalizedAssignee
    );
  }

  if (page !== undefined || limit !== undefined) {
    // Support partial pagination input by applying defaults for omitted fields.
    const pageNum = page === undefined ? 1 : Number(page);
    const limitNum = limit === undefined ? 10 : Number(limit);
    tasks = taskService.getPaginated(pageNum, limitNum, tasks);
  }

  res.json(tasks);
});

// Direct lookup endpoint to avoid fetching a full collection for one task.
/**
 * WHY: Clients often need one task by id for detail screens or follow-up operations.
 * HOW: Performs direct id lookup via service and maps missing records to 404.
 *
 * @param {import('express').Request} req - Incoming GET /tasks/:id request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends task JSON or 404 error payload.
 * @behavior Missing id is handled as normal control flow, not an exception.
 */
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * WHY: Create endpoint enforces contract at the edge before mutating state.
 * HOW: Validates body, delegates creation, returns 201 for successful resource creation.
 *
 * @param {import('express').Request} req - Incoming POST /tasks request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends created task or 400 validation error.
 * @behavior Rejects invalid payloads before calling service to protect data integrity.
 */
router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

/**
 * WHY: Update endpoint needs deterministic contract semantics.
 * HOW: Validation runs before id lookup so malformed payloads always produce 400,
 * independent of whether the target id exists.
 *
 * @param {import('express').Request} req - Incoming PUT /tasks/:id request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends updated task, 400 validation error, or 404 missing-task error.
 * @behavior Validation-first ordering keeps client error handling consistent and predictable.
 */
router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * WHY: Delete endpoint communicates idempotent resource removal semantics using HTTP status.
 * HOW: Service returns boolean existence outcome that is mapped to 204/404.
 *
 * @param {import('express').Request} req - Incoming DELETE /tasks/:id request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends 204 on delete or 404 when task is absent.
 * @behavior No response body is returned for successful deletion per REST convention.
 */
router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

/**
 * WHY: Completion endpoint provides explicit business action distinct from generic update.
 * HOW: Delegates to service and maps missing-task result to 404.
 *
 * @param {import('express').Request} req - Incoming PATCH /tasks/:id/complete request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends completed task or 404 error payload.
 * @behavior Completion timestamp behavior is encapsulated in service layer.
 */
router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * WHY: Assignment endpoint needs explicit conflict semantics for ownership changes.
 * HOW: Validates payload, delegates to service envelope response,
 * then maps service error codes to HTTP statuses (not_found->404, already_assigned->409).
 *
 * @param {import('express').Request} req - Incoming PATCH /tasks/:id/assign request.
 * @param {import('express').Response} res - Express response writer.
 * @returns {void} Sends assigned task or mapped error response.
 * @behavior Re-assigning to a different user is treated as conflict instead of silent overwrite.
 */
router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = taskService.assignTask(req.params.id, req.body.assignee);
  if (result.error === 'not_found') {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Reassignment conflict is explicit to prevent accidental ownership overwrite.
  if (result.error === 'already_assigned') {
    return res.status(409).json({ error: 'Task is already assigned to another user' });
  }

  res.json(result.task);
});

module.exports = router;
