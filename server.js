const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

app.use(cors());
app.use(express.json());

// ==== إعداد قاعدة البيانات ====
const pool = new Pool({
  connectionString: 'postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja',
  ssl: { rejectUnauthorized: false }
});

// ==== إنشاء الجداول تلقائيًا إذا لم توجد ====
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      duration INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      option1 TEXT NOT NULL,
      option2 TEXT NOT NULL,
      option3 TEXT NOT NULL,
      option4 TEXT NOT NULL,
      correct INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS student_results (
      id SERIAL PRIMARY KEY,
      exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      score INT NOT NULL,
      total INT NOT NULL
    );
  `);
  console.log("Tables are ready!");
}

// نفذ إنشاء الجداول فور تشغيل الخادم
createTables().catch(err=>console.error(err));

// ==== API Routes ====

// جلب جميع الامتحانات
app.get('/api/exams', async (req,res)=>{
  const result = await pool.query('SELECT * FROM exams ORDER BY id');
  res.json(result.rows);
});

// جلب الأسئلة لامتحان معين
app.get('/api/exams/:id/questions', async (req,res)=>{
  const exam_id = req.params.id;
  const result = await pool.query('SELECT * FROM questions WHERE exam_id=$1 ORDER BY id', [exam_id]);
  res.json(result.rows);
});

// إنشاء امتحان جديد
app.post('/api/exams', async (req,res)=>{
  try {
    const { password, name, duration, questions } = req.body;
    if(password !== '1234') return res.status(403).json({error:'كلمة سر خاطئة'});
    const examResult = await pool.query('INSERT INTO exams(name,duration) VALUES($1,$2) RETURNING id', [name,duration]);
    const exam_id = examResult.rows[0].id;
    for(const q of questions){
      await pool.query(
        'INSERT INTO questions(exam_id,text,option1,option2,option3,option4,correct) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [exam_id,q.text,q.options[0],q.options[1],q.options[2],q.options[3],q.correct]
      );
    }
    res.json({success:true});
  } catch(err) {
    console.error(err);
    res.status(500).json({error:'حدث خطأ أثناء الحفظ'});
  }
});

// حفظ نتيجة طالب
app.post('/api/results', async (req,res)=>{
  try {
    const { exam_id, name, score, total } = req.body;
    await pool.query('INSERT INTO student_results(exam_id,name,score,total) VALUES($1,$2,$3,$4)', [exam_id,name,score,total]);
    res.json({success:true});
  } catch(err) {
    console.error(err);
    res.status(500).json({error:'حدث خطأ أثناء حفظ النتيجة'});
  }
});

// جلب نتائج الطلاب
app.get('/api/results', async (req,res)=>{
  const result = await pool.query(`
    SELECT sr.name, e.name as exam, sr.score, sr.total 
    FROM student_results sr 
    JOIN exams e ON sr.exam_id=e.id
    ORDER BY sr.id
  `);
  res.json(result.rows);
});

// ==== Serve static files ====
app.use(express.static(path.join(__dirname,'public')));

// أي رابط لا يبدأ بـ /api يرسل index.html
app.get(/^\/(?!api).*/, (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
