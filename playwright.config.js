const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 30_000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  reporter: "list",
});
