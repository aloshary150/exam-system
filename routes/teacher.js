const router = require("express").Router();
const pool = require("../db/connection");
const PASSWORD = "aloshary150";

router.post("/login", (req, res) => {
  res.json({ ok: req.body.password === PASSWORD });
});

router.post("/add", async (req, res) => {
  const { question, answers, correctIndex } = req.body;
  if (!question || !Array.isArray(answers) || answers.length !== 4 || correctIndex < 0 || correctIndex > 3) {
    return res.status(400).json({ error: "بيانات غير صحيحة" });
  }

  const q = await pool.query(
    "INSERT INTO questions(question) VALUES($1) RETURNING id",
    [question]
  );

  for (let i = 0; i < 4; i++) {
    await pool.query(
      "INSERT INTO answers(question_id,answer,is_correct) VALUES($1,$2,$3)",
      [q.rows[0].id, answers[i], i === correctIndex]
    );
  }

  res.json({ ok: true });
});

module.exports = router;
