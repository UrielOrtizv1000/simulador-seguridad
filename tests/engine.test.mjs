import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const engine = require("../engine.js");
const questions = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));

test("the generated bank has valid traceable questions", () => {
  assert.equal(questions.length, 141);
  assert.deepEqual(new Set(questions.map((question) => question.type)), new Set(["multiple", "true_false", "open"]));
  for (const question of questions) {
    assert.match(question.id, /^Q\d{3}$/);
    assert.ok(question.question);
    assert.ok(question.topic);
    assert.ok(question.subtopic);
    assert.ok(question.explanation);
    assert.ok(question.source.endsWith(".pdf"));
    assert.ok(question.section);
    if (question.type === "multiple") {
      assert.ok(question.options.length >= 2);
      assert.ok(Number.isInteger(question.correct));
      assert.ok(question.correct >= 0 && question.correct < question.options.length);
    }
    if (question.type === "true_false") assert.equal(typeof question.correct, "boolean");
    if (question.type === "open") {
      assert.ok(question.expectedAnswer);
      assert.ok(question.keyPoints.length > 0);
    }
  }
});

test("buildExam filters by type, topic, errors and favorites", () => {
  const noShuffle = () => 0.999999;
  const multiple = engine.buildExam(questions, { mode: "type", type: "multiple" }, [], [], noShuffle);
  assert.equal(multiple.length, 47);
  assert.ok(multiple.every((question) => question.type === "multiple"));

  const topic = questions[0].topic;
  const topicExam = engine.buildExam(questions, { mode: "topic", topic }, [], [], noShuffle);
  assert.ok(topicExam.length > 0);
  assert.ok(topicExam.every((question) => question.topic === topic));

  const ids = [questions[2].id, questions[5].id];
  assert.deepEqual(engine.buildExam(questions, { mode: "errors" }, ids, [], noShuffle).map((q) => q.id), ids);
  assert.deepEqual(engine.buildExam(questions, { mode: "favorites" }, [], ids, noShuffle).map((q) => q.id), ids);
});

test("random practice clamps the requested count", () => {
  const exam = engine.buildExam(questions, { mode: "random", count: 12 }, [], [], () => 0.5);
  assert.equal(exam.length, 12);
  assert.equal(new Set(exam.map((question) => question.id)).size, 12);
});

test("option shuffling preserves the correct answer text", () => {
  const original = questions.find((question) => question.type === "multiple");
  const expectedText = original.options[original.correct];
  const shuffled = engine.shuffleOptions(original, () => 0);
  assert.equal(shuffled.options[shuffled.correct], expectedText);
  assert.notStrictEqual(shuffled, original);
});

test("evaluate grades objective types but not open questions", () => {
  const multiple = questions.find((question) => question.type === "multiple");
  assert.deepEqual(engine.evaluate(multiple, multiple.correct), { graded: true, correct: true });
  assert.deepEqual(engine.evaluate(multiple, (multiple.correct + 1) % multiple.options.length), { graded: true, correct: false });

  const trueFalse = questions.find((question) => question.type === "true_false");
  assert.deepEqual(engine.evaluate(trueFalse, String(trueFalse.correct)), { graded: true, correct: true });

  const open = questions.find((question) => question.type === "open");
  assert.deepEqual(engine.evaluate(open, "respuesta"), { graded: false, correct: null });
});

test("summary excludes open questions from the automatic percentage", () => {
  const multiple = questions.find((question) => question.type === "multiple");
  const trueFalse = questions.find((question) => question.type === "true_false");
  const open = questions.find((question) => question.type === "open");
  const answers = {
    [multiple.id]: { submitted: true, correct: true },
    [trueFalse.id]: { submitted: true, correct: false },
    [open.id]: { submitted: true, correct: null, selfAssessment: "review" },
  };
  const result = engine.summarize([multiple, trueFalse, open], answers);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.openReviewed, 1);
  assert.equal(result.openNeedsReview, 1);
  assert.equal(result.percent, 50);
  assert.deepEqual(new Set(result.reviewIds), new Set([trueFalse.id, open.id]));
});

test("unanswered objective questions reduce the automatic score", () => {
  const multiple = questions.find((question) => question.type === "multiple");
  const trueFalse = questions.find((question) => question.type === "true_false");
  const open = questions.find((question) => question.type === "open");
  const result = engine.summarize(
    [multiple, trueFalse, open],
    { [multiple.id]: { submitted: true, correct: true } }
  );
  assert.equal(result.gradedTotal, 2);
  assert.equal(result.gradedAnswered, 1);
  assert.equal(result.omitted, 2);
  assert.equal(result.percent, 50);
});

test("unanswered questions are counted as omitted", () => {
  const sample = questions.slice(0, 4);
  const result = engine.summarize(sample, {});
  assert.equal(result.total, 4);
  assert.equal(result.omitted, 4);
  assert.equal(result.percent, 0);
});
