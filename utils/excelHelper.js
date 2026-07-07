const XLSX = require('xlsx');
const fs = require('fs');

let results = [];

function addResult(srNo, productName, status) {

    results.push({
        "Sr No": srNo,
        "Product Name": productName,
        "Test(Pass/Fail)": status
    });

}

function saveExcel() {

    const worksheet = XLSX.utils.json_to_sheet(results);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    XLSX.writeFile(workbook, "reports/product-test-report.xlsx");

}

module.exports = { addResult, saveExcel };