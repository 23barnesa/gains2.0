const DEFAULT_ORIGIN = "https://23barnesa.github.io";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;
const MAX_BODY_BYTES = 32_000;
const rateLimits = new Map();
const FOOD_SCHEMA = {
  type: "object",
  properties: {
    calories: { type: "number" },
    protein: { type: "number" },
    note: { type: "string" }
  },
  required: ["calories", "protein", "note"],
  additionalProperties: false
};
const SPLIT_SCHEMA = {
  type: "object",
  properties: {
    splitId: { type: "string", enum: ["ppl", "full_body", "upper_lower", "hybrid"] },
    reason: { type: "string" }
  },
  required: ["splitId", "reason"],
  additionalProperties: false
};
const WORKOUT_FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    feedback: { type: "string" },
    weekAdjustment: { type: "string" }
  },
  required: ["feedback", "weekAdjustment"],
  additionalProperties: false
};

function openAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.open_ai_key;
}

const COACH_INSTRUCTIONS = `You are GainLog's concise hypertrophy coach. Use only the structured context provided and clearly say when there is not enough history.

Priorities:
- Give short, actionable guidance with minimal statistics.
- Use double progression. Recommend a load increase only after the full rep target is reached with clean execution and appropriate RIR across the planned sets.
- Treat the top of every prescribed rep range as a ceiling. Never tell the user to beat or exceed that number. If one set reaches the ceiling but later sets do not, keep the load and improve the lower sets. If fewer than the planned sets were completed, complete the planned sets in range before changing load.
- Recommend lowering the load by the smallest practical amount when the first set or most completed working sets fall below the minimum rep target at approximately 0-2 RIR. Do not lower weight from one odd later set, high-RIR under-effort, short rest alone, equipment problems, time limits, or pain-related swaps.
- Do not make major recommendations from one unusual set. Look for trends.
- Compounds are generally 1-2 RIR. Isolations are generally 0-2 RIR; a final isolation set may reach technical failure.
- Never encourage absolute failure on heavy presses, hack squat, or leg press.
- Treat shoulder joint pain differently from muscular fatigue. Never advise training through joint pain; suggest stopping or using a comfortable stable alternative and professional assessment when persistent.
- Respect scoliosis and preferences: no barbell back squats, RDLs, split squats as a primary replacement, or unnecessary spinal loading. Prefer stable machines and Hammer Strength movements.
- Rest targets begin around 60 seconds for small isolations, 75 seconds for moderate isolations, and 90 seconds for demanding compounds. Change rest by about 15 seconds only when repeated performance, load, RIR, and actual rest support it.
- Do not reward short rest or penalize longer rest. Do not add volume just because muscle coverage is below 100.
- Nutrition targets are 2750 calories and 155 g protein. Do not encourage more food when targets are already met.
- Bodyweight advice must use multi-week trends; never automatically change the calorie target.
- When a weekly schedule is provided, protect fixed class/work commitments and meaningful homework blocks first. Suggest specific realistic workout windows, preserve recovery, and avoid crowding every free hour. Ask for missing timing details instead of inventing them.
- Do not assume Push/Pull/Legs is always optimal. Choose training structure from the user's realistic weekly frequency, session length, spacing between available days, recovery, completion history, muscle coverage, and explicit workout requests. Prefer productive per-muscle frequency and recoverable sessions over a fashionable split name.
- Split routines and full-body routines produce similar hypertrophy when weekly volume is equated. Never claim a split name is inherently more anabolic. Use frequency as a way to distribute recoverable weekly volume and maintain set quality, not as an independent score to maximize.
- A broad range of loads can support hypertrophy when sets have appropriate effort. Respect the programmed rep ranges and double progression; do not claim a narrow rep range is uniquely optimal.
- Training to momentary failure is not required for hypertrophy. Preserve the stated RIR rules, clean technique, and safety margins.
- Rest long enough to preserve productive reps, technique, and intended RIR. The 60/75/90-second defaults are starting points, not caps; increase rest when repeated comparable sets show a meaningful performance drop that is not better explained by load, effort, pain, or recovery.
- Choose exercises by the intended muscle action, a comfortable controllable range of motion, stability, progression potential, available equipment, and the user's feedback. Do not call one exercise universally best, force painful ranges, or swap movements solely because another option is fashionable.
- Use productive recoverable weekly volume with diminishing returns. Make conservative volume or emphasis changes only from repeated history; never chase a perfect coverage score.
- Program changes are Level 3 changes: recommend them only when schedule or repeated history supports them. Preserve the user's exercises and safety preferences wherever possible.
- Exercise emphasis changes are Level 2 changes: use the saved weekly emphasis, change at most one or two movement slots, do not automatically add volume, and recommend only equipment listed in the gym profile or exercises the user has already logged.
- Keep recommendations within fitness coaching, not medical diagnosis.`;

function allowedOrigins() {
  return new Set((process.env.ALLOWED_ORIGINS || DEFAULT_ORIGIN).split(",").map(value => value.trim()).filter(Boolean));
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function requestOriginAllowed(req) {
  const origin = req.headers.origin;
  return process.env.NODE_ENV !== "production" && !origin ? true : Boolean(origin && allowedOrigins().has(origin));
}

function requestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function withinRateLimit(req) {
  const now = Date.now();
  const ip = requestIp(req);
  const current = rateLimits.get(ip);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    rateLimits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS;
}

function cleanText(value, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNumber(value, min = 0, max = 100_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : null;
}

function hasBackToBackThreeDaySchedule(schedule = {}) {
  const text = `${schedule.weeklySchedule || ""} ${schedule.workoutRequests || ""}`.toLowerCase();
  return /back[ -]?to[ -]?back|consecutive/.test(text)
    || /fri(?:day)?[^\n]{0,80}sat(?:urday)?[^\n]{0,80}sun(?:day)?/.test(text)
    || /sat(?:urday)?[^\n]{0,80}sun(?:day)?[^\n]{0,80}mon(?:day)?/.test(text);
}

function cleanSet(set = {}) {
  return {
    weight: cleanNumber(set.weight, 0, 2_000),
    reps: cleanNumber(set.reps, 0, 100),
    rir: cleanNumber(set.rir, 0, 10),
    actualRestSeconds: cleanNumber(set.actualRestSeconds, 0, 1_800)
  };
}

export function sanitizeContext(context = {}) {
  const nutrition = context.nutrition || {};
  return {
    nutrition: {
      calories: cleanNumber(nutrition.calories, 0, 20_000),
      protein: cleanNumber(nutrition.protein, 0, 1_000),
      calorieTarget: cleanNumber(nutrition.calorieTarget, 0, 20_000),
      proteinTarget: cleanNumber(nutrition.proteinTarget, 0, 1_000)
    },
    recentFoods: (Array.isArray(context.recentFoods) ? context.recentFoods : []).slice(0, 12).map(food => ({
      name: cleanText(food.name, 120),
      calories: cleanNumber(food.calories, 0, 10_000),
      protein: cleanNumber(food.protein, 0, 500),
      date: cleanText(food.date, 24)
    })),
    weights: (Array.isArray(context.weights) ? context.weights : []).slice(0, 16).map(weight => ({
      value: cleanNumber(weight.value, 50, 600),
      date: cleanText(weight.date, 24)
    })),
    workouts: (Array.isArray(context.workouts) ? context.workouts : []).slice(0, 6).map(workout => ({
      day: cleanText(workout.day, 20),
      date: cleanText(workout.date, 32),
      earlyEndReason: cleanText(workout.earlyEndReason, 80),
      exercises: (Array.isArray(workout.exercises) ? workout.exercises : []).slice(0, 10).map(exercise => ({
        name: cleanText(exercise.name, 100),
        range: cleanText(exercise.range, 20),
        plannedSets: cleanNumber(exercise.plannedSets, 0, 10),
        sets: (Array.isArray(exercise.sets) ? exercise.sets : []).slice(0, 8).map(cleanSet)
      }))
    })),
    muscleCoverage: Object.fromEntries(Object.entries(context.muscleCoverage && typeof context.muscleCoverage === "object" ? context.muscleCoverage : {}).slice(0, 20).map(([muscle, score]) => [cleanText(muscle, 40), cleanNumber(score, 0, 100)])),
    recentRest: (Array.isArray(context.recentRest) ? context.recentRest : []).slice(0, 20).map(rest => ({
      exercise: cleanText(rest.exercise, 100),
      actualSeconds: cleanNumber(rest.actualSeconds, 0, 1_800),
      recommendedSeconds: cleanNumber(rest.recommendedSeconds, 0, 1_800)
    })),
    recentSwaps: (Array.isArray(context.recentSwaps) ? context.recentSwaps : []).slice(0, 12).map(swap => ({
      from: cleanText(swap.from, 100),
      to: cleanText(swap.to, 100),
      reason: cleanText(swap.reason, 80),
      permanent: Boolean(swap.permanent)
    })),
    recentConversation: (Array.isArray(context.recentConversation) ? context.recentConversation : []).slice(-8).map(message => ({
      role: message.role === "user" ? "user" : "coach",
      text: cleanText(message.text, 600)
    })),
    currentWorkoutDay: cleanText(context.currentWorkoutDay, 20),
    schedule: {
      weeklySchedule: cleanText(context.schedule?.weeklySchedule, 2_000),
      homeworkNeeds: cleanText(context.schedule?.homeworkNeeds, 1_000),
      workoutRequests: cleanText(context.schedule?.workoutRequests, 1_000),
      workoutsPerWeek: cleanNumber(context.schedule?.workoutsPerWeek, 1, 6),
      workoutDurationMinutes: cleanNumber(context.schedule?.workoutDurationMinutes, 30, 150),
      timezone: cleanText(context.schedule?.timezone, 80)
    },
    trainingPlan: {
      mode: cleanText(context.trainingPlan?.mode, 20),
      splitId: cleanText(context.trainingPlan?.splitId, 30),
      splitName: cleanText(context.trainingPlan?.splitName, 80),
      reason: cleanText(context.trainingPlan?.reason, 300)
    },
    trainingWeek: {
      weekKey: cleanText(context.trainingWeek?.weekKey, 20),
      emphasisNotes: (Array.isArray(context.trainingWeek?.emphasisNotes) ? context.trainingWeek.emphasisNotes : []).slice(0, 2).map(note => cleanText(note, 300)),
      remaining: (Array.isArray(context.trainingWeek?.remaining) ? context.trainingWeek.remaining : []).slice(0, 8).map(day => cleanText(day, 30))
    },
    gymProfile: {
      id: cleanText(context.gymProfile?.id, 40),
      name: cleanText(context.gymProfile?.name, 120),
      verifiedEquipment: (Array.isArray(context.gymProfile?.verifiedEquipment) ? context.gymProfile.verifiedEquipment : []).slice(0, 20).map(item => cleanText(item, 100)),
      userConfirmedEquipment: (Array.isArray(context.gymProfile?.userConfirmedEquipment) ? context.gymProfile.userConfirmedEquipment : []).slice(0, 20).map(item => cleanText(item, 100))
    }
  };
}

function outputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  return (Array.isArray(response.output) ? response.output : [])
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(item => item.type === "output_text" && typeof item.text === "string")
    .map(item => item.text.trim())
    .filter(Boolean)
    .join("\n");
}

export async function createCoachReply(message, context, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "low" },
      instructions: COACH_INSTRUCTIONS,
      input: `GAINLOG CONTEXT\n${JSON.stringify(sanitizeContext(context))}\n\nUSER QUESTION\n${message}`,
      max_output_tokens: 450,
      store: false
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
  const data = await response.json();
  const reply = outputText(data);
  if (!reply) throw new Error("OpenAI returned no text");
  return reply.slice(0, 3_000);
}

export async function createFoodEstimate(food, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "low" },
      instructions: "Estimate normal easy-to-log portions for GainLog. Combine every food and drink in the user's description. Return approximate calories and protein, not false precision. If a calorie number is supplied, use it as an anchor while estimating the other items. Keep note short and state the main portion assumption.",
      input: `Estimate this food entry: ${food}`,
      text: { format: { type: "json_schema", name: "gainlog_food_estimate", strict: true, schema: FOOD_SCHEMA } },
      max_output_tokens: 180,
      store: false
    })
  });
  if (!response.ok) throw new Error(`OpenAI food request failed with status ${response.status}`);
  const data = await response.json();
  let parsed;
  try { parsed = JSON.parse(outputText(data)); } catch (_) { throw new Error("OpenAI returned invalid food JSON"); }
  const calories = Number(parsed.calories), protein = Number(parsed.protein);
  if (!Number.isFinite(calories) || !Number.isFinite(protein)) throw new Error("OpenAI returned invalid food values");
  return { calories: Math.round(Math.min(20_000, Math.max(0, calories))), protein: Math.round(Math.min(1_000, Math.max(0, protein))), note: cleanText(parsed.note, 180) };
}

export async function createSplitRecommendation(context, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openAiApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "low" },
      instructions: `${COACH_INSTRUCTIONS}\nChoose exactly one supported split: ppl, full_body, upper_lower, or hybrid. PPL supports three back-to-back days or six distributed days; full_body supports one to three well-spaced days; upper_lower supports four days; hybrid supports five days. The actual schedule spacing overrides the simple day-count rule. Keep the reason under 55 words and explain volume distribution, recovery, session length, adherence, and schedule fit without claiming one split is inherently more anabolic.`,
      input: `GAINLOG CONTEXT\n${JSON.stringify(sanitizeContext(context))}\n\nRecommend the most productive recoverable split.`,
      text: { format: { type: "json_schema", name: "gainlog_split_recommendation", strict: true, schema: SPLIT_SCHEMA } },
      max_output_tokens: 180,
      store: false
    })
  });
  if (!response.ok) throw new Error(`OpenAI split request failed with status ${response.status}`);
  const data = await response.json();
  let parsed;
  try { parsed = JSON.parse(outputText(data)); } catch (_) { throw new Error("OpenAI returned invalid split JSON"); }
  if (!["ppl", "full_body", "upper_lower", "hybrid"].includes(parsed.splitId)) throw new Error("OpenAI returned an unsupported split");
  if (Number(context.schedule?.workoutsPerWeek) === 3 && hasBackToBackThreeDaySchedule(context.schedule)) {
    return { splitId: "ppl", reason: "Your three available training days are back-to-back, so PPL avoids retraining the same muscles before they recover while still covering every major muscle group each week." };
  }
  return { splitId: parsed.splitId, reason: cleanText(parsed.reason, 400) };
}

export async function createWorkoutFeedback(details = {}, fetchImpl = fetch) {
  const workout = {
    day: cleanText(details.workout?.day, 30),
    earlyEndReason: cleanText(details.workout?.earlyEndReason, 80),
    exercises: (Array.isArray(details.workout?.exercises) ? details.workout.exercises : []).slice(0, 12).map(exercise => ({
      name: cleanText(exercise.name, 100),
      range: cleanText(exercise.range, 20),
      plannedSets: cleanNumber(exercise.plannedSets, 1, 10),
      sets: (Array.isArray(exercise.sets) ? exercise.sets : []).slice(0, 10).map(cleanSet),
      previousSets: (Array.isArray(exercise.previousSets) ? exercise.previousSets : []).slice(0, 10).map(cleanSet)
    }))
  };
  const week = {
    completed: (Array.isArray(details.week?.completed) ? details.week.completed : []).slice(0, 10).map(value => cleanText(value, 30)),
    remaining: (Array.isArray(details.week?.remaining) ? details.week.remaining : []).slice(0, 10).map(value => cleanText(value, 30)),
    nextSession: cleanText(details.week?.nextSession, 30),
    weeklySchedule: cleanText(details.week?.weeklySchedule, 2_000),
    homeworkNeeds: cleanText(details.week?.homeworkNeeds, 1_000),
    emphasisNotes: (Array.isArray(details.week?.emphasisNotes) ? details.week.emphasisNotes : []).slice(0, 2).map(note => cleanText(note, 300))
  };
  if (!workout.day || !workout.exercises.length) throw new Error("Workout feedback requires a completed workout");
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openAiApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "low" },
      instructions: `${COACH_INSTRUCTIONS}\nReview the completed workout as a whole. In feedback, mention at most two important actions: a justified load increase or reduction, an exercise that needs more effort within its RIR target, or a repeated performance issue. actualRestSeconds is rest after that set, so ignore it on the final set. Praise only concrete progress. In weekAdjustment, confirm what was completed and how the remaining rotation should proceed around the saved schedule. Keep each field under 70 words.`,
      input: `COMPLETED WORKOUT\n${JSON.stringify(workout)}\n\nCURRENT WEEK\n${JSON.stringify(week)}`,
      text: { format: { type: "json_schema", name: "gainlog_workout_feedback", strict: true, schema: WORKOUT_FEEDBACK_SCHEMA } },
      max_output_tokens: 220,
      store: false
    })
  });
  if (!response.ok) throw new Error(`OpenAI workout feedback failed with status ${response.status}`);
  const data = await response.json();
  let parsed;
  try { parsed = JSON.parse(outputText(data)); } catch (_) { throw new Error("OpenAI returned invalid workout feedback JSON"); }
  const feedback = cleanText(parsed.feedback, 500);
  const weekAdjustment = cleanText(parsed.weekAdjustment, 500);
  if (!feedback || !weekAdjustment) throw new Error("OpenAI returned incomplete workout feedback");
  return { feedback, weekAdjustment };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requestOriginAllowed(req)) return res.status(403).json({ error: "Origin not allowed" });
  if (!withinRateLimit(req)) return res.status(429).json({ error: "Too many requests. Try again shortly." });
  const contentLength = Number(req.headers["content-length"] || 0);
  const parsedBodyLength = Buffer.byteLength(JSON.stringify(req.body || {}));
  if (contentLength > MAX_BODY_BYTES || parsedBodyLength > MAX_BODY_BYTES) return res.status(413).json({ error: "Request too large" });
  if (!openAiApiKey()) return res.status(503).json({ error: "AI coaching is not configured" });

  if (req.body?.type === "food_estimate") {
    const food = cleanText(req.body?.food, 500);
    if (!food) return res.status(400).json({ error: "Food description is required" });
    try {
      const estimate = await createFoodEstimate(food);
      return res.status(200).json({ ...estimate, source: "openai" });
    } catch (error) {
      console.error("Food estimate failed", error instanceof Error ? error.message : "Unknown error");
      return res.status(502).json({ error: "Food estimation is temporarily unavailable" });
    }
  }

  if (req.body?.type === "split_recommendation") {
    try {
      const recommendation = await createSplitRecommendation(req.body?.context || {});
      return res.status(200).json({ ...recommendation, source: "openai" });
    } catch (error) {
      console.error("Split recommendation failed", error instanceof Error ? error.message : "Unknown error");
      return res.status(502).json({ error: "Split planning is temporarily unavailable" });
    }
  }

  if (req.body?.type === "workout_feedback") {
    try {
      const result = await createWorkoutFeedback(req.body || {});
      return res.status(200).json({ ...result, source: "openai" });
    } catch (error) {
      console.error("Workout feedback failed", error instanceof Error ? error.message : "Unknown error");
      return res.status(502).json({ error: "Workout feedback is temporarily unavailable" });
    }
  }

  const message = cleanText(req.body?.message, 1_000);
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const reply = await createCoachReply(message, req.body?.context || {});
    return res.status(200).json({ reply, source: "openai" });
  } catch (error) {
    console.error("Coach request failed", error instanceof Error ? error.message : "Unknown error");
    return res.status(502).json({ error: "AI coaching is temporarily unavailable" });
  }
}
