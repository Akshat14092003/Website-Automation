const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ProductPage = require('../pages/ProductPage');
const config = require('../utils/config');
const { saveExcel } = require('../utils/excelHelper');

test('Validate products add to cart', async ({page}) => {

  const loginPage = new LoginPage(page);
  const productPage = new ProductPage(page);

  await loginPage.openLogin(config.baseUrl);

  await loginPage.login(config.email,config.password);

  await productPage.openProductPage(config.productUrl);

  await productPage.testProducts();

  // Save Excel Report
  saveExcel();

});