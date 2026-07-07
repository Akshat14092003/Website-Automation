const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ProductDetailPage = require('../pages/productDetailPage');
const config = require('../utils/config');
const { saveImageExcel } = require('../utils/imageTestExcelHelper');

test('Validate product images on detail page', async ({page}) => {

  const loginPage = new LoginPage(page);
  const productDetailPage = new ProductDetailPage(page);

  await loginPage.openLogin(config.baseUrl);

  await loginPage.login(config.email, config.password);

  await productDetailPage.openProductPage();

  await productDetailPage.testProductImages();

  // Save final Excel Report
  saveImageExcel();

});
