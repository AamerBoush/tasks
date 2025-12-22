const tg = Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe.user;
const USER_ID = user.id;
const API = "https://insipidly-transdesert-noble.ngrok-free.dev"; 

let currentTab = "pending";

// ---------------- UI ----------------

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  loadTasks();
}

function openModal() {
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ---------------- Load Tasks ----------------

async function loadTasks() {
  const res = await fetch(`${API}/tasks/${USER_ID}/${currentTab}`);
  const tasks = await res.json();

  const list = document.getElementById("task-list");
  list.innerHTML = "";

  if (tasks.length === 0) {
    list.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>مهمة</b>
      <small>${new Date(t.created_at).toLocaleString()}</small>
      <div class="actions">
        <button class="danger" onclick="deleteTask('${t.task_id}')">حذف</button>
      </div>
    `;

    list.appendChild(div);
  });
}

// ---------------- Create Task ----------------

async function createTask() {
  const modal = document.querySelector(".modal-content");
  const inputs = modal.querySelectorAll("input");
  const selects = modal.querySelectorAll("select");

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
    alert("لا يمكن إنشاء المهمة (نقاط غير كافية)");
    return;
  }

  closeModal();
  loadTasks();
}

// ---------------- Delete ----------------

async function deleteTask(id) {
  if (!confirm("حذف المهمة؟")) return;
  await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
  loadTasks();
}

// ---------------- Init ----------------
loadTasks();
