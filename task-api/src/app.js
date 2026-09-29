const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

// 1. i think url encoded is missing: we cant get params from url
// 2. actually req.query works without it, only needed for form submissions
app.use(express.json());
app.use('/tasks', taskRoutes);

app.use((err, req, res, next) => {
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
