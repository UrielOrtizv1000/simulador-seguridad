(() => {
  "use strict";

  const questions = Array.isArray(window.EXAM_QUESTIONS) ? window.EXAM_QUESTIONS : [];
  const engine = window.ExamEngine;
  const STORAGE_KEY = "securityExamSimulator.v1";
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const elements = Object.fromEntries(
    [
      "start-view", "exam-view", "results-view", "bank-summary", "type-counts", "setup-form",
      "random-controls", "type-controls", "topic-controls", "random-count", "type-select",
      "topic-select", "setup-error", "resume-button", "wrong-mode-help", "favorite-mode-help",
      "lifetime-stats", "clear-progress", "theme-toggle", "question-counter", "progress-bar",
      "live-correct", "live-answered", "question-type", "question-difficulty", "question-topic",
      "question-text", "answer-area", "feedback", "previous-button", "favorite-button",
      "submit-button", "next-button", "finish-button", "score-percent", "result-metrics",
      "type-performance", "topic-performance", "review-list", "review-errors-button",
      "new-practice-button",
    ].map((id) => [id, document.getElementById(id)])
  );

  function defaultState() {
    return {
      theme: "dark",
      favorites: [],
      wrongIds: [],
      stats: { attempts: 0, gradedAnswered: 0, correct: 0, bestPercent: 0 },
      active: null,
      lastResult: null,
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState(), ...saved, stats: { ...defaultState().stats, ...(saved?.stats || {}) } };
    } catch (_error) {
      return defaultState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      // The simulator remains usable if storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function setView(name) {
    elements["start-view"].hidden = name !== "start";
    elements["exam-view"].hidden = name !== "exam";
    elements["results-view"].hidden = name !== "results";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    elements["theme-toggle"].textContent = state.theme === "dark" ? "Modo claro" : "Modo oscuro";
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  }

  function renderStart() {
    const counts = questions.reduce((result, question) => {
      result[question.type] = (result[question.type] || 0) + 1;
      return result;
    }, {});
    elements["bank-summary"].textContent = `${questions.length} preguntas trazables · 7 archivos PDF analizados`;
    elements["type-counts"].innerHTML = [
      [counts.multiple || 0, "Opción múltiple"],
      [counts.true_false || 0, "Verdadero/falso"],
      [counts.open || 0, "Abiertas"],
    ].map(([count, label]) => `<div class="metric"><strong>${count}</strong><span>${label}</span></div>`).join("");

    const topics = unique(questions.map((question) => question.topic)).sort((a, b) => a.localeCompare(b, "es"));
    elements["topic-select"].innerHTML = topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");
    elements["random-count"].max = String(questions.length);
    elements["wrong-mode-help"].textContent = state.wrongIds.length
      ? `${state.wrongIds.length} preguntas guardadas.`
      : "Sin errores guardados.";
    elements["favorite-mode-help"].textContent = state.favorites.length
      ? `${state.favorites.length} preguntas guardadas.`
      : "Sin favoritas guardadas.";
    elements["resume-button"].hidden = !state.active?.questions?.length;

    const attempts = state.stats.attempts || 0;
    const accuracy = state.stats.gradedAnswered
      ? Math.round((state.stats.correct / state.stats.gradedAnswered) * 100)
      : 0;
    elements["lifetime-stats"].innerHTML = [
      ["Intentos finalizados", attempts],
      ["Preguntas calificadas", state.stats.gradedAnswered || 0],
      ["Precisión acumulada", `${accuracy}%`],
      ["Mejor calificación", `${state.stats.bestPercent || 0}%`],
      ["Por repasar", state.wrongIds.length],
      ["Favoritas", state.favorites.length],
    ].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    updateConditionalControls();
  }

  function selectedMode() {
    return document.querySelector('input[name="mode"]:checked')?.value || "complete";
  }

  function updateConditionalControls() {
    const mode = selectedMode();
    elements["random-controls"].hidden = mode !== "random";
    elements["type-controls"].hidden = mode !== "type";
    elements["topic-controls"].hidden = mode !== "topic";
    elements["setup-error"].hidden = true;
  }

  function readConfig() {
    const mode = selectedMode();
    return {
      mode,
      count: elements["random-count"].value,
      type: elements["type-select"].value,
      topic: elements["topic-select"].value,
    };
  }

  function showSetupError(message) {
    elements["setup-error"].textContent = message;
    elements["setup-error"].hidden = false;
  }

  function startExam(config) {
    let examQuestions;
    try {
      examQuestions = engine.buildExam(questions, config, state.wrongIds, state.favorites);
    } catch (error) {
      showSetupError(error.message);
      return;
    }
    if (!examQuestions.length) {
      showSetupError(config.mode === "errors"
        ? "No hay preguntas pendientes de repaso."
        : config.mode === "favorites"
          ? "Aún no has marcado preguntas como favoritas."
          : "La modalidad elegida no contiene preguntas.");
      return;
    }
    state.active = {
      config,
      questions: examQuestions,
      answers: {},
      index: 0,
      startedAt: new Date().toISOString(),
    };
    saveState();
    setView("exam");
    renderQuestion();
  }

  function currentQuestion() {
    return state.active?.questions?.[state.active.index];
  }

  function currentRecord() {
    return state.active?.answers?.[currentQuestion()?.id];
  }

  function countAnswered() {
    return Object.values(state.active?.answers || {}).filter((answer) => answer.submitted).length;
  }

  function updateLiveStats() {
    const summary = engine.summarize(state.active.questions, state.active.answers);
    elements["live-correct"].textContent = String(summary.correct);
    elements["live-answered"].textContent = String(countAnswered());
  }

  function setDraftValue(value) {
    const question = currentQuestion();
    const previous = state.active.answers[question.id] || {};
    if (previous.submitted) return;
    state.active.answers[question.id] = { ...previous, value, submitted: false };
    saveState();
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const record = currentRecord();
    const total = state.active.questions.length;
    const position = state.active.index + 1;
    const progress = Math.round((position / total) * 100);

    elements["question-counter"].textContent = `Pregunta ${position} de ${total}`;
    elements["progress-bar"].style.width = `${progress}%`;
    elements["progress-bar"].parentElement.setAttribute("aria-valuenow", String(progress));
    elements["question-type"].textContent = engine.TYPE_LABELS[question.type];
    elements["question-difficulty"].textContent = question.difficulty;
    elements["question-topic"].textContent = `${question.topic} · ${question.subtopic}`;
    elements["question-text"].textContent = question.question;

    if (question.type === "multiple") renderMultiple(question, record);
    if (question.type === "true_false") renderTrueFalse(question, record);
    if (question.type === "open") renderOpen(question, record);

    renderFeedback(question, record);
    elements["previous-button"].disabled = state.active.index === 0;
    elements["next-button"].disabled = state.active.index === total - 1;
    elements["finish-button"].hidden = false;
    elements["submit-button"].textContent = question.type === "open" ? "Mostrar respuesta esperada" : "Responder";
    elements["submit-button"].disabled = Boolean(record?.submitted);
    elements["favorite-button"].setAttribute("aria-pressed", String(state.favorites.includes(question.id)));
    elements["favorite-button"].textContent = state.favorites.includes(question.id) ? "Quitar favorita" : "Marcar favorita";
    updateLiveStats();
  }

  function optionClass(question, record, index) {
    if (!record?.submitted) return "";
    if (question.type === "multiple" && index === question.correct) return " correct-option";
    if (question.type === "multiple" && index === Number(record.value) && !record.correct) return " wrong-option";
    return "";
  }

  function renderMultiple(question, record) {
    elements["answer-area"].innerHTML = question.options.map((option, index) => {
      const checked = String(record?.value) === String(index) ? " checked" : "";
      const disabled = record?.submitted ? " disabled" : "";
      const locked = record?.submitted ? " locked" : "";
      return `<label class="answer-option${locked}${optionClass(question, record, index)}"><input type="radio" name="answer" value="${index}"${checked}${disabled}><span>${escapeHtml(option)}</span></label>`;
    }).join("");
    elements["answer-area"].querySelectorAll('input[name="answer"]').forEach((input) => {
      input.addEventListener("change", () => setDraftValue(input.value));
    });
  }

  function renderTrueFalse(question, record) {
    const values = [["true", "Verdadero"], ["false", "Falso"]];
    elements["answer-area"].innerHTML = values.map(([value, label]) => {
      const checked = String(record?.value) === value ? " checked" : "";
      const disabled = record?.submitted ? " disabled" : "";
      let resultClass = "";
      if (record?.submitted && String(question.correct) === value) resultClass = " correct-option";
      if (record?.submitted && String(record.value) === value && !record.correct) resultClass = " wrong-option";
      return `<label class="answer-option${record?.submitted ? " locked" : ""}${resultClass}"><input type="radio" name="answer" value="${value}"${checked}${disabled}><span>${label}</span></label>`;
    }).join("");
    elements["answer-area"].querySelectorAll('input[name="answer"]').forEach((input) => {
      input.addEventListener("change", () => setDraftValue(input.value));
    });
  }

  function renderOpen(_question, record) {
    const disabled = record?.submitted ? " disabled" : "";
    elements["answer-area"].innerHTML = `<label class="open-label" for="open-answer">Tu respuesta</label><textarea id="open-answer" placeholder="Desarrolla tu respuesta antes de consultar la guía."${disabled}>${escapeHtml(record?.value || "")}</textarea>`;
    const textarea = document.getElementById("open-answer");
    textarea.addEventListener("input", () => setDraftValue(textarea.value));
  }

  function renderFeedback(question, record) {
    if (!record?.submitted) {
      elements.feedback.hidden = true;
      elements.feedback.innerHTML = "";
      elements.feedback.className = "feedback";
      return;
    }
    elements.feedback.hidden = false;
    if (question.type === "open") {
      const points = (question.keyPoints || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("");
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = `
        <h3>Respuesta esperada</h3>
        <p>${escapeHtml(question.expectedAnswer)}</p>
        <h4>Conceptos esenciales</h4>
        <ul class="key-points">${points}</ul>
        <p><strong>Explicación:</strong> ${escapeHtml(question.explanation)}</p>
        <p class="source-line">Fuente de estudio: ${escapeHtml(question.source)} · ${escapeHtml(question.section)}</p>
        <div class="self-assessment">
          <button class="button secondary" type="button" data-assessment="mastered">La dominé</button>
          <button class="button secondary" type="button" data-assessment="review">Necesito repasar</button>
        </div>`;
      elements.feedback.querySelectorAll("[data-assessment]").forEach((button) => {
        const selected = button.dataset.assessment === record.selfAssessment;
        button.disabled = selected;
        button.addEventListener("click", () => assessOpen(button.dataset.assessment));
      });
      return;
    }

    const correctAnswer = question.type === "multiple"
      ? question.options[question.correct]
      : question.correct ? "Verdadero" : "Falso";
    elements.feedback.className = `feedback${record.correct ? "" : " incorrect"}`;
    elements.feedback.innerHTML = `
      <h3>${record.correct ? "Correcto" : "Incorrecto"}</h3>
      <p><strong>Respuesta correcta:</strong> ${escapeHtml(correctAnswer)}</p>
      <p>${escapeHtml(question.explanation)}</p>
      <p class="source-line">Fuente de estudio: ${escapeHtml(question.source)} · ${escapeHtml(question.section)}</p>`;
  }

  function submitCurrent() {
    const question = currentQuestion();
    const record = currentRecord() || {};
    if (record.submitted) return;

    if (question.type === "open") {
      state.active.answers[question.id] = {
        value: record.value || "",
        submitted: true,
        graded: false,
        correct: null,
        selfAssessment: null,
      };
      saveState();
      renderQuestion();
      return;
    }

    if (record.value === undefined || record.value === null || record.value === "") {
      elements.feedback.hidden = false;
      elements.feedback.className = "feedback incorrect";
      elements.feedback.innerHTML = "<p>Selecciona una respuesta antes de continuar.</p>";
      return;
    }
    const result = engine.evaluate(question, record.value);
    state.active.answers[question.id] = { ...record, submitted: true, ...result };
    if (result.correct) {
      state.wrongIds = state.wrongIds.filter((id) => id !== question.id);
    } else if (!state.wrongIds.includes(question.id)) {
      state.wrongIds.push(question.id);
    }
    saveState();
    renderQuestion();
  }

  function assessOpen(assessment) {
    const question = currentQuestion();
    const record = currentRecord();
    if (!record?.submitted || question.type !== "open") return;
    record.selfAssessment = assessment;
    if (assessment === "review" && !state.wrongIds.includes(question.id)) state.wrongIds.push(question.id);
    if (assessment === "mastered") state.wrongIds = state.wrongIds.filter((id) => id !== question.id);
    saveState();
    renderQuestion();
  }

  function moveQuestion(offset) {
    const nextIndex = state.active.index + offset;
    if (nextIndex < 0 || nextIndex >= state.active.questions.length) return;
    state.active.index = nextIndex;
    saveState();
    renderQuestion();
  }

  function toggleFavorite() {
    const id = currentQuestion().id;
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((item) => item !== id)
      : [...state.favorites, id];
    saveState();
    renderQuestion();
  }

  function finishExam(skipConfirmation = false) {
    const unanswered = state.active.questions.length - countAnswered();
    if (!skipConfirmation && unanswered > 0 && !window.confirm(`Quedan ${unanswered} preguntas sin responder. ¿Finalizar de todos modos?`)) return;
    const summary = engine.summarize(state.active.questions, state.active.answers);
    state.wrongIds = unique([...state.wrongIds, ...summary.reviewIds]);
    state.stats.attempts += 1;
    state.stats.gradedAnswered += summary.gradedAnswered;
    state.stats.correct += summary.correct;
    state.stats.bestPercent = Math.max(state.stats.bestPercent, summary.percent);
    state.lastResult = {
      summary,
      questions: state.active.questions,
      answers: state.active.answers,
      finishedAt: new Date().toISOString(),
    };
    state.active = null;
    saveState();
    renderResults(state.lastResult);
    setView("results");
  }

  function performanceRows(groups) {
    return Object.entries(groups).map(([label, values]) => `
      <tr><td>${escapeHtml(label)}</td><td>${values.correct}</td><td>${values.incorrect}</td><td>${values.omitted}</td></tr>`).join("");
  }

  function renderResults(result) {
    const { summary, questions: examQuestions } = result;
    elements["score-percent"].textContent = `${summary.percent}%`;
    elements["result-metrics"].innerHTML = [
      [summary.total, "Preguntas totales"],
      [summary.correct, "Correctas"],
      [summary.incorrect, "Incorrectas"],
      [summary.omitted, "Omitidas"],
      [summary.openReviewed, "Abiertas revisadas"],
      [summary.openNeedsReview, "Abiertas por repasar"],
    ].map(([value, label]) => `<div class="result-metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
    elements["type-performance"].innerHTML = performanceRows(summary.byType);
    elements["topic-performance"].innerHTML = performanceRows(summary.byTopic);

    const reviewQuestions = summary.reviewIds
      .map((id) => examQuestions.find((question) => question.id === id) || questionById.get(id))
      .filter(Boolean);
    elements["review-list"].innerHTML = reviewQuestions.length
      ? reviewQuestions.map((question) => `<div class="review-item"><p>${escapeHtml(question.question)}</p><small>${escapeHtml(question.topic)} · ${escapeHtml(question.source)}</small></div>`).join("")
      : '<p class="empty-state">No quedaron preguntas pendientes de repaso en este intento.</p>';
    elements["review-errors-button"].disabled = state.wrongIds.length === 0;
  }

  function resetAll() {
    if (!window.confirm("Se borrarán el progreso, los errores, favoritos y estadísticas. ¿Continuar?")) return;
    const theme = state.theme;
    state = { ...defaultState(), theme };
    saveState();
    renderStart();
    setView("start");
  }

  elements["setup-form"].addEventListener("submit", (event) => {
    event.preventDefault();
    startExam(readConfig());
  });
  document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener("change", updateConditionalControls));
  elements["resume-button"].addEventListener("click", () => { setView("exam"); renderQuestion(); });
  elements["theme-toggle"].addEventListener("click", toggleTheme);
  elements["clear-progress"].addEventListener("click", resetAll);
  elements["previous-button"].addEventListener("click", () => moveQuestion(-1));
  elements["next-button"].addEventListener("click", () => moveQuestion(1));
  elements["submit-button"].addEventListener("click", submitCurrent);
  elements["favorite-button"].addEventListener("click", toggleFavorite);
  elements["finish-button"].addEventListener("click", () => finishExam(false));
  elements["review-errors-button"].addEventListener("click", () => startExam({ mode: "errors" }));
  elements["new-practice-button"].addEventListener("click", () => { renderStart(); setView("start"); });

  applyTheme();
  renderStart();
  if (!questions.length || !engine) showSetupError("No se pudo cargar el banco de preguntas.");
})();
