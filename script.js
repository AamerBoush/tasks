/**********************************************************
 * Telegram WebApp Init
 **********************************************************/
const tg = Telegram.WebApp;
tg.ready();

if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
  alert("❌ يجب فتح التطبيق من داخل Telegram عبر زر البوت");
  throw new Error("Telegram user not found");
}

const USER_ID = Number(tg.initDataUnsafe.user.id);
const API = "https://insipidly-transdesert-noble.ngrok-free.dev"; // بدون /

console.log("✅ USER_ID:", USER_ID);
console.log("🌐 API:", API);

/**********************************************************
 * Global State
 **********************************************************/
let currentStatus = "pending";
let config = null;

/**********************************************************
 * Load Config (form structure)
 **********************************************************/
async function loadConfig() {
  try {
    const res = await fetch("config.json");
    if (!res.ok) throw new Error("Failed to load config.json");
    config = await res.json();
    buildForm();
  } catch (err) {
    console.error("Config error:", err);
    alert("❌ فشل تحميل إعدادات النموذج");
  }
}

/**********************************************************
 * Build Form Dynamically
 **********************************************************/
function buildForm() {
  const form = document.getElementById("task-form");
  form.innerHTML = "";

  // Fields
  config.form.fields.forEach(f => {
    const input = document.createElement("input");
    input.placeholder = f.placeholder;
    input.dataset.type = "field";
    form.appendChild(input);
  });

  // Dropdowns
  config.form.dropdowns.forEach(d => {
    const select = document.createElement("select");
    select.dataset.type = "dropdown";

    d.options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });

    form.appendChild(select);
  });
}

/**********************************************************
 * Load Account Balance
 **********************************************************/
async function loadBalance() {
  try {
    const res = await fetch(`${API}/account/${USER_ID}`);
    if (!res.ok) throw new Error("Failed to load account");

    const data = await res.json();
    document.getElementById("balance").innerText =
      `النقاط: ${data.points} | مجمدة: ${data.frozen_points}`;
  } catch (err) {
    console.error("Balance error:", err);
    document.getElementById("balance").innerText = "خطأ في جلب الرصيد";
  }
}

/**********************************************************
 * Tabs Handling
 **********************************************************/
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    loadTasks();
  });
});

/**********************************************************
 * Load Tasks (per user + status)
 **********************************************************/
async function loadTasks() {
  const list = document.getElementById("task-list");
  list.innerHTML = "جارٍ التحميل...";

  try {
    const res = await fetch(
      `${API}/tasks/${USER_ID}?status=${encodeURIComponent(currentStatus)}`
    );

    if (!res.ok) throw new Error("Failed to load tasks");

    const tasks = await res.json();
    console.log("📦 TASKS:", tasks);

    list.innerHTML = "";

    if (!Array.isArray(tasks) || tasks.length === 0) {
      list.innerHTML = "<p>لا توجد مهمات</p>";
      return;
    }

    tasks.forEach(t => {
      const card = document.createElement("div");
      card.className = "card";

      let failNote = "";
      if (t.status === "failed" && t.fail_reason) {
        failNote = `<p class="fail">سبب الفشل: ${t.fail_reason}</p>`;
      }

      card.innerHTML = `
        <h4>${t.fields[0]}</h4>
        <p>${t.fields[1]}</p>
        <small>${t.dropdowns.join(" • ")}</small>
        ${failNote}
      `;

      list.appendChild(card);
    });

  } catch (err) {
    console.error("Tasks error:", err);
    list.innerHTML = "<p>❌ خطأ في جلب المهمات</p>";
  }
}

/**********************************************************
 * Modal Controls
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
document.getElementById("submit").addEventListener("click", async () => {
  const fields = Array.from(
    document.querySelectorAll('[data-type="field"]')
  ).map(i => i.value.trim());

  const dropdowns = Array.from(
    document.querySelectorAll('[data-type="dropdown"]')
  ).map(s => s.value);

  if (fields.some(v => !v)) {
    alert("❌ يرجى تعبئة جميع الحقول");
    return;
  }

  try {
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

    // Success
    document.getElementById("modal").classList.add("hidden");
    loadBalance();
    loadTasks();

  } catch (err) {
    console.error("Create task error:", err);
    alert("❌ خطأ في إنشاء المهمة");
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
