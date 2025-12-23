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

  // ✅ صحيح مع HTML الجديد
  document.getElementById("points").innerText = data.points;
  document.getElementById("frozen").innerText = data.frozen_points;
}

// ===== Load Tasks =====
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

    // زر حذف فقط للمهمات الجارية
    const deleteBtn =
      t.status === "pending"
        ? `<button onclick="deleteTask('${t.task_id}')">حذف المهمة</button>`
        : "";

    div.innerHTML = `
      <h4>${t.fields[0] || ""}</h4>
      <p>${t.fields[1] || ""}</p>
      <small>${(t.dropdowns || []).join(" • ")}</small>
      ${deleteBtn}
    `;

    list.appendChild(div);
  });
}

// ===== Delete Task =====
async function deleteTask(taskId) {
  if (!confirm("هل أنت متأكد من حذف المهمة؟")) return;

  await api(`/api/tasks/${taskId}`, { method: "DELETE" });
  await bootstrap();   // تحديث الرصيد + فك التجميد
  await loadTasks();
}

// ===== Modal Controls =====
document.getElementById("add-btn").onclick = () => {
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("cancel").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

// ===== Create Task =====
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

  await api("/api/tasks", {
    method: "POST",
    body: { fields, dropdowns }
  });

  // ✅ إغلاق المودال بعد الإنشاء
  document.getElementById("modal").classList.add("hidden");

  await bootstrap();
  await loadTasks();
};

// ===== Tabs =====
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

// ===== Init =====
bootstrap().then(loadTasks);
