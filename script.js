const tg = Telegram.WebApp;
tg.ready();

const API = "https://insipidly-transdesert-noble.ngrok-free.dev";

// ---------- DOM ----------
const el = {
  available: document.getElementById("available"),
  frozen: document.getElementById("frozen"),
  trial: document.getElementById("trial"),

  balFrozen: document.getElementById("bal-frozen"),
  balTrial: document.getElementById("bal-trial"),

  taskList: document.getElementById("task-list"),
  modal: document.getElementById("modal"),
  taskForm: document.getElementById("task-form"),
  notice: document.getElementById("notice"),

  addBtn: document.getElementById("add-btn"),
  submitBtn: document.getElementById("submit"),
  cancelBtn: document.getElementById("cancel"),

  tabs: Array.from(document.querySelectorAll(".tabs button"))
};

// ---------- Helper ----------
function showNotice(msg) {
  el.notice.textContent = msg;
  el.notice.classList.remove("hidden");
  setTimeout(() => el.notice.classList.add("hidden"), 3500);
}

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

  if (!res.ok) throw new Error(data.detail || text);
  return data;
}

// ---------- State ----------
let balances = {};
let currentTab = "pending";

// ---------- Bootstrap ----------
async function bootstrap() {
  const data = await api("/api/bootstrap");
  balances = data.balances;

  el.available.textContent = balances.available;

  if (balances.frozen > 0) {
    el.frozen.textContent = balances.frozen;
    el.balFrozen.classList.remove("hidden");
  } else {
    el.balFrozen.classList.add("hidden");
  }

  if (balances.trial > 0) {
    el.trial.textContent = balances.trial;
    el.balTrial.classList.remove("hidden");
  } else {
    el.balTrial.classList.add("hidden");
  }
}

// ---------- Load Tasks ----------
async function loadTasks() {
  el.taskList.innerHTML = "جارٍ التحميل...";

  const tasks = await api(`/api/tasks?execution_status=${currentTab}`);
  el.taskList.innerHTML = "";

  if (!tasks.length) {
    el.taskList.innerHTML = "<p>لا توجد مهمات</p>";
    return;
  }

  tasks.forEach(t => {
    const card = document.createElement("div");
    card.className = "card";

    // financial note
    if (t.financial_note) {
      const fn = document.createElement("div");
      fn.className = "fin-note";
      fn.textContent = t.financial_note;
      card.appendChild(fn);
    }

    // status text (only in pending tab)
    if (currentTab === "pending") {
      const st = document.createElement("div");
      st.className = "status-text";

      st.textContent =
        t.status === "pending"   ? "جارٍ النشر" :
        t.status === "completed" ? "قيد الإنجاز" :
                                   "مرفوضة";

      card.appendChild(st);
    }

    // fields
    t.fields.forEach(f => {
      const line = document.createElement("div");
      line.className = "line";
      line.textContent = f;
      card.appendChild(line);
    });

    // dropdowns
    t.dropdowns.forEach(d => {
      const line = document.createElement("div");
      line.className = "line";
      line.textContent = d;
      card.appendChild(line);
    });

    // delete button
    const btn = document.createElement("button");
    btn.textContent = "حذف المهمة";
    btn.onclick = async () => {
      if (currentTab === "pending") {
        if (!confirm("هل أنت متأكد من حذف المهمة؟")) return;
      }
      await api(`/api/tasks/${t._id}`, { method: "DELETE" });
      await loadTasks();
    };

    card.appendChild(btn);
    el.taskList.appendChild(card);
  });
}

// ---------- Modal ----------
el.addBtn.onclick = () => el.modal.classList.remove("hidden");
el.cancelBtn.onclick = () => el.modal.classList.add("hidden");

// ---------- Create Task ----------
el.submitBtn.onclick = async () => {
  const fields = Array.from(el.taskForm.querySelectorAll('[data-type="field"]'))
    .map(i => i.value.trim());

  const dropdowns = Array.from(el.taskForm.querySelectorAll('[data-type="dropdown"]'))
    .map(s => s.value);

  if (fields.some(v => !v)) {
    showNotice("يرجى تعبئة جميع الحقول");
    return;
  }

  let source = null;
  if (balances.available >= 12) source = "available";
  else if (balances.trial >= 12) source = "trial";

  if (!source) {
    showNotice("لا يوجد رصيد كافٍ لإضافة مهمة");
    return;
  }

  await api("/api/tasks", {
    method: "POST",
    body: { fields, dropdowns, balance_source: source }
  });

  el.modal.classList.add("hidden");
  await loadTasks();
};

// ---------- Tabs ----------
el.tabs.forEach(btn => {
  btn.onclick = async () => {
    el.tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.status;
    await loadTasks();
  };
});

// ---------- Init ----------
(async function init() {
  await bootstrap();
  await loadTasks();
})();
