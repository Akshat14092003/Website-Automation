const XLSX = require('xlsx');
const fs = require('fs');

const reportPath = "reports/login-test-report.xlsx";

function initLoginExcel() {
    if (!fs.existsSync("reports")) {
        fs.mkdirSync("reports");
    }

    if (fs.existsSync(reportPath)) {
        try {
            fs.unlinkSync(reportPath);
            console.log("✓ Old report deleted successfully");
        } catch (e) {
            console.warn("⚠ Could not delete old report - file may be open in Excel. Will append to existing file.");
        }
    }
}

function addLoginTestResult(testId, testName, status, details = "") {
    let results = [];
    
    // Read existing results if file exists
    if (fs.existsSync(reportPath)) {
        try {
            const workbook = XLSX.readFile(reportPath);
            const sheetName = workbook.SheetNames[0];
            results = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } catch (e) {
            console.warn("⚠ Could not read existing Excel file - it may be open. Starting fresh.");
        }
    }
    
    // Add new test result
    results.push({
        "Test ID": testId,
        "Test Name": testName,
        "Status": status,
        "Details": details
    });

    // Write all results to Excel with retry logic
    let retries = 3;
    let written = false;
    
    while (retries > 0 && !written) {
        try {
            const worksheet = XLSX.utils.json_to_sheet(results);
            const workbook = XLSX.utils.book_new();
            
            // Set column widths
            worksheet['!cols'] = [
                { wch: 10 },  // Test ID
                { wch: 50 },  // Test Name
                { wch: 10 },  // Status
                { wch: 60 }   // Details
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, "Login Test Results");
            XLSX.writeFile(workbook, reportPath);
            
            console.log(`✓ Added ${testId} to report (Total: ${results.length} tests)`);
            written = true;
        } catch (e) {
            retries--;
            if (retries === 0) {
                console.error(`✗ Failed to write ${testId} to Excel after 3 attempts. Please close the Excel file.`);
            }
        }
    }
}

module.exports = { initLoginExcel, addLoginTestResult };
