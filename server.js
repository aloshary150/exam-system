const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ================= DATABASE ================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    "postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja",
  ssl: { rejectUnauthorized: false }
});

/* ================= INIT ================= */
async function initDB() {
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
}
initDB();

/* ================= TEACHER ================= */

/* إنشاء امتحان */
app.post("/api/teacher/create-exam", async (req, res) => {
  try {
    const { password, subject, grade, totalQuestions, duration } = req.body;
    if (password !== "aloshary150") {
      return res.status(401).json({ error: "كلمة السر غير صحيحة" });
    }

    const r = await pool.query(
      `INSERT INTO exams(subject,grade,total_questions,duration)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [subject, grade, totalQuestions, duration]
    );

    res.json({ id: r.rows[0].id });
  } catch {
    res.status(500).json({ error: "فشل إنشاء امتحان" });
  }
});

/* إضافة سؤال مع إجابات */
app.post("/api/teacher/add-question", async (req, res) => {
  try {
    const { examId, question, answers, correctIndex } = req.body;

    const q = await pool.query(
      `INSERT INTO questions(exam_id,question)
       VALUES($1,$2) RETURNING id`,
      [examId, question]
    );

    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        `INSERT INTO answers(question_id,answer,is_correct)
         VALUES($1,$2,$3)`,
        [q.rows[0].id, answers[i], i === correctIndex]
      );
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "فشل إضافة السؤال" });
  }
});

/* تعديل امتحان */
app.put("/api/teacher/update-exam/:id", async (req, res) => {
  try {
    const { subject, grade, duration } = req.body;
    await pool.query(
      `UPDATE exams SET subject=$1,grade=$2,duration=$3 WHERE id=$4`,
      [subject, grade, duration, req.params.id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "فشل التعديل" });
  }
});

/* حذف امتحان */
app.delete("/api/teacher/delete-exam/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM exams WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "فشل الحذف" });
  }
});

/* نتائج الطلبة */
app.get("/api/teacher/results/:examId", async (req, res) => {
  const r = await pool.query(
    `SELECT student_name, score
     FROM results WHERE exam_id=$1
     ORDER BY score DESC`,
    [req.params.examId]
  );
  res.json(r.rows);
});

/* ================= STUDENT ================= */

/* عرض الامتحانات */
app.get("/api/exams", async (_, res) => {
  const r = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(r.rows);
});

/* تحميل امتحان */
app.get("/api/exam/:id", async (req, res) => {
  const exam = await pool.query("SELECT * FROM exams WHERE id=$1", [req.params.id]);
  const questions = await pool.query(
    "SELECT * FROM questions WHERE exam_id=$1",
    [req.params.id]
  );

  for (let q of questions.rows) {
    const a = await pool.query(
      "SELECT id,answer FROM answers WHERE question_id=$1",
      [q.id]
    );
    q.answers = a.rows;
  }

  res.json({ exam: exam.rows[0], questions: questions.rows });
});

/* إرسال وتصحيح الامتحان */
app.post("/api/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;
    let score = 0;

    for (const qId in answers) {
      const chosen = Number(answers[qId]);
      const c = await pool.query(
        `SELECT id FROM answers
         WHERE question_id=$1 AND is_correct=true`,
        [Number(qId)]
      );
      if (c.rows.length && chosen === Number(c.rows[0].id)) score++;
    }

    await pool.query(
      `INSERT INTO results(exam_id,student_name,score)
       VALUES($1,$2,$3)`,
      [examId, studentName, score]
    );

    res.json({ score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "خطأ في التصحيح" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on http://localhost:" + PORT)
);
