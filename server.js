// server.js

require('dotenv').config(); // تحميل متغيرات البيئة
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// إعداد اتصال قاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// إنشاء امتحان جديد
app.post('/api/teacher/create-exam', async (req, res) => {
  const { subject, grade, totalQuestions, duration, password } = req.body;
  if (!subject || !grade || !totalQuestions || !duration || !password) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO exams(subject, grade, total_questions, duration, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [subject, grade, totalQuestions, duration, password]
    );
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في إنشاء الامتحان' });
  }
});

// جلب جميع الامتحانات
app.get('/api/exams', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, subject, grade FROM exams ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب الامتحانات' });
  }
});

// إضافة سؤال جديد مع الإجابات
app.post('/api/teacher/add-question', async (req, res) => {
  const { examId, question, answers, correctIndex } = req.body;
  if (!examId || !question || !answers || answers.length !== 4 || correctIndex === undefined) {
    return res.status(400).json({ error: 'بيانات غير مكتملة' });
  }
  try {
    const qRes = await pool.query(
      'INSERT INTO questions (exam_id, question) VALUES ($1, $2) RETURNING id',
      [examId, question]
    );

    const questionId = qRes.rows[0].id;

    for (let i = 0; i < 4; i++) {
      await pool.query(
        'INSERT INTO answers (question_id, answer, is_correct) VALUES ($1, $2, $3)',
        [questionId, answers[i], i === correctIndex]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل إضافة السؤال' });
  }
});

// جلب الأسئلة والإجابات لامتحان معين
app.get('/api/teacher/questions/:examId', async (req, res) => {
  const examId = Number(req.params.examId);
  try {
    const questionsRes = await pool.query('SELECT * FROM questions WHERE exam_id=$1', [examId]);
    const questions = questionsRes.rows;

    for (let q of questions) {
      const answersRes = await pool.query(
        'SELECT id, answer, is_correct FROM answers WHERE question_id=$1 ORDER BY id',
        [q.id]
      );
      q.answers = answersRes.rows;
    }
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل جلب الأسئلة' });
  }
});

// تعديل سؤال وإجاباته
app.put('/api/teacher/update-question/:id', async (req, res) => {
  const { question, answers, correctIndex } = req.body;
  if (!question || !answers || answers.length !== 4 || correctIndex === undefined) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  try {
    await pool.query('UPDATE questions SET question=$1 WHERE id=$2', [question, req.params.id]);
    await pool.query('DELETE FROM answers WHERE question_id=$1', [req.params.id]);

    for (let i = 0; i < 4; i++) {
      await pool.query(
        'INSERT INTO answers (question_id, answer, is_correct) VALUES ($1, $2, $3)',
        [req.params.id, answers[i], i === correctIndex]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل تعديل السؤال' });
  }
});

// حذف امتحان (مع حذف الأسئلة والإجابات المرتبطة)
app.delete('/api/teacher/delete-exam/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل حذف الامتحان' });
  }
});

// تصحيح الامتحان وحفظ النتيجة
app.post('/api/submit', async (req, res) => {
  const { examId, studentName, answers } = req.body;
  try {
    let score = 0;
    for (const qId in answers) {
      const chosen = Number(answers[qId]);
      const correctAnsRes = await pool.query(
        'SELECT id FROM answers WHERE question_id=$1 AND is_correct=true',
        [Number(qId)]
      );
      if (correctAnsRes.rows.length && chosen === Number(correctAnsRes.rows[0].id)) {
        score++;
      }
    }

    await pool.query(
      'INSERT INTO results (exam_id, student_name, score) VALUES ($1, $2, $3)',
      [examId, studentName, score]
    );

    res.json({ score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في التصحيح' });
  }
});

// عرض نتائج الطلبة لامتحان معين
app.get('/api/teacher/results/:examId', async (req, res) => {
  const examId = Number(req.params.examId);
  try {
    const resultsRes = await pool.query(
      'SELECT student_name, score FROM results WHERE exam_id=$1 ORDER BY score DESC',
      [examId]
    );
    res.json(resultsRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب النتائج' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
