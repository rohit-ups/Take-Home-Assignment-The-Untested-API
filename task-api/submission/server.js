/**
 * Submission entry point.
 *
 * It composes the original Express application with the new assignment route
 * and the selected bug fix, without editing the original src/ files.
 */
const app = require('../src/app');
const registerAssignRoute = require('./assignRoute');
const { applySubmissionBugFixes } = require('./bugFixes');

applySubmissionBugFixes();
registerAssignRoute(app);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API submission server running on port ${PORT}`);
  });
}

module.exports = app;
