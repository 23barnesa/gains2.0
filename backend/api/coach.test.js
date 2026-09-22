import test from "node:test";
import assert from "node:assert/strict";
import { createCoachReply, sanitizeContext } from "./coach.js";

test("sanitizes and limits device context", () => {
  const context = sanitizeContext({
    nutrition: { calories: "2800", protein: -4 },
    recentFoods: Array.from({ length: 20 }, (_, index) => ({ name: `Food ${index}`, calories: 100, protein: 10 })),
    workouts: [{ day: "PUSH", exercises: [{ name: "Press", sets: [{ weight: 90, reps: 10, rir: 2, extra: "drop" }] }] }],
    ignoredSecret: "never forward this"
  });
  assert.equal(context.nutrition.calories, 2800);
  assert.equal(context.nutrition.protein, 0);
  assert.equal(context.recentFoods.length, 12);
  assert.deepEqual(context.workouts[0].exercises[0].sets[0], { weight: 90, reps: 10, rir: 2, actualRestSeconds: null });
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
