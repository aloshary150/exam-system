const API_URL = 'https://exam-system-tm6q.onrender.com/api'; // عدل للـ Render URL بعد النشر

document.addEventListener('DOMContentLoaded', async () => {
const teacherPanel = document.getElementById('teacher-panel');

async function getExams(){ const res = await fetch(`${API_URL}/exams`); return await res.json(); }
async function getQuestions(exam_id){ const res = await fetch(`${API_URL}/exams/${exam_id}/questions`); return await res.json(); }
async function saveResult(exam_id,name,score,total){ await fetch(`${API_URL}/results`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({exam_id,name,score,total})}); }
async function getResults(){ const res = await fetch(`${API_URL}/results`); return await res.json(); }

document.getElementById('btnTeacherLogin').onclick=()=>{ const pass=prompt('كلمة سر المعلم'); if(pass==='1234') teacherPanel.classList.remove('hidden'); else alert('كلمة سر خاطئة'); }

async function renderExamOptions(){ const select=document.getElementById('select-exam'); const exams=await getExams(); select.innerHTML=exams.map(e=>`<option value="${e.id}">${e.name}</option>`).join(''); }
async function renderExamList(){ const exams=await getExams(); document.getElementById('exam-list').innerHTML=exams.map(e=>`<div>${e.name} (${e.duration} دقيقة)</div>`).join(''); renderExamOptions(); }

document.getElementById('btnShowResults').onclick=async()=>{
  const editDiv=document.getElementById('edit-exam'); editDiv.innerHTML='';
  const results=await getResults();
  editDiv.innerHTML=results.map((r,i)=>`<div>${i+1}. ${r.name} - ${r.exam} : ${r.score}/${r.total}</div>`).join('');
}

document.getElementById('btnCreateExam').onclick=async()=>{
const editDiv=document.getElementById('edit-exam'); editDiv.innerHTML='';
const nameInput=document.createElement('input'); nameInput.placeholder='اسم الامتحان';
const durationInput=document.createElement('input'); durationInput.type='number'; durationInput.placeholder='مدة بالدقائق';
const numQInput=document.createElement('input'); numQInput.type='number'; numQInput.placeholder='عدد الأسئلة';
const nextBtn=document.createElement('button'); nextBtn.textContent='التالي'; editDiv.append(nameInput,durationInput,numQInput,nextBtn);

nextBtn.onclick=async()=>{
const name=nameInput.value.trim(); const duration=parseInt(durationInput.value)||0; const numQ=parseInt(numQInput.value);
if(!name||isNaN(numQ)||numQ<=0){alert('أدخل اسم وعدد صحيح للأسئلة'); return;}
editDiv.innerHTML='<h3>إنشاء الامتحان</h3>'; const questions=[];
for(let i=0;i<numQ;i++){
const qDiv=document.createElement('div'); qDiv.className='question';
qDiv.innerHTML=`<strong>السؤال ${i+1}</strong><br>`+ [0,1,2,3].map(j=>`<input type="text" placeholder="خيار ${j+1}"><br>`).join('')+`<label>صحيح:<select>${[0,1,2,3].map(j=>`<option value="${j}">${j+1}</option>`).join('')}</select></label>`;
editDiv.appendChild(qDiv); questions.push({text:'',options:['','','',''],correct:0});
const inputs=qDiv.querySelectorAll('input[type=text]'); inputs.forEach((input,j)=>{ input.onchange=()=>{ questions[i].options[j]=input.value; }; });
const sel=qDiv.querySelector('select'); sel.onchange=()=>{ questions[i].correct=parseInt(sel.value); };
}

const saveBtn=document.createElement('button'); saveBtn.textContent='حفظ الامتحان';
saveBtn.onclick=async()=>{ const payload={password:'1234',name,duration,questions}; const res=await fetch(`${API_URL}/exams`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(res.ok){alert('تم الحفظ'); editDiv.innerHTML=''; renderExamList(); } };
editDiv.appendChild(saveBtn);
}
}

document.getElementById('btnStartExam').onclick=async()=>{
const exam_id=document.getElementById('select-exam').value;
const studentName=document.getElementById('student-name').value.trim();
if(!studentName) return alert('ادخل اسمك');
const examQuestions=await getQuestions(exam_id);
const formDiv=document.getElementById('exam-form'); formDiv.innerHTML='';
const timerDiv=document.getElementById('timer'); timerDiv.textContent='';
examQuestions.forEach((q,i)=>{ const qDiv=document.createElement('div'); qDiv.className='question';
qDiv.innerHTML=`<strong>${i+1}. ${q.text}</strong><br>` + [q.option1,q.option2,q.option3,q.option4].map((o,j)=>`<label><input type="radio" name="q${i}" value="${j}"> ${o}</label><br>`).join('');
formDiv.appendChild(qDiv); });
const submitBtn=document.createElement('button'); submitBtn.textContent='عرض النتيجة'; formDiv.appendChild(submitBtn);
submitBtn.onclick=async()=>{
let score=0; examQuestions.forEach((q,i)=>{ const sel=document.querySelector(`input[name=q${i}]:checked`); if(sel && parseInt(sel.value)===q.correct) score++; });
formDiv.innerHTML=`${studentName} حصل على ${score} من ${examQuestions.length}`;
await saveResult(exam_id,studentName,score,examQuestions.length);
}

renderExamList(); renderExamOptions();
