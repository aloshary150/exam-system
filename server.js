require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ================== امتحانات ================== */

// إنشاء امتحان
app.post("/api/create-exam", async (req, res) => {
  const { subject, grade, totalQuestions, duration, password } = req.body;
  if (password !== "aloshary150")
    return res.status(403).json({ error: "كلمة السر خطأ" });

  const r = await pool.query(
    `INSERT INTO exams(subject, grade, total_questions, duration)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [subject, grade, totalQuestions, duration]
  );

  res.json({ id: r.rows[0].id });
});

// جلب الامتحانات
app.get("/api/exams", async (_, res) => {
  const r = await pool.query(
    "SELECT id, subject, grade FROM exams ORDER BY id DESC"
  );
  res.json(r.rows);
});

/* ================== الأسئلة ================== */

app.post("/api/add-question", async (req, res) => {
  const { examId, question, answers, correct } = req.body;

  const q = await pool.query(
    "INSERT INTO questions(exam_id,question) VALUES($1,$2) RETURNING id",
    [examId, question]
  );

  for (let i = 0; i < 4; i++) {
    await pool.query(
      "INSERT INTO answers(question_id,answer,is_correct) VALUES($1,$2,$3)",
      [q.rows[0].id, answers[i], i === correct]
    );
  }

  res.json({ ok: true });
});

// جلب أسئلة امتحان
app.get("/api/exam/:id", async (req, res) => {
  const qs = await pool.query(
    "SELECT * FROM questions WHERE exam_id=$1",
    [req.params.id]
  );

  for (let q of qs.rows) {
    const a = await pool.query(
      "SELECT id,answer FROM answers WHERE question_id=$1",
      [q.id]
    );
    q.answers = a.rows;
  }
  res.json(qs.rows);
});

/* ================== تصحيح ================== */

app.post("/api/submit", async (req, res) => {
  const { examId, name, answers } = req.body;
  let score = 0;

  for (let qId in answers) {
    const c = await pool.query(
      "SELECT id FROM answers WHERE question_id=$1 AND is_correct=true",
      [qId]
    );
    if (c.rows[0] && Number(answers[qId]) === c.rows[0].id) score++;
  }

  await pool.query(
    "INSERT INTO results(exam_id,student_name,score) VALUES($1,$2,$3)",
    [examId, name, score]
  );

  res.json({ score });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
