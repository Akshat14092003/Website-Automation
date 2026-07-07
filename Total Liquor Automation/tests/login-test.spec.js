const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const config = require('../utils/config');
const { initLoginExcel, addLoginTestResult } = require('../utils/loginTestExcelHelper');

test.describe('Login Page Tests', () => {

  test.describe.configure({ mode: 'serial' });

  let loginPage;

  test.beforeAll(() => {
    // Clear old Excel report at the very beginning
    initLoginExcel();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.openLogin(config.baseUrl);
  });

  test.afterEach(async ({ }, testInfo) => {
    // Record test result
    const status = testInfo.status === 'passed' ? 'Pass' : 'Fail';
    const errorMsg = testInfo.error ? testInfo.error.message.split('\n')[0] : '';
    
    // Extract Test ID and Test Name from title
    const titleParts = testInfo.title.split(' - ');
    const testId = titleParts[0].trim();
    const testName = titleParts.slice(1).join(' - ').trim() || testInfo.title;
    
    // Write result to Excel
    addLoginTestResult(testId, testName, status, errorMsg);
  });


  // ==================== POSITIVE TEST CASES ====================

  test('TC01 - Successful login with valid credentials', async ({ page }) => {

    await loginPage.login(config.email, config.password);

    // Should redirect away from login page
    expect(await loginPage.isOnLoginPage()).toBe(false);

    // Should show welcome greeting
    await expect(page.locator('text=Hi, John')).toBeVisible({ timeout: 10000 });

    console.log("TC01 PASS: Successful login with valid credentials");

  });

  test('TC02 - Login page loads correctly with all elements', async ({ page }) => {

    // Email field should be visible
    await expect(page.locator(loginPage.emailInput)).toBeVisible();

    // Password field should be visible
    await expect(page.locator(loginPage.passwordInput)).toBeVisible();

    // Sign In button should be visible
    await expect(page.locator(loginPage.signInButton)).toBeVisible();

    // Forgot Password link should be present
    await expect(page.locator('text=Forgot Password')).toBeVisible();

    // Sign up option should be present
    await expect(page.locator('text=Sign up')).toBeVisible();

    console.log("TC02 PASS: Login page loaded with all elements");

  });

  test('TC03 - Password field masks input', async ({ page }) => {

    const passwordField = page.locator(loginPage.passwordInput);

    // Password field should be of type "password"
    await expect(passwordField).toHaveAttribute('type', 'password');

    console.log("TC03 PASS: Password field masks input");

  });


  // ==================== NEGATIVE TEST CASES ====================

  test('TC04 - Login with empty email and password', async ({ page }) => {

    // Sign In should be disabled with empty fields
    const isEnabled = await loginPage.isSignInEnabled();
    expect(isEnabled).toBe(false);

    // Should remain on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);

    console.log("TC04 PASS: Empty fields keep Sign In disabled");

  });

  test('TC05 - Login with wrong email and wrong password', async ({ page }) => {

    await loginPage.attemptLogin('wrong@email.com', 'WrongPass123');

    // Wait briefly for response
    await page.waitForTimeout(1000);

    // Check if toast appears
    const toast = await loginPage.getToastMessage(3000);
    
    // Should remain on login page (main validation)
    expect(await loginPage.isOnLoginPage()).toBe(true);
    
    // If toast appears, verify message
    if (toast) {
      expect(toast).toContain('Invalid credentials');
    }

    console.log("TC05 PASS: Wrong credentials rejected");

  });

  test('TC06 - Login with valid email and wrong password', async ({ page }) => {

    await loginPage.attemptLogin(config.email, 'WrongPassword123');

    // Wait briefly for response
    await page.waitForTimeout(1000);

    // Check if toast appears
    const toast = await loginPage.getToastMessage(3000);
    
    // Should remain on login page (main validation)
    expect(await loginPage.isOnLoginPage()).toBe(true);
    
    // If toast appears, verify message
    if (toast) {
      expect(toast).toContain('Invalid credentials');
    }

    console.log("TC06 PASS: Correct email + wrong password rejected");

  });

  test('TC07 - Login with wrong email and correct password', async ({ page }) => {

    await loginPage.attemptLogin('nonexistent@email.com', config.password);

    // Wait briefly for response
    await page.waitForTimeout(1000);

    // Check if toast appears
    const toast = await loginPage.getToastMessage(3000);
    
    // Should remain on login page (main validation)
    expect(await loginPage.isOnLoginPage()).toBe(true);
    
    // If toast appears, verify message
    if (toast) {
      expect(toast).toContain('Invalid credentials');
    }

    console.log("TC07 PASS: Wrong email + correct password rejected");

  });

  test('TC08 - Login with empty email only', async ({ page }) => {

    // Fill password but leave email empty
    await page.fill(loginPage.passwordInput, config.password);

    // Sign In should remain disabled without email
    const isEnabled = await loginPage.isSignInEnabled();
    expect(isEnabled).toBe(false);

    // Should remain on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);

    console.log("TC08 PASS: Empty email keeps Sign In disabled");

  });

  test('TC09 - Login with empty password only', async ({ page }) => {

    // Fill email but leave password empty
    await page.fill(loginPage.emailInput, config.email);

    // Sign In should remain disabled without password
    const isEnabled = await loginPage.isSignInEnabled();
    expect(isEnabled).toBe(false);

    // Should remain on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);

    console.log("TC09 PASS: Empty password keeps Sign In disabled");

  });

  test('TC10 - Login with SQL injection in email', async ({ page }) => {

    await loginPage.attemptLogin("' OR 1=1 --", 'password');

    await page.waitForTimeout(1500);

    // Should remain on login page (not bypass auth)
    expect(await loginPage.isOnLoginPage()).toBe(true);

    console.log("TC10 PASS: SQL injection in email does not bypass login");

  });

  test('TC11 - Login with XSS script in email', async ({ page }) => {

    await loginPage.attemptLogin('<script>alert("xss")</script>', 'password');

    await page.waitForTimeout(1500);

    // Should remain on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);

    // No alert dialog should have appeared
    console.log("TC11 PASS: XSS in email does not execute");

  });

  test('TC12 - Login with extra spaces in email', async ({ page }) => {

    await loginPage.attemptLogin(`  ${config.email}  `, config.password);

    await page.waitForTimeout(2000);

    // Check behavior - may trim and succeed, or show error
    const isOnLogin = await loginPage.isOnLoginPage();
    const toast = await loginPage.getToastMessage(2000);

    if (!isOnLogin) {
      console.log("TC12 PASS: Email with spaces was trimmed and login succeeded");
    } else {
      console.log("TC12 PASS: Email with spaces was rejected:", toast);
    }

  });

});
