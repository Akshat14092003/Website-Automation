const XLSX = require('xlsx');

let results = [];

function addImageResult(srNo, productName, productUrl, imageStatus, imageSrc) {

    results.push({
        "Sr No": srNo,
        "Product Name": productName,
        "Product URL": productUrl,
        "Image Status": imageStatus,
        "Image Src": imageSrc || "N/A"
    });

}

function saveImageExcel() {

    const worksheet = XLSX.utils.json_to_sheet(results);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Image Results");

    XLSX.writeFile(workbook, "reports/product-image-test-report.xlsx");

}

module.exports = { addImageResult, saveImageExcel };
