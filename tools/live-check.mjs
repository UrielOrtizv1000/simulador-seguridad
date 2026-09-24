// Smoke test for the deployed site. The local browser tests run over file://,
// which cannot catch a deploy that only breaks once the page is served from a
// repository subpath or with the wrong content type for an asset.
//
//   node tools/live-check.mjs [url]
//
import { chromium } from "@playwright/test";

const url =
  process.argv[2] ??
  process.env.SITE_URL ??
  "https://urielortizv1000.github.io/simulador-seguridad/";

const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console error: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
page.on("response", (response) => {
  if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
});

try {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("#bank-summary", { timeout: 60_000 });

  const summary = (await page.textContent("#bank-summary")).trim();
  if (!summary.includes("141 preguntas")) problems.push(`unexpected bank summary: ${summary}`);

  await page.getByRole("button", { name: "Iniciar práctica" }).click();
  await page.waitForSelector("#question-counter", { timeout: 15_000 });

  const counter = (await page.textContent("#question-counter")).trim();
  if (!/^Pregunta 1 de \d+$/.test(counter)) problems.push(`unexpected counter: ${counter}`);

  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: /Responder|Mostrar respuesta esperada/ }).click();
  await page.waitForSelector("#feedback:not([hidden])", { timeout: 15_000 });

  const feedback = (await page.textContent("#feedback")).trim();
  if (!feedback) problems.push("feedback stayed empty after answering");
  if (!feedback.includes("Fuente de estudio")) problems.push("feedback is missing the study source");
} catch (error) {
  problems.push(`flow failed: ${error.message}`);
} finally {
  await browser.close();
}

if (problems.length > 0) {
  console.error(`FAIL ${url}`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`OK ${url}`);
