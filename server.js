process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ===== PostgreSQL =====
const pool = new Pool({
  connectionString:
    "postgresql://exam_ybym_user:FmOIq9VYLFjiSGPmUcdDvbtthyeUWPev@dpg-d6c5c5rh46gs738f0ie0-a/exam_ybym",
  ssl: {
    rejectUnauthorized: false
  }
});
    
// ===== إنشاء الجداول تلقائياً =====
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams(
      id SERIAL PRIMARY KEY,
      name TEXT,
      duration INT
    );

    CREATE TABLE IF NOT EXISTS questions(
      id SERIAL PRIMARY KEY,
      exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
      text TEXT,
      option1 TEXT,
      option2 TEXT,
      option3 TEXT,
      option4 TEXT,
      correct INT
    );

    CREATE TABLE IF NOT EXISTS results(
      id SERIAL PRIMARY KEY,
      exam_id INT,
      student TEXT,
      score INT,
      total INT
    );
  `);

  console.log("✅ Database Ready");
}
initDB();


// ===== API =====

// كل الامتحانات
app.get("/api/exams", async (req, res) => {
  const data = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(data.rows);
});

// أسئلة امتحان
app.get("/api/questions/:id", async (req, res) => {
  const data = await pool.query(
    "SELECT * FROM questions WHERE exam_id=$1",
    [req.params.id]
  );
  res.json(data.rows);
});

// إنشاء امتحان
app.post("/api/exam", async (req, res) => {
  const { password, name, duration, questions } = req.body;

  if (password !== "1234")
    return res.status(403).json({ error: "كلمة سر خاطئة" });

  const exam = await pool.query(
    "INSERT INTO exams(name,duration) VALUES($1,$2) RETURNING id",
    [name, duration]
  );

  const exam_id = exam.rows[0].id;

  for (let q of questions) {
    await pool.query(
      `INSERT INTO questions
      (exam_id,text,option1,option2,option3,option4,correct)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        exam_id,
        q.text,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        q.correct,
      ]
    );
  }

  res.json({ success: true });
});

// حفظ نتيجة
app.post("/api/result", async (req, res) => {
  const { exam_id, student, score, total } = req.body;

  await pool.query(
    "INSERT INTO results(exam_id,student,score,total) VALUES($1,$2,$3,$4)",
    [exam_id, student, score, total]
  );

  res.json({ success: true });
});

// عرض النتائج
app.get("/api/results", async (req, res) => {
  const data = await pool.query("SELECT * FROM results ORDER BY id DESC");
  res.json(data.rows);
});


// ===== تشغيل الموقع =====
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server Running"));
