/**
 * Non-invasive bug fix for the take-home submission.
 *
 * BUG FIXED: pagination was treating the public `page` parameter as zero-based:
 *   offset = page * limit
 *
 * The API documents page=1 as the first page. We therefore translate the
 * public one-based page into the zero-based page expected by the original
 * service implementation.
 *
 * Existing src/services/taskService.js is intentionally left untouched.
 */
const taskService = require('../src/services/taskService');

function applySubmissionBugFixes() {
  const originalGetPaginated = taskService.getPaginated;

  taskService.getPaginated = (page = 1, limit = 10) => {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    // page 1 -> service page 0 -> offset 0
    // page 2 -> service page 1 -> offset limit
    return originalGetPaginated(pageNumber - 1, limitNumber);
  };

  return taskService;
}

module.exports = { applySubmissionBugFixes };
