const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('reports/login-test-report.xlsx');
    const sheetName = workbook.SheetNames[0];
    const results = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Found ${results.length} test cases in report:`);
    results.forEach(r => console.log(`- ${r['Test ID']}: ${r['Status']}`));
} catch (e) {
    console.log("Error reading report:", e.message);
}
