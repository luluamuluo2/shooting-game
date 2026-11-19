import * as savegame from '../src/savegame.js';
import {createTitanModel,poseTitanAttack} from '../src/titans.js';
// Actual index.html parsed by jsdom. Only WebGL and wall-clock scheduling are stubbed.
// This tests DOM contracts and UI events, not rendering or browser GPU behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import * as rules from '../src/rules.js';
import {createPlantSystem} from '../src/plants.js';
const testUI=new WeakMap();
function freshQuiz(g){const u=testUI.get(g);if(g.supplyRound){if(g.state.mode==='playing')g.openQuiz();if(g.state.mode==='quiz'){const button=[...u.document.querySelectorAll('[data-reward]')].find(b=>!b.disabled);g.selectQuestion(Number(button.dataset.reward));const wrong=[...u.document.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[Number(button.dataset.reward)].answer);g.answer(Number(wrong.textContent));u.flush();}}g.openQuiz();}
function setup(options={}){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:options.url||'http://localhost/',pretendToBeVisual:true});
 const {window}=dom,document=window.document;document.exitPointerLock=()=>{};if(options.preference)window.localStorage.setItem('block-guardians-sound',options.preference);if(options.storageBlocked)Object.defineProperty(window,'localStorage',{get(){throw new Error('storage unavailable');}});
 if(options.savedText)window.localStorage.setItem(savegame.SAVE_KEY,options.savedText);const timers=new Map();let timerId=0,frame;
 class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}setClearColor(){}clear(){}setViewport(){}setScissor(){}setScissorTest(){}render(){}}
 const ctx={...savegame,...rules,createTitanModel,poseTitanAttack,createPlantSystem,THREE:{...THREE,WebGLRenderer:Renderer},window,document,HTMLInputElement:window.HTMLInputElement,devicePixelRatio:1,innerWidth:options.width||1200,innerHeight:options.height||800,performance:{now:()=>0},requestAnimationFrame(fn){frame=fn;},addEventListener:window.addEventListener.bind(window),setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},console};
 vm.createContext(ctx);const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');vm.runInContext(src,ctx);
 testUI.set(window.__game,{document,flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}});
 return {dom,document,g:window.__game,setRandom(fn){ctx.qaRandom=fn;vm.runInContext('Math.random=qaRandom',ctx);},frame(now){frame(now);},flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('supply rules are accessible native disclosure and close on every quiz opening',()=>{
 const {g,document:d}=setup();g.reset();g.openQuiz();const rulesPanel=d.getElementById('supply-rules');assert.equal(rulesPanel.tagName,'DETAILS');assert.equal(rulesPanel.open,false);assert.equal(rulesPanel.querySelector('summary').textContent,'？规则');assert.ok(rulesPanel.querySelector('.subtitle').textContent.length>200);assert.equal(d.querySelectorAll('#supply-card-rules li').length,3);assert.match(d.querySelector('.supply-brief').textContent,/答错/);rulesPanel.open=true;d.getElementById('close-quiz').click();g.openQuiz();assert.equal(rulesPanel.open,false);
 for(const button of d.querySelectorAll('#question-cards button')){assert.match(button.querySelector('.supply-need').textContent,/答对 \d 题/);assert.ok(button.getAttribute('aria-label').includes('题'));assert.ok(!button.textContent.includes('生命'));}
});
test('super and ultimate counts are prominent and upgrade area icon differs from multishot',()=>{
 const {g,document:d}=setup();g.reset();let saved=g.captureSave();saved.supplyRound={offers:[rules.SPECIAL_GOLEM_START,rules.SPECIAL_GOLEM_START+1,0],rerollsRemaining:3,locked:false,selected:-1};assert.equal(g.restoreSave(saved),true);g.state.mode='playing';g.openQuiz();assert.equal(d.querySelector('[data-reward="'+rules.SPECIAL_GOLEM_START+'"] .supply-badge').textContent,'★ 超级');assert.match(d.querySelector('[data-reward="'+rules.SPECIAL_GOLEM_START+'"] b').textContent,/×2/);assert.equal(d.querySelector('[data-reward="'+(rules.SPECIAL_GOLEM_START+1)+'"] .supply-badge').textContent,'✦ 终极');
 g.reset();const area=rules.PLANT_UPGRADES.find(u=>u.kind==='area'),multi=rules.PLANT_UPGRADES.find(u=>u.kind==='multi'&&u.plantId===area.plantId),slow=rules.PLANT_UPGRADES.find(u=>u.kind==='slow'&&u.plantId===area.plantId);g.plantSystem.add(rules.PLANTS.find(p=>p.id===area.plantId),0);saved=g.captureSave();saved.supplyRound={offers:[area.id,multi.id,slow.id],rerollsRemaining:3,locked:false,selected:-1};assert.equal(g.restoreSave(saved),true);g.state.mode='playing';g.openQuiz();assert.equal(d.querySelector('[data-reward="'+area.id+'"] .gun').textContent,'◎');assert.equal(d.querySelector('[data-reward="'+multi.id+'"] .gun').textContent,'↟');assert.equal(d.querySelector('[data-reward="'+slow.id+'"] .gun').textContent,'❄');assert.equal(d.querySelectorAll('#supply-card-rules li').length,3);
});
