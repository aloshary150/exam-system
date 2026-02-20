// حل مشكلة SSL في Render
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// PostgreSQL على Render
const pool = new Pool({
  connectionString:
    "postgresql://exam_ybym_user:FmOIq9VYLFjiSGPmUcdDvbtthyeUWPev@dpg-d6c5c5rh46gs738f0ie0-a.virginia-postgres.render.com/exam_ybym",
  ssl: { rejectUnauthorized: false },
});

// إنشاء جدول تلقائياً
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams(
      id SERIAL PRIMARY KEY,
      title TEXT,
      questions JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS results(
      id SERIAL PRIMARY KEY,
      exam_id INT,
      student TEXT,
      score INT,
      total INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Database Ready");
}
initDB();

// حفظ امتحان جديد
app.post("/save-exam", async (req, res) => {
  try {
    const { title, questions } = req.body;
    await pool.query(
      "INSERT INTO exams(title, questions) VALUES($1, $2)",
      [title, JSON.stringify(questions)]
    );
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// جلب كل الامتحانات
app.get("/exams", async (req, res) => {
  const result = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(result.rows);
});

// حفظ نتيجة الطالب
app.post("/save-result", async (req, res) => {
  try {
    const { exam_id, student, score, total } = req.body;
    await pool.query(
      "INSERT INTO results(exam_id, student, score, total) VALUES($1,$2,$3,$4)",
      [exam_id, student, score, total]
    );
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// جلب نتائج
app.get("/results", async (req, res) => {
  const r = await pool.query("SELECT * FROM results ORDER BY id DESC");
  res.json(r.rows);
});

// تشغيل الموقع
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server Running"));
