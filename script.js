/**********************************************************
 * Telegram WebApp Init
 **********************************************************/
const tg = Telegram.WebApp;
tg.ready();

const debugBoxId = "debug-box";
function ensureDebugBox() {
  let box = document.getElementById(debugBoxId);
  if (!box) {
    box = document.createElement("div");
    box.id = debugBoxId;
    box.style.cssText = `
      position: fixed; left: 10px; right: 10px; bottom: 10px;
      max-height: 40vh; overflow:auto;
      background:#0b1020; color:#e5e7eb; padding:10px;
      border-radius:12px; font-size:12px; z-index:9999;
      box-shadow:0 10px 30px rgba(0,0,0,.25)
    `;
    document.body.appendChild(box);
  }
  return box;
}
function logDebug(...args) {
  console.log(...args);
  const box = ensureDebugBox();
  const line = document.createElement("div");
  line.textContent = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  box.appendChild(line);
}

if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
  alert("❌ يجب فتح التطبيق من داخل Telegram عبر زر البوت");
  throw new Error("Telegram user not found");
}

const USER_ID = Number(tg.initDataUnsafe.user.id);

// ✅ API كما عندك
const API = "https://insipidly-transdesert-noble.ngrok-free.dev"; // بدون /

logDebug("✅ USER_ID =", USER_ID);
logDebug("🌐 API =", API);

/**********************************************************
 * Robust fetch helper (shows real error reason)
 **********************************************************/
async function apiFetch(path, options = {}) {
  const url = `${API}${path}`;
  const opts = {
    method: "GET",
    mode: "cors",
    redirect: "follow",
    cache: "no-store",
    credentials: "omit",
    headers: {
      "Accept": "application/json"
    },
    ...options
  };

  // If sending JSON body
  if (opts.body && typeof opts.body !== "string") {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }

  logDebug("➡️ FETCH", opts.method, url);

  try {
    const res = await fetch(url, opts);
    const text = await res.text(); // read raw for debugging

    logDebug("⬅️ STATUS", res.status, res.statusText);
    if (text) logDebug("⬅️ BODY", text.slice(0, 500));

    // Try parse JSON
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}

    if (!res.ok) {
      // Prefer FastAPI detail
      const detail = data?.detail || text || `HTTP ${res.status}`;
      throw new Error(detail);
    }

    return data ?? {};
  } catch (err) {
    logDebug("❌ FETCH ERROR:", String(err));
    throw err;
  }
}

/**********************************************************
 * Global State
 **********************************************************/
let currentStatus = "pending";
let config = null;

/**********************************************************
 * Load Config
 **********************************************************/
async function loadConfig() {
  try {
    const res = await fetch("config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("فشل تحميل config.json");
    config = await res.json();
    buildForm();
    logDebug("✅ Config loaded");
  } catch (err) {
    logDebug("❌ Config error:", String(err));
    alert("❌ فشل تحميل إعدادات النموذج (config.json)");
  }
}

/**********************************************************
 * Build Form
 **********************************************************/
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

/**********************************************************
 * Balance
 **********************************************************/
async function loadBalance() {
  try {
    const data = await apiFetch(`/account/${USER_ID}`);
    document.getElementById("balance").innerText =
      `النقاط: ${data.points} | مجمدة: ${data.frozen_points}`;
    logDebug("✅ Balance OK", data);
  } catch (err) {
    document.getElementById("balance").innerText = "خطأ في جلب الرصيد";
    alert("❌ فشل جلب الرصيد: " + err.message);
  }
}

/**********************************************************
 * Tabs
 **********************************************************/
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    loadTasks();
  });
});

/**********************************************************
 * Load Tasks
 **********************************************************/
async function loadTasks() {
  const list = document.getElementById("task-list");
  list.innerHTML = "جارٍ التحميل...";

  try {
    const tasks = await apiFetch(`/tasks/${USER_ID}?status=${encodeURIComponent(currentStatus)}`);

    list.innerHTML = "";
    if (!Array.isArray(tasks) || tasks.length === 0) {
      list.innerHTML = "<p>لا توجد مهمات</p>";
      logDebug("ℹ️ No tasks for status:", currentStatus);
      return;
    }

    tasks.forEach(t => {
      const div = document.createElement("div");
      div.className = "card";

      const failNote = (t.status === "failed" && t.fail_reason)
        ? `<p class="fail">سبب الفشل: ${t.fail_reason}</p>`
        : "";

      div.innerHTML = `
        <h4>${t.fields?.[0] ?? ""}</h4>
        <p>${t.fields?.[1] ?? ""}</p>
        <small>${(t.dropdowns ?? []).join(" • ")}</small>
        ${failNote}
      `;

      list.appendChild(div);
    });

    logDebug("✅ Tasks OK. Count:", tasks.length);
  } catch (err) {
    list.innerHTML = "<p>❌ خطأ في جلب المهمات</p>";
    alert("❌ فشل جلب المهمات: " + err.message);
  }
}

/**********************************************************
 * Modal
 **********************************************************/
document.getElementById("add-btn").addEventListener("click", () => {
  document.getElementById("modal").classList.remove("hidden");
});

document.getElementById("cancel").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

/**********************************************************
 * Create Task
 **********************************************************/
document.getElementById("submit").addEventListener("click", async (e) => {
  e.preventDefault();

  const fields = Array.from(document.querySelectorAll('[data-type="field"]'))
    .map(i => i.value.trim());

  const dropdowns = Array.from(document.querySelectorAll('[data-type="dropdown"]'))
    .map(s => s.value);

  if (fields.some(v => !v)) {
    alert("❌ يرجى تعبئة جميع الحقول");
    return;
  }

  try {
    const result = await apiFetch(`/tasks`, {
      method: "POST",
      body: { user_id: USER_ID, fields, dropdowns }
    });

    logDebug("✅ Created task", result);

    document.getElementById("modal").classList.add("hidden");
    await loadBalance();
    await loadTasks();
  } catch (err) {
    alert("❌ فشل إنشاء المهمة: " + err.message);
  }
});

/**********************************************************
 * Init
 **********************************************************/
(async function init() {
  await loadConfig();
  await loadBalance();
  await loadTasks();
})();
