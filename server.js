const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ================== DATABASE ================== */
/*
  في Render:
  ضع DATABASE_URL في Environment Variables
*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ================== CONFIG ================== */
const TEACHER_PASSWORD = "aloshary150";

/* ================== INIT DATABASE ================== */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      total_questions INT NOT NULL,
      duration INT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
      question TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      question_id INT REFERENCES questions(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      score INT NOT NULL,
      total INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Database ready");
}

initDB().catch(err => console.error("DB init error:", err));

/* ================== TEACHER ================== */

// إنشاء امتحان
app.post("/api/teacher/create-exam", async (req, res) => {
  try {
    const { password, subject, grade, totalQuestions, duration } = req.body;

    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const result = await pool.query(
      `INSERT INTO exams (subject, grade, total_questions, duration)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [subject, grade, totalQuestions, duration]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل إنشاء الامتحان" });
  }
});

// إضافة سؤال
app.post("/api/teacher/add-question", async (req, res) => {
  try {
    const { password, examId, question, answers, correctIndex } = req.body;

    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const qRes = await pool.query(
      `INSERT INTO questions (exam_id, question)
       VALUES ($1,$2) RETURNING id`,
      [examId, question]
    );

    const questionId = qRes.rows[0].id;

    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        `INSERT INTO answers (question_id, answer, is_correct)
         VALUES ($1,$2,$3)`,
        [questionId, answers[i], i === correctIndex]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في إضافة السؤال" });
  }
});

// حذف امتحان
app.delete("/api/teacher/delete-exam/:id", async (req, res) => {
  try {
    if (req.headers.password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    await pool.query("DELETE FROM exams WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "فشل الحذف" });
  }
});

// نتائج الطلاب
app.get("/api/teacher/results", async (req, res) => {
  try {
    if (req.headers.password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const r = await pool.query(`
      SELECT r.student_name, e.subject, r.score, r.total, r.created_at
      FROM results r
      JOIN exams e ON r.exam_id = e.id
      ORDER BY r.created_at DESC
    `);

    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "خطأ في جلب النتائج" });
  }
});

/* ================== STUDENT ================== */

// قائمة الامتحانات
app.get("/api/exam/list", async (_, res) => {
  const r = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(r.rows);
});

// أسئلة الامتحان
app.get("/api/exam/questions/:id", async (req, res) => {
  try {
    const examId = req.params.id;

    const exam = await pool.query(
      "SELECT * FROM exams WHERE id=$1",
      [examId]
    );

    if (!exam.rows.length)
      return res.status(404).json({ error: "الامتحان غير موجود" });

    const qRes = await pool.query(
      "SELECT id, question FROM questions WHERE exam_id=$1",
      [examId]
    );

    const questions = [];

    for (const q of qRes.rows) {
      const aRes = await pool.query(
        "SELECT id, answer FROM answers WHERE question_id=$1",
        [q.id]
      );

      questions.push({
        id: q.id,
        question: q.question,
        answers: aRes.rows,
      });
    }

    res.json({ examInfo: exam.rows[0], questions });
  } catch {
    res.status(500).json({ error: "خطأ في تحميل الأسئلة" });
  }
});

// تصحيح الامتحان (مضمون)
app.post("/api/exam/submit", async (req, res) => {
  try {
    console.log("📥 SUBMIT:", req.body);

    const { examId, studentName, answers } = req.body;
    const exam_id = Number(examId);

    const qRes = await pool.query(
      "SELECT id FROM questions WHERE exam_id=$1",
      [exam_id]
    );

    let score = 0;
    const total = qRes.rows.length;

    for (const q of qRes.rows) {
      const cRes = await pool.query(
        "SELECT id FROM answers WHERE question_id=$1 AND is_correct=true",
        [q.id]
      );

      if (!cRes.rows.length) continue;

      const correct = String(cRes.rows[0].id);
      const student = String(answers[q.id]);

      console.log(`Q${q.id} | correct=${correct} | student=${student}`);

      if (student === correct) score++;
    }

    await pool.query(
      `INSERT INTO results (exam_id, student_name, score, total)
       VALUES ($1,$2,$3,$4)`,
      [exam_id, studentName, score, total]
    );

    res.json({ score, total });
  } catch (err) {
    console.error("❌ Correction error:", err);
    res.status(500).json({ error: "خطأ في تصحيح الامتحان" });
  }
});

/* ================== START ================== */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
