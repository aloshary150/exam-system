const express = require("express");
const cors = require("cors");
const pool = require("./db/connection");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions(
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS answers(
        id SERIAL PRIMARY KEY,
        question_id INT REFERENCES questions(id) ON DELETE CASCADE,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students(
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS results(
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        score INT NOT NULL,
        total INT NOT NULL
      );
    `);

    console.log("✅ Database tables ready");

    const count = await pool.query("SELECT COUNT(*) FROM questions");
    if (parseInt(count.rows[0].count) === 0) {
      await require("./routes/defaultExam")(pool);
      console.log("📘 Default Islamic exam inserted");
    }
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

app.use("/api/questions", require("./routes/questions"));
app.use("/api/exam", require("./routes/exam"));
app.use("/api/teacher", require("./routes/teacher"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDatabase();
});
