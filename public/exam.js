const app=document.getElementById("app");
let questions=[];

// ===== المعلم =====
function showTeacher(){
  const pass=prompt("كلمة سر المعلم");
  if(pass!=="1234") return alert("كلمة السر خاطئة");

  app.innerHTML=`
  <input id="examTitle" placeholder="اسم الامتحان"><br>
  <textarea id="qText" placeholder="السؤال"></textarea><br>
  <input id="qAnswer" placeholder="الإجابة"><br>
  <button onclick="addQuestion()">إضافة سؤال</button>
  <button onclick="saveExam()">💾 حفظ الامتحان</button>
  <h3>الأسئلة المضافة:</h3>
  <ul id="qList"></ul>
  `;
}

function addQuestion(){
  const q=document.getElementById("qText").value;
  const a=document.getElementById("qAnswer").value;
  if(!q || !a){ alert("أدخل السؤال والإجابة"); return;}
  questions.push({q,a});
  const li=document.createElement("li");
  li.innerText=q+" → "+a;
  document.getElementById("qList").appendChild(li);
  document.getElementById("qText").value="";
  document.getElementById("qAnswer").value="";
}

async function saveExam(){
  const title=document.getElementById("examTitle").value;
  if(!title || questions.length===0){ alert("أدخل عنوان و أسئلة"); return; }
  const res=await fetch("/save-exam",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({title,questions})
  });
  const data=await res.json();
  if(data.success){ alert("✅ تم حفظ الامتحان"); location.reload(); }
  else alert("❌ فشل الحفظ");
}

// ===== الطالب =====
async function showStudent(){
  const r=await fetch("/exams");
  const exams=await r.json();
  let html="<h3>اختر امتحان:</h3>";
  exams.forEach(e=>{
    html+=`<button onclick="startExam(${e.id},'${e.title}',${JSON.stringify(e.questions)})">${e.title}</button><br>`;
  });
  app.innerHTML=html;
}

function startExam(id,title,qs){
  const name=prompt("اسم الطالب");
  let html=`<h3>${title}</h3>`;
  qs.forEach((q,i)=>{
    html+=`<p>${q.q}</p>`;
    html+=`<input type="text" id="ans${i}" placeholder="الإجابة"><br>`;
  });
  html+=`<button onclick='submitExam(${id},${JSON.stringify(qs)},"${name}")'>إرسال</button>`;
  app.innerHTML=html;
}

async function submitExam(id,qs,name){
  let score=0;
  qs.forEach((q,i)=>{
    const a=document.getElementById(`ans${i}`).value.trim();
    if(a===q.a) score++;
  });
  await fetch("/save-result",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({exam_id:id,student:name,score,total:qs.length})
  });
  app.innerHTML=`<h3>النتيجة</h3>${name}<br>${score} / ${qs.length}`;
}
