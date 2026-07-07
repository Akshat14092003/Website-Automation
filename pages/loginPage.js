class LoginPage {

  constructor(page){
    this.page = page;

    this.emailInput = 'input[placeholder="example@email.com"]';
    this.passwordInput = 'input[placeholder="Password"]';
    this.signInButton = 'button:has-text("Sign In")';
  }

  async openLogin(baseUrl){
    await this.page.goto(`${baseUrl}/login`);
  }

  async login(email, password){

    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.signInButton);

    await this.page.waitForSelector('text=successfully', { timeout: 10000 });

    console.log("Login successful");

  }

  // Fill fields and click Sign In without asserting success
  async attemptLogin(email, password){

    if (email !== null) {
      await this.page.fill(this.emailInput, email);
    }

    if (password !== null) {
      await this.page.fill(this.passwordInput, password);
    }

    const btn = this.page.locator(this.signInButton);

    if (await btn.isEnabled()) {
      await btn.click();
    }

  }

  // Check if the Sign In button is disabled
  async isSignInEnabled(){
    return await this.page.locator(this.signInButton).isEnabled();
  }

  // Get inline field validation error text (e.g. "Email is required")
  async getFieldError(){
    try {
      const error = this.page.locator('text=is required').first();
      await error.waitFor({ state: 'visible', timeout: 3000 });
      return await error.textContent();
    } catch {
      return null;
    }
  }

  // Get toast notification text
  async getToastMessage(timeout = 5000){
    try {
      const toast = this.page.locator('[role="status"]').last();
      await toast.waitFor({ state: 'visible', timeout });
      return await toast.textContent();
    } catch {
      return null;
    }
  }

  // Check if we're still on the login page
  async isOnLoginPage(){
    return this.page.url().includes('/login');
  }

  // Trigger field validation by focusing and blurring an empty field
  async triggerEmailValidation(){
    await this.page.click(this.emailInput);
    await this.page.click(this.passwordInput);
  }

}

module.exports = LoginPage;