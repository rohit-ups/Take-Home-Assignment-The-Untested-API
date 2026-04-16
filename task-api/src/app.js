const express = require("express");
const taskRoutes = require("./routes/tasks");

const app = express();

app.use(express.json());
app.use("/tasks", taskRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

const startServer = (port = PORT) =>
  app.listen(port, () => {
    console.log(`Task API running on port ${port}`);
  });

if (require.main === module) {
  startServer(PORT);
}

app.startServer = startServer;

module.exports = app;
