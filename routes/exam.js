const router = require("express").Router();
const pool = require("../db/connection");

router.post("/submit", async (req, res) => {
  const { studentName, answers } = req.body;

  const qCount = await pool.query("SELECT COUNT(*) FROM questions");
  if (Object.keys(answers).length !== parseInt(qCount.rows[0].count)) {
    return res.status(400).json({ error: "يجب الإجابة على كل الأسئلة" });
  }

  const s = await pool.query(
    "INSERT INTO students(name) VALUES($1) RETURNING id",
    [studentName]
  );

  const correct = await pool.query("SELECT id FROM answers WHERE is_correct=true");
  let score = 0;
  correct.rows.forEach(c => {
    if (Object.values(answers).includes(c.id.toString())) score++;
  });

  await pool.query(
    "INSERT INTO results(student_id,score,total) VALUES($1,$2,$3)",
    [s.rows[0].id, score, correct.rows.length]
  );

  res.json({ score, total: correct.rows.length });
});

module.exports = router;
