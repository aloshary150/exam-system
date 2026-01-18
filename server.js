const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ================== DATABASE ================== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
  "postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja",
  ssl: { rejectUnauthorized: false }
});

/* ================== INIT ================== */
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exams(
        id SERIAL PRIMARY KEY,
        subject TEXT,
        grade TEXT,
        total_questions INT,
        duration INT
      );

      CREATE TABLE IF NOT EXISTS questions(
        id SERIAL PRIMARY KEY,
        exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
        question TEXT
      );

      CREATE TABLE IF NOT EXISTS answers(
        id SERIAL PRIMARY KEY,
        question_id INT REFERENCES questions(id) ON DELETE CASCADE,
        answer TEXT,
        is_correct BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS results(
        id SERIAL PRIMARY KEY,
        exam_id INT,
        student_name TEXT,
        score INT
      );
    `);
    console.log("✅ Database ready");
  } catch (e) {
    console.error("DB init error:", e);
  }
}
initDB();

/* ================== API ================== */

/* إنشاء امتحان */
app.post("/api/teacher/create-exam", async (req, res) => {
  try {
    const { password, subject, grade, totalQuestions, duration } = req.body;
    if (password !== "aloshary150") {
      return res.status(401).json({ error: "كلمة السر غير صحيحة" });
    }

    const r = await pool.query(
      `INSERT INTO exams(subject, grade, total_questions, duration)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [subject, grade, totalQuestions, duration]
    );

    res.json({ id: r.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "فشل إنشاء امتحان" });
  }
});

/* عرض الامتحانات */
app.get("/api/exams", async (req, res) => {
  const r = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(r.rows);
});

/* تحميل امتحان */
app.get("/api/exam/:id", async (req, res) => {
  const examId = Number(req.params.id);

  const exam = await pool.query(
    "SELECT * FROM exams WHERE id=$1",
    [examId]
  );

  const questions = await pool.query(
    "SELECT * FROM questions WHERE exam_id=$1",
    [examId]
  );

  for (let q of questions.rows) {
    const a = await pool.query(
      "SELECT id,answer FROM answers WHERE question_id=$1",
      [q.id]
    );
    q.answers = a.rows;
  }

  res.json({
    exam: exam.rows[0],
    questions: questions.rows
  });
});

/* إرسال الامتحان + التصحيح */
app.post("/api/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;
    console.log("SUBMIT:", req.body);

    if (!examId || !studentName || !answers) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }

    let score = 0;

    for (const qId in answers) {
      const questionId = Number(qId);
      const chosen = Number(answers[qId]);

      const c = await pool.query(
        `SELECT id FROM answers
         WHERE question_id=$1 AND is_correct=true LIMIT 1`,
        [questionId]
      );

      if (c.rows.length === 0) continue;

      if (chosen === Number(c.rows[0].id)) {
        score++;
      }
    }

    await pool.query(
      `INSERT INTO results(exam_id, student_name, score)
       VALUES($1,$2,$3)`,
      [Number(examId), studentName, score]
    );

    res.json({ score });
  } catch (e) {
    console.error("❌ CORRECTION ERROR:", e);
    res.status(500).json({ error: "خطأ في التصحيح" });
  }
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on http://localhost:" + PORT)
);
