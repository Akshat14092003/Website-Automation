const { addImageResult, saveImageExcel } = require('../utils/imageTestExcelHelper');

class ProductDetailPage {

    constructor(page) {
        this.page = page;
        this.serialNumber = 1;
    }

    async openProductPage() {

        await this.page.goto('https://total-liquor-mvp.netlify.app/product', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

        await this.page.waitForSelector('div.border.rounded-xl', { timeout: 20000 });

        console.log("Product catalogue page loaded");
    }

    async testProductImages() {

        let pageNumber = 1;

        while (true) {

            console.log(`\n========= PAGE ${pageNumber} =========`);

            const products = this.page.locator('div.border.rounded-xl');

            const count = await products.count();

            console.log("Products on this page:", count);

            for (let i = 0; i < count; i++) {

                const product = products.nth(i);

                await product.scrollIntoViewIfNeeded();

                const productName = await product.locator('h3').innerText();

                console.log(`Testing product ${this.serialNumber}: ${productName}`);

                try {

                    // Click the product to open detail page
                    await product.locator('h3').click();

                    // Wait for detail page to load - try multiple selectors
                    try {
                        await this.page.waitForSelector('div.aspect-square img', { timeout: 15000 });
                    } catch {
                        // Try alternative selector
                        await this.page.waitForSelector('img[alt]', { timeout: 5000 });
                    }

                    // Give the image time to load
                    await this.page.waitForTimeout(1500);

                    const currentUrl = this.page.url();

                    // Check if the product image loaded properly on detail page
                    const imageInfo = await this.page.evaluate(() => {

                        // Try multiple selectors for the image
                        let img = document.querySelector('div.aspect-square img');
                        
                        if (!img) {
                            img = document.querySelector('img[alt]');
                        }
                        
                        if (!img) {
                            img = document.querySelector('img');
                        }

                        if (!img) {
                            return { loaded: false, src: null, naturalWidth: 0, naturalHeight: 0, isPlaceholder: false };
                        }

                        // Check if it's a placeholder image (gray bottle silhouette)
                        const src = img.src || '';
                        const isPlaceholder = 
                            src.includes('placeholder') || 
                            src.includes('default') ||
                            src.startsWith('data:image') ||
                            src.includes('bottle-silhouette') ||
                            src.includes('no-image') ||
                            !src.includes('salsify.com'); // Real images are from salsify.com

                        return {
                            loaded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
                            src: img.src,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            isPlaceholder: isPlaceholder
                        };

                    });

                    if (imageInfo.loaded && !imageInfo.isPlaceholder) {

                        console.log("PASS - Real product image loaded:", imageInfo.src);

                        addImageResult(this.serialNumber, productName, currentUrl, "Pass", imageInfo.src);

                    } else if (imageInfo.isPlaceholder) {

                        console.log("FAIL - Placeholder image (no real product photo)");

                        await this.page.screenshot({
                            path: `screenshots/image-fail-${this.serialNumber}.png`
                        });

                        addImageResult(this.serialNumber, productName, currentUrl, "Fail", "Placeholder/default image - no real product photo");

                    } else {

                        console.log("FAIL - Image NOT loaded. naturalWidth:", imageInfo.naturalWidth);

                        await this.page.screenshot({
                            path: `screenshots/image-fail-${this.serialNumber}.png`
                        });

                        addImageResult(this.serialNumber, productName, currentUrl, "Fail", imageInfo.src || "No image found");

                    }

                } catch (error) {

                    console.log("Error testing product image:", error.message);

                    const currentUrl = this.page.url();
                    
                    // Check if we're still on the product list page
                    if (currentUrl.includes('/product') && !currentUrl.includes('/product/')) {
                        addImageResult(this.serialNumber, productName, currentUrl, "Error", "Failed to navigate to detail page");
                    } else {
                        await this.page.screenshot({
                            path: `screenshots/image-error-${this.serialNumber}.png`
                        });
                        addImageResult(this.serialNumber, productName, currentUrl, "Error", `Timeout: ${error.message.substring(0, 100)}`);
                    }

                }

                // Save Excel continuously
                saveImageExcel();

                this.serialNumber++;

                // Navigate back to product catalogue
                await this.page.goBack({ waitUntil: 'domcontentloaded' });

                // Wait for product cards to reload
                await this.page.waitForSelector('div.border.rounded-xl', { timeout: 10000 });

                await this.page.waitForTimeout(300);

            }

            // Pagination
            const nextButton = this.page.getByRole('button', { name: /Next/i });

            if (await nextButton.isVisible()) {

                console.log("Moving to next page...");

                const firstProductName = await products.first().locator('h3').innerText();

                await nextButton.click();

                await this.page.waitForFunction(
                    (oldName) => {
                        const firstH3 = document.querySelector('div.border.rounded-xl h3');
                        return firstH3 && firstH3.innerText !== oldName;
                    },
                    firstProductName,
                    { timeout: 15000 }
                );

                await this.page.waitForSelector('div.border.rounded-xl', { timeout: 10000 });

                pageNumber++;

            } else {

                console.log("All pages completed.");
                break;
            }
        }

        console.log(`\nTotal products tested: ${this.serialNumber - 1}`);

    }

}

module.exports = ProductDetailPage;
