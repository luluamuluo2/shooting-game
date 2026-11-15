import {mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.__game);await page.screenshot({path:'test-results/welcome.png'});
await page.click('#start');await page.waitForTimeout(2000);await page.screenshot({path:'test-results/gameplay.png'});
await page.evaluate(()=>{window.__game.state.ammo=1;window.__game.state.shot=0;window.__game.shoot();});assert.equal(await page.evaluate(()=>window.__game.state.mode),'quiz');
const t=await page.evaluate(()=>window.__game.state.elapsed);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__game.state.elapsed),t);
// Follow real random cards; all ten reward identities are covered deterministically by qa-runtime.
let solved=0;
for(let run=0;run<3;run++){
 if(run)await page.click('#resupply');
 const card=page.locator('#question-cards button').first(),reward=Number(await card.getAttribute('data-reward'));
 await card.click();
 const wrong=await page.evaluate(i=>[...document.querySelectorAll('#answer-options button')].findIndex(b=>Number(b.textContent)!==window.__game.questions[i].answer),reward);
 await page.locator('#answer-options button').nth(wrong).click();
 assert.equal(await page.locator('#next-question').count(),0);
 await page.waitForFunction(()=>document.querySelectorAll('#answer-options button:not(:disabled)').length===4);
 const need=reward<3?1:reward===3?2:3;
 for(let n=0;n<need;n++){
  const a=await page.evaluate(i=>window.__game.questions[i].answer,reward);
  await page.locator('#answer-options button').filter({hasText:new RegExp('^'+a+'$')}).click();
  solved++;assert.equal(await page.evaluate(()=>window.__game.state.solved),solved);
  await page.evaluate(()=>window.__game.answer());
  if(n<need-1)await page.waitForFunction(()=>document.querySelectorAll('#answer-options button:not(:disabled)').length===4);
 }
 assert.equal(await page.evaluate(()=>window.__game.state.mode),'reward');
 assert.equal(await page.locator('#continue').count(),0);await page.waitForFunction(()=>window.__game.state.mode==='playing');assert.equal(await page.evaluate(()=>window.__game.state.mode),'playing');
 if(reward<3)assert.equal(await page.evaluate(()=>window.__game.state.weapon),reward);
}
await page.click('#pause');const pos=await page.evaluate(()=>window.__game.state.elapsed);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__game.state.elapsed),pos);await page.click('#resume');await page.click('#resupply');await page.locator('#question-cards button').nth(1).click();await page.screenshot({path:'test-results/quiz.png'});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: WebGL, ammo exhaustion, pause safety, wrong answer, 3 random reward challenges, repeated submit, resume, mobile viewport, zero page errors');await browser.close();
