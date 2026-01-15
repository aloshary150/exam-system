const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

const TEACHER_PASSWORD = "aloshary150";

router.post("/create-exam", async (req, res) => {
  const { password, subject, grade, totalQuestions } = req.body;

  if (password !== TEACHER_PASSWORD) {
    return res.status(401).json({ message: "كلمة السر غير صحيحة" });
  }

  try {
    const exam = await pool.query(
      `INSERT INTO exams (subject, grade, total_questions)
       VALUES ($1, $2, $3) RETURNING *`,
      [subject, grade, totalQuestions]
    );

    res.json(exam.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
