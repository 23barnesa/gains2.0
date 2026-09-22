import test from "node:test";
import assert from "node:assert/strict";
import { createCoachReply, createFoodEstimate, createSplitRecommendation, sanitizeContext } from "./coach.js";

test("sanitizes and limits device context", () => {
  const context = sanitizeContext({
    nutrition: { calories: "2800", protein: -4 },
    recentFoods: Array.from({ length: 20 }, (_, index) => ({ name: `Food ${index}`, calories: 100, protein: 10 })),
    workouts: [{ day: "PUSH", exercises: [{ name: "Press", sets: [{ weight: 90, reps: 10, rir: 2, extra: "drop" }] }] }],
    schedule: { weeklySchedule: "Mon: class 9-11", homeworkNeeds: "Lab Friday", workoutRequests: "Prioritize shoulders", workoutsPerWeek: 9, workoutDurationMinutes: 10, timezone: "America/Detroit" },
    trainingPlan: { mode: "coach", splitId: "ppl", splitName: "Push / Pull / Legs", reason: "Original plan" },
    ignoredSecret: "never forward this"
  });
  assert.equal(context.nutrition.calories, 2800);
  assert.equal(context.nutrition.protein, 0);
  assert.equal(context.recentFoods.length, 12);
  assert.deepEqual(context.workouts[0].exercises[0].sets[0], { weight: 90, reps: 10, rir: 2, actualRestSeconds: null });
  assert.deepEqual(context.schedule, { weeklySchedule: "Mon: class 9-11", homeworkNeeds: "Lab Friday", workoutRequests: "Prioritize shoulders", workoutsPerWeek: 6, workoutDurationMinutes: 30, timezone: "America/Detroit" });
  assert.deepEqual(context.trainingPlan, { mode: "coach", splitId: "ppl", splitName: "Push / Pull / Legs", reason: "Original plan" });
  assert.equal("ignoredSecret" in context, false);
});

test("uses the Responses API and extracts output text", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  let request;
  const reply = await createCoachReply("Should I add weight?", { currentWorkoutDay: "PUSH" }, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: "Keep 90 lb today." }] }] }) };
  });
  assert.equal(reply, "Keep 90 lb today.");
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer test-only");
  assert.equal(JSON.parse(request.options.body).store, false);
});

test("accepts the existing Vercel open_ai_key variable", async () => {
  delete process.env.OPENAI_API_KEY;
  process.env.open_ai_key = "existing-vercel-key";
  let authorization;
  await createCoachReply("Test", {}, async (_url, options) => {
    authorization = options.headers.Authorization;
    return { ok: true, json: async () => ({ output_text: "Connected." }) };
  });
  assert.equal(authorization, "Bearer existing-vercel-key");
  delete process.env.open_ai_key;
});

test("returns a structured combined food estimate", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  let request;
  const estimate = await createFoodEstimate("500 cal muffin with a Coke", async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ calories: 650, protein: 8, note: "Assumes one regular muffin and one 12 oz Coke." }) }) };
  });
  assert.deepEqual(estimate, { calories: 650, protein: 8, note: "Assumes one regular muffin and one 12 oz Coke." });
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
});

test("returns a supported structured split recommendation", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  let request;
  const recommendation = await createSplitRecommendation({ schedule: { workoutsPerWeek: 4 } }, async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ splitId: "upper_lower", reason: "Four available days support twice-weekly muscle frequency with manageable recovery." }) }) };
  });
  assert.deepEqual(recommendation, { splitId: "upper_lower", reason: "Four available days support twice-weekly muscle frequency with manageable recovery." });
  assert.deepEqual(request.text.format.schema.properties.splitId.enum, ["ppl", "full_body", "upper_lower", "hybrid"]);
});
