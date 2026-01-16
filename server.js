const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const TEACHER_PASSWORD = "aloshary150";

/* ================= DATABASE ================= */
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja",
  ssl: { rejectUnauthorized: false },
});

/* ================= MIDDLEWARE ================= */
app.use(bodyParser.json());
app.use(express.static("public"));

/* ================= CREATE EXAM (FULL) ================= */
app.post("/api/teacher/full-create", async (req, res) => {
  try {
    const {
      password,
      subject,
      grade,
      duration,
      totalQuestions,
      questions,
    } = req.body;

    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    if (
      !subject ||
      !grade ||
      !duration ||
      !totalQuestions ||
      !Array.isArray(questions)
    ) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }

    const examResult = await pool.query(
      `INSERT INTO exams (subject, grade, total_questions, duration)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [subject, grade, totalQuestions, duration]
    );

    const examId = examResult.rows[0].id;

    for (const q of questions) {
      const qRes = await pool.query(
        `INSERT INTO questions (exam_id, question)
         VALUES ($1,$2) RETURNING id`,
        [examId, q.text]
      );

      const questionId = qRes.rows[0].id;

      for (let i = 0; i < 4; i++) {
        await pool.query(
          `INSERT INTO answers (question_id, answer, is_correct)
           VALUES ($1,$2,$3)`,
          [questionId, q.answers[i], i + 1 === q.correct]
        );
      }
    }

    res.json({ success: true, examId });
  } catch (err) {
    console.error("CREATE EXAM ERROR:", err);
    res.status(500).json({ error: "فشل إنشاء الامتحان" });
  }
});

/* ================= GET ALL EXAMS ================= */
app.get("/api/exams", async (req, res) => {
  const exams = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(exams.rows);
});

/* ================= GET SINGLE EXAM ================= */
app.get("/api/exam/:id", async (req, res) => {
  try {
    const examId = req.params.id;

    const exam = await pool.query(
      "SELECT * FROM exams WHERE id=$1",
      [examId]
    );

    if (exam.rows.length === 0)
      return res.status(404).json({ error: "الامتحان غير موجود" });

    const questions = await pool.query(
      "SELECT * FROM questions WHERE exam_id=$1 ORDER BY id",
      [examId]
    );

    for (const q of questions.rows) {
      const answers = await pool.query(
        "SELECT * FROM answers WHERE question_id=$1 ORDER BY id",
        [q.id]
      );
      q.answers = answers.rows;
    }

    res.json({ exam: exam.rows[0], questions: questions.rows });
  } catch (err) {
    console.error("GET EXAM ERROR:", err);
    res.status(500).json({ error: "خطأ في جلب الامتحان" });
  }
});

/* ================= SUBMIT EXAM ================= */
app.post("/api/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;

    if (!examId || !studentName || !answers)
      return res.status(400).json({ error: "بيانات ناقصة" });

    let score = 0;

    for (const questionId in answers) {
      const correct = await pool.query(
        `SELECT id FROM answers
         WHERE question_id=$1 AND is_correct=true`,
        [questionId]
      );

      if (
        correct.rows.length &&
        String(correct.rows[0].id) === String(answers[questionId])
      ) {
        score++;
      }
    }

    await pool.query(
      `INSERT INTO results (exam_id, student_name, score)
       VALUES ($1,$2,$3)`,
      [examId, studentName, score]
    );

    res.json({ score });
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    res.status(500).json({ error: "خطأ في التصحيح" });
  }
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
