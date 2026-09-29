const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());

// Landing route, so opening the deployed URL shows what the API offers.
app.get('/', (req, res) => {
  res.json({
    name: 'Task Manager API',
    endpoints: [
      'GET /tasks',
      'GET /tasks?status=todo&page=1&limit=10',
      'POST /tasks',
      'PUT /tasks/:id',
      'DELETE /tasks/:id',
      'PATCH /tasks/:id/complete',
      'PATCH /tasks/:id/assign',
      'GET /tasks/stats',
    ],
  });
});

// Used by the hosting platform to check that the service is up.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/tasks', taskRoutes);

// Unknown routes get a JSON error like the rest of the API, not Express's HTML page.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  // Errors from middleware such as express.json() carry their own status
  // (400 for bad JSON, 413 for a body that is too large). Those are client
  // mistakes, so pass them on; only real server errors become a 500 (#7).
  const status = err.status || err.statusCode || 500;
  if (status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : err.message;
    return res.status(status).json({ error: message });
  }

  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;
