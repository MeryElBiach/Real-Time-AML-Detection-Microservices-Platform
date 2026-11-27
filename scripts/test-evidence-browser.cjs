// Frontend contract test with explicit API fixtures; no running backend is required.
// Uses the same local Playwright installation as the repository's other browser scripts.
const { chromium } = require('../artifacts/browser-tools/node_modules/playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const origin = 'http://127.0.0.1:5181';
const evidence = [{ code: 'HIGH_AMOUNT', points: 50, ruleVersion: 'demo-v1', evidence: {
  amount: '125000.25', currency: 'USD', threshold: '100000.00', comparison: '>=',
  scope: 'SINGLE_TRANSACTION', currencyConversionApplied: false,
} }];
const alerts = [
  { id: 1, transactionId: 'TX-USD', fromAccount: 'ACC-1', toAccount: 'ACC-2', amount: 125000.25,
    currency: 'USD', country: 'MA', riskScore: 50, triggeredRules: 'HIGH_AMOUNT',
    createdAt: '2026-11-24T10:00:00', transactionTimestamp: '2026-11-24T09:00:00',
    status: 'PENDING', statusVersion: 0, scoringVersion: 'demo-v1', ruleHits: evidence },
  { id: 2, transactionId: 'TX-LEGACY', fromAccount: 'ACC-3', toAccount: 'ACC-4', amount: 9900,
    currency: null, country: 'MA', riskScore: 50, triggeredRules: 'STRUCTURING_PATTERN',
    createdAt: '2026-11-23T10:00:00', transactionTimestamp: null,
    status: 'PENDING', statusVersion: 0, scoringVersion: null, ruleHits: [] },
];
const stats = { totalAlerts: 2, alertsByRule: { HIGH_AMOUNT: 1, STRUCTURING_PATTERN: 1 },
  alertsByCountry: { MA: 2 }, averageRiskScore: 50, highRiskAlerts: 2,
  riskScoreDistribution: { '0-49': 0, '50-64': 2, '65-79': 0, '80-100': 0 },
  timeSeries: [{ date: '24 Nov', alerts: 2 }], statusDistribution: { PENDING: 2, CONFIRMED: 0, FALSE_POSITIVE: 0 },
  statusTimeSeries: [{ date: '24 Nov', pending: 2, confirmed: 0, falsePositive: 0 }] };

(async () => {
  const server = spawn(process.execPath, [path.resolve(__dirname, '../Frontend/node_modules/vite/bin/vite.js'),
    'preview', '--host', '127.0.0.1', '--port', '5181', '--strictPort'],
    { cwd: path.resolve(__dirname, '../Frontend'), windowsHide: true, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { ready = (await fetch(origin)).ok; } catch { /* wait for the local preview */ }
      if (ready) break;
      if (server.exitCode !== null) throw new Error('Preview exited; check that port 5181 is available.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'Preview server must start');
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.AML_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('aml_token', 'browser-contract-test'));
    let failDetail = false;
    let delayDetail = false;
    let detailRequests = 0;
    let failEvaluation = false;
    await page.route('http://localhost:8080/api/**', async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { 'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      assert.equal(request.headers().authorization, 'Bearer browser-contract-test');
      let body;
      if (pathname === '/api/alerts') {
        body = alerts.map(({ ruleHits, scoringVersion, ...summary }) => summary);
      } else if (pathname === '/api/reports/stats') {
        body = stats;
      } else if (pathname === '/api/scoring/rules') {
        body = ['HIGH_AMOUNT', 'STRUCTURING_PATTERN', 'RISK_COUNTRY', 'ROUND_AMOUNT', 'FOREIGN_CURRENCY']
          .map((code, index) => ({ code, name: code, condition: 'Demonstration condition',
            scoreContribution: [50, 50, 60, 15, 20][index], description: 'Demonstration rule', status: 'Active' }));
      } else if (pathname === '/api/scoring/evaluate') {
        if (failEvaluation) return route.fulfill({ status: 503, headers, json: {} });
        const { amount, currency, country } = request.postDataJSON();
        assert.equal(currency, 'MAD'); assert.equal(country, 'MA');
        const hits = amount === 125000 ? [
          { code: 'HIGH_AMOUNT', points: 50, ruleVersion: 'demo-v1',
            evidence: { amount: '125000.00', currency: 'MAD', threshold: '100000.00', currencyConversionApplied: false } },
          { code: 'ROUND_AMOUNT', points: 15, ruleVersion: 'demo-v1',
            evidence: { amount: '125000.00', currency: 'MAD', minimumAmount: '10000.00', multipleOf: '5000.00' } },
        ] : [{ code: 'STRUCTURING_PATTERN', points: 50, ruleVersion: 'demo-v1',
          evidence: { amount: '9900.00', currency: 'MAD', expectedAmount: '9900.00', historyEvaluated: false } }];
        assert([9900, 125000].includes(amount));
        body = { riskScore: amount === 125000 ? 65 : 50, scoringVersion: 'demo-v1', ruleHits: hits,
          triggeredRules: hits.map(hit => hit.code), ruleEvaluations: hits.map(hit => ({ code: hit.code, triggered: true, contribution: hit.points })) };
      } else if (/^\/api\/alerts\/\d+\/status$/.test(pathname)) {
        const alert = alerts.find(alert => alert.id === Number(pathname.split('/')[3]));
        alert.status = request.postDataJSON();
        alert.statusVersion++;
        body = alert;
      } else if (/^\/api\/alerts\/\d+$/.test(pathname)) {
        detailRequests++;
        if (failDetail) return route.fulfill({ status: 503, headers, json: {} });
        if (delayDetail && pathname.endsWith('/1')) await new Promise(resolve => setTimeout(resolve, 300));
        body = alerts.find(alert => alert.id === Number(pathname.split('/')[3]));
      } else {
        throw new Error(`Unexpected API request: ${pathname}`);
      }
      await route.fulfill({ status: body ? 200 : 404, headers, json: body || {} });
    });
    await page.goto(origin);
    await page.getByRole('button', { name: /^Alerts/ }).click();
    await page.locator('#alert-row-1').click();
    const recorded = page.locator('[data-testid="evidence-HIGH_AMOUNT"]');
    await recorded.waitFor();
    assert((await recorded.textContent()).includes('125000.25'));
    assert((await recorded.textContent()).includes('USD'));
    const drawer = page.locator('#alert-detail-drawer-panel');
    assert((await drawer.textContent()).includes('24 Nov 2026, 09:00:00'));
    await page.locator('#btn-mark-confirmed').click();
    await page.getByText('Status updated to CONFIRMED', { exact: true }).waitFor();
    assert.deepEqual(alerts[0].ruleHits, evidence);
    await page.screenshot({ path: path.resolve(__dirname, '../artifacts/evidence-recorded.png') });
    await page.locator('#close-drawer-button').click();

    await page.locator('#alert-row-2').click();
    await page.locator('[data-testid="evidence-unavailable"]').waitFor();
    assert(await drawer.getByText('Unavailable', { exact: true }).count() >= 1);
    assert(!(await drawer.textContent()).includes('MAD'));
    assert(!(await drawer.textContent()).includes('demo-v1'));
    await page.locator('#close-drawer-button').click();

    failDetail = true;
    await page.locator('#alert-row-1').click();
    await page.getByRole('button', { name: 'Retry loading details' }).waitFor();
    assert(await page.locator('#btn-mark-confirmed').isDisabled());
    failDetail = false;
    await page.getByRole('button', { name: 'Retry loading details' }).click();
    await recorded.waitFor();
    assert(await page.locator('#btn-mark-confirmed').isEnabled());
    await page.locator('#close-drawer-button').click();

    delayDetail = true;
    await page.locator('#alert-row-1').click();
    await page.locator('#close-drawer-button').click();
    await page.locator('#alert-row-2').click();
    await page.locator('[data-testid="evidence-unavailable"]').waitFor();
    await page.waitForTimeout(400);
    assert((await drawer.textContent()).includes('TX-LEGACY'));
    assert(!(await drawer.textContent()).includes('TX-USD'));
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: path.resolve(__dirname, '../artifacts/evidence-legacy-mobile.png') });
    await page.locator('#close-drawer-button').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: /AML Rules/ }).click();
    await page.getByText('Risk Score: 65 / 100', { exact: true }).waitFor();
    assert((await recorded.textContent()).includes('125000.00'));
    await page.getByRole('button', { name: '9,900' }).click();
    await page.getByText('Risk Score: 50 / 100', { exact: true }).waitFor();
    assert.equal(await recorded.count(), 0);
    const exact = await page.locator('[data-testid="evidence-STRUCTURING_PATTERN"]').textContent();
    assert(exact.includes('9900.00') && exact.includes('Account history evaluated') && exact.includes('No'));
    failEvaluation = true;
    await page.getByRole('button', { name: '125,000' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('[data-testid="rule-evidence"]').count(), 0);
    assert.deepEqual(browserErrors, []);
    assert(detailRequests >= 5);
    console.log(JSON.stringify({ result: 'passed', api: 'fixtures', detailRequests,
      checks: ['recorded facts', 'status preservation', 'legacy missing data', 'retry', 'stale request', 'mobile',
        'rule tester evidence', 'evaluation failure'], browserErrors }));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
