const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const appUrl = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

async function cleanOpen(page) {
  await page.goto(appUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function selectMode(page, mode) {
  await page.locator(`input[name="mode"][value="${mode}"]`).check();
}

async function chooseCorrectCurrentAnswer(page) {
  const data = await page.evaluate(() => {
    const prompt = document.querySelector("#question-text").textContent;
    const question = window.EXAM_QUESTIONS.find((item) => item.question === prompt);
    return question.type === "multiple"
      ? { type: question.type, text: question.options[question.correct] }
      : { type: question.type, value: String(question.correct) };
  });
  if (data.type === "multiple") {
    await page.locator(".answer-option", { hasText: data.text }).click();
  } else {
    await page.locator(`input[name="answer"][value="${data.value}"]`).check();
  }
}

test("loads the complete bank and exposes all study modes", async ({ page }) => {
  await cleanOpen(page);
  await expect(page.locator("#bank-summary")).toContainText("141 preguntas");
  await expect(page.locator("#type-counts")).toContainText("47");
  await expect(page.locator("#type-counts")).toContainText("15");
  await expect(page.locator("#type-counts")).toContainText("79");
  await expect(page.locator('input[name="mode"]')).toHaveCount(6);
  await expect(page.locator("#topic-select option")).toHaveCount(7);
});

test("grades a multiple-choice answer and reveals explanation only after submission", async ({ page }) => {
  await cleanOpen(page);
  await selectMode(page, "type");
  await page.locator("#type-select").selectOption("multiple");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await expect(page.locator("#feedback")).toBeHidden();
  await chooseCorrectCurrentAnswer(page);
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.locator("#feedback")).toContainText("Correcto");
  await expect(page.locator("#feedback")).toContainText("Fuente de estudio:");
  await expect(page.locator('input[name="answer"]:checked')).toBeDisabled();
});

test("open questions show a guide and support self-assessed review", async ({ page }) => {
  await cleanOpen(page);
  await selectMode(page, "type");
  await page.locator("#type-select").selectOption("open");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await page.locator("#open-answer").fill("Mi respuesta de práctica");
  await page.getByRole("button", { name: "Mostrar respuesta esperada" }).click();
  await expect(page.locator("#feedback")).toContainText("Respuesta esperada");
  await expect(page.locator("#feedback")).toContainText("Conceptos esenciales");
  await page.getByRole("button", { name: "Necesito repasar" }).click();
  await expect(page.locator("#live-answered")).toHaveText("1");
  const savedWrong = await page.evaluate(() => JSON.parse(localStorage.getItem("securityExamSimulator.v1")).wrongIds.length);
  expect(savedWrong).toBe(1);
});

test("persists and restores an unfinished response", async ({ page }) => {
  await cleanOpen(page);
  await selectMode(page, "type");
  await page.locator("#type-select").selectOption("multiple");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await page.locator('input[name="answer"]').first().check();
  await page.reload();
  await page.getByRole("button", { name: "Continuar progreso" }).click();
  await expect(page.locator('input[name="answer"]:checked')).toHaveCount(1);
});

test("computes final totals and starts an errors-only review", async ({ page }) => {
  await cleanOpen(page);
  await selectMode(page, "type");
  await page.locator("#type-select").selectOption("true_false");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  const wrongValue = await page.evaluate(() => {
    const prompt = document.querySelector("#question-text").textContent;
    const question = window.EXAM_QUESTIONS.find((item) => item.question === prompt);
    return String(!question.correct);
  });
  await page.locator(`input[name="answer"][value="${wrongValue}"]`).check();
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.locator("#feedback")).toContainText("Incorrecto");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.locator("#results-view")).toBeVisible();
  await expect(page.locator("#result-metrics")).toContainText("15");
  await expect(page.locator("#result-metrics")).toContainText("14");
  await expect(page.locator("#review-list .review-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Repasar errores" }).click();
  await expect(page.locator("#question-counter")).toHaveText("Pregunta 1 de 1");
  await chooseCorrectCurrentAnswer(page);
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.locator("#feedback")).toContainText("Correcto");
});

test("persists favorites and starts a favorites-only practice", async ({ page }) => {
  await cleanOpen(page);
  await selectMode(page, "type");
  await page.locator("#type-select").selectOption("multiple");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  const prompt = await page.locator("#question-text").textContent();
  await page.getByRole("button", { name: "Marcar favorita" }).click();
  await expect(page.getByRole("button", { name: "Quitar favorita" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Finalizar" }).click();
  await page.getByRole("button", { name: "Nueva práctica" }).click();
  await expect(page.locator("#favorite-mode-help")).toContainText("1 pregunta");
  await selectMode(page, "favorites");
  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await expect(page.locator("#question-counter")).toHaveText("Pregunta 1 de 1");
  await expect(page.locator("#question-text")).toHaveText(prompt);
  await page.getByRole("button", { name: "Quitar favorita" }).click();
  const favoriteCount = await page.evaluate(() => JSON.parse(localStorage.getItem("securityExamSimulator.v1")).favorites.length);
  expect(favoriteCount).toBe(0);
});

test("fits a narrow viewport without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await cleanOpen(page);
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});
