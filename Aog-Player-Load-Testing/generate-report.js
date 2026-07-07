// ===========================================================
// Total Liquor Buyer Load Testing — HTML + Excel Report Generator
// ===========================================================
// Auto-called by run-test.ps1 after k6 finishes
// Generates both HTML infographic and Excel report in reports/
// ===========================================================
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const resultsDir = path.join(__dirname, 'results');
const reportsDir = path.join(__dirname, 'reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

// Clean old reports (both HTML and Excel)
const oldFiles = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.html') || f.endsWith('.xlsx'));
for (const f of oldFiles) {
  fs.unlinkSync(path.join(reportsDir, f));
  console.log(`Deleted old report: ${f}`);
}

// Read latest result
const jsonFile = path.join(resultsDir, 'latest-result.json');
if (!fs.existsSync(jsonFile)) {
  console.error('No result file found. Run a k6 test first.');
  process.exit(1);
}
console.log('Reading: results/latest-result.json');
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

// -----------------------------------------------------------
// Extract metadata (stage + environment)
// -----------------------------------------------------------
const meta = data.__meta || {};
const stageName = (meta.stage || 'smoke').toUpperCase();
const baseUrl = meta.baseUrl || '';

// Detect environment from URL
let envName = 'Dev';
if (baseUrl.includes('.qa.') || baseUrl.includes('qa-')) envName = 'QA';
else if (baseUrl.includes('.staging.') || baseUrl.includes('staging-')) envName = 'Staging';
else if (baseUrl.includes('.prod.') || baseUrl.includes('prod-') || (!baseUrl.includes('.dev.') && !baseUrl.includes('localhost'))) envName = 'Dev';
if (baseUrl.includes('.dev.') || baseUrl.includes('localhost')) envName = 'Dev';

// Map stage to test type label
const testTypeLabels = { SMOKE: 'Smoke Test', LOAD: 'Load Test', STRESS: 'Stress Test', SPIKE: 'Spike Test' };
const testTypeLabel = testTypeLabels[stageName] || 'Load Test';

// -----------------------------------------------------------
// Extract data
// -----------------------------------------------------------
const m = data.metrics || {};
const totalReqs = m.http_reqs?.values?.count || 0;
const failRate = m.http_req_failed?.values?.rate || 0;
const httpSuccessRate = ((1 - failRate) * 100).toFixed(1);
const successRate = httpSuccessRate; // kept for backward compat
const totalFails = Math.round(failRate * totalReqs);
const maxVUs = m.vus_max?.values?.max || m.vus_max?.values?.value || 0;
const avgDuration = m.http_req_duration?.values?.avg || 0;
const minDuration = m.http_req_duration?.values?.min || 0;
const medDuration = m.http_req_duration?.values?.med || 0;
const p90Duration = m.http_req_duration?.values?.['p(90)'] || 0;
const p95Duration = m.http_req_duration?.values?.['p(95)'] || 0;
const p99Duration = m.http_req_duration?.values?.['p(99)'] || 0;
const maxDuration = m.http_req_duration?.values?.max || 0;
const throughput = m.http_reqs?.values?.rate || 0;
const dataRecv = m.data_received?.values?.count || 0;
const dataSent = m.data_sent?.values?.count || 0;
const iterations = m.iterations?.values?.count || 0;
const testDuration = totalReqs / (throughput || 1);

// Thresholds
let overallStatus = 'PASS';
const thresholds = [];
for (const [name, metric] of Object.entries(m)) {
  if (metric.thresholds && !name.includes('{')) {
    for (const [rule, result] of Object.entries(metric.thresholds)) {
      const passed = typeof result === 'object' ? result.ok : result;
      if (!passed) overallStatus = 'FAIL';
      thresholds.push({ name, rule, passed });
    }
  }
}

// Flow breakdown from groups
const flows = [];
function walkGroups(group) {
  if (group.groups) {
    for (const g of group.groups) {
      const checks = g.checks || [];
      const totalChecks = checks.reduce((s, c) => s + c.passes + c.fails, 0);
      const passedChecks = checks.reduce((s, c) => s + c.passes, 0);
      const failedChecks = checks.reduce((s, c) => s + c.fails, 0);
      if (checks.length > 0) {
        flows.push({
          name: g.name,
          checks: checks.length,
          totalChecks,
          passedChecks,
          failedChecks,
          passRate: totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : '0',
          status: failedChecks === 0 ? 'PASS' : 'FAIL',
        });
      }
    }
  }
}
walkGroups(data.root_group || {});

// Per-check detail
const checkDetails = [];
function walkChecks(group, groupName) {
  if (group.checks) {
    for (const c of group.checks) {
      checkDetails.push({
        group: groupName || 'Setup',
        name: c.name,
        passes: c.passes,
        fails: c.fails,
        total: c.passes + c.fails,
        rate: c.passes + c.fails > 0 ? ((c.passes / (c.passes + c.fails)) * 100).toFixed(1) : '0',
        status: c.fails === 0 ? 'PASS' : 'FAIL',
      });
    }
  }
  if (group.groups) {
    for (const g of group.groups) walkChecks(g, g.name);
  }
}
walkChecks(data.root_group || {}, '');

// API-level success rate (from checks, not HTTP status)
const totalChecksAll = checkDetails.reduce((s, c) => s + c.total, 0);
const passedChecksAll = checkDetails.reduce((s, c) => s + c.passes, 0);
const apiSuccessRate = totalChecksAll > 0 ? ((passedChecksAll / totalChecksAll) * 100).toFixed(1) : '0';

// Helpers
const r = (v) => (v !== undefined && v !== null ? Math.round(v * 100) / 100 : 0);
const ms = (v) => `${r(v).toFixed(0)}ms`;
const sec = (v) => `${(v / 1000).toFixed(3)}s`;
const fmtBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};
const fmtDur = (s) => {
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const now = new Date();
const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Success rate circle SVG — uses API check rate (the meaningful one)
const circleRadius = 54;
const circleCircum = 2 * Math.PI * circleRadius;
const circleOffset = circleCircum * (1 - parseFloat(apiSuccessRate) / 100);
const circleColor = parseFloat(apiSuccessRate) >= 99 ? '#2dd4a8' : parseFloat(apiSuccessRate) >= 90 ? '#eab308' : '#ef4444';

// Bar chart max for response times
const maxRT = Math.max(p90Duration, p95Duration, p99Duration, maxDuration, 500);

// Flow bar max
const maxFlowChecks = Math.max(...flows.map((f) => f.totalChecks), 1);

// -----------------------------------------------------------
// HTML Template
// -----------------------------------------------------------
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AOG Load Test Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0a0e1a; color: #e2e8f0; }
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 40px 60px; page-break-after: always; }

  /* Header */
  .header-label { color: #2dd4a8; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
  .header-title { font-size: 42px; font-weight: 800; color: #fff; margin: 8px 0 4px; }
  .header-sub { color: #94a3b8; font-size: 15px; }
  .header-line { height: 3px; background: linear-gradient(90deg, #2dd4a8, transparent); margin: 20px 0 30px; border-radius: 2px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left { flex: 1; }

  /* Success Circle */
  .success-circle { width: 150px; height: 150px; position: relative; }
  .success-circle svg { transform: rotate(-90deg); }
  .success-circle .label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .success-circle .pct { font-size: 32px; font-weight: 800; color: ${circleColor}; }
  .success-circle .sub { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }

  /* Stat Cards */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 35px; }
  .stat-card { background: linear-gradient(135deg, #111827, #1a2035); border: 1px solid #1e293b; border-radius: 12px; padding: 24px; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 50px; height: 3px; border-radius: 0 0 4px 0; }
  .stat-card.blue::before { background: #3b82f6; }
  .stat-card.green::before { background: #2dd4a8; }
  .stat-card.orange::before { background: #f59e0b; }
  .stat-card.red::before { background: #ef4444; }
  .stat-card.purple::before { background: #a855f7; }
  .stat-val { font-size: 36px; font-weight: 800; color: #fff; }
  .stat-label { font-size: 13px; color: #2dd4a8; margin-top: 4px; font-weight: 500; }
  .stat-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* Section */
  .section-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; position: relative; padding-left: 0; }
  .section-title::after { content: ''; display: block; width: 100%; height: 2px; background: linear-gradient(90deg, #2dd4a8, transparent); margin-top: 8px; }
  .section { margin-bottom: 35px; }

  /* Flow Cards */
  .flow-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
  .flow-card { background: linear-gradient(135deg, #111827, #1a2035); border: 1px solid #1e293b; border-radius: 10px; padding: 18px; border-left: 3px solid; }
  .flow-card.pass { border-left-color: #2dd4a8; }
  .flow-card.fail { border-left-color: #ef4444; }
  .flow-name { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px; }
  .flow-stat-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .flow-stat-label { font-size: 11px; color: #64748b; }
  .flow-stat-val { font-size: 11px; color: #e2e8f0; font-weight: 500; }
  .flow-bar { height: 4px; background: #1e293b; border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .flow-bar-fill { height: 100%; border-radius: 2px; }
  .flow-bar-fill.pass { background: #2dd4a8; }
  .flow-bar-fill.fail { background: #ef4444; }
  .flow-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-top: 8px; }
  .flow-badge.pass { background: rgba(45,212,168,0.15); color: #2dd4a8; }
  .flow-badge.fail { background: rgba(239,68,68,0.15); color: #ef4444; }

  /* Response Time Bars */
  .rt-row { display: flex; align-items: center; margin-bottom: 12px; }
  .rt-label { width: 70px; font-size: 13px; color: #94a3b8; font-weight: 500; }
  .rt-bar-wrap { flex: 1; height: 28px; background: #1e293b; border-radius: 6px; position: relative; overflow: hidden; }
  .rt-bar { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 12px; font-size: 12px; font-weight: 600; color: #fff; min-width: 60px; }
  .rt-bar.blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  .rt-bar.orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
  .rt-bar.purple { background: linear-gradient(90deg, #a855f7, #c084fc); }
  .rt-bar.red { background: linear-gradient(90deg, #ef4444, #f87171); }
  .rt-bar.teal { background: linear-gradient(90deg, #2dd4a8, #5eead4); }
  .rt-threshold { position: absolute; right: 0; top: 0; bottom: 0; width: 2px; background: #ef4444; }
  .rt-threshold-label { position: absolute; right: 6px; top: -18px; font-size: 10px; color: #ef4444; font-weight: 600; }

  /* Table */
  .check-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  .check-table th { text-align: left; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; border-bottom: 1px solid #1e293b; }
  .check-table td { font-size: 12px; padding: 8px 12px; border-bottom: 1px solid #111827; color: #cbd5e1; }
  .check-table tr:hover td { background: rgba(45,212,168,0.03); }
  .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .badge.pass { background: rgba(45,212,168,0.15); color: #2dd4a8; }
  .badge.fail { background: rgba(239,68,68,0.15); color: #ef4444; }

  /* Threshold cards */
  .threshold-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
  .threshold-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .threshold-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; }
  .threshold-icon.pass { background: rgba(45,212,168,0.15); color: #2dd4a8; }
  .threshold-icon.fail { background: rgba(239,68,68,0.15); color: #ef4444; }
  .threshold-name { font-size: 12px; color: #94a3b8; }
  .threshold-rule { font-size: 11px; color: #64748b; }

  /* Footer */
  .footer { text-align: center; color: #475569; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b; }

  /* Detailed metrics */
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
  .metric-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; text-align: center; }
  .metric-card .val { font-size: 22px; font-weight: 700; color: #fff; }
  .metric-card .label { font-size: 11px; color: #64748b; margin-top: 4px; }

  @media print {
    body { background: #0a0e1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; padding: 20px; }
  }
</style>
</head>
<body>

<!-- ==================== PAGE 1 ==================== -->
<div class="page">
  <div class="header-row">
    <div class="header-left">
      <div class="header-label">Performance Report</div>
      <div class="header-title">${testTypeLabel}<br>Results</div>
      <div class="header-sub">AOG Player Panel | ${dateStr} | ${envName} Environment</div>
    </div>
    <div class="success-circle">
      <svg width="150" height="150" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="${circleRadius}" fill="none" stroke="#1e293b" stroke-width="8"/>
        <circle cx="60" cy="60" r="${circleRadius}" fill="none" stroke="${circleColor}" stroke-width="8"
          stroke-dasharray="${circleCircum}" stroke-dashoffset="${circleOffset}"
          stroke-linecap="round"/>
      </svg>
      <div class="label">
        <div class="pct">${apiSuccessRate}%</div>
        <div class="sub">API Success</div>
      </div>
    </div>
  </div>
  <div class="header-line"></div>

  <!-- Top Stats -->
  <div class="stats-row">
    <div class="stat-card blue">
      <div class="stat-val">${totalReqs.toLocaleString()}</div>
      <div class="stat-label">Total Requests</div>
      <div class="stat-sub">${iterations} iterations in ${fmtDur(testDuration)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-val">${maxVUs}</div>
      <div class="stat-label">Max Concurrent</div>
      <div class="stat-sub">Virtual users at peak load</div>
    </div>
    <div class="stat-card ${parseFloat(apiSuccessRate) >= 99 ? 'green' : parseFloat(apiSuccessRate) >= 90 ? 'orange' : 'red'}">
      <div class="stat-val">${apiSuccessRate}%</div>
      <div class="stat-label">API Check Pass Rate</div>
      <div class="stat-sub">${passedChecksAll.toLocaleString()} of ${totalChecksAll.toLocaleString()} checks passed</div>
    </div>
  </div>

  <!-- Dual Success Rate -->
  <div class="stats-row">
    <div class="stat-card ${parseFloat(httpSuccessRate) >= 99 ? 'green' : parseFloat(httpSuccessRate) >= 90 ? 'orange' : 'red'}">
      <div class="stat-val">${httpSuccessRate}%</div>
      <div class="stat-label">HTTP Delivery Rate</div>
      <div class="stat-sub">Server responded to ${(totalReqs - totalFails).toLocaleString()} of ${totalReqs.toLocaleString()} requests</div>
    </div>
    <div class="stat-card ${totalFails === 0 ? 'green' : 'red'}">
      <div class="stat-val">${totalFails.toLocaleString()}</div>
      <div class="stat-label">HTTP Failures</div>
      <div class="stat-sub">${totalFails === 0 ? 'Zero errors' : 'Timeouts + connection resets + server errors'}</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-val">${r(throughput).toFixed(1)}</div>
      <div class="stat-label">Throughput (req/s)</div>
      <div class="stat-sub">Requests processed per second</div>
    </div>
  </div>

  <!-- Response Times -->
  <div class="section">
    <div class="section-title">Response Time Breakdown</div>
    <div style="margin-top: 20px; position: relative;">
      <div class="rt-row">
        <div class="rt-label">Average</div>
        <div class="rt-bar-wrap">
          <div class="rt-bar blue" style="width: ${Math.max((avgDuration / maxRT) * 100, 8)}%">${ms(avgDuration)}</div>
        </div>
      </div>
      <div class="rt-row">
        <div class="rt-label">p(90)</div>
        <div class="rt-bar-wrap">
          <div class="rt-bar teal" style="width: ${Math.max((p90Duration / maxRT) * 100, 8)}%">${ms(p90Duration)}</div>
        </div>
      </div>
      <div class="rt-row">
        <div class="rt-label">p(95)</div>
        <div class="rt-bar-wrap">
          <div class="rt-bar orange" style="width: ${Math.max((p95Duration / maxRT) * 100, 8)}%">${ms(p95Duration)}</div>
        </div>
      </div>
      <div class="rt-row">
        <div class="rt-label">p(99)</div>
        <div class="rt-bar-wrap">
          <div class="rt-bar purple" style="width: ${Math.max((p99Duration / maxRT) * 100, 8)}%">${ms(p99Duration)}</div>
        </div>
      </div>
      <div class="rt-row">
        <div class="rt-label">Max</div>
        <div class="rt-bar-wrap">
          <div class="rt-bar red" style="width: ${Math.max((maxDuration / maxRT) * 100, 8)}%">${ms(maxDuration)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Detailed Metrics -->
  <div class="section">
    <div class="section-title">Performance Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card"><div class="val">${r(throughput).toFixed(1)}</div><div class="label">Requests/sec</div></div>
      <div class="metric-card"><div class="val">${ms(avgDuration)}</div><div class="label">Avg Response Time</div></div>
      <div class="metric-card"><div class="val">${fmtBytes(dataRecv)}</div><div class="label">Data Received</div></div>
      <div class="metric-card"><div class="val">${fmtBytes(dataSent)}</div><div class="label">Data Sent</div></div>
    </div>
  </div>

  <!-- Thresholds -->
  <div class="section">
    <div class="section-title">Thresholds</div>
    <div class="threshold-grid">
      ${thresholds
        .map(
          (t) => `
        <div class="threshold-card">
          <div class="threshold-icon ${t.passed ? 'pass' : 'fail'}">${t.passed ? '\u2713' : '\u2717'}</div>
          <div>
            <div class="threshold-name">${t.name}</div>
            <div class="threshold-rule">${t.rule}</div>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
  </div>

  <div class="footer">AOG Player Panel | ${testTypeLabel} Report | ${envName} | ${dateStr} | Page 1 of 2</div>
</div>

<!-- ==================== PAGE 2 ==================== -->
<div class="page">
  <div class="header-label">Performance Report</div>
  <div class="header-title" style="font-size: 32px;">Detailed Flow Analysis</div>
  <div class="header-line"></div>

  <!-- Flow Breakdown -->
  <div class="section">
    <div class="section-title">Per-Flow Breakdown</div>
    <div class="flow-grid">
      ${flows
        .map(
          (f) => `
        <div class="flow-card ${f.status.toLowerCase()}">
          <div class="flow-name">${f.name}</div>
          <div class="flow-stat-row"><span class="flow-stat-label">Checks Run</span><span class="flow-stat-val">${f.totalChecks}</span></div>
          <div class="flow-stat-row"><span class="flow-stat-label">Passed</span><span class="flow-stat-val">${f.passedChecks}</span></div>
          <div class="flow-stat-row"><span class="flow-stat-label">Failed</span><span class="flow-stat-val">${f.failedChecks}</span></div>
          <div class="flow-bar"><div class="flow-bar-fill ${f.status.toLowerCase()}" style="width: ${f.passRate}%"></div></div>
          <span class="flow-badge ${f.status.toLowerCase()}">${f.passRate}% Pass</span>
        </div>
      `,
        )
        .join('')}
    </div>
  </div>

  <!-- Checks Table -->
  <div class="section">
    <div class="section-title">All Checks Detail</div>
    <table class="check-table">
      <thead>
        <tr>
          <th>Flow</th>
          <th>Check</th>
          <th>Passes</th>
          <th>Fails</th>
          <th>Total</th>
          <th>Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${checkDetails
          .map(
            (c) => `
          <tr>
            <td>${c.group}</td>
            <td>${c.name}</td>
            <td>${c.passes}</td>
            <td>${c.fails}</td>
            <td>${c.total}</td>
            <td>${c.rate}%</td>
            <td><span class="badge ${c.status.toLowerCase()}">${c.status}</span></td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">AOG Player Panel | ${testTypeLabel} Report | ${envName} | ${dateStr} | Page 2 of 2</div>
</div>

</body>
</html>`;

// -----------------------------------------------------------
// Save HTML
// -----------------------------------------------------------
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filePrefix = `AOG-${envName}-${stageName.toLowerCase()}-test`;
const htmlFile = path.join(reportsDir, `${filePrefix}_${timestamp}.html`);
fs.writeFileSync(htmlFile, html);
console.log(`\nHTML report saved: ${htmlFile}`);

// ===========================================================
// EXCEL REPORT
// ===========================================================
const wb = XLSX.utils.book_new();

// --- Sheet 1: Summary ---
const summaryRows = [
  ['AOG Player Load Test Report'],
  [],
  ['Generated At', dateStr + ' ' + timeStr],
  ['Environment', envName],
  ['Overall Status', overallStatus],
  [],
  ['METRIC', 'VALUE'],
  ['Total Requests', totalReqs],
  ['HTTP Failures (timeouts/resets)', totalFails],
  ['API Check Pass Rate', apiSuccessRate + '%'],
  ['HTTP Delivery Rate', httpSuccessRate + '%'],
  ['Max Virtual Users', maxVUs],
  ['Test Duration', fmtDur(testDuration)],
  ['Iterations', iterations],
  [],
  ['RESPONSE TIMES', 'ms'],
  ['Average', r(avgDuration)],
  ['Minimum', r(minDuration)],
  ['Median (p50)', r(medDuration)],
  ['p(90)', r(p90Duration)],
  ['p(95)', r(p95Duration)],
  ['p(99)', r(p99Duration)],
  ['Maximum', r(maxDuration)],
  [],
  ['THROUGHPUT', 'VALUE'],
  ['Requests/sec', r(throughput)],
  ['Data Received', fmtBytes(dataRecv)],
  ['Data Sent', fmtBytes(dataSent)],
];
const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

// --- Sheet 2: Scenario Breakdown ---
const scenarioRows = [
  ['Scenario', 'Checks Run', 'Passed', 'Failed', 'Pass Rate %', 'Status'],
];
for (const f of flows) {
  scenarioRows.push([
    f.name,
    f.totalChecks,
    f.passedChecks,
    f.failedChecks,
    parseFloat(f.passRate),
    f.status,
  ]);
}
scenarioRows.push([]);
scenarioRows.push(['TOTAL',
  flows.reduce((s, f) => s + f.totalChecks, 0),
  flows.reduce((s, f) => s + f.passedChecks, 0),
  flows.reduce((s, f) => s + f.failedChecks, 0),
  flows.reduce((s, f) => s + f.totalChecks, 0) > 0
    ? ((flows.reduce((s, f) => s + f.passedChecks, 0) / flows.reduce((s, f) => s + f.totalChecks, 0)) * 100).toFixed(1)
    : '0',
  flows.every((f) => f.status === 'PASS') ? 'PASS' : 'FAIL',
]);
const scenarioSheet = XLSX.utils.aoa_to_sheet(scenarioRows);
scenarioSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
XLSX.utils.book_append_sheet(wb, scenarioSheet, 'Scenarios');

// --- Sheet 3: All Checks ---
const checksRows = [
  ['Scenario', 'Check Name', 'Passes', 'Fails', 'Total', 'Pass Rate %', 'Status'],
];
for (const c of checkDetails) {
  checksRows.push([c.group, c.name, c.passes, c.fails, c.total, parseFloat(c.rate), c.status]);
}
const checksSheet = XLSX.utils.aoa_to_sheet(checksRows);
checksSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
XLSX.utils.book_append_sheet(wb, checksSheet, 'All Checks');

// --- Sheet 4: Failed Checks (only failures) ---
const failedChecks = checkDetails.filter((c) => c.fails > 0);
const failedRows = [
  ['Scenario', 'Check Name', 'Passes', 'Fails', 'Total', 'Pass Rate %', 'Possible Cause'],
];
for (const c of failedChecks) {
  let cause = 'Unknown';
  if (c.name.includes('status 200') && parseFloat(c.rate) === 0) {
    cause = 'Endpoint always returns non-200. Likely a backend bug.';
  } else if (c.name.includes('status 200') && parseFloat(c.rate) < 50) {
    cause = 'Endpoint intermittently failing under load. Possible DB/connection issue.';
  } else if (c.name.includes('status 200') && parseFloat(c.rate) >= 50) {
    cause = 'Partial failures under high concurrency. May indicate race condition.';
  } else if (c.name.includes('responded')) {
    cause = 'Server not responding at all. Possible timeout or crash.';
  } else if (c.name.includes('success')) {
    cause = 'Server responds but returns { success: false }. Business logic error.';
  }
  failedRows.push([c.group, c.name, c.passes, c.fails, c.total, parseFloat(c.rate), cause]);
}
if (failedChecks.length === 0) {
  failedRows.push(['None', 'All checks passed', '-', '-', '-', '100', 'No issues detected']);
}
const failedSheet = XLSX.utils.aoa_to_sheet(failedRows);
failedSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, failedSheet, 'Failed Checks');

// --- Sheet 5: Thresholds ---
const thresholdRows = [['Metric', 'Threshold Rule', 'Status']];
for (const t of thresholds) {
  thresholdRows.push([t.name, t.rule, t.passed ? 'PASS' : 'FAIL']);
}
const thresholdSheet = XLSX.utils.aoa_to_sheet(thresholdRows);
thresholdSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, thresholdSheet, 'Thresholds');

// --- Sheet 6: Executive Summary ---
const totalChecksRun = flows.reduce((s, f) => s + f.totalChecks, 0);
const totalChecksPassed = flows.reduce((s, f) => s + f.passedChecks, 0);
const totalChecksFailed = flows.reduce((s, f) => s + f.failedChecks, 0);
const scenariosPassed = flows.filter((f) => f.status === 'PASS').length;
const scenariosFailed = flows.filter((f) => f.status === 'FAIL').length;

const summaryLines = [
  ['EXECUTIVE SUMMARY'],
  [],
  ['Test Date', dateStr],
  ['Environment', `${envName} (${baseUrl || 'localhost'})`],
  ['Test Type', testTypeLabel],
  ['Max Concurrent Users', maxVUs],
  [],
  ['RESULTS OVERVIEW'],
  ['Total API Requests', totalReqs],
  ['HTTP Failures (timeouts/resets)', totalFails],
  ['HTTP Delivery Rate', httpSuccessRate + '%'],
  ['API Check Pass Rate', apiSuccessRate + '%'],
  [],
  ['Scenarios Tested', flows.length],
  ['Scenarios Passed', scenariosPassed],
  ['Scenarios Failed', scenariosFailed],
  [],
  ['Total Checks Run', totalChecksRun],
  ['Checks Passed', totalChecksPassed],
  ['Checks Failed', totalChecksFailed],
  ['Check Pass Rate', totalChecksRun > 0 ? ((totalChecksPassed / totalChecksRun) * 100).toFixed(1) + '%' : 'N/A'],
  [],
  ['PERFORMANCE'],
  ['Avg Response Time', r(avgDuration) + 'ms'],
  ['p(95) Response Time', r(p95Duration) + 'ms'],
  ['p(99) Response Time', r(p99Duration) + 'ms'],
  ['Max Response Time', r(maxDuration) + 'ms'],
  ['Throughput', r(throughput) + ' req/s'],
  [],
  ['THRESHOLD RESULTS'],
  ...thresholds.map((t) => [`${t.name} ${t.rule}`, t.passed ? 'PASS' : 'FAIL']),
  [],
  ['FAILED APIs (if any)'],
  ...failedChecks.length > 0
    ? failedChecks.map((c) => [`${c.group}: ${c.name}`, `${c.fails} failures out of ${c.total} (${c.rate}% pass)`])
    : [['None', 'All checks passed']],
  [],
  ['CONCLUSION'],
  [overallStatus === 'PASS' && failedChecks.length === 0
    ? `The AOG backend successfully handled ${maxVUs} concurrent users with ${successRate}% success rate and avg response time of ${r(avgDuration)}ms. All API checks passed. The system is stable under this load.`
    : `The AOG backend was tested with ${maxVUs} concurrent users. ${scenariosFailed} scenario(s) had failures. ${failedChecks.length} API check(s) failed. Avg response time was ${r(avgDuration)}ms. Review the "Failed Checks" sheet for details on which APIs need attention.`
  ],
];
const execSheet = XLSX.utils.aoa_to_sheet(summaryLines);
execSheet['!cols'] = [{ wch: 35 }, { wch: 80 }];
XLSX.utils.book_append_sheet(wb, execSheet, 'Executive Summary');

// Save Excel
const xlsxFile = path.join(reportsDir, `${filePrefix}_${timestamp}.xlsx`);
XLSX.writeFile(wb, xlsxFile);
console.log(`Excel report saved: ${xlsxFile}`);
