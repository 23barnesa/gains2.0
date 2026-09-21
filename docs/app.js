const APP_VERSION = 3;
const TARGETS = { calories: 2750, protein: 155 };
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
const MUSCLES = ["Upper chest","Mid/lower chest","Front delts","Side delts","Rear delts","Lats","Upper/mid back","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves"];
const DEFAULTS = { version:APP_VERSION, foods:[], weights:[], workouts:[], swaps:[], preferences:{}, coachMessages:[], earlyEndReasons:[], programOverrides:{}, restHistory:[], restPreferences:{}, workoutDraft:null };

function loadData() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("gainlog")) || {}; } catch (_) {}
  const merged = {...DEFAULTS, ...stored};
  ["foods","weights","workouts","swaps","coachMessages","earlyEndReasons","restHistory"].forEach(k => { if (!Array.isArray(merged[k])) merged[k] = []; });
  ["preferences","programOverrides","restPreferences"].forEach(k => { if (!merged[k] || typeof merged[k] !== "object" || Array.isArray(merged[k])) merged[k] = {}; });
  merged.version = APP_VERSION;
  return merged;
}
let D = loadData();
let day = D.workoutDraft?.day || "PUSH";
let coverageRange = "last";
let activeRest = null;
let restInterval = null;
let pendingSwap = null;
let waitingWorker = null;

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
function addFood() {
  const input=document.getElementById("foodtxt"), text=input.value.trim(); if(!text)return;
  const e=estimateFood(text); D.foods.unshift({id:uid(),name:text,cal:e.cal,protein:e.protein,date:new Date().toDateString(),dateKey:dateKey(),createdAt:isoNow()});
  save(); input.value=""; renderFood(); renderToday(); toast("Food added");
}
function renderFood() {
  const box=document.getElementById("foods"), today=D.foods.filter(f=>(f.dateKey||dateKey(f.date))===dateKey());
  box.innerHTML=today.length?today.map(f=>`<button class="card food" onclick="editFood('${f.id||D.foods.indexOf(f)}')"><div><strong>${escapeHTML(f.name)}</strong><div class="muted">${f.cal} cal · ${f.protein} g protein</div></div><span class="chevron">›</span></button>`).join(""):'<div class="empty">No food logged yet today.</div>';
}
function editFood(id) {
  const index=D.foods.findIndex((f,i)=>(f.id||String(i))===id), f=D.foods[index]; if(!f)return;
  openModal(`<div class="sheet-handle"></div><h2>Edit food</h2><label>Name<input id="editFoodName" value="${escapeHTML(f.name)}"></label><div class="two-col"><label>Calories<input id="editFoodCal" inputmode="numeric" value="${f.cal}"></label><label>Protein (g)<input id="editFoodPro" inputmode="numeric" value="${f.protein}"></label></div><button class="primary wide" onclick="saveFoodEdit(${index})">Save changes</button><button class="danger wide" onclick="deleteFood(${index})">Delete entry</button>`);
}
function saveFoodEdit(i){const f=D.foods[i];f.name=document.getElementById("editFoodName").value.trim()||f.name;f.cal=Math.max(0,number(document.getElementById("editFoodCal").value)||0);f.protein=Math.max(0,number(document.getElementById("editFoodPro").value)||0);save();closeModal();renderFood();renderToday();}
function deleteFood(i){D.foods.splice(i,1);save();closeModal();renderFood();renderToday();toast("Food deleted");}
function addWeight(){const input=document.getElementById("wt"),v=number(input.value);if(!v||v<50||v>600)return toast("Enter a valid weight");D.weights.unshift({id:uid(),value:v,date:new Date().toLocaleDateString(),dateKey:dateKey(),createdAt:isoNow()});save();input.value="";renderProgress();toast("Weight saved");}

function currentProgram() {
  return PROGRAM[day].map((e,i)=>{
    const override=D.programOverrides[day]?.[i];
    return {base:e[0],name:override?.name||e[0],sets:e[1],range:e[2],temporary:D.workoutDraft?.swaps?.[i]||null};
  }).map(e=>({...e,name:e.temporary?.name||e.name}));
}
function renderDays(){document.getElementById("days").innerHTML=["PUSH","PULL","LEGS"].map(d=>`<button class="${d===day?"on":""}" onclick="selectDay('${d}')">${d}</button>`).join("");}
function selectDay(d){if(D.workoutDraft?.hasData&&D.workoutDraft.day!==d)return toast("Finish or discard your current workout first");day=d;ensureDraft();renderDays();renderWorkout();}
function ensureDraft(){
  if(!D.workoutDraft||D.workoutDraft.day!==day)D.workoutDraft={id:uid(),day,startedAt:isoNow(),sets:{},swaps:{},hasData:false};
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
  const allTop=sets.length>=e.sets&&sets.every(s=>number(s.reps)>=range.max);
  const avgRir=sets.reduce((a,s)=>a+(number(s.rir)??2),0)/sets.length;
  const weight=sets[0]?.weight;
  if(allTop&&avgRir<=2)return `Increase weight next session. You reached ${sets.map(s=>s.reps).join("/")} around ${avgRir.toFixed(1)} RIR.`;
  if(allTop&&avgRir>2)return "Keep the load. You reached the rep target with high RIR, so push the sets harder first.";
  return `Keep ${weight?weight+" lb":"the load"}. Try to beat ${sets.map(s=>s.reps||"–").join("/")}.`;
}
function renderWorkout(){
  ensureDraft(); const box=document.getElementById("ex"), program=currentProgram();
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
    return `<article class="exercise"><div class="exercise-head"><div><h3>${escapeHTML(e.name)}</h3><small>${e.sets} sets · ${e.range} reps</small></div><button class="swap" onclick="showSwap(${ei})">↻ Swap</button></div>${lastHtml}<p class="guidance">${escapeHTML(progressionText(e,last))}</p><div class="set set-labels"><span></span><span>Weight</span><span>Reps</span><span>RIR</span></div>${sets}</article>`;
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
  if(left===0&&!activeRest.notified){activeRest.notified=true;localStorage.setItem("gainlog-active-rest",JSON.stringify(activeRest));if(navigator.vibrate)navigator.vibrate([100,80,100]);try{new Audio("data:audio/wav;base64,UklGRl9vT19teleVQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU").play();}catch(_){}toast("Rest complete");}
}
function addRest(seconds){if(!activeRest)return;activeRest.endAt+=seconds*1000;activeRest.notified=false;localStorage.setItem("gainlog-active-rest",JSON.stringify(activeRest));renderRest();}
function skipRest(){finishActiveRest(true);}
function finishActiveRest(skipped){
  if(!activeRest)return;const actual=Math.max(0,Math.round((Date.now()-activeRest.startedAt)/1000));
  D.restHistory.unshift({id:activeRest.id,exercise:activeRest.exercise,startedAt:new Date(activeRest.startedAt).toISOString(),actualSeconds:actual,recommendedSeconds:activeRest.recommended,skipped:!!skipped,workoutDraftId:D.workoutDraft?.id});save();
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
  return program.map((e,ei)=>({name:e.name,baseName:e.base,range:e.range,plannedSets:e.sets,sets:Array.from({length:e.sets},(_,si)=>D.workoutDraft.sets[draftKey(ei,si)]||{}).filter(s=>s.logged).map(s=>({weight:number(s.weight),reps:number(s.reps),rir:number(s.rir),loggedAt:s.loggedAt}))}));
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
function saveWorkout(exercises,earlyReason){
  D.workouts.unshift({id:uid(),draftId:D.workoutDraft.id,day,date:new Date().toLocaleDateString(),completedAt:isoNow(),startedAt:D.workoutDraft.startedAt,exercises,earlyReason});
  D.workoutDraft=null;save();closeModal();toast(`${day} workout saved`);ensureDraft();renderWorkout();renderProgress();renderToday();
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

function generateLocalCoachResponse(message,appState=D){
  const q=message.toLowerCase(),t=totals();
  if(/shoulder|pain|hurt|discomfort/.test(q))return "Joint pain is different from muscle fatigue. Stop the painful movement and use a comfortable, stable alternative. If pain persists or affects daily activity, get it assessed rather than training through it.";
  if(/eat|food|protein|calorie|tonight/.test(q))return nutritionMessage();
  if(/coverage|muscle/.test(q)){const scores=muscleCoverage("week"),rank=Object.entries(scores).sort((a,b)=>a[1].score-b[1].score),low=rank.filter(x=>x[1].score>0).slice(0,2).map(x=>x[0]);return D.workouts.length?`Your current 7-day coverage is lowest for ${low.join(" and ")||"muscles without recent work"}. A low score alone is not a reason to add sets; finish your normal rotation first.`:"Log a workout first and I’ll estimate muscle coverage from completed sets and RIR.";}
  if(/rest|timer|between sets/.test(q)){const recent=D.restHistory.slice(0,12);if(!recent.length)return "Start with 60 seconds for smaller isolations, 75 seconds for moderate isolations, and 90 seconds for demanding compounds. Adjust based on repeated performance, not one set.";const avg=Math.round(recent.reduce((a,r)=>a+r.actualSeconds,0)/recent.length);return `Your recent average actual rest is about ${avg} seconds. Keep it if reps and RIR stay reasonably stable across sets.`;}
  if(/increase|weight|press|progress/.test(q)){const w=D.workouts[0];if(!w)return "Log at least one workout so I can compare reps, load, and RIR.";const candidates=(w.exercises||[]).map(e=>({e,text:progressionText({name:e.name,base:e.baseName,range:e.range,sets:e.plannedSets||e.sets.length},{exercise:e})}));return candidates[0]?.text||"Keep using double progression and avoid changing load from one unusual set.";}
  if(/next workout|focus/.test(q)){const next=day==="PUSH"?"PULL":day==="PULL"?"LEGS":"PUSH";return `Your next session in the rotation is ${next}. Focus on clean reps, recording RIR, and beating prior performance without forcing failure on heavy compounds.`;}
  if(/hate|don't like|swap/.test(q))return "Use the Swap button on that exercise and choose “Don't like it.” I’ll preserve the movement’s purpose, and repeated swaps can support a permanent replacement.";
  if(/weak|low energy|tired/.test(q))return "Treat one low-energy session as an off day. Keep technique clean, avoid forced PRs, and look for a trend across sleep, food, bodyweight, and multiple workouts before changing the program.";
  return `I’m the local rules-based Coach. I can help with progression, food targets, rest, muscle coverage, exercise swaps, shoulder safety, and your next workout. ${t.c||t.p?nutritionMessage():"Start by logging a workout or today’s food."}`;
}
function renderCoach(){
  const box=document.getElementById("coachMessages");
  const messages=D.coachMessages.length?D.coachMessages:[{role:"coach",text:"Ask me about your next workout, progression, food, rest, swaps, or muscle coverage."}];
  box.innerHTML=messages.slice(-40).map(m=>`<div class="bubble ${m.role==="user"?"user":"coach"}">${escapeHTML(m.text)}</div>`).join("");box.scrollTop=box.scrollHeight;
}
function askCoach(text){D.coachMessages.push({id:uid(),role:"user",text,date:isoNow()});D.coachMessages.push({id:uid(),role:"coach",text:generateLocalCoachResponse(text,D),date:isoNow()});save();renderCoach();}
function sendCoachMessage(){const input=document.getElementById("coachInput"),text=input.value.trim();if(!text)return;input.value="";askCoach(text);}

function openModal(html){document.getElementById("modalSheet").innerHTML=html;document.getElementById("modal").classList.remove("hidden");document.body.classList.add("modal-open");}
function closeModal(){document.getElementById("modal").classList.add("hidden");document.body.classList.remove("modal-open");pendingSwap=null;}
function modalBackdrop(e){if(e.target.id==="modal")closeModal();}
function backup(){const blob=new Blob([JSON.stringify(D,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`gainlog-backup-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function restoreBackup(event){
  const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||!Array.isArray(parsed.foods)||!Array.isArray(parsed.weights)||!Array.isArray(parsed.workouts))throw new Error();window.pendingRestore=parsed;openModal('<div class="sheet-handle"></div><h2>Restore backup?</h2><p class="muted">This replaces current device data with the selected backup. Export a backup first if needed.</p><button class="danger wide" onclick="confirmRestore()">Restore backup</button><button class="ghost wide" onclick="closeModal()">Cancel</button>');}catch(_){toast("That file is not a valid GainLog backup");}};reader.readAsText(file);event.target.value="";
}
function confirmRestore(){localStorage.setItem("gainlog",JSON.stringify(window.pendingRestore));D=loadData();save();day=D.workoutDraft?.day||"PUSH";closeModal();renderAll();toast("Backup restored");}

function renderAll(){renderDays();renderWorkout();renderFood();renderToday();renderProgress();renderCoach();renderRest();}
renderAll();go("today");

if("serviceWorker"in navigator){
  window.addEventListener("load",async()=>{
    const reg=await navigator.serviceWorker.register("./service-worker.js");
    if(reg.waiting)showUpdate(reg.waiting);
    reg.addEventListener("updatefound",()=>{const worker=reg.installing;worker?.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(worker);});});
    navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
  });
}
function showUpdate(worker){waitingWorker=worker;document.getElementById("updateButton").classList.remove("hidden");toast("A GainLog update is ready");}
function applyUpdate(){waitingWorker?.postMessage({type:"SKIP_WAITING"});}
