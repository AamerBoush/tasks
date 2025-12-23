const tg = Telegram.WebApp;
tg.ready();

const API = "https://insipidly-transdesert-noble.ngrok-free.dev";

// ===== Helper =====
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": tg.initData,
      "ngrok-skip-browser-warning": "true"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : {};
}

// ===== State =====
let currentStatus = "pending";

// ===== Bootstrap =====
async function bootstrap() {
  const data = await api("/api/bootstrap");
  document.getElementById("balance").innerText =
    `النقاط: ${data.points} | مجمدة: ${data.frozen_points}`;
}

// ===== Load Tasks =====
async function loadTasks() {
  const tasks = await api(`/api/tasks?status=${currentStatus}`);
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
      <h4>${t.fields[0]}</h4>
      <p>${t.fields[1]}</p>
      <small>${t.dropdowns.join(" • ")}</small>
    `;
    list.appendChild(div);
  });
}

// ===== Create Task =====
document.getElementById("submit").onclick = async () => {
  const fields = Array.from(document.querySelectorAll('[data-type="field"]')).map(i => i.value);
  const dropdowns = Array.from(document.querySelectorAll('[data-type="dropdown"]')).map(s => s.value);

  await api("/api/tasks", {
    method: "POST",
    body: { fields, dropdowns }
  });

  await bootstrap();
  await loadTasks();
};

// ===== Tabs =====
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    loadTasks();
  };
});

// ===== Init =====
bootstrap().then(loadTasks);
