const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

/* ===== PostgreSQL Render Connection ===== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* ===== Create Table Automatically ===== */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      title TEXT,
      questions JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Database Ready");
}

initDB();

/* ===== SAVE EXAM ===== */
app.post("/save-exam", async (req, res) => {
  try {
    const { title, questions } = req.body;

    await pool.query(
      "INSERT INTO exams (title, questions) VALUES ($1,$2)",
      [title, JSON.stringify(questions)]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/* ===== GET EXAMS ===== */
app.get("/exams", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM exams ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* ===== INDEX ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server Running");
});
