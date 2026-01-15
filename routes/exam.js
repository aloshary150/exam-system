const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

router.get("/list", async (req, res) => {
  try {
    const exams = await pool.query(
      "SELECT id, subject, grade FROM exams ORDER BY created_at DESC"
    );
    res.json(exams.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
