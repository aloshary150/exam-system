const express = require("express");
const cors = require("cors");
const pool = require("./db/connection");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/questions", require("./routes/questions"));
app.use("/api/exam", require("./routes/exam"));
app.use("/api/teacher", require("./routes/teacher"));

app.listen(process.env.PORT || 3000, async () => {
  const count = await pool.query("SELECT COUNT(*) FROM questions");
  if (count.rows[0].count == 0) {
    await require("./routes/defaultExam")(pool);
    console.log("✔ Default Islamic exam added");
  }
});
