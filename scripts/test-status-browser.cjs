const { chromium } = require('../artifacts/browser-tools/node_modules/playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'http://localhost:8080/api';
const password = process.env.AML_TEST_PASSWORD || 'password123';
const results = { transitions: [], browserErrors: [], requests: [] };
const sql = (query) => execFileSync('docker', ['compose','exec','-T','postgres','psql','-U','aml_user','-d','aml_db','-At','-c',query], { encoding: 'utf8' }).trim();
async function login(email) {
  const response = await fetch(base + '/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  assert.equal(response.status, 200, 'Test account login');
  return (await response.json()).token;
}
async function api(path, token, options={}) {
  return fetch(base+path, {...options, headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...options.headers}});
}
async function waitFor(check, label) {
  for(let n=0;n<60;n++) { if(await check()) return; await new Promise(r=>setTimeout(r,1000)); }
  throw new Error('Timed out: '+label);
}
(async()=>{
  const token=await login('analyst@aml.local');
  const auditor=await login('auditor@aml.local');
  const alerts=await (await api('/alerts',token)).json();
  const alert=alerts.filter(a=>a.status==='PENDING').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id-b.id)[0];
  assert(alert && Number.isInteger(alert.statusVersion));
  results.alertId=alert.id;
  const reportId=sql(`select id from reporting_schema.alert_report where alert_id=${alert.id}`);
  assert(reportId);
  const initialStats=await (await api('/reports/stats',token)).json();
  const day=new Date(alert.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  const dayIndex=initialStats.statusTimeSeries.findIndex(point=>point.date===day);
  const baseline=initialStats.statusTimeSeries[dayIndex];
  assert(baseline);
  results.unauthenticated=(await fetch(base+'/reports/stats')).status;
  results.auditorRead=(await api('/reports/stats',auditor)).status;
  results.auditorWrite=(await api(`/alerts/${alert.id}/status`,auditor,{method:'PUT',body:'"CONFIRMED"'})).status;
  results.invalidStatus=(await api(`/alerts/${alert.id}/status`,token,{method:'PUT',body:'"INVALID"'})).status;
  results.nullStatus=(await api(`/alerts/${alert.id}/status`,token,{method:'PUT',body:'null'})).status;
  results.missingAlert=(await api('/alerts/999999999/status',token,{method:'PUT',body:'"PENDING"'})).status;
  assert.equal(results.unauthenticated,401);assert.equal(results.auditorRead,200);assert.equal(results.auditorWrite,403);
  assert.equal(results.invalidStatus,400);assert.equal(results.nullStatus,400);assert.equal(results.missingAlert,404);
  const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',error=>results.browserErrors.push(error.message));
  page.on('response',response=>{if(response.request().method()==='PUT')results.requests.push({status:response.status(),body:response.request().postData()});});
  try {
    await page.goto('http://localhost:5173');
    await page.locator('#login-email').fill('analyst@aml.local');
    await page.locator('#login-password').fill(password);
    await page.locator('#login-submit-button').click();
    await page.locator('#sidebar-navigation').waitFor();
    await page.getByRole('button',{name:/^Alerts/}).click();
    await page.locator('#search-alerts-input').fill(alert.transactionId);
    await page.locator(`#alert-row-${alert.id}`).click();
    for(const [status,button] of [['CONFIRMED','#btn-mark-confirmed'],['FALSE_POSITIVE','#btn-mark-false-positive'],['PENDING','#btn-revert-pending']]) {
      const responsePromise=page.waitForResponse(r=>r.url().endsWith(`/alerts/${alert.id}/status`) && r.request().method()==='PUT');
      await page.locator(button).click();
      const response=await responsePromise;assert.equal(response.status(),200);
      const saved=await response.json();assert.equal(saved.status,status);
      await page.getByText('Status updated to '+status,{exact:true}).waitFor();
      await waitFor(()=>sql(`select status from reporting_schema.alert_report where alert_id=${alert.id}`)===status,'reporting status');
      assert.equal(sql(`select status from alert_schema.alert where id=${alert.id}`),status);
      assert.equal(sql(`select id from reporting_schema.alert_report where alert_id=${alert.id}`),reportId);
      assert.equal(sql(`select count(*) from reporting_schema.alert_report where alert_id=${alert.id}`),'1');
      const stats=await (await api('/reports/stats',token)).json();
      assert.equal(Object.values(stats.statusDistribution).reduce((a,b)=>a+b,0),stats.totalAlerts);
      stats.timeSeries.forEach((point,index)=>{
        const statuses=stats.statusTimeSeries[index];
        assert.equal(point.date,statuses.date);
        assert.equal(point.alerts,statuses.pending+statuses.confirmed+statuses.falsePositive);
      });
      const point=stats.statusTimeSeries[dayIndex];
      assert.equal(point.confirmed,baseline.confirmed+(status==='CONFIRMED'?1:0));
      assert.equal(point.falsePositive,baseline.falsePositive+(status==='FALSE_POSITIVE'?1:0));
      assert.equal(point.pending,baseline.pending-(status==='PENDING'?0:1));
      results.transitions.push({status,reportId,version:saved.statusVersion,distribution:stats.statusDistribution,day:point});
      await page.locator('#close-drawer-button').click();
      await page.getByRole('button',{name:'Reporting & Analytics'}).click();
      await page.getByText('Daily AML Alert Inflow (Last 15 Days)',{exact:true}).waitFor();
      await waitFor(async()=>{
        const displayed=await page.locator('#chart-status-distribution .text-base').allTextContents();
        return JSON.stringify(displayed.slice(1).map(Number))===JSON.stringify(['CONFIRMED','FALSE_POSITIVE'].map(s=>stats.statusDistribution[s]));
      },'status card refresh');
      const stacked=page.locator('section').filter({has:page.getByText('Daily AML Alert Inflow (Last 15 Days)',{exact:true})});
      assert.equal(await stacked.locator('.group.relative').count(),Math.min(stats.statusTimeSeries.length,15));
      assert(!/demonstration|simulated/i.test(await stacked.textContent()));
      const firstPoint=stats.statusTimeSeries.slice(-15)[0];
      const tooltip=await stacked.locator('.group.relative').first().textContent();
      assert(tooltip.includes('Conf: '+firstPoint.confirmed));
      assert(tooltip.includes('FP: '+firstPoint.falsePositive));
      assert(tooltip.includes('Pend: '+firstPoint.pending));
      if(status==='CONFIRMED') {
        await stacked.scrollIntoViewIfNeeded();
        await page.screenshot({path:'artifacts/reporting-confirmed.png',fullPage:true});
        fs.writeFileSync('artifacts/stats-confirmed.json',JSON.stringify(stats,null,2));
        // Replay a stale snapshot twice: neither the row count nor the newer decision may change.
        execFileSync('docker',['compose','exec','-T','kafka','/opt/kafka/bin/kafka-console-producer.sh','--bootstrap-server','localhost:9092','--topic','alerts','--property','parse.key=true','--property','key.separator=|'],{input:(alert.transactionId+'|'+JSON.stringify(alert)+'\n').repeat(2),encoding:'utf8'});
        await new Promise(r=>setTimeout(r,3000));
        assert.equal(sql(`select status from reporting_schema.alert_report where alert_id=${alert.id}`),'CONFIRMED');
        assert.equal(sql(`select count(*) from reporting_schema.alert_report where alert_id=${alert.id}`),'1');
        results.staleReplay='passed';
      }
      await page.getByRole('button',{name:/^Alerts/}).click();
      await page.locator('#search-alerts-input').fill(alert.transactionId);
      await page.locator(`#alert-row-${alert.id}`).click();
    }
    // A failed API request must not display a success message or mutate the local status.
    await page.route(`**/api/alerts/${alert.id}/status`,route=>route.fulfill({status:503,body:'{}',contentType:'application/json'}));
    await page.locator('#btn-mark-confirmed').click();
    await page.getByRole('alert').waitFor();
    assert.equal(sql(`select status from alert_schema.alert where id=${alert.id}`),'PENDING');
    assert.equal(await page.getByText('Status updated to CONFIRMED',{exact:true}).count(),0);
    results.failedRequest='passed';
    await page.unroute(`**/api/alerts/${alert.id}/status`);
    await page.locator('#close-drawer-button').click();
    await page.reload();
    await page.getByRole('button',{name:'Reporting & Analytics'}).click();
    await page.getByText('Daily AML Alert Inflow (Last 15 Days)',{exact:true}).waitFor();
    results.reload='passed';
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'artifacts/reporting-mobile.png',fullPage:true});
    assert.deepEqual(results.browserErrors,[]);
    results.result='passed';
  } finally {
    await api(`/alerts/${alert.id}/status`,token,{method:'PUT',body:JSON.stringify(alert.status)});
    await browser.close();
    fs.writeFileSync('artifacts/status-browser-results.json',JSON.stringify(results,null,2));
  }
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
