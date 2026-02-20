let questions = [];

function addQuestion() {
  const q = document.getElementById("question").value;
  const a = document.getElementById("answer").value;

  if (!q || !a) {
    alert("اكتب السؤال والإجابة");
    return;
  }

  questions.push({ q, a });

  const li = document.createElement("li");
  li.innerText = q + " → " + a;
  document.getElementById("list").appendChild(li);

  document.getElementById("question").value = "";
  document.getElementById("answer").value = "";
}

async function saveExam() {
  const title = document.getElementById("title").value;

  if (!title || questions.length === 0) {
    alert("أدخل عنوان وأسئلة");
    return;
  }

  const res = await fetch("/save-exam", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      questions,
    }),
  });

  const data = await res.json();

  if (data.success) {
    alert("✅ تم حفظ الامتحان");
    location.reload();
  } else {
    alert("❌ فشل الحفظ");
  }
}
