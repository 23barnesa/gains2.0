const APP_VERSION = 8;
const COACH_API_URL = "https://gainlog-coach-23barnesa.vercel.app/api/coach";
const TARGETS = { calories: 2750, protein: 155 };
const EVIDENCE_RULES = {
  split:"No split is inherently superior when weekly volume is equated. Choose the structure that fits the available days, distributes work into productive sessions, supports recovery, and can be completed consistently.",
  frequency:"Use frequency to distribute recoverable weekly volume and maintain set quality; do not chase a frequency target by itself.",
  volume:"Use a productive, recoverable amount of hard training and change it conservatively from repeated history. More sets are not automatically better.",
  effort:"Most hypertrophy sets should finish close to failure without requiring failure. Keep compounds around 1–2 RIR and isolations around 0–2 RIR unless safety or technique requires more margin.",
  loading:"A broad range of loads can build muscle when sets are performed with appropriate effort. Use the prescribed rep range and double progression instead of treating one rep range as uniquely anabolic.",
  rest:"Rest long enough to preserve productive reps and technique. The 60/75/90-second timers are starting points, not caps or performance goals.",
  exerciseSelection:"Choose exercises that train the intended muscle through a comfortable, controllable range, are stable enough to progress, fit available equipment, and do not cause joint pain. No exercise is mandatory."
};
const PROGRAM = {
  PUSH: [
    ["Hammer Strength Incline Press",3,"6–10"],["Hammer Strength Decline Press",3,"8–12"],
    ["Cable Fly",2,"10–15"],["Machine Shoulder Press",2,"8–12"],
    ["Cable Lateral Raise",4,"12–20"],["Rope Triceps Pushdown",3,"8–15"],
    ["Overhead Cable Triceps Extension",2,"10–15"]
  ],
  PULL: [
    ["Neutral-Grip Lat Pulldown",3,"6–10"],["Chest-Supported Row",3,"6–10"],
    ["Single-Arm Cable Lat Pulldown",2,"10–15"],["Reverse Pec Deck",3,"12–20"],
    ["Cable Lateral Raise",2,"12–20"],["Incline DB Curl",3,"8–12"],["Hammer Curl",2,"10–15"]
  ],
  LEGS: [
    ["Hack Squat / Leg Press",3,"6–10"],["Leg Extension",4,"10–15"],
    ["Seated Leg Curl",4,"8–12"],["Lying Leg Curl",2,"10–15"],
    ["Hip Thrust / Glute Drive",2,"8–12"],["Calf Raise",4,"8–15"]
  ]
};
const TRAINING_PROGRAMS = {
  ppl: { name:"Push / Pull / Legs", days:PROGRAM },
  full_body: { name:"Full Body A / B / C", days:{
    "FULL A":[["Hammer Strength Incline Press",3,"6–10"],["Neutral-Grip Lat Pulldown",3,"6–10"],["Hack Squat / Leg Press",3,"6–10"],["Seated Leg Curl",3,"8–12"],["Cable Lateral Raise",3,"12–20"],["Rope Triceps Pushdown",2,"8–15"],["Incline DB Curl",2,"8–12"]],
    "FULL B":[["Hammer Strength Decline Press",3,"8–12"],["Chest-Supported Row",3,"6–10"],["Leg Extension",3,"10–15"],["Hip Thrust / Glute Drive",2,"8–12"],["Reverse Pec Deck",3,"12–20"],["Overhead Cable Triceps Extension",2,"10–15"],["Hammer Curl",2,"10–15"],["Calf Raise",3,"8–15"]],
    "FULL C":[["Hammer Strength Incline Press",3,"6–10"],["Single-Arm Cable Lat Pulldown",3,"10–15"],["Hack Squat / Leg Press",3,"6–10"],["Lying Leg Curl",3,"10–15"],["Cable Lateral Raise",3,"12–20"],["Cable Fly",2,"10–15"],["Incline DB Curl",2,"8–12"],["Calf Raise",3,"8–15"]]
  }},
  upper_lower: { name:"Upper / Lower", days:{
    "UPPER A":[["Hammer Strength Incline Press",3,"6–10"],["Neutral-Grip Lat Pulldown",3,"6–10"],["Chest-Supported Row",3,"6–10"],["Cable Fly",2,"10–15"],["Cable Lateral Raise",3,"12–20"],["Rope Triceps Pushdown",2,"8–15"],["Incline DB Curl",2,"8–12"]],
    "LOWER A":[["Hack Squat / Leg Press",3,"6–10"],["Leg Extension",3,"10–15"],["Seated Leg Curl",4,"8–12"],["Hip Thrust / Glute Drive",2,"8–12"],["Calf Raise",4,"8–15"]],
    "UPPER B":[["Hammer Strength Decline Press",3,"8–12"],["Single-Arm Cable Lat Pulldown",3,"10–15"],["Chest-Supported Row",3,"6–10"],["Reverse Pec Deck",3,"12–20"],["Cable Lateral Raise",3,"12–20"],["Overhead Cable Triceps Extension",2,"10–15"],["Hammer Curl",2,"10–15"]],
    "LOWER B":[["Hack Squat / Leg Press",3,"6–10"],["Leg Extension",3,"10–15"],["Lying Leg Curl",3,"10–15"],["Seated Leg Curl",2,"8–12"],["Hip Thrust / Glute Drive",2,"8–12"],["Calf Raise",4,"8–15"]]
  }},
  hybrid: { name:"Upper / Lower + PPL", days:{} }
};
TRAINING_PROGRAMS.hybrid.days={"UPPER":TRAINING_PROGRAMS.upper_lower.days["UPPER A"],"LOWER":TRAINING_PROGRAMS.upper_lower.days["LOWER A"],...PROGRAM};

const EXERCISES = {
  "Hammer Strength Incline Press": { rest:90, muscles:{"Upper chest":1,"Front delts":.45,"Triceps":.35}, swaps:["Incline Machine Press","Low-to-High Cable Press","Neutral-Grip Incline DB Press"] },
  "Hammer Strength Decline Press": { rest:90, muscles:{"Mid/lower chest":1,"Triceps":.4,"Front delts":.25}, swaps:["Decline Machine Press","Chest Press Machine","High-to-Low Cable Press"] },
  "Cable Fly": { rest:75, muscles:{"Mid/lower chest":1,"Upper chest":.25}, swaps:["Pec Deck","Machine Fly","Single-Arm Cable Fly"] },
  "Machine Shoulder Press": { rest:90, muscles:{"Front delts":1,"Side delts":.4,"Triceps":.35}, swaps:["Landmine Press","Neutral-Grip Machine Press","Cable Front Raise"] },
  "Cable Lateral Raise": { rest:60, muscles:{"Side delts":1}, swaps:["Machine Lateral Raise","Leaning Cable Lateral Raise","DB Lateral Raise"] },
  "Rope Triceps Pushdown": { rest:60, muscles:{"Triceps":1}, swaps:["Straight-Bar Pushdown","Single-Arm Cable Pushdown","Machine Dip"] },
  "Overhead Cable Triceps Extension": { rest:60, muscles:{"Triceps":1}, swaps:["Single-Arm Overhead Extension","Cross-Body Cable Extension","Cable Skull Crusher"] },
  "Neutral-Grip Lat Pulldown": { rest:90, muscles:{"Lats":1,"Biceps":.35,"Upper/mid back":.25}, swaps:["Neutral-Grip Assisted Pull-Up","Close-Grip Pulldown","Plate-Loaded Pulldown"] },
  "Chest-Supported Row": { rest:90, muscles:{"Upper/mid back":1,"Lats":.45,"Biceps":.3,"Rear delts":.3}, swaps:["Machine High Row","Seated Cable Row","Chest-Supported DB Row"] },
  "Single-Arm Cable Lat Pulldown": { rest:75, muscles:{"Lats":1,"Biceps":.25}, swaps:["Single-Arm Machine Pulldown","Cable Pullover","Kneeling Single-Arm Pulldown"] },
  "Reverse Pec Deck": { rest:75, muscles:{"Rear delts":1,"Upper/mid back":.25}, swaps:["Cable Rear-Delt Fly","Chest-Supported Rear-Delt Raise","Face Pull"] },
  "Incline DB Curl": { rest:60, muscles:{"Biceps":1}, swaps:["Straight-Bar Cable Curl","EZ-Bar Curl","Alternating DB Curl"] },
  "Hammer Curl": { rest:60, muscles:{"Biceps":1}, swaps:["Rope Hammer Curl","Cross-Body Hammer Curl","Machine Curl"] },
  "Hack Squat / Leg Press": { rest:90, muscles:{"Quads":1,"Glutes":.55}, swaps:["Leg Press","Hack Squat","Belt Squat Machine"] },
  "Leg Extension": { rest:75, muscles:{"Quads":1}, swaps:["Single-Leg Extension","Pendulum Squat Machine","Sissy Squat Machine"] },
  "Seated Leg Curl": { rest:75, muscles:{"Hamstrings":1}, swaps:["Lying Leg Curl","Standing Single-Leg Curl","Nordic Curl Machine"] },
  "Lying Leg Curl": { rest:75, muscles:{"Hamstrings":1}, swaps:["Seated Leg Curl","Standing Single-Leg Curl","Cable Leg Curl"] },
  "Hip Thrust / Glute Drive": { rest:90, muscles:{"Glutes":1,"Hamstrings":.2}, swaps:["Glute Drive Machine","Cable Pull-Through","45° Hip Extension"] },
  "Calf Raise": { rest:60, muscles:{"Calves":1}, swaps:["Seated Calf Raise","Leg-Press Calf Raise","Standing Calf Machine"] }
};
const OU_GYM_PROFILE = {
  id:"oakland-rec",name:"Oakland University Recreation Center",
  verifiedEquipment:["Selectorized machines","Plate-loaded machines","Cable crossover stations","Hoist MotionCage","Dumbbells and free weights","Olympic bars and bumper plates","TRX and resistance bands","Medicine balls and functional space"],
  userConfirmedEquipment:["Hammer Strength incline press","Hammer Strength decline press","Hack squat / leg press","Leg extension","Seated and lying leg curls","Glute drive","Calf raise machines"]
};
const OU_OPTION_GROUPS = {
  "Hammer Strength Incline Press":["Incline Machine Press","Neutral-Grip Incline DB Press","Low-to-High Cable Press","Dumbbell Incline Press","Single-Arm Incline Cable Press"],
  "Hammer Strength Decline Press":["Decline Machine Press","Plate-Loaded Chest Press","High-to-Low Cable Press","Chest Press Machine","Dumbbell Floor Press"],
  "Cable Fly":["Pec Deck","Machine Fly","Single-Arm Cable Fly","Low-to-High Cable Fly","High-to-Low Cable Fly"],
  "Machine Shoulder Press":["Neutral-Grip Machine Press","Seated Neutral-Grip DB Press","Cable Front Raise","Single-Arm Cable Press","Cable Y Raise"],
  "Cable Lateral Raise":["Machine Lateral Raise","Leaning Cable Lateral Raise","Behind-Body Cable Lateral Raise","DB Lateral Raise","Single-Arm MotionCage Lateral Raise"],
  "Rope Triceps Pushdown":["Straight-Bar Pushdown","Single-Arm Cable Pushdown","Reverse-Grip Cable Pushdown","Cross-Body Cable Extension","Machine Dip"],
  "Overhead Cable Triceps Extension":["Single-Arm Overhead Extension","Cross-Body Cable Extension","Cable Skull Crusher","Rope Overhead Extension","Seated DB Overhead Extension"],
  "Neutral-Grip Lat Pulldown":["Close-Grip Pulldown","Wide-Grip Pulldown","Single-Arm Cable Pulldown","Plate-Loaded Pulldown","Band-Assisted Pull-Up"],
  "Chest-Supported Row":["Machine High Row","Seated Cable Row","Chest-Supported DB Row","Single-Arm Cable Row","Plate-Loaded Row"],
  "Single-Arm Cable Lat Pulldown":["Single-Arm Machine Pulldown","Cable Pullover","Kneeling Single-Arm Pulldown","Straight-Arm Cable Pulldown","MotionCage Lat Pulldown"],
  "Reverse Pec Deck":["Cable Rear-Delt Fly","Chest-Supported Rear-Delt Raise","Face Pull","Single-Arm Rear-Delt Cable Fly","Band Rear-Delt Pull-Apart"],
  "Incline DB Curl":["Straight-Bar Cable Curl","EZ-Bar Curl","Alternating DB Curl","Bayesian Cable Curl","Seated DB Curl"],
  "Hammer Curl":["Rope Hammer Curl","Cross-Body Hammer Curl","Alternating DB Hammer Curl","Cable Hammer Curl","Machine Curl"],
  "Hack Squat / Leg Press":["Leg Press","Hack Squat","Single-Leg Press","Cable Belt Squat","Plate-Loaded Leg Press"],
  "Leg Extension":["Single-Leg Extension","Leg Extension Machine","Cable Leg Extension","Single-Leg Press","Heels-Low Leg Press"],
  "Seated Leg Curl":["Lying Leg Curl","Standing Single-Leg Curl","Cable Leg Curl","Single-Leg Seated Curl","DB Leg Curl"],
  "Lying Leg Curl":["Seated Leg Curl","Standing Single-Leg Curl","Cable Leg Curl","Single-Leg Lying Curl","DB Leg Curl"],
  "Hip Thrust / Glute Drive":["Glute Drive Machine","Cable Pull-Through","DB Hip Thrust","Single-Leg Hip Thrust","Cable Glute Kickback"],
  "Calf Raise":["Seated Calf Raise","Leg-Press Calf Raise","Standing Calf Machine","Single-Leg DB Calf Raise","Hack-Squat Calf Raise"]
};
Object.entries(OU_OPTION_GROUPS).forEach(([base,options])=>{const source=EXERCISES[base];if(!source)return;source.swaps=[...new Set([...(source.swaps||[]),...options])];source.swaps.forEach(name=>{if(!EXERCISES[name])EXERCISES[name]={rest:source.rest,muscles:{...source.muscles},swaps:[base,...source.swaps.filter(option=>option!==name)].slice(0,6)};});});
const MUSCLES = ["Upper chest","Mid/lower chest","Front delts","Side delts","Rear delts","Lats","Upper/mid back","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves"];
const NOTIFICATION_DEFAULTS = { enabled:false, restComplete:true, workout:true, workoutTime:"11:00", nutrition:true, nutritionTime:"20:00", bodyweight:true, bodyweightTime:"08:00" };
const SCHEDULE_DEFAULTS = { weeklySchedule:"", homeworkNeeds:"", workoutRequests:"", workoutsPerWeek:3, workoutDurationMinutes:60, updatedAt:null };
const TRAINING_PLAN_DEFAULTS = { mode:"coach", splitId:"ppl", reason:"Your original Push / Pull / Legs plan is preserved until Coach optimization is requested.", updatedAt:null };
const DEFAULTS = { version:APP_VERSION, foods:[], weights:[], workouts:[], swaps:[], preferences:{}, coachMessages:[], earlyEndReasons:[], programOverrides:{}, restHistory:[], restPreferences:{}, notificationHistory:[], notifications:{...NOTIFICATION_DEFAULTS}, schedule:{...SCHEDULE_DEFAULTS}, trainingPlan:{...TRAINING_PLAN_DEFAULTS}, trainingWeek:null, workoutDraft:null };

function loadData() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("gainlog")) || {}; } catch (_) {}
  const merged = {...DEFAULTS, ...stored};
  ["foods","weights","workouts","swaps","coachMessages","earlyEndReasons","restHistory","notificationHistory"].forEach(k => { if (!Array.isArray(merged[k])) merged[k] = []; });
  ["preferences","programOverrides","restPreferences"].forEach(k => { if (!merged[k] || typeof merged[k] !== "object" || Array.isArray(merged[k])) merged[k] = {}; });
  merged.notifications={...NOTIFICATION_DEFAULTS,...(stored.notifications&&typeof stored.notifications==="object"?stored.notifications:{})};
  merged.schedule={...SCHEDULE_DEFAULTS,...(stored.schedule&&typeof stored.schedule==="object"&&!Array.isArray(stored.schedule)?stored.schedule:{})};
  merged.trainingPlan={...TRAINING_PLAN_DEFAULTS,...(stored.trainingPlan&&typeof stored.trainingPlan==="object"&&!Array.isArray(stored.trainingPlan)?stored.trainingPlan:{})};
  if(!TRAINING_PROGRAMS[merged.trainingPlan.splitId])merged.trainingPlan.splitId="ppl";
  if(!merged.trainingWeek||typeof merged.trainingWeek!=="object"||Array.isArray(merged.trainingWeek))merged.trainingWeek=null;
  merged.version = APP_VERSION;
  return merged;
}
let D = loadData();
let day = D.workoutDraft?.day || Object.keys(TRAINING_PROGRAMS[D.trainingPlan.splitId].days)[0];
let coverageRange = "last";
let activeRest = null;
let restInterval = null;
let pendingSwap = null;
let pendingSplit = null;
let waitingWorker = null;
let coachPending = false;
let foodPending = false;
let pendingWorkoutSummaryId = null;
let coachConnectionState = localStorage.getItem("gainlog-coach-status") || "ready";
let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDate = dateKey();

function save() { localStorage.setItem("gainlog", JSON.stringify(D)); }
function isoNow() { return new Date().toISOString(); }
function dateKey(value = new Date()) { const d = new Date(value); return d.toLocaleDateString("en-CA"); }
function workoutDate(w) { return new Date(w.completedAt || w.date); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2)); }
function parseRange(range) { const nums = String(range).match(/\d+/g)?.map(Number) || [0,99]; return {min:nums[0],max:nums[1] ?? nums[0]}; }
function toast(message) { const el=document.getElementById("toast"); el.textContent=message; el.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add("hidden"),2600); }

function go(id) {
  document.querySelectorAll("main section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on", b.dataset.screen===id));
  if (id==="progress") renderProgress();
  if (id==="calendar") renderCalendar();
  if (id==="coachScreen") renderCoach();
  window.scrollTo(0,0);
}

function totals() {
  return D.foods.filter(f => (f.dateKey || dateKey(f.date)) === dateKey()).reduce((a,f)=>({c:a.c+(Number(f.cal)||0),p:a.p+(Number(f.protein)||0)}),{c:0,p:0});
}
function nutritionMessage() {
  const t=totals(), cal=TARGETS.calories-t.c, pro=TARGETS.protein-t.p;
  if (t.c>TARGETS.calories+350) return "You're well over today's calorie target. Just return to your normal target tomorrow.";
  if (cal<=150 && pro>20) return `Calories are nearly covered, but protein is low. Prioritize roughly ${Math.max(0,pro)} g protein.`;
  if (cal<=150 && pro<=10) return "Nutrition looks good today. No need to force extra food.";
  return `You're about ${Math.max(0,cal)} calories and ${Math.max(0,pro)} g protein short today.`;
}
function renderToday() {
  const t=totals();
  document.getElementById("todayDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  ["cals","pro"].forEach((id,i)=>document.getElementById(id).textContent=i?t.p:t.c);
  document.getElementById("cp").value=t.c; document.getElementById("pp").value=t.p;
  document.getElementById("calLeft").textContent=`${Math.max(0,TARGETS.calories-t.c)} left`;
  document.getElementById("proLeft").textContent=`${Math.max(0,TARGETS.protein-t.p)} g left`;
  document.getElementById("coachSummary").textContent=nutritionMessage();
}

function estimateFood(text) {
  const x=text.toLowerCase();
  let r={cal:450,protein:22};
  const foods=[
    [["cheerio","cereal"],380,14],[["little caesars","pizza"],560,24],[["lasagna"],520,28],
    [["omelet","omelette"],430,30],[["chicken"],420,45],[["ground beef","beef"],520,38],
    [["steak"],500,45],[["bagel"],280,10],[["peanut butter"],190,7],
    [["protein shake","whey"],240,35],[["burrito"],650,30],[["sandwich"],450,28],
    [["salmon"],430,40],[["mac and cheese","mac & cheese"],500,18],[["quesadilla"],520,25]
  ];
  const hit=foods.find(([terms])=>terms.some(t=>x.includes(t))); if(hit) r={cal:hit[1],protein:hit[2]};
  if (x.includes("milk") && !x.includes("cereal") && !x.includes("cheerio")) r={cal:120,protein:8};
  const slices=x.match(/(\d+)\s*slices?/); if(slices && (x.includes("pizza")||x.includes("little caesars"))) { r.cal=Number(slices[1])*280; r.protein=Number(slices[1])*12; }
  if (/(big|large|huge|big plate)/.test(x)) {r.cal=Math.round(r.cal*1.3);r.protein=Math.round(r.protein*1.25);}
  if (/(small|little portion)/.test(x)) {r.cal=Math.round(r.cal*.7);r.protein=Math.round(r.protein*.75);}
  return r;
}
async function requestAiFood(text){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(COACH_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"food_estimate",food:text}),signal:controller.signal});
    if(!response.ok)throw new Error(`Food estimator returned ${response.status}`);
    const data=await response.json();
    if(!Number.isFinite(Number(data.calories))||!Number.isFinite(Number(data.protein)))throw new Error("Food estimate was incomplete");
    return {calories:Math.round(Number(data.calories)),protein:Math.round(Number(data.protein)),note:String(data.note||"").trim()};
  }finally{clearTimeout(timeout);}
}
async function addFood() {
  const input=document.getElementById("foodtxt"),button=document.getElementById("addFoodButton"),text=input.value.trim(); if(!text||foodPending)return;
  foodPending=true;button.disabled=true;button.textContent="Estimating…";
  let e,source="ai";
  try{e=await requestAiFood(text);}
  catch(_){const local=estimateFood(text);e={calories:local.cal,protein:local.protein,note:""};source="local";toast("Secure food estimate unavailable · used local estimate");}
  D.foods.unshift({id:uid(),name:text,cal:e.calories,protein:e.protein,estimateNote:e.note,estimateSource:source,date:new Date().toDateString(),dateKey:dateKey(),createdAt:isoNow()});
  save(); input.value=""; renderFood(); renderToday(); foodPending=false;button.disabled=false;button.textContent="Estimate & add";toast(source==="ai"?"Food added · Secure AI estimate":"Food added · Local estimate");
}
function renderFood() {
  const box=document.getElementById("foods"), today=D.foods.filter(f=>(f.dateKey||dateKey(f.date))===dateKey());
  box.innerHTML=today.length?today.map(f=>`<button class="card food" onclick="editFood('${f.id||D.foods.indexOf(f)}')"><div><strong>${escapeHTML(f.name)}</strong><div class="muted">${f.cal} cal · ${f.protein} g protein</div>${f.estimateSource?`<small>${f.estimateSource==="ai"?"Secure AI estimate":"Local estimate"}</small>`:""}</div><span class="chevron">›</span></button>`).join(""):'<div class="empty">No food logged yet today.</div>';
}
function editFood(id) {
  const index=D.foods.findIndex((f,i)=>(f.id||String(i))===id), f=D.foods[index]; if(!f)return;
  openModal(`<div class="sheet-handle"></div><h2>Edit food</h2><label>Name<input id="editFoodName" value="${escapeHTML(f.name)}"></label><div class="two-col"><label>Calories<input id="editFoodCal" inputmode="numeric" value="${f.cal}"></label><label>Protein (g)<input id="editFoodPro" inputmode="numeric" value="${f.protein}"></label></div><button class="primary wide" onclick="saveFoodEdit(${index})">Save changes</button><button class="danger wide" onclick="deleteFood(${index})">Delete entry</button>`);
}
function saveFoodEdit(i){const f=D.foods[i];f.name=document.getElementById("editFoodName").value.trim()||f.name;f.cal=Math.max(0,number(document.getElementById("editFoodCal").value)||0);f.protein=Math.max(0,number(document.getElementById("editFoodPro").value)||0);save();closeModal();renderFood();renderToday();}
function deleteFood(i){D.foods.splice(i,1);save();closeModal();renderFood();renderToday();toast("Food deleted");}
function addWeight(){const input=document.getElementById("wt"),v=number(input.value);if(!v||v<50||v>600)return toast("Enter a valid weight");D.weights.unshift({id:uid(),value:v,date:new Date().toLocaleDateString(),dateKey:dateKey(),createdAt:isoNow()});save();input.value="";renderProgress();toast("Weight saved");}

function currentProgram() {
  const plan=TRAINING_PROGRAMS[D.trainingPlan.splitId]?.days||PROGRAM;
  return (plan[day]||Object.values(plan)[0]).map((e,i)=>{
    const override=D.programOverrides[day]?.[i];
    const weekly=D.workoutDraft?.day===day?D.workoutDraft.weeklyOverrides?.[i]:D.trainingWeek?.overrides?.[day]?.[i];
    return {base:e[0],name:override?.name||weekly?.name||e[0],sets:e[1],range:e[2],temporary:D.workoutDraft?.swaps?.[i]||null,weeklyReason:override?null:weekly?.reason};
  }).map(e=>({...e,name:e.temporary?.name||e.name}));
}
function trainingDays(){return Object.keys(TRAINING_PROGRAMS[D.trainingPlan.splitId]?.days||PROGRAM);}
function stimulusBeforeWeek(weekKey){
  const end=new Date(`${weekKey}T00:00:00`),start=new Date(end);start.setDate(start.getDate()-8);const points=Object.fromEntries(MUSCLES.map(m=>[m,0]));let workoutCount=0;
  D.workouts.forEach(workout=>{const when=workoutDate(workout);if(!Number.isFinite(when.getTime())||when<start||when>=end)return;workoutCount++;(workout.exercises||[]).forEach(exercise=>{const muscles=EXERCISES[exercise.name]?.muscles||EXERCISES[exercise.baseName]?.muscles||{};(exercise.sets||[]).forEach(set=>{const rir=number(set.rir),effort=rir===null?.75:Math.max(.45,Math.min(1.05,1.05-rir*.1));Object.entries(muscles).forEach(([muscle,factor])=>{if(points[muscle]!==undefined)points[muscle]+=factor*effort;});});});});
  return {points,workoutCount};
}
function weeklyEmphasisPlan(week){
  const history=stimulusBeforeWeek(week.weekKey);if(history.workoutCount<2)return {overrides:{},notes:[],reason:"More completed workouts are needed before Coach changes exercise emphasis."};
  const priorities=(D.schedule.workoutRequests||"").toLowerCase(),replacements={"Upper chest":"Hammer Strength Incline Press","Mid/lower chest":"Hammer Strength Decline Press","Side delts":"Cable Lateral Raise","Rear delts":"Reverse Pec Deck","Lats":"Neutral-Grip Lat Pulldown","Upper/mid back":"Chest-Supported Row","Biceps":"Incline DB Curl","Triceps":"Rope Triceps Pushdown","Quads":"Leg Extension","Hamstrings":"Seated Leg Curl"};
  const pairs=[["Upper chest","Mid/lower chest"],["Lats","Upper/mid back"],["Quads","Hamstrings"],["Biceps","Triceps"]],candidates=[];
  pairs.forEach(([a,b])=>{const av=history.points[a]||0,bv=history.points[b]||0;if(av-bv>=2&&(av+.5)/(bv+.5)>=1.45)candidates.push({from:a,to:b,gap:av-bv});if(bv-av>=2&&(bv+.5)/(av+.5)>=1.45)candidates.push({from:b,to:a,gap:bv-av});});
  const front=history.points["Front delts"]||0,side=history.points["Side delts"]||0,rear=history.points["Rear delts"]||0,target=side<=rear?"Side delts":"Rear delts",targetValue=Math.min(side,rear);if(front-targetValue>=2&&(front+.5)/(targetValue+.5)>=1.45)candidates.push({from:"Front delts",to:target,gap:front-targetValue});
  const aliases={"Upper chest":["upper chest"],"Mid/lower chest":["lower chest","mid chest","chest"],"Front delts":["front delt","shoulder"],"Side delts":["side delt","shoulder"],"Rear delts":["rear delt","shoulder"],Lats:["lat"],"Upper/mid back":["back"],Biceps:["bicep","arm"],Triceps:["tricep","arm"],Quads:["quad","leg"],Hamstrings:["hamstring","leg"]};
  const requested=muscle=>(aliases[muscle]||[]).some(term=>priorities.includes(term)),plan=TRAINING_PROGRAMS[D.trainingPlan.splitId]?.days||PROGRAM,used=new Set(),overrides={},notes=[];
  candidates.sort((a,b)=>b.gap-a.gap).forEach(candidate=>{if(notes.length>=2||requested(candidate.from)||!replacements[candidate.to])return;for(const session of week.sessions){const entries=plan[session.day]||[];const index=entries.findIndex((entry,i)=>{if(used.has(`${session.day}:${i}`)||D.programOverrides[session.day]?.[i])return false;const muscles=EXERCISES[entry[0]]?.muscles||{},primary=Object.entries(muscles).sort((x,y)=>y[1]-x[1])[0]?.[0];return primary===candidate.from;});if(index<0)continue;const replacement=replacements[candidate.to],reason=`Last week favored ${candidate.from.toLowerCase()}, so this slot emphasizes ${candidate.to.toLowerCase()} for balance.`;overrides[session.day]=overrides[session.day]||{};overrides[session.day][index]={name:replacement,from:entries[index][0],reason};used.add(`${session.day}:${index}`);notes.push(reason);break;}});
  return {overrides,notes,reason:notes.length?"Coach shifted up to two exercise slots using last week’s stimulus. Total planned sets were not increased.":"Last week’s muscle balance did not justify changing your exercises."};
}
function trainingWeekKey(){const now=new Date(),dayIndex=(now.getDay()+6)%7,start=new Date(now);start.setDate(now.getDate()-dayIndex);start.setHours(12,0,0,0);return dateKey(start);}
function ensureTrainingWeek(){
  const key=trainingWeekKey(),base=trainingDays(),count=Math.min(6,Math.max(1,D.schedule.workoutsPerWeek||base.length));
  if(D.trainingWeek?.weekKey===key&&D.trainingWeek?.splitId===D.trainingPlan.splitId&&Array.isArray(D.trainingWeek.sessions))return D.trainingWeek;
  const start=Math.max(0,Math.round(number(D.trainingPlan.rotationIndex)||0))%base.length;
  D.trainingWeek={weekKey:key,splitId:D.trainingPlan.splitId,sessions:Array.from({length:count},(_,i)=>({id:uid(),day:base[(start+i)%base.length],status:"planned",workoutId:null}))};
  const emphasis=weeklyEmphasisPlan(D.trainingWeek);D.trainingWeek.overrides=emphasis.overrides;D.trainingWeek.emphasisNotes=emphasis.notes;D.trainingWeek.emphasisReason=emphasis.reason;D.trainingWeek.adaptationVersion=1;
  const weekStart=new Date(`${key}T00:00:00`);D.workouts.filter(workout=>workoutDate(workout)>=weekStart).slice().reverse().forEach(workout=>{const slot=D.trainingWeek.sessions.find(s=>s.status!=="done"&&s.day===workout.day);if(slot){slot.status="done";slot.workoutId=workout.id;slot.completedAt=workout.completedAt||workout.date;}});save();return D.trainingWeek;
}
function weekStatus(){const week=ensureTrainingWeek(),completed=week.sessions.filter(s=>s.status==="done").map(s=>s.day),remaining=week.sessions.filter(s=>s.status!=="done").map(s=>s.day);return {week,completed,remaining,nextSession:remaining[0]||null};}
function renderWeekProgress(){const box=document.getElementById("weekProgress");if(!box)return;const status=weekStatus(),emphasis=status.week.emphasisNotes?.length?`<button class="week-emphasis" onclick="showWeeklyEmphasis()">Coach emphasis · ${status.week.emphasisNotes.length} change${status.week.emphasisNotes.length===1?"":"s"}</button>`:"";box.innerHTML=`<div><span>THIS WEEK</span><b>${status.completed.length}/${status.week.sessions.length} done</b></div><div class="week-sessions">${status.week.sessions.map(s=>`<span class="${s.status==="done"?"done":""}">${escapeHTML(s.day)}${s.status==="done"?" ✓":""}</span>`).join("")}</div>${emphasis}`;}
function showWeeklyEmphasis(){const week=ensureTrainingWeek(),notes=week.emphasisNotes||[];openModal(`<div class="sheet-handle"></div><span class="pill">Weekly emphasis</span><h2>${notes.length?"Coach adjusted this week":"No exercise changes"}</h2><p class="muted">${escapeHTML(week.emphasisReason||"")}</p>${notes.map(note=>`<div class="coach-note">${escapeHTML(note)}</div>`).join("")}<button class="primary wide" onclick="closeModal()">Done</button>`);}
function renderDays(){document.getElementById("days").innerHTML=trainingDays().map(d=>`<button class="${d===day?"on":""}" onclick="selectDay('${d}')">${d}</button>`).join("");}
function selectDay(d){if(D.workoutDraft?.hasData&&D.workoutDraft.day!==d)return toast("Finish or discard your current workout first");day=d;ensureDraft();renderDays();renderWorkout();}
function ensureDraft(){
  if(!D.workoutDraft||D.workoutDraft.day!==day)D.workoutDraft={id:uid(),day,startedAt:isoNow(),sets:{},swaps:{},weeklyOverrides:{...(D.trainingWeek?.overrides?.[day]||{})},hasData:false};
  else if(!D.workoutDraft.hasData&&!D.workoutDraft.weeklyOverrides)D.workoutDraft.weeklyOverrides={...(D.trainingWeek?.overrides?.[day]||{})};
  save();
}
function draftKey(ex,set){return `${ex}:${set}`;}
function lastExercise(name,base) {
  for(const workout of D.workouts){const hit=(workout.exercises||[]).find(e=>e.name===name||e.name===base);if(hit)return {workout,exercise:hit};}
  return null;
}
function progressionText(e,last){
  if(!last)return "First session logged here. Use a controlled starting load.";
  const sets=(last.exercise.sets||[]).filter(s=>number(s.reps)!==null), range=parseRange(e.range);
  if(!sets.length)return "No completed sets last time.";
  const reps=sets.map(s=>number(s.reps)), complete=sets.length>=e.sets;
  const allTop=complete&&sets.slice(0,e.sets).every(s=>number(s.reps)>=range.max);
  const anyTop=reps.some(rep=>rep>=range.max), belowCount=reps.filter(rep=>rep<range.min).length,anyBelow=belowCount>0;
  const avgRir=sets.reduce((a,s)=>a+(number(s.rir)??2),0)/sets.length;
  const weights=[...new Set(sets.map(s=>number(s.weight)).filter(value=>value!==null))];
  const load=weights.length===1?`${weights[0]} lb`:"the same working load";
  const repLine=reps.join("/");
  if(!complete){
    if(anyTop)return `Keep ${load}. ${range.max} is the rep ceiling—complete all ${e.sets} working sets and bring the remaining sets into ${range.min}–${range.max}, rather than exceeding ${range.max}.`;
    return `Keep ${load}. Last time only ${sets.length} of ${e.sets} sets were logged; complete the planned sets in the ${range.min}–${range.max} range before changing weight.`;
  }
  if(weights.length>1)return `Repeat the working loads from ${repLine}. Keep every set within ${range.min}–${range.max}; use one consistent load when practical before judging progression.`;
  if(allTop&&avgRir<=2)return `Increase by the smallest practical amount next time. You reached ${repLine} at about ${avgRir.toFixed(1)} RIR with all planned sets at the top of the range.`;
  if(allTop)return `Keep ${load} once more. Repeat ${repLine} with clean execution and confirm the sets finish around 0–2 RIR before increasing—do not exceed ${range.max} reps.`;
  if(anyBelow&&avgRir<=2&&(reps[0]<range.min||belowCount>=Math.ceil(sets.length/2)))return `Lower ${load} by the smallest practical amount next time. Too many hard sets fell below the ${range.min}-rep minimum (${repLine}), so the load is currently limiting productive reps.`;
  if(anyBelow&&avgRir>2)return `Keep ${load} for now. Some sets missed the ${range.min}-rep minimum, but the average RIR was ${avgRir.toFixed(1)}—push closer to the target effort before reducing weight.`;
  if(anyBelow)return `Keep ${load}. Only the later set${belowCount===1?"":"s"} fell below ${range.min}; bring ${repLine} into range, and consider more rest if the drop repeats before lowering weight.`;
  if(anyTop)return `Keep ${load}. Match the ${range.max}-rep set and add reps to the lower sets without exceeding ${range.max} per set. Last time: ${repLine}.`;
  const total=reps.reduce((sum,rep)=>sum+rep,0);
  return `Keep ${load}. Aim for at least ${total+1} total reps across the sets, staying within ${range.min}–${range.max} per set. Last time: ${repLine}.`;
}
function renderWorkout(){
  ensureTrainingWeek();ensureDraft();const box=document.getElementById("ex"), program=currentProgram();
  renderWeekProgress();
  const splitLabel=document.getElementById("activeSplitLabel");if(splitLabel)splitLabel.textContent=TRAINING_PROGRAMS[D.trainingPlan.splitId].name;
  document.getElementById("discardWorkout").classList.toggle("hidden",!D.workoutDraft.hasData);
  document.getElementById("workoutHint").textContent=D.workoutDraft.hasData?"Workout in progress · saved on this device":"Log a complete set to start its rest timer.";
  box.innerHTML=program.map((e,ei)=>{
    const last=lastExercise(e.name,e.base), lastSets=last?.exercise.sets?.filter(s=>s&&s.reps)||[];
    const lastWeights=[...new Set(lastSets.map(s=>s.weight).filter(v=>v!==null&&v!==undefined&&v!=="").map(String))];
    const lastResult=!lastSets.length?"No completed sets":lastWeights.length===1
      ? `<strong>${escapeHTML(lastWeights[0])} lb</strong><b>${lastSets.map(s=>escapeHTML(s.reps)).join(" / ")} reps</b>`
      : `<b>${lastSets.map(s=>`${escapeHTML(s.weight??"—")} lb × ${escapeHTML(s.reps)}`).join(" · ")}</b>`;
    const lastHtml=last?`<div class="last-time"><span>LAST TIME</span><div class="last-result">${lastResult}</div></div>`:"";
    const sets=Array.from({length:e.sets},(_,si)=>{const v=D.workoutDraft.sets[draftKey(ei,si)]||{};return `<div class="set ${v.logged?"logged":""}" data-row="${ei}-${si}"><button class="set-number" onclick="logSet(${ei},${si})">${v.logged?"✓":si+1}</button><input inputmode="decimal" placeholder="lb" value="${escapeHTML(v.weight||"")}" oninput="updateDraft(${ei},${si},'weight',this.value)"><input inputmode="numeric" placeholder="reps" value="${escapeHTML(v.reps||"")}" oninput="updateDraft(${ei},${si},'reps',this.value)"><input inputmode="decimal" placeholder="RIR" value="${escapeHTML(v.rir||"")}" oninput="updateDraft(${ei},${si},'rir',this.value)"></div>`;}).join("");
    return `<article class="exercise"><div class="exercise-head"><div><h3>${escapeHTML(e.name)}</h3><small>${e.sets} sets · ${e.range} reps</small>${e.weeklyReason?`<small class="weekly-tag">Weekly emphasis</small>`:""}</div><button class="swap" onclick="showSwap(${ei})">↻ Swap</button></div>${lastHtml}<p class="guidance">${escapeHTML(e.weeklyReason||progressionText(e,last))}</p><div class="set set-labels"><span></span><span>Weight</span><span>Reps</span><span>RIR</span></div>${sets}</article>`;
  }).join("");
}
function updateDraft(ex,set,type,value){ensureDraft();const key=draftKey(ex,set);D.workoutDraft.sets[key]={...(D.workoutDraft.sets[key]||{}),[type]:value};D.workoutDraft.hasData=Object.values(D.workoutDraft.sets).some(s=>s.weight||s.reps||s.rir);save();document.getElementById("discardWorkout").classList.toggle("hidden",!D.workoutDraft.hasData);}
function logSet(ex,set){
  const key=draftKey(ex,set),v=D.workoutDraft.sets[key]||{};
  if(v.logged){v.logged=false;save();renderWorkout();return;}
  if(number(v.weight)===null||number(v.reps)===null||number(v.rir)===null)return toast("Enter weight, reps, and RIR first");
  v.logged=true;v.loggedAt=isoNow();D.workoutDraft.sets[key]=v;D.workoutDraft.hasData=true;save();renderWorkout();
  const e=currentProgram()[ex];startRest(e.name,recommendedRest(e.name),{ex,set});
}
function recommendedRest(name){return D.restPreferences[name]||EXERCISES[name]?.rest||75;}
function startRest(name,seconds,source){
  finishActiveRest(false);activeRest={id:uid(),exercise:name,startedAt:Date.now(),endAt:Date.now()+seconds*1000,recommended:seconds,source};localStorage.setItem("gainlog-active-rest",JSON.stringify(activeRest));renderRest();clearInterval(restInterval);restInterval=setInterval(renderRest,500);
}
function renderRest(){
  const el=document.getElementById("restTimer");if(!activeRest){try{activeRest=JSON.parse(localStorage.getItem("gainlog-active-rest"));}catch(_){}}
  if(!activeRest)return el.classList.add("hidden");
  if(!restInterval)restInterval=setInterval(renderRest,500);
  const left=Math.max(0,Math.ceil((activeRest.endAt-Date.now())/1000));el.classList.remove("hidden");document.getElementById("restClock").textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;document.getElementById("restExercise").textContent=activeRest.exercise;
  if(left===0&&!activeRest.notified){activeRest.notified=true;localStorage.setItem("gainlog-active-rest",JSON.stringify(activeRest));if(navigator.vibrate)navigator.vibrate([100,80,100]);try{new Audio("data:audio/wav;base64,UklGRl9vT19teleVQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU").play().catch(()=>{});}catch(_){}if(D.notifications.restComplete)showGainLogNotification("Rest complete",`${activeRest.exercise}: your next set is ready.`,"gainlog-rest");toast("Rest complete");}
}
function addRest(seconds){if(!activeRest)return;activeRest.endAt+=seconds*1000;activeRest.notified=false;localStorage.setItem("gainlog-active-rest",JSON.stringify(activeRest));renderRest();}
function skipRest(){finishActiveRest(true);}
function finishActiveRest(skipped){
  if(!activeRest)return;const actual=Math.max(0,Math.round((Date.now()-activeRest.startedAt)/1000));
  D.restHistory.unshift({id:activeRest.id,exercise:activeRest.exercise,startedAt:new Date(activeRest.startedAt).toISOString(),actualSeconds:actual,recommendedSeconds:activeRest.recommended,skipped:!!skipped,workoutDraftId:D.workoutDraft?.id,exerciseIndex:activeRest.source?.ex,setIndex:activeRest.source?.set});save();
  activeRest=null;localStorage.removeItem("gainlog-active-rest");clearInterval(restInterval);restInterval=null;document.getElementById("restTimer")?.classList.add("hidden");
}

function showSwap(index){
  const e=currentProgram()[index],options=EXERCISES[e.base]?.swaps||EXERCISES[e.name]?.swaps||[];
  pendingSwap={index,reason:"Don't feel like it",choice:null};
  openModal(`<div class="sheet-handle"></div><h2>Swap ${escapeHTML(e.name)}</h2><p class="muted">Why are you swapping?</p><div class="reason-grid">${["Don't feel like it","Equipment taken","Discomfort","Don't like it","Something else"].map((r,i)=>`<button class="${i===0?"on":""}" onclick="chooseSwapReason(this)">${r}</button>`).join("")}</div><p class="muted">Choose a replacement</p><div class="swap-options">${options.map((o,i)=>`<button onclick="chooseSwap(this,${i})"><strong>${o}</strong><span>Same training purpose</span></button>`).join("")}</div><div class="button-stack"><button id="useSwap" class="primary wide" disabled onclick="applySwap(false)">Use today</button><button id="permanentSwap" class="wide" disabled onclick="applySwap(true)">Make permanent</button><button class="ghost wide" onclick="closeModal()">Cancel</button></div>`);
}
function chooseSwapReason(btn){pendingSwap.reason=btn.textContent.trim();btn.parentElement.querySelectorAll("button").forEach(b=>b.classList.remove("on"));btn.classList.add("on");}
function chooseSwap(btn,choiceIndex){const e=currentProgram()[pendingSwap.index],options=EXERCISES[e.base]?.swaps||EXERCISES[e.name]?.swaps||[];pendingSwap.choice=options[choiceIndex];btn.parentElement.querySelectorAll("button").forEach(b=>b.classList.remove("on"));btn.classList.add("on");document.getElementById("useSwap").disabled=false;document.getElementById("permanentSwap").disabled=false;}
function applySwap(permanent){
  const {index,choice,reason}=pendingSwap,from=currentProgram()[index].name;
  D.swaps.unshift({id:uid(),date:isoNow(),day,index,from,to:choice,reason,permanent});
  if(permanent){D.programOverrides[day]=D.programOverrides[day]||{};D.programOverrides[day][index]={name:choice,from};delete D.workoutDraft.swaps[index];}
  else D.workoutDraft.swaps[index]={name:choice,from};
  save();closeModal();renderWorkout();toast(permanent?"Program updated":"Swapped for today");
}

function collectWorkout(){
  const program=currentProgram();
  return program.map((e,ei)=>({name:e.name,baseName:e.base,range:e.range,plannedSets:e.sets,sets:Array.from({length:e.sets},(_,si)=>({set:D.workoutDraft.sets[draftKey(ei,si)]||{},si})).filter(item=>item.set.logged).map(({set,si})=>{const rest=D.restHistory.find(item=>item.workoutDraftId===D.workoutDraft.id&&item.exerciseIndex===ei&&item.setIndex===si);return {weight:number(set.weight),reps:number(set.reps),rir:number(set.rir),loggedAt:set.loggedAt,actualRestSeconds:rest?.actualSeconds??null};})}));
}
function finishWorkout(){
  finishActiveRest(false);const exercises=collectWorkout(),completed=exercises.reduce((n,e)=>n+e.sets.length,0),planned=exercises.reduce((n,e)=>n+e.plannedSets,0);
  if(!completed)return toast("Log at least one complete set first");
  if(completed<planned*.7)return askEarlyEnd(exercises,completed,planned);
  saveWorkout(exercises,null);
}
function askEarlyEnd(exercises,completed,planned){
  window.pendingFinish={exercises,completed,planned};
  openModal(`<div class="sheet-handle"></div><h2>Why did you end early?</h2><p class="muted">${completed} of ${planned} planned sets completed.</p><div class="early-options">${["Too difficult","Ran out of time","Shoulder bothered me","Low energy","Equipment issue","Something else"].map(r=>`<button onclick="finishWithReason('${r}')">${r}</button>`).join("")}</div><button class="ghost wide" onclick="closeModal()">Keep workout open</button>`);
}
function finishWithReason(reason){const p=window.pendingFinish;D.earlyEndReasons.unshift({id:uid(),date:isoNow(),day,reason,completed:p.completed,planned:p.planned});saveWorkout(p.exercises,reason);}
function localWorkoutFeedback(workout){
  const increases=[],reductions=[],effort=[],below=[];
  workout.exercises.forEach(exercise=>{const range=parseRange(exercise.range),sets=exercise.sets||[];if(sets.length<exercise.plannedSets)return;const reps=sets.map(set=>number(set.reps)),avgRir=sets.reduce((sum,set)=>sum+(number(set.rir)??2),0)/sets.length,belowCount=reps.filter(rep=>rep<range.min).length;if(sets.every(set=>number(set.reps)>=range.max)&&avgRir<=2)increases.push(exercise.name);else if(avgRir<=2&&(reps[0]<range.min||belowCount>=Math.ceil(sets.length/2)))reductions.push(exercise.name);else if(avgRir>2)effort.push(exercise.name);else if(belowCount)below.push(exercise.name);});
  const actions=[];
  if(increases.length)actions.push(`${increases.slice(0,2).join(" and ")} reached the top of every planned set at appropriate RIR—raise the load by the smallest practical amount next time.`);
  if(reductions.length)actions.push(`Lower ${reductions.slice(0,2).join(" and ")} by the smallest practical amount next time; too many hard sets missed the minimum rep target.`);
  if(effort.length)actions.push(`Push ${effort.slice(0,2).join(" and ")} closer to the prescribed RIR while staying inside the rep range.`);
  else if(below.length)actions.push(`Keep the load on ${below.slice(0,2).join(" and ")} and bring every set into range; review rest only if the drop repeats.`);
  if(actions.length)return actions.slice(0,2).join(" ");
  return "Solid session. Keep the current loads and add reps within each exercise’s range before increasing weight.";
}
function completeWeeklySession(workout){const status=weekStatus(),matching=status.week.sessions.find(s=>s.status!=="done"&&s.day===workout.day),slot=matching||status.week.sessions.find(s=>s.status!=="done");if(slot){if(!matching)slot.day=workout.day;slot.status="done";slot.workoutId=workout.id;slot.completedAt=workout.completedAt;}const base=trainingDays(),index=base.indexOf(workout.day);if(index>=0)D.trainingPlan.rotationIndex=(index+1)%base.length;return weekStatus();}
function localWeekAdjustment(workout,status){if(!status.nextSession)return `${workout.day} is complete and this week’s planned rotation is finished.`;return `${workout.day} is complete. Next is ${status.nextSession}; ${status.remaining.length} planned session${status.remaining.length===1?" remains":"s remain"} this week.`;}
function workoutFeedbackPayload(workout,status){return {type:"workout_feedback",workout:{day:workout.day,earlyEndReason:workout.earlyReason||"",exercises:workout.exercises.map(exercise=>{const previous=findPreviousExercise(exercise.name,workout.id);return {...exercise,previousSets:previous?.exercise?.sets||[]};})},week:{completed:status.completed,remaining:status.remaining,nextSession:status.nextSession,weeklySchedule:D.schedule.weeklySchedule,homeworkNeeds:D.schedule.homeworkNeeds,emphasisNotes:D.trainingWeek?.emphasisNotes||[]}};}
async function requestWorkoutFeedback(workout,status){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);try{const response=await fetch(COACH_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(workoutFeedbackPayload(workout,status)),signal:controller.signal});if(!response.ok)throw new Error(`Workout feedback returned ${response.status}`);const result=await response.json();if(!result.feedback||!result.weekAdjustment)throw new Error("Workout feedback incomplete");return result;}finally{clearTimeout(timeout);}}
function renderWorkoutSummary(workout){if(pendingWorkoutSummaryId!==workout.id)return;const feedback=workout.coachFeedback||localWorkoutFeedback(workout),weekAdjustment=workout.weekAdjustment||localWeekAdjustment(workout,weekStatus()),source=workout.feedbackSource==="ai"?"Secure AI":workout.feedbackPending?"Local now · Secure AI thinking":"Local";openModal(`<div class="sheet-handle"></div><span class="pill">${escapeHTML(workout.day)} complete</span><h2>Coach review</h2><p>${escapeHTML(feedback)}</p><div class="coach-note">${escapeHTML(weekAdjustment)}</div><small>${source}</small><button class="primary wide" onclick="closeModal()">Done</button>`);}
async function upgradeWorkoutFeedback(workout,status){try{const result=await requestWorkoutFeedback(workout,status),saved=D.workouts.find(w=>w.id===workout.id);if(!saved)return;saved.coachFeedback=result.feedback;saved.weekAdjustment=result.weekAdjustment;saved.feedbackSource="ai";saved.feedbackPending=false;save();if(pendingWorkoutSummaryId===saved.id)renderWorkoutSummary(saved);}catch(_){const saved=D.workouts.find(w=>w.id===workout.id);if(saved){saved.feedbackPending=false;save();if(pendingWorkoutSummaryId===saved.id)renderWorkoutSummary(saved);}}}
function saveWorkout(exercises,earlyReason){
  const workout={id:uid(),draftId:D.workoutDraft.id,day,date:new Date().toLocaleDateString(),completedAt:isoNow(),startedAt:D.workoutDraft.startedAt,exercises,earlyReason,feedbackPending:true};
  ensureTrainingWeek();D.workouts.unshift(workout);const status=completeWeeklySession(workout);workout.coachFeedback=localWorkoutFeedback(workout);workout.weekAdjustment=localWeekAdjustment(workout,status);workout.feedbackSource="local";D.workoutDraft=null;if(status.nextSession)day=status.nextSession;save();ensureDraft();renderDays();renderWorkout();renderProgress();renderToday();pendingWorkoutSummaryId=workout.id;renderWorkoutSummary(workout);toast(`${workout.day} workout saved`);upgradeWorkoutFeedback(workout,status);
}
function discardDraft(){openModal('<div class="sheet-handle"></div><h2>Discard workout?</h2><p class="muted">Only the current unfinished entries will be removed. Saved workout history is untouched.</p><button class="danger wide" onclick="confirmDiscard()">Discard workout</button><button class="ghost wide" onclick="closeModal()">Cancel</button>');}
function confirmDiscard(){finishActiveRest(false);D.workoutDraft=null;save();closeModal();ensureDraft();renderWorkout();toast("Workout discarded");}

function workoutWithinDays(w,days){const d=workoutDate(w);return Number.isFinite(d.getTime())&&(Date.now()-d.getTime())<=days*86400000;}
function muscleCoverage(range=coverageRange){
  const workouts=range==="last"?D.workouts.slice(0,1):D.workouts.filter(w=>workoutWithinDays(w,7));
  const raw=Object.fromEntries(MUSCLES.map(m=>[m,{points:0,sets:0,effort:[],progress:0}]));
  workouts.forEach(w=>(w.exercises||[]).forEach(e=>{
    const map=EXERCISES[e.name]?.muscles||EXERCISES[e.baseName]?.muscles||{};
    (e.sets||[]).forEach(s=>Object.entries(map).forEach(([m,factor])=>{if(!raw[m])return;const rir=number(s.rir);const effort=rir===null?.75:Math.max(.45,Math.min(1.05,1.05-rir*.1));raw[m].points+=factor*effort;raw[m].sets+=factor;raw[m].effort.push(rir);}));
    const previous=findPreviousExercise(e.name,w.id);if(previous&&performanceScore(e)>performanceScore(previous)*1.015)Object.keys(map).forEach(m=>{if(raw[m])raw[m].progress+=1;});
  }));
  return Object.fromEntries(MUSCLES.map(m=>{const x=raw[m],volume=Math.min(100,x.points/6*100),effort=x.effort.length?Math.min(100,Math.max(35,100-(x.effort.reduce((a,b)=>a+(b??2),0)/x.effort.length)*12)):0,progress=x.sets?Math.min(100,50+x.progress*25):0,frequency=x.sets?Math.min(100,range==="week"?55+Math.min(2,workouts.filter(w=>(w.exercises||[]).some(e=>Object.keys(EXERCISES[e.name]?.muscles||EXERCISES[e.baseName]?.muscles||{}).includes(m))).length)*20:80):0;return[m,{score:Math.min(100,Math.round(volume*.55+effort*.2+progress*.1+frequency*.15)),volume,effort,progress,frequency,sets:x.sets}];}));
}
function performanceScore(e){const sets=e.sets||[];return sets.reduce((n,s)=>n+(number(s.weight)||0)*(number(s.reps)||0),0);}
function findPreviousExercise(name,excludeId){for(const w of D.workouts){if(w.id===excludeId)continue;const e=(w.exercises||[]).find(x=>x.name===name||x.baseName===name);if(e)return e;}return null;}
function setCoverageRange(range){coverageRange=range;document.getElementById("coverageLast").classList.toggle("on",range==="last");document.getElementById("coverageWeek").classList.toggle("on",range==="week");renderCoverage();}
function renderCoverage(){
  const scores=muscleCoverage();document.getElementById("coverage").innerHTML=MUSCLES.map(m=>{const s=scores[m].score;return `<button class="muscle-row" onclick="explainMuscle('${m}')"><div><span>${m}</span><strong>${s}/100</strong></div><div class="bar"><i style="width:${s}%"></i></div></button>`;}).join("");
}
function level(v){return v>=75?"Strong":v>=45?"Moderate":v>0?"Building":"No recent data";}
function explainMuscle(m){const x=muscleCoverage()[m];openModal(`<div class="sheet-handle"></div><span class="eyebrow">${m}</span><h2 class="score-title">${x.score}/100</h2><div class="score-grid"><span>Volume <b>${level(x.volume)}</b></span><span>Effort <b>${level(x.effort)}</b></span><span>Progression <b>${level(x.progress)}</b></span><span>Coverage <b>${level(x.frequency)}</b></span></div><p>${x.sets?`You logged about ${x.sets.toFixed(1)} effective direct/secondary sets in this window. The score rewards productive effort and caps excess volume.`:"No recorded stimulus in this window. That does not automatically mean you should add work."}</p><button class="primary wide" onclick="closeModal()">Done</button>`);}

function renderProgress(){
  const weights=document.getElementById("weights"),sorted=[...D.weights].sort((a,b)=>new Date(b.createdAt||b.date)-new Date(a.createdAt||a.date));
  weights.innerHTML=sorted.length?sorted.slice(0,8).map(w=>`<p class="history-line"><strong>${w.value} lb</strong><span class="muted">${escapeHTML(w.date)}</span></p>`).join(""):'<p class="muted">No weigh-ins yet.</p>';
  const recent=sorted.filter(w=>{const d=new Date(w.createdAt||w.date);return Date.now()-d<7*86400000;});document.getElementById("weightTrend").textContent=recent.length>=2?`${(recent[0].value-recent[recent.length-1].value)>=0?"+":""}${(recent[0].value-recent[recent.length-1].value).toFixed(1)} lb`:"Need more data";
  document.getElementById("sessions").textContent=`${D.workouts.length} workout${D.workouts.length===1?"":"s"} logged.`;
  const week=D.workouts.filter(w=>workoutWithinDays(w,7)).length;document.getElementById("sessionsWeek").textContent=`${week} this week`;
  document.getElementById("recentWorkouts").innerHTML=D.workouts.slice(0,4).map(w=>`<div class="workout-history"><span><strong>${escapeHTML(w.day)}</strong><small>${escapeHTML(w.date)}</small></span><b>${(w.exercises||[]).reduce((n,e)=>n+(e.sets||[]).length,0)} sets</b></div>`).join("");
  renderCoverage();
}

function recordsOnDate(key){
  const foods=D.foods.filter(f=>(f.dateKey||dateKey(f.date))===key);
  const workouts=D.workouts.filter(w=>dateKey(w.completedAt||w.date)===key);
  const weights=D.weights.filter(w=>(w.dateKey||dateKey(w.date))===key);
  return {foods,workouts,weights};
}
function renderCalendar(){
  const title=document.getElementById("calendarTitle"),grid=document.getElementById("calendarGrid");if(!title||!grid)return;
  title.textContent=calendarCursor.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth(),firstDay=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push('<span class="calendar-blank"></span>');
  for(let dayNumber=1;dayNumber<=days;dayNumber++){
    const key=dateKey(new Date(year,month,dayNumber)),data=recordsOnDate(key),today=key===dateKey(),selected=key===selectedCalendarDate;
    const dots=`${data.foods.length?'<i class="food-dot"></i>':''}${data.workouts.length?'<i class="workout-dot"></i>':''}${data.weights.length?'<i class="weight-dot"></i>':''}`;
    cells.push(`<button class="calendar-day ${today?"today":""} ${selected?"selected":""}" onclick="selectCalendarDate('${key}')"><b>${dayNumber}</b><span class="calendar-dots">${dots}</span></button>`);
  }
  grid.innerHTML=cells.join("");renderCalendarDetail();
}
function changeCalendarMonth(delta){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+delta,1);selectedCalendarDate=dateKey(calendarCursor);renderCalendar();}
function selectCalendarDate(key){selectedCalendarDate=key;renderCalendar();}
function renderCalendarDetail(){
  const box=document.getElementById("calendarDetail");if(!box)return;
  const data=recordsOnDate(selectedCalendarDate),date=new Date(`${selectedCalendarDate}T12:00:00`),label=date.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const calories=data.foods.reduce((sum,f)=>sum+(Number(f.cal)||0),0),protein=data.foods.reduce((sum,f)=>sum+(Number(f.protein)||0),0);
  const foodList=data.foods.length?data.foods.slice(0,8).map(f=>`<div class="history-line"><span>${escapeHTML(f.name)}</span><b>${f.cal} cal · ${f.protein} g</b></div>`).join(""):"<p class=\"muted compact\">No food logged.</p>";
  const workoutList=data.workouts.length?data.workouts.map(w=>`<div class="calendar-workout"><strong>${escapeHTML(w.day)} workout</strong><span>${(w.exercises||[]).reduce((sum,e)=>sum+(e.sets||[]).length,0)} sets · ${(w.exercises||[]).map(e=>escapeHTML(e.name)).slice(0,3).join(", ")}${(w.exercises||[]).length>3?"…":""}</span></div>`).join(""):"<p class=\"muted compact\">No workout logged.</p>";
  const weightList=data.weights.length?data.weights.map(w=>`<span class="pill">${escapeHTML(w.value)} lb</span>`).join(" "):"<span class=\"muted\">No weigh-in</span>";
  box.innerHTML=`<div class="card-head"><h2>${label}</h2><span class="pill">${calories} cal · ${protein} g</span></div><div class="calendar-detail-section"><h3>Food</h3>${foodList}</div><div class="calendar-detail-section"><h3>Training</h3>${workoutList}</div><div class="calendar-detail-section"><h3>Bodyweight</h3><div>${weightList}</div></div>`;
}

function generateLocalCoachResponse(message,appState=D){
  const q=message.toLowerCase(),t=totals();
  if(/shoulder|pain|hurt|discomfort/.test(q))return "Joint pain is different from muscle fatigue. Stop the painful movement and use a comfortable, stable alternative. If pain persists or affects daily activity, get it assessed rather than training through it.";
  if(/eat|food|protein|calorie|tonight/.test(q))return nutritionMessage();
  if(/science|scientific|evidence|research/.test(q))return `${EVIDENCE_RULES.split} ${EVIDENCE_RULES.exerciseSelection} ${EVIDENCE_RULES.rest}`;
  if(/coverage|muscle/.test(q)){const scores=muscleCoverage("week"),rank=Object.entries(scores).sort((a,b)=>a[1].score-b[1].score),low=rank.filter(x=>x[1].score>0).slice(0,2).map(x=>x[0]);return D.workouts.length?`Your current 7-day coverage is lowest for ${low.join(" and ")||"muscles without recent work"}. A low score alone is not a reason to add sets; finish your normal rotation first.`:"Log a workout first and I’ll estimate muscle coverage from completed sets and RIR.";}
  if(/rest|timer|between sets/.test(q)){const recent=D.restHistory.slice(0,12);if(!recent.length)return "Start with 60 seconds for smaller isolations, 75 seconds for moderate isolations, and 90 seconds for demanding compounds. Adjust based on repeated performance, not one set.";const avg=Math.round(recent.reduce((a,r)=>a+r.actualSeconds,0)/recent.length);return `Your recent average actual rest is about ${avg} seconds. Keep it if reps and RIR stay reasonably stable across sets.`;}
  if(/split|routine|program|schedule|class|homework|study|plan my week|workout time/.test(q)){const s=appState.schedule||SCHEDULE_DEFAULTS,plan=TRAINING_PROGRAMS[appState.trainingPlan?.splitId||"ppl"];if(!s.weeklySchedule)return `Your active split is ${plan.name}. Add your weekly commitments in Settings so Coach can decide whether PPL, Full Body, Upper/Lower, or the five-day hybrid fits better.`;return `Your active split is ${plan.name}. Your saved plan calls for ${s.workoutsPerWeek} workout${s.workoutsPerWeek===1?"":"s"} of about ${s.workoutDurationMinutes} minutes. Use Optimize split to compare frequency, recovery, session length, and your saved workout request before changing it.`;}
  if(/increase|weight|press|progress/.test(q)){const w=D.workouts[0];if(!w)return "Log at least one workout so I can compare reps, load, and RIR.";const candidates=(w.exercises||[]).map(e=>({e,text:progressionText({name:e.name,base:e.baseName,range:e.range,sets:e.plannedSets||e.sets.length},{exercise:e})}));return candidates[0]?.text||"Keep using double progression and avoid changing load from one unusual set.";}
  if(/next workout|focus/.test(q)){const days=trainingDays(),next=days[(days.indexOf(day)+1)%days.length];return `Your next session in the ${TRAINING_PROGRAMS[D.trainingPlan.splitId].name} rotation is ${next}. Focus on clean reps, recording RIR, and beating prior performance without forcing failure on heavy compounds.`;}
  if(/hate|don't like|swap/.test(q))return "Use the Swap button on that exercise and choose “Don't like it.” I’ll preserve the movement’s purpose, and repeated swaps can support a permanent replacement.";
  if(/weak|low energy|tired/.test(q))return "Treat one low-energy session as an off day. Keep technique clean, avoid forced PRs, and look for a trend across sleep, food, bodyweight, and multiple workouts before changing the program.";
  return `I’m the local rules-based Coach. I can help with progression, food targets, rest, muscle coverage, exercise swaps, shoulder safety, and your next workout. ${t.c||t.p?nutritionMessage():"Start by logging a workout or today’s food."}`;
}
function buildCoachContext(){
  const t=totals(),coverage=muscleCoverage("week");
  return {
    nutrition:{calories:t.c,protein:t.p,calorieTarget:TARGETS.calories,proteinTarget:TARGETS.protein},
    recentFoods:D.foods.slice(0,12).map(f=>({name:f.name,calories:f.cal,protein:f.protein,date:f.dateKey||f.date})),
    weights:D.weights.slice(0,16).map(w=>({value:w.value,date:w.dateKey||w.date})),
    workouts:D.workouts.slice(0,6).map(w=>({day:w.day,date:w.completedAt||w.date,earlyEndReason:w.earlyEndReason||w.endReason||"",exercises:(w.exercises||[]).map(e=>({name:e.name,range:e.range,plannedSets:e.plannedSets,sets:(e.sets||[]).map(s=>({weight:s.weight,reps:s.reps,rir:s.rir,actualRestSeconds:s.actualRestSeconds}))}))})),
    muscleCoverage:Object.fromEntries(Object.entries(coverage).map(([muscle,value])=>[muscle,value.score])),
    recentRest:D.restHistory.slice(0,20).map(r=>({exercise:r.exercise,actualSeconds:r.actualSeconds,recommendedSeconds:r.recommendedSeconds})),
    recentSwaps:D.swaps.slice(0,12).map(s=>({from:s.from||s.original,to:s.to||s.replacement,reason:s.reason,permanent:!!s.permanent})),
    recentConversation:D.coachMessages.slice(-8).map(m=>({role:m.role,text:m.text})),
    currentWorkoutDay:day,
    schedule:{weeklySchedule:D.schedule.weeklySchedule,homeworkNeeds:D.schedule.homeworkNeeds,workoutRequests:D.schedule.workoutRequests,workoutsPerWeek:D.schedule.workoutsPerWeek,workoutDurationMinutes:D.schedule.workoutDurationMinutes,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||""},
    trainingPlan:{mode:D.trainingPlan.mode,splitId:D.trainingPlan.splitId,splitName:TRAINING_PROGRAMS[D.trainingPlan.splitId].name,reason:D.trainingPlan.reason},
    trainingWeek:{weekKey:D.trainingWeek?.weekKey||"",emphasisNotes:D.trainingWeek?.emphasisNotes||[],remaining:D.trainingWeek?.sessions?.filter(session=>session.status!=="done").map(session=>session.day)||[]},
    gymProfile:OU_GYM_PROFILE
  };
}
async function requestAiCoach(message){
  if(!COACH_API_URL.startsWith("https://"))throw new Error("Coach backend is not deployed");
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(COACH_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,context:buildCoachContext()}),signal:controller.signal});
    if(!response.ok)throw new Error(`Coach backend returned ${response.status}`);
    const data=await response.json();if(!data.reply||typeof data.reply!=="string")throw new Error("Coach reply was empty");
    return data.reply.trim();
  }finally{clearTimeout(timeout);}
}
function renderCoach(){
  renderCoachStatus();
  const box=document.getElementById("coachMessages");
  const messages=D.coachMessages.length?D.coachMessages:[{role:"coach",text:"Ask me about your next workout, progression, food, rest, swaps, or muscle coverage."}];
  box.innerHTML=messages.slice(-40).map(m=>`<div class="bubble ${m.role==="user"?"user":"coach"}">${escapeHTML(m.text)}${m.role==="coach"?`<small>${m.source==="ai"?"Secure AI":"Local"}</small>`:""}</div>`).join("")+(coachPending?'<div class="bubble coach thinking">Thinking…</div>':"");box.scrollTop=box.scrollHeight;
}
async function askCoach(text){
  text=String(text||"").trim();if(!text||coachPending)return;
  D.coachMessages.push({id:uid(),role:"user",text,date:isoNow()});save();coachPending=true;renderCoach();
  let reply,source="ai";
  try{reply=await requestAiCoach(text);coachConnectionState="connected";localStorage.setItem("gainlog-coach-status","connected");}
  catch(_){reply=generateLocalCoachResponse(text,D);source="local";coachConnectionState="local";localStorage.setItem("gainlog-coach-status","local");toast("Secure Coach unavailable · used local guidance");}
  D.coachMessages.push({id:uid(),role:"coach",text:reply,source,date:isoNow()});coachPending=false;save();renderCoach();
}
function sendCoachMessage(){const input=document.getElementById("coachInput"),text=input.value.trim();if(!text)return;input.value="";askCoach(text);}
function renderCoachStatus(){const el=document.getElementById("coachConnectionStatus");if(!el)return;el.textContent=coachConnectionState==="connected"?"Secure AI connected":coachConnectionState==="local"?"Local fallback":"Secure AI ready";el.classList.toggle("connected",coachConnectionState==="connected");el.classList.toggle("local",coachConnectionState==="local");}

function renderScheduleSettings(){
  const fields={weeklySchedule:D.schedule.weeklySchedule,homeworkNeeds:D.schedule.homeworkNeeds,workoutRequests:D.schedule.workoutRequests,scheduleWorkoutCount:D.schedule.workoutsPerWeek,scheduleWorkoutLength:D.schedule.workoutDurationMinutes};
  Object.entries(fields).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value??"";});
  const mode=document.getElementById("splitMode"),choice=document.getElementById("splitChoice"),pill=document.getElementById("activeSplitPill"),reason=document.getElementById("splitReason");
  if(mode)mode.value=D.trainingPlan.mode;if(choice)choice.value=D.trainingPlan.splitId;if(pill)pill.textContent=TRAINING_PROGRAMS[D.trainingPlan.splitId].name;if(reason)reason.textContent=D.trainingPlan.reason;
}
function saveSchedule(showToast=true){
  const weeklySchedule=document.getElementById("weeklySchedule").value.trim(),homeworkNeeds=document.getElementById("homeworkNeeds").value.trim(),workoutRequests=document.getElementById("workoutRequests").value.trim();
  const workoutsPerWeek=Math.min(6,Math.max(1,Math.round(number(document.getElementById("scheduleWorkoutCount").value)||3)));
  const workoutDurationMinutes=Math.min(150,Math.max(30,Math.round(number(document.getElementById("scheduleWorkoutLength").value)||60)));
  D.schedule={weeklySchedule,homeworkNeeds,workoutRequests,workoutsPerWeek,workoutDurationMinutes,updatedAt:isoNow()};save();renderScheduleSettings();if(showToast)toast("Weekly schedule saved");return weeklySchedule;
}
function planMyWeek(){const hasSchedule=saveSchedule(false);if(!hasSchedule)return toast("Add your class or work schedule first");go("coachScreen");askCoach(`Plan my workout and homework times this week using my saved schedule and active ${TRAINING_PROGRAMS[D.trainingPlan.splitId].name} split. If another supported split would clearly improve recovery or muscle frequency, tell me to use Optimize split. Give specific realistic time windows and protect homework.`);}

function localSplitRecommendation(){
  const count=D.schedule.workoutsPerWeek,text=`${D.schedule.weeklySchedule} ${D.schedule.workoutRequests}`.toLowerCase();
  let splitId=count<=3?"full_body":count===4?"upper_lower":count===5?"hybrid":"ppl";
  if(count===3&&(/fri[^\n]*sat[^\n]*sun|consecutive|back.to.back/.test(text)))splitId="ppl";
  const reason=splitId==="full_body"?"With three or fewer well-spaced sessions, Full Body distributes weekly work across the available days without requiring long single-muscle sessions.":splitId==="upper_lower"?"Four days fits Upper/Lower well because it distributes weekly work into manageable sessions with recovery between repeated muscle exposures.":splitId==="hybrid"?"Five days lets the hybrid distribute weekly volume across shorter sessions while preserving room for recovery and emphasis work.":"PPL fits six sessions—or three back-to-back days—because adjacent sessions train different muscle groups. The split is chosen for schedule and recovery, not because PPL is inherently superior.";
  return {splitId,reason,source:"local"};
}
async function requestAiSplit(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{const response=await fetch(COACH_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"split_recommendation",context:buildCoachContext()}),signal:controller.signal});if(!response.ok)throw new Error(`Split planner returned ${response.status}`);const result=await response.json();if(!TRAINING_PROGRAMS[result.splitId])throw new Error("Unsupported split");return {...result,source:"ai"};}finally{clearTimeout(timeout);}
}
async function optimizeTrainingSplit(){
  if(D.workoutDraft?.hasData)return toast("Finish or discard the current workout before changing splits");
  saveSchedule(false);toast("Coach is comparing training splits…");
  try{pendingSplit=await requestAiSplit();}catch(_){pendingSplit=localSplitRecommendation();}
  const plan=TRAINING_PROGRAMS[pendingSplit.splitId];
  openModal(`<div class="sheet-handle"></div><span class="pill">${pendingSplit.source==="ai"?"Secure AI":"Local fallback"}</span><h2>${escapeHTML(plan.name)}</h2><p>${escapeHTML(pendingSplit.reason)}</p><p class="muted compact">This changes future workout tabs only. History, previous weights, swaps, and stored data stay intact.</p><button class="primary wide" onclick="applySplitRecommendation()">Use this split</button><button class="ghost wide" onclick="closeModal()">Keep ${escapeHTML(TRAINING_PROGRAMS[D.trainingPlan.splitId].name)}</button>`);
}
function applyTrainingSplit(splitId,reason,mode=D.trainingPlan.mode){
  if(!TRAINING_PROGRAMS[splitId]||D.workoutDraft?.hasData)return false;
  D.trainingPlan={mode,splitId,reason,rotationIndex:0,updatedAt:isoNow()};D.trainingWeek=null;day=Object.keys(TRAINING_PROGRAMS[splitId].days)[0];D.workoutDraft=null;save();renderDays();renderWorkout();renderScheduleSettings();return true;
}
function applySplitRecommendation(){if(!pendingSplit)return;const plan=TRAINING_PROGRAMS[pendingSplit.splitId];if(applyTrainingSplit(pendingSplit.splitId,pendingSplit.reason,"coach")){closeModal();toast(`${plan.name} is now active`);}}
function setSplitMode(mode){D.trainingPlan.mode=mode==="manual"?"manual":"coach";D.trainingPlan.updatedAt=isoNow();save();renderScheduleSettings();}
function selectTrainingSplit(splitId){if(D.workoutDraft?.hasData){renderScheduleSettings();return toast("Finish or discard the current workout first");}const plan=TRAINING_PROGRAMS[splitId];if(!plan)return;if(applyTrainingSplit(splitId,`You manually selected ${plan.name}.`,"manual"))toast(`${plan.name} is now active`);}

function openModal(html){document.getElementById("modalSheet").innerHTML=html;document.getElementById("modal").classList.remove("hidden");document.body.classList.add("modal-open");}
function closeModal(){document.getElementById("modal").classList.add("hidden");document.body.classList.remove("modal-open");pendingSwap=null;pendingSplit=null;pendingWorkoutSummaryId=null;}
function modalBackdrop(e){if(e.target.id==="modal")closeModal();}
function backup(){const blob=new Blob([JSON.stringify(D,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`gainlog-backup-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function restoreBackup(event){
  const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||!Array.isArray(parsed.foods)||!Array.isArray(parsed.weights)||!Array.isArray(parsed.workouts))throw new Error();window.pendingRestore=parsed;openModal('<div class="sheet-handle"></div><h2>Restore backup?</h2><p class="muted">This replaces current device data with the selected backup. Export a backup first if needed.</p><button class="danger wide" onclick="confirmRestore()">Restore backup</button><button class="ghost wide" onclick="closeModal()">Cancel</button>');}catch(_){toast("That file is not a valid GainLog backup");}};reader.readAsText(file);event.target.value="";
}
function confirmRestore(){localStorage.setItem("gainlog",JSON.stringify(window.pendingRestore));D=loadData();save();day=D.workoutDraft?.day||Object.keys(TRAINING_PROGRAMS[D.trainingPlan.splitId].days)[0];closeModal();renderAll();toast("Backup restored");}

function notificationsSupported(){return "Notification" in window&&"serviceWorker" in navigator;}
function renderNotificationSettings(){
  const supported=notificationsSupported(),permission=supported?Notification.permission:"unsupported";
  const status=document.getElementById("notificationStatus"),help=document.getElementById("notificationHelp"),button=document.getElementById("enableNotifications");
  status.textContent=permission==="granted"?"Enabled":permission==="denied"?"Blocked":permission==="unsupported"?"Unavailable":"Not enabled";
  status.classList.toggle("warning",permission==="denied"||permission==="unsupported");
  button.classList.toggle("hidden",(permission==="granted"&&D.notifications.enabled)||permission==="unsupported");
  button.textContent=permission==="denied"?"Open iPhone Settings to allow notifications":permission==="granted"?"Turn notifications on":"Enable notifications";
  help.textContent=permission==="unsupported"?"Open GainLog from your iPhone Home Screen to enable notifications.":permission==="denied"?"Notifications are blocked. Allow GainLog in iPhone Settings > Notifications.":"Alerts stay on this device and never expose your workout data.";
  const values={notifyRest:D.notifications.restComplete,notifyWorkout:D.notifications.workout,notifyNutrition:D.notifications.nutrition,notifyWeight:D.notifications.bodyweight,workoutTime:D.notifications.workoutTime,nutritionTime:D.notifications.nutritionTime,weightTime:D.notifications.bodyweightTime};
  Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(!el)return;if(el.type==="checkbox")el.checked=!!value;else el.value=value;});
}
async function enableNotifications(){
  if(!notificationsSupported())return toast("Open the installed Home Screen app to enable alerts");
  if(Notification.permission==="denied"){toast("Allow GainLog in iPhone Settings > Notifications");return;}
  const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
  D.notifications.enabled=permission==="granted";save();renderNotificationSettings();
  if(permission==="granted"){await showGainLogNotification("GainLog notifications are on","Rest and training reminders are ready.","gainlog-enabled");toast("Notifications enabled");}
  else toast("Notifications were not enabled");
}
function updateNotificationSetting(key,value){D.notifications[key]=value;if(value===true&&notificationsSupported()&&Notification.permission==="granted")D.notifications.enabled=true;save();renderNotificationSettings();checkScheduledNotifications();}
async function showGainLogNotification(title,body,tag){
  if(!notificationsSupported()||!D.notifications.enabled||Notification.permission!=="granted")return false;
  try{const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,{body,tag,data:{url:"./"},renotify:true});return true;}catch(_){return false;}
}
function reminderSent(type,today){return D.notificationHistory.some(n=>n.type===type&&n.dateKey===today);}
function markReminder(type,today){D.notificationHistory.unshift({id:uid(),type,dateKey:today,sentAt:isoNow()});D.notificationHistory=D.notificationHistory.slice(0,90);save();}
function timeReached(now,time){const [h,m]=String(time||"00:00").split(":").map(Number);return now.getHours()*60+now.getMinutes()>=h*60+m;}
async function sendReminderOnce(type,title,body){
  const today=dateKey();if(reminderSent(type,today))return;
  if(await showGainLogNotification(title,body,`gainlog-${type}-${today}`))markReminder(type,today);
}
function checkScheduledNotifications(){
  if(!notificationsSupported()||!D.notifications.enabled||Notification.permission!=="granted")return;
  const now=new Date(),weekday=now.getDay();
  if(D.notifications.workout&&[5,6,0].includes(weekday)&&timeReached(now,D.notifications.workoutTime))sendReminderOnce("workout","Workout day","Open GainLog and start today’s planned session.");
  if(D.notifications.nutrition&&timeReached(now,D.notifications.nutritionTime)){const t=totals(),cal=Math.max(0,TARGETS.calories-t.c),pro=Math.max(0,TARGETS.protein-t.p);if(cal>250||pro>15)sendReminderOnce("nutrition","Nutrition check",`About ${cal} calories and ${pro} g protein remain today.`);}
  if(D.notifications.bodyweight&&[1,3,5].includes(weekday)&&timeReached(now,D.notifications.bodyweightTime)){const logged=D.weights.some(w=>(w.dateKey||dateKey(w.date))===dateKey());if(!logged)sendReminderOnce("bodyweight","Morning weigh-in","Log a quick morning weight so GainLog can track the weekly trend.");}
}

function renderAll(){renderDays();renderWorkout();renderFood();renderToday();renderProgress();renderCalendar();renderCoach();renderRest();renderNotificationSettings();renderScheduleSettings();}
renderAll();go("today");
setInterval(checkScheduledNotifications,60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkScheduledNotifications();});
window.addEventListener("focus",checkScheduledNotifications);

if("serviceWorker"in navigator){
  window.addEventListener("load",async()=>{
    const reg=await navigator.serviceWorker.register("./service-worker.js");
    if(reg.waiting)showUpdate(reg.waiting);
    reg.addEventListener("updatefound",()=>{const worker=reg.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(worker);});});
    navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
    checkScheduledNotifications();
  });
}
function showUpdate(worker){waitingWorker=worker;document.getElementById("updateButton").classList.remove("hidden");toast("A GainLog update is ready");}
function applyUpdate(){waitingWorker?.postMessage({type:"SKIP_WAITING"});}
