const express = require("express");
const cors = require("cors");
const pool = require("./db/connection");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1");
    res.json({ status: "ok", db: true });
  } catch (err) {
    res.status(500).json({ status: "error", db: false });
  }
});

app.use("/api/questions", require("./routes/questions"));
app.use("/api/exam", require("./routes/exam"));
app.use("/api/teacher", require("./routes/teacher"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    const count = await pool.query("SELECT COUNT(*) FROM questions");
    if (parseInt(count.rows[0].count) === 0) {
      await require("./routes/defaultExam")(pool);
      console.log("📘 Default Islamic exam inserted");
    }
  } catch (err) {
    console.error("❌ Startup DB error:", err);
  }
});
