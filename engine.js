(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ExamEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TYPE_LABELS = {
    multiple: "Opción múltiple",
    true_false: "Verdadero o falso",
    open: "Abierta",
  };

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function shuffleOptions(question, random = Math.random) {
    const copy = JSON.parse(JSON.stringify(question));
    if (copy.type !== "multiple") return copy;
    const indexed = copy.options.map((text, index) => ({ text, correct: index === copy.correct }));
    const shuffled = shuffle(indexed, random);
    copy.options = shuffled.map((item) => item.text);
    copy.correct = shuffled.findIndex((item) => item.correct);
    return copy;
  }

  function buildExam(questions, config, wrongIds = [], favoriteIds = [], random = Math.random) {
    let pool = [...questions];
    switch (config.mode) {
      case "type":
        pool = pool.filter((question) => question.type === config.type);
        break;
      case "topic":
        pool = pool.filter((question) => question.topic === config.topic);
        break;
      case "errors":
        pool = pool.filter((question) => wrongIds.includes(question.id));
        break;
      case "favorites":
        pool = pool.filter((question) => favoriteIds.includes(question.id));
        break;
      case "random":
      case "complete":
        break;
      default:
        throw new Error(`Unknown mode: ${config.mode}`);
    }
    pool = shuffle(pool, random);
    if (config.mode === "random") {
      const requested = Number.parseInt(config.count, 10);
      const count = Number.isFinite(requested) ? Math.max(1, Math.min(requested, pool.length)) : Math.min(20, pool.length);
      pool = pool.slice(0, count);
    }
    return pool.map((question) => shuffleOptions(question, random));
  }

  function evaluate(question, rawAnswer) {
    if (question.type === "open") return { graded: false, correct: null };
    if (question.type === "multiple") {
      const answer = Number.parseInt(rawAnswer, 10);
      return { graded: true, correct: answer === question.correct };
    }
    if (question.type === "true_false") {
      const answer = rawAnswer === true || rawAnswer === "true";
      return { graded: true, correct: answer === question.correct };
    }
    throw new Error(`Unknown question type: ${question.type}`);
  }

  function blankBucket() {
    return { total: 0, correct: 0, incorrect: 0, omitted: 0, openReviewed: 0 };
  }

  function summarize(questions, answers) {
    const summary = {
      total: questions.length,
      correct: 0,
      incorrect: 0,
      omitted: 0,
      gradedTotal: questions.filter((question) => question.type !== "open").length,
      gradedAnswered: 0,
      openReviewed: 0,
      openNeedsReview: 0,
      percent: 0,
      byType: {},
      byTopic: {},
      reviewIds: [],
    };

    for (const question of questions) {
      const record = answers[question.id];
      const typeKey = TYPE_LABELS[question.type] || question.type;
      summary.byType[typeKey] ||= blankBucket();
      summary.byTopic[question.topic] ||= blankBucket();
      const buckets = [summary.byType[typeKey], summary.byTopic[question.topic]];
      for (const bucket of buckets) bucket.total += 1;

      if (!record || !record.submitted) {
        summary.omitted += 1;
        for (const bucket of buckets) bucket.omitted += 1;
        continue;
      }

      if (question.type === "open") {
        summary.openReviewed += 1;
        for (const bucket of buckets) bucket.openReviewed += 1;
        if (record.selfAssessment === "review") {
          summary.openNeedsReview += 1;
          summary.reviewIds.push(question.id);
        }
        continue;
      }

      summary.gradedAnswered += 1;
      if (record.correct) {
        summary.correct += 1;
        for (const bucket of buckets) bucket.correct += 1;
      } else {
        summary.incorrect += 1;
        summary.reviewIds.push(question.id);
        for (const bucket of buckets) bucket.incorrect += 1;
      }
    }

    summary.percent = summary.gradedTotal === 0
      ? 0
      : Math.round((summary.correct / summary.gradedTotal) * 100);
    return summary;
  }

  return { TYPE_LABELS, shuffle, shuffleOptions, buildExam, evaluate, summarize };
});
