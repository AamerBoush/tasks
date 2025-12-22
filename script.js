const tg = Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe.user;

if (!user) {
  alert("Telegram user not detected");
}

const USER_ID = user.id;
const API_URL = "https://insipidly-transdesert-noble.ngrok-free.dev/";

function addTask(prefill = null) {
  const div = document.createElement("div");
  div.className = "task";

  let html = "";

  for (let i = 0; i < 6; i++) {
    html += `<input placeholder="Field ${i+1}" value="${prefill?.fields?.[i] || ""}"><br>`;
  }

  for (let i = 0; i < 4; i++) {
    html += `
      <select>
        <option ${prefill?.dropdowns?.[i] === "A" ? "selected" : ""}>A</option>
        <option ${prefill?.dropdowns?.[i] === "B" ? "selected" : ""}>B</option>
        <option ${prefill?.dropdowns?.[i] === "C" ? "selected" : ""}>C</option>
      </select><br>
    `;
  }

  div.innerHTML = html;
  document.getElementById("tasks").appendChild(div);
}

async function saveTasks() {
  const elements = document.querySelectorAll(".task");

  for (const el of elements) {
    const inputs = el.querySelectorAll("input");
    const selects = el.querySelectorAll("select");

    const payload = {
      user_id: USER_ID,
      fields: Array.from(inputs).map(i => i.value),
      dropdowns: Array.from(selects).map(s => s.value)
    };

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  alert("Tasks saved!");
}

async function loadTasks() {
  const res = await fetch(`${API_URL}/${USER_ID}`);
  const data = await res.json();

  data.tasks.forEach(task => addTask(task));
}

loadTasks();


