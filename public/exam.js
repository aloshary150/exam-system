const API="https://onlineexam-v2j5.onrender.com/api";
const app=document.getElementById("app");
let questions=[];

// ===== المعلم =====
function teacher(){
  const pass=prompt("كلمة سر المعلم");
  if(pass!=="1234") return alert("كلمة سر خاطئة");

  app.innerHTML=`
  <input id="name" placeholder="اسم الامتحان"><br>
  <input id="duration" placeholder="الوقت بالدقائق"><br>
  <input id="count" type="number" placeholder="عدد الأسئلة"><br>
  <button onclick="make()">التالي</button>`;
}

function make(){
  let n=parseInt(document.getElementById("count").value);
  questions=[];
  let html="";
  for(let i=0;i<n;i++){
    html+=`
    <hr>
    <input id="q${i}" placeholder="السؤال"><br>
    <input id="o1${i}" placeholder="1"><br>
    <input id="o2${i}" placeholder="2"><br>
    <input id="o3${i}" placeholder="3"><br>
    <input id="o4${i}" placeholder="4"><br>
    الصحيح <input id="c${i}" type="number" min="1" max="4"><br>`;
  }
  html+=`<button onclick="save(${n})">حفظ الامتحان</button>`;
  app.innerHTML=html;
}

async function save(n){
  let qs=[];
  for(let i=0;i<n;i++){
    qs.push({
      text:document.getElementById(`q${i}`).value,
      options:[
        document.getElementById(`o1${i}`).value,
        document.getElementById(`o2${i}`).value,
        document.getElementById(`o3${i}`).value,
        document.getElementById(`o4${i}`).value
      ],
      correct:parseInt(document.getElementById(`c${i}`).value)-1
    });
  }

  await fetch("/api/exam",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      password:"1234",
      name:document.getElementById("name").value,
      duration:document.getElementById("duration").value,
      questions:qs
    })
  });

  alert("✅ تم الحفظ");
}

// ===== الطالب =====
async function loadExams(){
  let r=await fetch("/api/exams");
  let exams=await r.json();
  let html="";
  exams.forEach(e=>{
    html+=`<button onclick="start(${e.id},'${e.name}')">${e.name}</button><br>`;
  });
  app.innerHTML=html;
}

async function start(id,title){
  let name=prompt("اسم الطالب");
  let r=await fetch(`/api/exams`);
  let exams=await r.json();
  let qs=exams.find(e=>e.id===id).questions;

  let html=`<h3>${title}</h3>`;
  qs.forEach((q,i)=>{
    html+=`<p>${q.text}</p>`;
    q.options.forEach((o,j)=>{
      html+=`<label><input type="radio" name="q${i}" value="${j}">${o}</label><br>`;
    });
  });
  html+=`<button onclick='finish(${id},${JSON.stringify(qs)},"${name}")'>انهاء</button>`;
  app.innerHTML=html;
}

async function finish(id,qs,name){
  let score=0;
  qs.forEach((q,i)=>{
    let a=document.querySelector(`input[name=q${i}]:checked`);
    if(a && parseInt(a.value)===q.correct) score++;
  });

  await fetch("/api/result",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({exam_id:id,student:name,score,total:qs.length})
  });

  app.innerHTML=`<h2>النتيجة</h2>${name}<br>${score}/${qs.length}`;
}
