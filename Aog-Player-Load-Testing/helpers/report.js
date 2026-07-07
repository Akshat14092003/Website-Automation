// ===========================================================
// AOG Player Load Testing — Report Helper
// ===========================================================
// Exports handleSummary that saves k6 results as JSON
// The run.ps1 wrapper auto-generates Excel after this
// ===========================================================

export function handleSummary(data) {
  // Inject stage and environment into the data for report generation
  const stage = __ENV.STAGE || 'smoke';
  const baseUrl = __ENV.BASE_URL || '';
  data.__meta = { stage, baseUrl };

  return {
    'results/latest-result.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

// -----------------------------------------------------------
// Simple text summary for stdout
// -----------------------------------------------------------
function textSummary(data) {
  const lines = [];
  lines.push('\n========== TEST SUMMARY ==========\n');

  // Thresholds
  if (data.metrics) {
    for (const [name, metric] of Object.entries(data.metrics)) {
      if (metric.thresholds) {
        for (const [threshold, passed] of Object.entries(metric.thresholds)) {
          const icon = passed ? 'PASS' : 'FAIL';
          lines.push(`  [${icon}] ${name}: ${threshold}`);
        }
      }
    }
  }

  lines.push('\n==================================\n');
  return lines.join('\n');
}
