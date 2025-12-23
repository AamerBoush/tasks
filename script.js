const tg = Telegram.WebApp;
tg.ready();

const API = "https://insipidly-transdesert-noble.ngrok-free.dev";

// ---------- DOM ----------
const el = {
  points: document.getElementById("points"),
  frozen: document.getElementById("frozen"),
  taskList: document.getElementById("task-list"),
  modal: document.getElementById("modal"),
  taskForm: document.getElementById("task-form"),
  notice: document.getElementById("notice"),
  addBtn: document.getElementById("add-btn"),
  submitBtn: document.getElementById("submit"),
  cancelBtn: document.getElementById("cancel"),
  tabButtons: Array.from(document.querySelectorAll(".tabs button")),
};

// ---------- Helper: quiet notice ----------
let noticeTimer = null;
function showNotice(message) {
  el.notice.textContent = message;
  el.notice.classList.remove("hidden");
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => el.notice.classList.add("hidden"), 3500);
}

// ---------- Helper: API ----------
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
    const msg = data.detail || text || "Request failed";
    throw new Error(msg);
  }
  return data;
}

// ---------- State ----------
let currentStatus = "pending";
let formConfig = null;

// ---------- Load config & build form ----------
async function loadConfig() {
  const res = await fetch("config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json not found");
  formConfig = await res.json();
  buildForm();
}

function buildForm() {
  el.taskForm.innerHTML = "";

  // fields (2 inputs)
  formConfig.form.fields.forEach(f => {
    const input = document.createElement("input");
    input.placeholder = f.placeholder;
    input.dataset.type = "field";
    el.taskForm.appendChild(input);
  });

  // dropdowns (4 selects)
  formConfig.form.dropdowns.forEach(d => {
    const select = document.createElement("select");
    select.dataset.type = "dropdown";

    d.options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });

    el.taskForm.appendChild(select);
  });
}

// ---------- Bootstrap (balance) ----------
async function bootstrap() {
  const data = await api("/api/bootstrap");
  el.points.textContent = data.points;
  el.frozen.textContent = data.frozen_points;
}

// ---------- Load tasks ----------
async function loadTasks() {
  el.taskList.innerHTML = "جارٍ التحميل...";

  const tasks = await api(`/api/tasks?status=${encodeURIComponent(currentStatus)}`);
  el.taskList.innerHTML = "";

  if (!Array.isArray(tasks) || tasks.length === 0) {
    el.taskList.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const card = document.createElement("div");
    card.className = "card";

    const failNote =
      t.status === "failed" && t.fail_reason
        ? `<p class="fail">سبب الفشل: ${t.fail_reason}</p>`
        : "";

    // delete available in all tabs
    card.innerHTML = `
      <h4>${(t.fields && t.fields[0]) ? t.fields[0] : ""}</h4>
      <p>${(t.fields && t.fields[1]) ? t.fields[1] : ""}</p>
      <small>${Array.isArray(t.dropdowns) ? t.dropdowns.join(" • ") : ""}</small>
      ${failNote}
      <button data-task-id="${t.task_id}" data-status="${t.status}">حذف المهمة</button>
    `;

    // button handler (no inline onclick to avoid issues)
    const btn = card.querySelector("button");
    btn.addEventListener("click", async () => {
      await deleteTask(btn.dataset.taskId, btn.dataset.status);
    });

    el.taskList.appendChild(card);
  });
}

// ---------- Delete task ----------
async function deleteTask(taskId, status) {
  // confirm only for pending
  if (status === "pending") {
    const ok = confirm("هل أنت متأكد من حذف المهمة الجارية؟");
    if (!ok) return;
  }

  await api(`/api/tasks/${taskId}`, { method: "DELETE" });
  await bootstrap();
  await loadTasks();
}

// ---------- Modal controls ----------
el.addBtn.addEventListener("click", () => {
  el.modal.classList.remove("hidden");
});

el.cancelBtn.addEventListener("click", () => {
  el.modal.classList.add("hidden");
});

// ---------- Create task ----------
el.submitBtn.addEventListener("click", async () => {
  const fields = Array.from(document.querySelectorAll('[data-type="field"]'))
    .map(i => i.value.trim());

  const dropdowns = Array.from(document.querySelectorAll('[data-type="dropdown"]'))
    .map(s => s.value);

  if (fields.some(v => !v)) {
    showNotice("يرجى تعبئة جميع الحقول");
    return;
  }

  try {
    await api("/api/tasks", { method: "POST", body: { fields, dropdowns } });
    el.modal.classList.add("hidden");
    await bootstrap();
    await loadTasks();
  } catch (e) {
    if ((e.message || "").includes("not enough points")) {
      showNotice("لا تملك رصيدًا كافيًا لإضافة مهمة جديدة");
    } else {
      showNotice("فشل إنشاء المهمة");
    }
  }
});

// ---------- Tabs ----------
el.tabButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    el.tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    await loadTasks();
  });
});

// ---------- Init ----------
(async function init() {
  try {
    await loadConfig();
    await bootstrap();
    await loadTasks();
  } catch (e) {
    console.error(e);
    showNotice("حدث خطأ في تشغيل الواجهة");
  }
})();
