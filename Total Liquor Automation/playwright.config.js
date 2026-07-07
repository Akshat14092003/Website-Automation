const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 300000, // 5 minutes global timeout for entire test run
  expect: {
    timeout: 5000 // 5 seconds for assertions
  },
  use: {
    headless: false,
    viewport: null,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000 // 10 seconds for actions like click, fill
  }
});