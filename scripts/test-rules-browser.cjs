const {chromium}=require('../artifacts/browser-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const base='http://localhost:8080/api';
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'analyst@aml.local',password:process.env.AML_TEST_PASSWORD||'password123'})});
 assert.equal(login.status,200);const {token}=await login.json();
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 let response;
 for(let i=0;i<40;i++){response=await fetch(base+'/scoring/rules',{headers});if(response.ok)break;await new Promise(r=>setTimeout(r,1000));}
 assert.equal(response.status,200);const rules=await response.json();assert.equal(rules.length,5);
 const results={rules,examples:[],browserErrors:[]};
 assert.equal((await fetch(base+'/scoring/rules')).status,401);
 assert.equal((await fetch(base+'/scoring/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 for(const [amount,currency,country,score,codes] of [[125000,'MAD','MA',65,['HIGH_AMOUNT','ROUND_AMOUNT']],[9900,'MAD','MA',50,['STRUCTURING_PATTERN']],[50000,'USD','IR',95,['RISK_COUNTRY','ROUND_AMOUNT','FOREIGN_CURRENCY']],[125000,'USD','IR',100,['HIGH_AMOUNT','RISK_COUNTRY','ROUND_AMOUNT','FOREIGN_CURRENCY']]]){
   const r=await fetch(base+'/scoring/evaluate',{method:'POST',headers,body:JSON.stringify({amount,currency,country})});assert.equal(r.status,200);
   const evaluation=await r.json();assert.equal(evaluation.riskScore,score);assert.deepEqual(evaluation.triggeredRules,codes);results.examples.push({amount,currency,country,...evaluation});
 }
 assert.equal((await fetch(base+'/scoring/evaluate',{method:'POST',headers,body:'{}'})).status,400);
 const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 page.on('pageerror',e=>results.browserErrors.push(e.message));
 try{
  await page.goto('http://localhost:5173');
  await page.locator('#login-email').fill('analyst@aml.local');await page.locator('#login-password').fill(process.env.AML_TEST_PASSWORD||'password123');await page.locator('#login-submit-button').click();
  await page.getByRole('button',{name:/AML Rules/}).click();
  await page.locator('#rule-definition-HIGH_AMOUNT').waitFor();assert.equal(await page.locator('[id^="rule-definition-"]').count(),5);
  await page.getByText('Risk Score: 65 / 100',{exact:true}).waitFor();
  await page.getByRole('button',{name:'9,900'}).click();await page.getByText('Risk Score: 50 / 100',{exact:true}).waitFor();
  await page.locator('input[type="number"]').fill('50000');await page.locator('select').nth(0).selectOption('USD');await page.locator('select').nth(1).selectOption('IR');
  await page.getByText('Risk Score: 95 / 100',{exact:true}).waitFor();
  await page.getByText('Test a transaction',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/rules-real-evaluation.png'});
  await page.route('**/api/scoring/evaluate',route=>route.fulfill({status:503,body:'{}'}));await page.locator('input[type="number"]').fill('120000');await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Risk Score: 95 / 100',{exact:true}).count(),0);
  await page.unroute('**/api/scoring/evaluate');await page.locator('input[type="number"]').fill('125000');await page.getByText('Risk Score: 100 / 100',{exact:true}).waitFor();
  assert.deepEqual(results.browserErrors,[]);results.browser='passed';
 }finally{await browser.close();fs.writeFileSync('artifacts/rules-test-results.json',JSON.stringify(results,null,2));}
 console.log(JSON.stringify({api:'passed',scores:results.examples.map(e=>e.riskScore),browser:results.browser,browserErrors:results.browserErrors}));
})().catch(e=>{console.error(e);process.exitCode=1});
