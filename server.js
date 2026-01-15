const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// اتصال قاعدة بيانات (عدل بيانات الاتصال حسبك)
const pool = new Pool({
  user: "exam_db_lmja_user",
  host: "dpg-d5ja4vili9vc73as6j70-a", // عدلها إلى مضيفك الحقيقي
  database: "exam_db_lmja",
  password: "JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// كلمة سر المعلم ثابتة (يمكنك تغييرها)
const TEACHER_PASSWORD = "secret123";

// إنشاء الجداول (إذا لم تكن موجودة)
async function initDB() {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    total_questions INT NOT NULL,
    duration INT NOT NULL
  )`);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    question TEXT NOT NULL
  )`);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL
  )`);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id),
    student_name VARCHAR(100) NOT NULL,
    score INT NOT NULL,
    total INT NOT NULL
  )`);
}
initDB().catch(console.error);

// API للمعلم لإنشاء امتحان
app.post("/api/teacher/create-exam", async (req, res) => {
  try {
    const { password, subject, grade, totalQuestions, duration } = req.body;
    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const result = await pool.query(
      "INSERT INTO exams (subject, grade, total_questions, duration) VALUES ($1, $2, $3, $4) RETURNING id",
      [subject, grade, totalQuestions, duration]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// API لجلب الامتحانات
app.get("/api/exam/list", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM exams ORDER BY id DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "خطأ في جلب الامتحانات" });
  }
});

// API حذف الامتحان (مع كلمة السر)
app.delete("/api/teacher/delete-exam/:id", async (req, res) => {
  try {
    const password = req.headers.password;
    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const id = parseInt(req.params.id);
    await pool.query("DELETE FROM exams WHERE id=$1", [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "فشل الحذف" });
  }
});

// API إضافة سؤال مع الأجوبة
app.post("/api/teacher/add-question", async (req, res) => {
  try {
    const { password, examId, question, answers, correctIndex } = req.body;
    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const exam_id = parseInt(examId);
    const questionRes = await pool.query(
      "INSERT INTO questions (exam_id, question) VALUES ($1, $2) RETURNING id",
      [exam_id, question]
    );
    const qid = questionRes.rows[0].id;

    // إدخال الأجوبة
    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        "INSERT INTO answers (question_id, answer, is_correct) VALUES ($1, $2, $3)",
        [qid, answers[i], i === correctIndex]
      );
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "خطأ أثناء إضافة السؤال" });
  }
});

// API جلب أسئلة الامتحان مع الأجوبة
app.get("/api/exam/questions/:id", async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const examRes = await pool.query("SELECT * FROM exams WHERE id=$1", [examId]);
    if (examRes.rows.length === 0)
      return res.status(404).json({ error: "الامتحان غير موجود" });

    const questionsRes = await pool.query(
      "SELECT id, question FROM questions WHERE exam_id=$1",
      [examId]
    );

    const questions = [];
    for (const q of questionsRes.rows) {
      const answersRes = await pool.query(
        "SELECT id, answer FROM answers WHERE question_id=$1",
        [q.id]
      );
      questions.push({
        id: q.id,
        question: q.question,
        answers: answersRes.rows,
      });
    }

    res.json({ examInfo: examRes.rows[0], questions });
  } catch {
    res.status(500).json({ error: "خطأ في جلب الأسئلة" });
  }
});

// API استلام نتيجة الامتحان وتصحيحها
app.post("/api/exam/submit", async (req, res) => {
  try {
    const { examId, studentName, answers } = req.body;
    const exam_id = parseInt(examId);

    // جلب الأسئلة والإجابات الصحيحة
    const questionsRes = await pool.query(
      "SELECT id FROM questions WHERE exam_id=$1",
      [exam_id]
    );
    if (questionsRes.rows.length === 0)
      return res.status(404).json({ error: "الامتحان غير موجود أو بدون أسئلة" });

    let score = 0;
    let total = questionsRes.rows.length;

    for (const q of questionsRes.rows) {
      const correctAnsRes = await pool.query(
        "SELECT id FROM answers WHERE question_id=$1 AND is_correct=true",
        [q.id]
      );
      const correctAnswerId = correctAnsRes.rows[0]?.id;
      if (answers[q.id] == correctAnswerId) score++;
    }

    // حفظ النتيجة
    await pool.query(
      "INSERT INTO results (exam_id, student_name, score, total) VALUES ($1, $2, $3, $4)",
      [exam_id, studentName, score, total]
    );

    res.json({ score, total });
  } catch {
    res.status(500).json({ error: "خطأ في تصحيح الامتحان" });
  }
});

// API جلب نتائج الطلاب (كلمة سر)
app.get("/api/teacher/results", async (req, res) => {
  try {
    const password = req.headers.password;
    if (password !== TEACHER_PASSWORD)
      return res.status(401).json({ error: "كلمة السر خاطئة" });

    const resultsRes = await pool.query(`
      SELECT r.student_name as name, e.subject, r.score, r.total
      FROM results r
      JOIN exams e ON r.exam_id = e.id
      ORDER BY r.id DESC
    `);
    res.json(resultsRes.rows);
  } catch {
    res.status(500).json({ error: "خطأ في جلب النتائج" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
