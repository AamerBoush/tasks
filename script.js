const tg = Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe.user;
const USER_ID = user.id;

const API = "https://insipidly-transdesert-noble.ngrok-free.dev";    // بدون /tasks

// ---------------- Tabs ----------------

function showTab(name) {
  document.getElementById("pending").classList.add("hidden");
  document.getElementById("failed").classList.add("hidden");
  document.getElementById(name).classList.remove("hidden");

  loadTasks(name);
}

// ---------------- Load Tasks ----------------

async function loadTasks(status) {
  const container = document.getElementById(status);
  container.innerHTML = "تحميل...";

  const res = await fetch(`${API}/tasks/${USER_ID}/${status}`);
  const tasks = await res.json();

  container.innerHTML = "";

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task";

    div.innerHTML = `
      <b>ID:</b> ${task.task_id}<br>
      <b>Status:</b> ${task.status}<br>
      <button onclick="deleteTask('${task.task_id}')">🗑️ حذف</button>
    `;

    container.appendChild(div);
  });
}

// ---------------- Delete Task ----------------

async function deleteTask(taskId) {
  if (!confirm("هل أنت متأكد؟")) return;

  await fetch(`${API}/tasks/${taskId}`, {
    method: "DELETE"
  });

  showTab("pending");
}

// ---------------- New Task Form ----------------

function addTaskForm() {
  const div = document.createElement("div");
  div.className = "task";

  let html = "";
  for (let i = 0; i < 6; i++) {
    html += `<input placeholder="حقل ${i+1}"><br>`;
  }

  for (let i = 0; i < 4; i++) {
    html += `
      <select>
        <option>A</option>
        <option>B</option>
        <option>C</option>
      </select><br>
    `;
  }

  div.innerHTML = html;
  document.getElementById("new-task").appendChild(div);
}

// ---------------- Create Task ----------------

async function createTask() {
  const task = document.querySelector("#new-task .task");
  if (!task) {
    alert("أضف مهمة أولاً");
    return;
  }

  const inputs = task.querySelectorAll("input");
  const selects = task.querySelectorAll("select");

  const payload = {
    user_id: USER_ID,
    fields: Array.from(inputs).map(i => i.value),
    dropdowns: Array.from(selects).map(s => s.value)
  };

  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.detail || "فشل إنشاء المهمة (نقاط غير كافية)");
    return;
  }

  document.getElementById("new-task").innerHTML = "";
  showTab("pending");
}

// ---------------- Init ----------------

showTab("pending");
