const router = require("express").Router();
const pool = require("../db/connection");

router.get("/all", async (req, res) => {
  const qs = await pool.query("SELECT * FROM questions");
  const data = [];
  for (const q of qs.rows) {
    const a = await pool.query(
      "SELECT id,answer FROM answers WHERE question_id=$1",
      [q.id]
    );
    data.push({ id: q.id, question: q.question, answers: a.rows });
  }
  res.json(data);
});

module.exports = router;
