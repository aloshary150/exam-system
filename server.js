const express = require("express");
const app = express();
const cors = require("cors");
const { Pool } = require("pg");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// إنشاء امتحان (موجود سابقاً)
// ...

// إضافة سؤال مع إجابات (مع تصحيح مضمون)
app.post("/api/teacher/add-question", async (req, res) => {
  try {
    const { examId, question, answers, correctIndex } = req.body;

    if (
      !examId ||
      !question ||
      !answers ||
      answers.length !== 4 ||
      correctIndex === undefined
    ) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }

    const q = await pool.query(
      `INSERT INTO questions (exam_id, question)
       VALUES ($1, $2) RETURNING id`,
      [examId, question]
    );

    for (let i = 0; i < 4; i++) {
      await pool.query(
        `INSERT INTO answers (question_id, answer, is_correct)
         VALUES ($1, $2, $3)`,
        [q.rows[0].id, answers[i], i === correctIndex]
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "فشل إضافة السؤال" });
  }
});

// جلب أسئلة الامتحان مع إجاباتها
app.get("/api/teacher/questions/:examId", async (req, res) => {
  try {
    const examId = Number(req.params.examId);
    const q = await pool.query(
      `SELECT * FROM questions WHERE exam_id=$1`,
      [examId]
    );

    for (let row of q.rows) {
      const a = await pool.query(
        `SELECT id, answer, is_correct FROM answers WHERE question_id=$1 ORDER BY id`,
        [row.id]
      );
      row.answers = a.rows;
    }

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "فشل جلب الأسئلة" });
  }
});

// تعديل سؤال وإجاباته
app.put("/api/teacher/update-question/:id", async (req, res) => {
  try {
    const { question, answers, correctIndex } = req.body;

    if (!question || !answers || answers.length !== 4 || correctIndex === undefined) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }

    await pool.query(
      `UPDATE questions SET question=$1 WHERE id=$2`,
      [question, req.params.id]
    );

    await pool.query(
      `DELETE FROM answers WHERE question_id=$1`,
      [req.params.id]
    );

    for (let i = 0; i < 4; i++) {
      await pool.query(
        `INSERT INTO answers (question_id, answer, is_correct)
         VALUES ($1, $2, $3)`,
        [req.params.id, answers[i], i === correctIndex]
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "فشل تعديل السؤال" });
  }
});

// تصحيح الامتحان
app.post("/api/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;
    let score = 0;

    for (const qId in answers) {
      const chosen = Number(answers[qId]);
      const c = await pool.query(
        `SELECT id FROM answers WHERE question_id=$1 AND is_correct=true`,
        [Number(qId)]
      );
      if (c.rows.length && chosen === Number(c.rows[0].id)) score++;
    }

    await pool.query(
      `INSERT INTO results (exam_id, student_name, score)
       VALUES ($1, $2, $3)`,
      [examId, studentName, score]
    );

    res.json({ score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "خطأ في التصحيح" });
  }
});

// بقية الراوتات عندك مثل إنشاء الامتحان، حذف، عرض نتائج الطلبة...

// بدء السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
