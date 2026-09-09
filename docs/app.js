const PROGRAM = {
  PUSH: [
    ["Hammer Strength Incline Press", 3, "6–10"],
    ["Hammer Strength Decline Press", 3, "8–12"],
    ["Cable Fly", 2, "10–15"],
    ["Machine Shoulder Press", 2, "8–12"],
    ["Cable Lateral Raise", 4, "12–20"],
    ["Rope Triceps Pushdown", 3, "8–15"],
    ["Overhead Cable Triceps Extension", 2, "10–15"]
  ],

  PULL: [
    ["Neutral-Grip Lat Pulldown", 3, "6–10"],
    ["Chest-Supported Row", 3, "6–10"],
    ["Single-Arm Cable Lat Pulldown", 2, "10–15"],
    ["Reverse Pec Deck", 3, "12–20"],
    ["Cable Lateral Raise", 2, "12–20"],
    ["Incline DB Curl", 3, "8–12"],
    ["Hammer Curl", 2, "10–15"]
  ],

  LEGS: [
    ["Hack Squat / Leg Press", 3, "6–10"],
    ["Leg Extension", 4, "10–15"],
    ["Seated Leg Curl", 4, "8–12"],
    ["Lying Leg Curl", 2, "10–15"],
    ["Hip Thrust / Glute Drive", 2, "8–12"],
    ["Calf Raise", 4, "8–15"]
  ]
};

let D = JSON.parse(localStorage.getItem("gainlog")) || {
  foods: [],
  weights: [],
  workouts: []
};

let day = "PUSH";

function save() {
  localStorage.setItem("gainlog", JSON.stringify(D));
}

function go(id) {
  document.querySelectorAll("section").forEach(s => {
    s.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  if (id === "progress") renderProgress();
}

function totals() {
  return D.foods
    .filter(f => f.date === new Date().toDateString())
    .reduce(
      (a, f) => {
        a.c += f.cal;
        a.p += f.protein;
        return a;
      },
      { c: 0, p: 0 }
    );
}

function renderToday() {
  const t = totals();

  document.getElementById("cals").textContent = t.c;
  document.getElementById("pro").textContent = t.p;

  document.getElementById("cp").value = t.c;
  document.getElementById("pp").value = t.p;

  const calLeft = Math.max(0, 2750 - t.c);
  const proLeft = Math.max(0, 155 - t.p);

  let message =
    `You have about ${calLeft} calories and ${proLeft} g protein left today.`;

  if (t.c >= 2600 && t.c <= 2900 && t.p >= 145) {
    message =
      "Nutrition looks good today. You're close to your calorie and protein targets.";
  }

  if (t.c >= 2750 && t.p < 125) {
    message =
      `Calories are covered, but protein is low. Try to get about ${proLeft} g more protein.`;
  }

  if (t.c > 3100) {
    message =
      "You're well over today's calorie target. No need to compensate aggressively tomorrow—just return to the normal target.";
  }

  document.getElementById("coach").textContent = message;
}

function estimateFood(text) {
  const x = text.toLowerCase();

  let result = {
    cal: 450,
    protein: 22
  };

  if (x.includes("cheerio") || x.includes("cereal")) {
    result = { cal: 380, protein: 14 };
  }

  if (x.includes("pizza") || x.includes("little caesars")) {
    result = { cal: 560, protein: 24 };
  }

  if (x.includes("lasagna")) {
    result = { cal: 520, protein: 28 };
  }

  if (x.includes("omelet")) {
    result = { cal: 430, protein: 30 };
  }

  if (x.includes("chicken")) {
    result = { cal: 420, protein: 45 };
  }

  if (x.includes("ground beef") || x.includes("beef")) {
    result = { cal: 520, protein: 38 };
  }

  if (x.includes("steak")) {
    result = { cal: 500, protein: 45 };
  }

  if (x.includes("bagel")) {
    result = { cal: 280, protein: 10 };
  }

  if (x.includes("peanut butter")) {
    result = { cal: 190, protein: 7 };
  }

  if (x.includes("protein shake") || x.includes("whey")) {
    result = { cal: 600, protein: 48 };
  }

  if (x.includes("burrito")) {
    result = { cal: 650, protein: 30 };
  }

  if (x.includes("sandwich")) {
    result = { cal: 450, protein: 28 };
  }

  if (x.includes("milk") && !x.includes("cereal") && !x.includes("cheerio")) {
    result = { cal: 120, protein: 8 };
  }

  if (
    x.includes("big") ||
    x.includes("large") ||
    x.includes("huge")
  ) {
    result.cal = Math.round(result.cal * 1.3);
    result.protein = Math.round(result.protein * 1.25);
  }

  if (
    x.includes("small") ||
    x.includes("little portion")
  ) {
    result.cal = Math.round(result.cal * 0.7);
    result.protein = Math.round(result.protein * 0.75);
  }

  return result;
}

function addFood() {
  const input = document.getElementById("foodtxt");
  const text = input.value.trim();

  if (!text) return;

  const e = estimateFood(text);

  D.foods.unshift({
    name: text,
    cal: e.cal,
    protein: e.protein,
    date: new Date().toDateString()
  });

  save();

  input.value = "";

  renderFood();
  renderToday();
}

function renderFood() {
  const box = document.getElementById("foods");

  const today = D.foods.filter(
    f => f.date === new Date().toDateString()
  );

  if (!today.length) {
    box.innerHTML =
      '<div class="card muted">No food logged yet today.</div>';
    return;
  }

  box.innerHTML = today
    .map((f, i) => `
      <div class="card food">
        <div>
          <strong>${escapeHTML(f.name)}</strong>
          <div class="muted">
            ${f.cal} cal • ${f.protein} g protein
          </div>
        </div>

        <button onclick="deleteFood(${D.foods.indexOf(f)})">
          ×
        </button>
      </div>
    `)
    .join("");
}

function deleteFood(index) {
  D.foods.splice(index, 1);
  save();
  renderFood();
  renderToday();
}

function addWeight() {
  const input = document.getElementById("wt");
  const value = parseFloat(input.value);

  if (!value) return;

  D.weights.unshift({
    value: value,
    date: new Date().toLocaleDateString()
  });

  save();

  input.value = "";

  renderProgress();
}

function renderDays() {
  const box = document.getElementById("days");

  box.className = "days";

  box.innerHTML = ["PUSH", "PULL", "LEGS"]
    .map(d => `
      <button
        class="${d === day ? "on" : ""}"
        onclick="selectDay('${d}')">
        ${d}
      </button>
    `)
    .join("");
}

function selectDay(d) {
  day = d;
  renderDays();
  renderWorkout();
}

function renderWorkout() {
  const box = document.getElementById("ex");

  box.innerHTML = PROGRAM[day]
    .map((e, exerciseIndex) => {
      let sets = "";

      for (let i = 1; i <= e[1]; i++) {
        sets += `
          <div class="set">
            <span>${i}</span>

            <input
              inputmode="decimal"
              placeholder="lb"
              data-ex="${exerciseIndex}"
              data-set="${i}"
              data-type="weight">

            <input
              inputmode="numeric"
              placeholder="reps"
              data-ex="${exerciseIndex}"
              data-set="${i}"
              data-type="reps">

            <input
              inputmode="decimal"
              placeholder="RIR"
              data-ex="${exerciseIndex}"
              data-set="${i}"
              data-type="rir">
          </div>
        `;
      }

      return `
        <div class="exercise">
          <h3>${e[0]}</h3>
          <small>${e[1]} sets • ${e[2]} reps</small>

          <div class="set muted">
            <span></span>
            <span>Weight</span>
            <span>Reps</span>
            <span>RIR</span>
          </div>

          ${sets}
        </div>
      `;
    })
    .join("");
}

function finish() {
  const inputs = document.querySelectorAll("#ex input");

  const exercises = PROGRAM[day].map(e => ({
    name: e[0],
    sets: []
  }));

  inputs.forEach(input => {
    const ex = Number(input.dataset.ex);
    const set = Number(input.dataset.set) - 1;
    const type = input.dataset.type;

    if (!exercises[ex].sets[set]) {
      exercises[ex].sets[set] = {};
    }

    exercises[ex].sets[set][type] = input.value;
  });

  D.workouts.unshift({
    day: day,
    date: new Date().toLocaleDateString(),
    exercises: exercises
  });

  save();

  alert(`${day} workout saved.`);

  renderWorkout();
  renderProgress();
}

function renderProgress() {
  const weights = document.getElementById("weights");

  if (!D.weights.length) {
    weights.innerHTML =
      '<p class="muted">No weigh-ins yet.</p>';
  } else {
    weights.innerHTML = D.weights
      .slice(0, 8)
      .map(w => `
        <p>
          <strong>${w.value} lb</strong>
          <span class="muted"> • ${w.date}</span>
        </p>
      `)
      .join("");
  }

  document.getElementById("sessions").textContent =
    `${D.workouts.length} workout${D.workouts.length === 1 ? "" : "s"} logged.`;
}

function backup() {
  const blob = new Blob(
    [JSON.stringify(D, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gainlog-backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

renderDays();
renderWorkout();
renderFood();
renderToday();
renderProgress();
go("today");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}