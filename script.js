const tg = Telegram.WebApp;
tg.ready();

const USER_ID = tg.initDataUnsafe.user.id;
const API = "https://insipidly-transdesert-noble.ngrok-free.dev"; 

let currentTab = "pending";
let config = null;

// ---------- Load Config ----------
async function loadConfig() {
  const res = await fetch("config.json");
  config = await res.json();
  buildForm();
}

// ---------- Build Form ----------
function buildForm() {
  const form = document.getElementById("task-form");
  form.innerHTML = "";

  config.form.fields.forEach(f => {
    const input = document.createElement("input");
    input.placeholder = f.placeholder;
    input.dataset.field = f.id;
    form.appendChild(input);
  });

  config.form.dropdowns.forEach(d => {
    const select = document.createElement("select");
    d.options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });
    form.appendChild(select);
  });
}

// ---------- Tabs ----------
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    loadTasks();
  };
});

// ---------- Modal ----------
document.querySelector(".fab").onclick = () =>
  document.querySelector(".modal").classList.remove("hidden");

document.getElementById("cancel").onclick = () =>
  document.querySelector(".modal").classList.add("hidden");

// ---------- Load Tasks ----------
async function loadTasks() {
  const res = await fetch(`${API}/tasks/${USER_ID}/${currentTab}`);
  const tasks = await res.json();

  const list = document.getElementById("task-list");
  list.innerHTML = "";

  if (!tasks.length) {
    list.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <b>${t.fields[0]}</b>
      <p>${t.fields[1]}</p>
      <small>${t.dropdowns.join(" • ")}</small>
    `;
    list.appendChild(div);
  });
}

// ---------- Create Task ----------
document.getElementById("submit").onclick = async () => {
  const inputs = document.querySelectorAll("#task-form input");
  const selects = document.querySelectorAll("#task-form select");

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
    alert("لا يمكن إنشاء المهمة");
    return;
  }

  document.querySelector(".modal").classList.add("hidden");
  loadTasks();
};

// ---------- Init ----------
loadConfig();
loadTasks();
