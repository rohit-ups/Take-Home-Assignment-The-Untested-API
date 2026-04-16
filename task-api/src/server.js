const app = require("./app.js");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
});