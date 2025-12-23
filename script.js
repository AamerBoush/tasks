const tg = Telegram.WebApp;
tg.ready();

if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
  alert("يجب فتح التطبيق من داخل Telegram");
  throw new Error("No Telegram user");
}

const USER_ID = Number(tg.initDataUnsafe.user.id);
const API = "https://insipidly-transdesert-noble.ngrok-free.dev";

console.log("USER_ID:", USER_ID);




let currentStatus = "pending";
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
    input.dataset.type = "field";
    form.appendChild(input);
  });

  config.form.dropdowns.forEach(d => {
    const select = document.createElement("select");
    select.dataset.type = "dropdown";
    d.options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });
    form.appendChild(select);
  });
}

// ---------- Balance ----------
async function loadBalance() {
  const res = await fetch(`${API}/account/${USER_ID}`);
  const data = await res.json();

  document.getElementById("balance").innerText =
    `النقاط: ${data.points} | مجمدة: ${data.frozen_points}`;
}

// ---------- Tabs ----------
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    loadTasks();
  };
});

// ---------- Load Tasks ----------
async function loadTasks() {
  const list = document.getElementById("task-list");
  list.innerHTML = "جارٍ التحميل...";

  const res = await fetch(`${API}/tasks/${USER_ID}?status=${currentStatus}`);
  const tasks = await res.json();

  list.innerHTML = "";

  if (!tasks.length) {
    list.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const div = document.createElement("div");
    div.className = "card";

    let failNote = "";
    if (t.status === "failed" && t.fail_reason) {
      failNote = `<p class="fail">سبب الفشل: ${t.fail_reason}</p>`;
    }

    div.innerHTML = `
      <h4>${t.fields[0]}</h4>
      <p>${t.fields[1]}</p>
      <small>${t.dropdowns.join(" • ")}</small>
      ${failNote}
    `;

    list.appendChild(div);
  });
}

// ---------- Modal ----------
document.getElementById("add-btn").onclick = () =>
  document.getElementById("modal").classList.remove("hidden");

document.getElementById("cancel").onclick = () =>
  document.getElementById("modal").classList.add("hidden");

// ---------- Create Task ----------
document.getElementById("submit").onclick = async () => {
  const fields = Array.from(document.querySelectorAll('[data-type="field"]')).map(i => i.value);
  const dropdowns = Array.from(document.querySelectorAll('[data-type="dropdown"]')).map(s => s.value);

  if (fields.some(v => !v)) {
    alert("يرجى تعبئة جميع الحقول");
    return;
  }

  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      fields,
      dropdowns
    })
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.detail || "فشل إنشاء المهمة");
    return;
  }

  document.getElementById("modal").classList.add("hidden");
  loadBalance();
  loadTasks();
};

// ---------- Init ----------
loadConfig();
loadBalance();
loadTasks();
