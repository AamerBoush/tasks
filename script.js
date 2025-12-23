const tg = Telegram.WebApp;
tg.ready();

const API = "https://insipidly-transdesert-noble.ngrok-free.dev";

// ================= Helper =================
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
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok) {
    const msg = data.detail || text || "خطأ غير معروف";
    throw new Error(msg);
  }

  return data;
}

// ================= State =================
let currentStatus = "pending";
let formConfig = null;

// ================= Load Config =================
async function loadConfig() {
  const res = await fetch("config.json");
  formConfig = await res.json();
  buildForm();
}

// ================= Build Form =================
function buildForm() {
  const form = document.getElementById("task-form");
  form.innerHTML = "";

  // حقول نصية
  formConfig.form.fields.forEach(f => {
    const input = document.createElement("input");
    input.placeholder = f.placeholder;
    input.dataset.type = "field";
    form.appendChild(input);
  });

  // قوائم منسدلة
  formConfig.form.dropdowns.forEach(d => {
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

// ================= Bootstrap =================
async function bootstrap() {
  const data = await api("/api/bootstrap");
  document.getElementById("points").innerText = data.points;
  document.getElementById("frozen").innerText = data.frozen_points;
}

// ================= Load Tasks =================
async function loadTasks() {
  const list = document.getElementById("task-list");
  list.innerHTML = "جارٍ التحميل...";

  const tasks = await api(`/api/tasks?status=${currentStatus}`);
  list.innerHTML = "";

  if (!tasks.length) {
    list.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const div = document.createElement("div");
    div.className = "card";

    const deleteBtn =
      t.status === "pending"
        ? `<button onclick="deleteTask('${t.task_id}')">حذف المهمة</button>`
        : "";

    div.innerHTML = `
      <h4>${t.fields?.[0] || ""}</h4>
      <p>${t.fields?.[1] || ""}</p>
      <small>${(t.dropdowns || []).join(" • ")}</small>
      ${deleteBtn}
    `;

    list.appendChild(div);
  });
}

// ================= Delete Task =================
async function deleteTask(taskId) {
  if (!confirm("هل أنت متأكد من حذف المهمة؟")) return;

  await api(`/api/tasks/${taskId}`, { method: "DELETE" });
  await bootstrap();
  await loadTasks();
}

// ================= Modal =================
document.getElementById("add-btn").onclick = () => {
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("cancel").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

// ================= Create Task =================
document.getElementById("submit").onclick = async () => {
  const fields = Array.from(
    document.querySelectorAll('[data-type="field"]')
  ).map(i => i.value.trim());

  const dropdowns = Array.from(
    document.querySelectorAll('[data-type="dropdown"]')
  ).map(s => s.value);

  if (fields.some(v => !v)) {
    alert("يرجى تعبئة جميع الحقول");
    return;
  }

  try {
    await api("/api/tasks", {
      method: "POST",
      body: { fields, dropdowns }
    });

    document.getElementById("modal").classList.add("hidden");
    await bootstrap();
    await loadTasks();

  } catch (err) {
    // 🔴 تحذير عند عدم توفر نقاط كافية
    if (err.message.includes("not enough points")) {
      alert("❌ لا تملك نقاط كافية لإضافة مهمة جديدة");
    } else {
      alert("❌ فشل إنشاء المهمة: " + err.message);
    }
  }
};

// ================= Tabs =================
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    document
      .querySelectorAll(".tabs button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    loadTasks();
  };
});

// ================= Init =================
(async function init() {
  await loadConfig();   // 🔑 هذا هو الذي كان مفقودًا
  await bootstrap();
  await loadTasks();
})();
