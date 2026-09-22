const DEFAULT_ORIGIN = "https://23barnesa.github.io";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;
const MAX_BODY_BYTES = 32_000;
const rateLimits = new Map();

const COACH_INSTRUCTIONS = `You are GainLog's concise hypertrophy coach. Use only the structured context provided and clearly say when there is not enough history.

Priorities:
- Give short, actionable guidance with minimal statistics.
- Use double progression. Recommend a load increase only after the full rep target is reached with clean execution and appropriate RIR across the planned sets.
- Do not make major recommendations from one unusual set. Look for trends.
- Compounds are generally 1-2 RIR. Isolations are generally 0-2 RIR; a final isolation set may reach technical failure.
- Never encourage absolute failure on heavy presses, hack squat, or leg press.
- Treat shoulder joint pain differently from muscular fatigue. Never advise training through joint pain; suggest stopping or using a comfortable stable alternative and professional assessment when persistent.
- Respect scoliosis and preferences: no barbell back squats, RDLs, split squats as a primary replacement, or unnecessary spinal loading. Prefer stable machines and Hammer Strength movements.
- Rest targets begin around 60 seconds for small isolations, 75 seconds for moderate isolations, and 90 seconds for demanding compounds. Change rest by about 15 seconds only when repeated performance, load, RIR, and actual rest support it.
- Do not reward short rest or penalize longer rest. Do not add volume just because muscle coverage is below 100.
- Nutrition targets are 2750 calories and 155 g protein. Do not encourage more food when targets are already met.
- Bodyweight advice must use multi-week trends; never automatically change the calorie target.
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
    currentWorkoutDay: cleanText(context.currentWorkoutDay, 20)
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
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requestOriginAllowed(req)) return res.status(403).json({ error: "Origin not allowed" });
  if (!withinRateLimit(req)) return res.status(429).json({ error: "Too many requests. Try again shortly." });
  const contentLength = Number(req.headers["content-length"] || 0);
  const parsedBodyLength = Buffer.byteLength(JSON.stringify(req.body || {}));
  if (contentLength > MAX_BODY_BYTES || parsedBodyLength > MAX_BODY_BYTES) return res.status(413).json({ error: "Request too large" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI coaching is not configured" });

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
