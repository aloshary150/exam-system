const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const TEACHER_PASSWORD = "aloshary150";

/* ========= DATABASE ========= */
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja",
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());
app.use(express.static("public"));

/* ========= CREATE EXAM (FULL) ========= */
app.post("/api/teacher/full-create", async (req, res) => {
  try {
    const { password, subject, grade, duration, totalQuestions, questions } = req.body;

    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const examRes = await pool.query(
      `INSERT INTO exams (subject, grade, total_questions, duration)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [subject, grade, totalQuestions, duration]
    );

    const examId = examRes.rows[0].id;

    for (const q of questions) {
      const qRes = await pool.query(
        `INSERT INTO questions (exam_id, question)
         VALUES ($1,$2) RETURNING id`,
        [examId, q.text]
      );

      const qId = qRes.rows[0].id;

      for (let i = 0; i < 4; i++) {
        await pool.query(
          `INSERT INTO answers (question_id, answer, is_correct)
           VALUES ($1,$2,$3)`,
          [qId, q.answers[i], i + 1 === q.correct]
        );
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error("CREATE ERROR:", e);
    res.status(500).json({ error: "فشل إنشاء الامتحان" });
  }
});

/* ========= GET EXAMS ========= */
app.get("/api/exams", async (req, res) => {
  const exams = await pool.query("SELECT * FROM exams ORDER BY id DESC");
  res.json(exams.rows);
});

/* ========= GET EXAM ========= */
app.get("/api/exam/:id", async (req, res) => {
  const examId = Number(req.params.id);

  const exam = await pool.query("SELECT * FROM exams WHERE id=$1", [examId]);
  const questions = await pool.query(
    "SELECT * FROM questions WHERE exam_id=$1 ORDER BY id",
    [examId]
  );

  for (let q of questions.rows) {
    const answers = await pool.query(
      "SELECT * FROM answers WHERE question_id=$1 ORDER BY id",
      [q.id]
    );
    q.answers = answers.rows;
  }

  res.json({ exam: exam.rows[0], questions: questions.rows });
});

/* ========= SUBMIT EXAM ========= */
app.post("/api/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;

    if (!examId || !studentName || !answers)
      return res.status(400).json({ error: "بيانات ناقصة" });

    let score = 0;

    for (const qId of Object.keys(answers)) {
      const correct = await pool.query(
        "SELECT id FROM answers WHERE question_id=$1 AND is_correct=true",
        [Number(qId)]
      );

      if (!correct.rows.length) continue;

      if (Number(correct.rows[0].id) === Number(answers[qId])) {
        score++;
      }
    }

    await pool.query(
      "INSERT INTO results (exam_id, student_name, score) VALUES ($1,$2,$3)",
      [Number(examId), studentName, score]
    );

    res.json({ score });
  } catch (e) {
    console.error("CORRECTION ERROR:", e);
    res.status(500).json({ error: "خطأ في التصحيح" });
  }
});

app.listen(PORT, () =>
  console.log("🚀 Server running on http://localhost:" + PORT)
);
