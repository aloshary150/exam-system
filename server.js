const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

app.use(cors());
app.use(express.json());

// PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://exam_db_lmja_user:JfFTkmXH2gKXdb1pWhbPdpJRIPzCmMzf@dpg-d5ja4vili9vc73as6j70-a.virginia-postgres.render.com/exam_db_lmja',
  ssl: { rejectUnauthorized: false }
});

// ==== API Routes ====
// ... ضع هنا كل الـ API كما في النسخة السابقة

// ==== Serve static files ====
app.use(express.static(path.join(__dirname,'public')));

// كل طلب غير الـ API يرسل index.html
app.get(/^\/(?!api).*/, (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
