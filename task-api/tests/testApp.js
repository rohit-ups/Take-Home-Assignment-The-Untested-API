/**
 * Shared Supertest app for the submission.
 *
 * Keeping registration in one place ensures integration tests exercise the
 * same assignment route and pagination fix used by the submission server.
 */
const app = require('../src/app');
const registerAssignRoute = require('../submission/assignRoute');
const { applySubmissionBugFixes } = require('../submission/bugFixes');

applySubmissionBugFixes();
registerAssignRoute(app);

module.exports = app;
