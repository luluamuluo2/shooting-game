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
function pickUltimate(f){const {g}=f;f.setRandom(()=>.25);g.openQuiz();const id=g.offers.find(i=>rules.SPECIAL_GOLEM_REWARDS.some(r=>r.id===i&&r.tier==='ultimate'));assert.ok(id);g.selectQuestion(id);return id;}
function correct(f,id){const {g}=f;g.answer(g.questions[id].answer);}
test('five notes reuse streak; actual ultimate award celebrates once on return, muted and reduced-motion safe',()=>{
 const f=setup(),{g,dom,document:d}=f,notes=[];class AudioContext{constructor(){this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}},connect(){},disconnect(){}};}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){notes.push(this.frequency.value);},stop(){}};}}dom.window.AudioContext=AudioContext;dom.window.matchMedia=()=>({matches:true});g.reset();const id=pickUltimate(f);
 for(let i=0;i<5;i++){correct(f,id);if(i<4)f.flush();}assert.equal(g.golems.length,3);assert.equal(g.state.celebrationPending,true);assert.equal(d.getElementById('summon-confetti'),null);assert.deepEqual(notes,[261.63,293.66,329.63,349.23,392]);assert.match(d.getElementById('answer-progress').textContent,/5 \/ 5/);
 const pending=g.captureSave();f.flush();assert.equal(g.state.celebrationPending,false);assert.deepEqual(notes.slice(5),[523.25,659.25,783.99]);assert.ok(d.querySelector('#summon-confetti.reduced'));const saved=g.captureSave();assert.equal(g.restoreSave(saved),true);d.getElementById('resume').click();assert.equal(notes.length,8);assert.equal(d.getElementById('summon-confetti'),null);
 assert.equal(g.restoreSave(pending),true);g.setSound(false);d.getElementById('resume').click();assert.equal(notes.length,8);assert.ok(d.getElementById('summon-confetti'));g.reset();assert.equal(d.getElementById('summon-confetti'),null);
});
test('every tenth cumulative correct queues ten active seconds; wrong does not deduct and save never doubles it',()=>{
 const f=setup(),{g,document:d}=f;g.reset();g.state.solved=9;const id=pickUltimate(f);correct(f,id);assert.equal(g.state.solved,10);assert.equal(g.state.luckyEarned,1);assert.equal(g.state.luckyPending,1);assert.equal(g.state.luckyRemaining,0);assert.equal(g.updateLucky(5),1);assert.equal(g.state.luckyPending,1);
 f.flush();const wrong=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[id].answer);wrong.click();wrong.click();assert.equal(g.state.solved,10);assert.equal(g.state.wrong,1);assert.equal(g.state.celebrationPending,false);f.flush();assert.equal(g.state.luckyRemaining,10);assert.equal(g.state.luckyPending,0);assert.equal(g.updateLucky(3),1.25);assert.equal(g.state.luckyRemaining,7);
 const saved=g.captureSave();assert.equal(g.restoreSave(saved),true);assert.equal(g.updateLucky(20),1);assert.equal(g.state.luckyRemaining,7);d.getElementById('resume').click();assert.equal(g.state.luckyRemaining,7);assert.equal(g.updateLucky(6.9),1.25);assert.ok(Math.abs(g.updateLucky(.2)-1.125)<1e-8);assert.equal(g.state.luckyRemaining,0);
 g.state.solved=20;g.recordLuckyCorrect();g.recordLuckyCorrect();assert.equal(g.state.luckyPending,1);g.state.mode='paused';g.activateLucky();assert.equal(g.state.luckyRemaining,0);g.state.mode='playing';g.activateLucky();assert.equal(g.state.luckyRemaining,10);Object.defineProperty(d,'hidden',{configurable:true,value:true});g.state.mode='playing';g.updateLucky(50);assert.equal(g.state.luckyRemaining,10);
});
test('old saved correct totals do not retroactively grant lucky rewards; new games reset counters',()=>{
 const f=setup(),{g,document:d}=f;g.reset();g.state.solved=39;g.state.luckyEarned=3;const old=g.captureSave();for(const k of ['luckyEarned','luckyPending','luckyRemaining','celebrationPending'])delete old.state[k];assert.equal(g.restoreSave(old),true);assert.equal(g.state.luckyEarned,3);d.getElementById('resume').click();assert.equal(g.state.luckyRemaining,0);g.state.solved++;g.recordLuckyCorrect();assert.equal(g.state.luckyPending,1);g.reset();assert.equal(g.state.solved,0);assert.equal(g.state.luckyEarned,0);assert.equal(g.state.luckyPending,0);assert.equal(g.state.luckyRemaining,0);
});
test('energy meter is always visible, old nineteen shows nine, and idle frames do not mutate live text',()=>{const f=setup(),{g,document:d}=f;g.reset();let meter=d.querySelector('#lucky-status progress');assert.equal(meter.value,0);const old=g.captureSave();old.state.solved=19;for(const k of ['luckyEarned','luckyPending','luckyRemaining','celebrationPending'])delete old.state[k];g.restoreSave(old);d.getElementById('resume').click();meter=d.querySelector('#lucky-status progress');assert.equal(meter.value,9);assert.match(d.getElementById('lucky-status').textContent,/9 \/ 10/);const records=[];const obs=new f.dom.window.MutationObserver(r=>records.push(...r));obs.observe(d.getElementById('lucky-status'),{subtree:true,childList:true,characterData:true,attributes:true});for(let i=0;i<20;i++)g.updateLucky(.01);assert.equal(obs.takeRecords().length,0);obs.disconnect();});
test('ultimate failure or exhausted capacity never celebrates or consumes a partial batch',()=>{for(const full of [false,true]){const f=setup(),{g,document:d}=f;g.reset();const id=pickUltimate(f);for(let i=0;i<4;i++){correct(f,id);f.flush();}if(full){for(let i=0;i<199;i++)g.summonGolem(rules.GOLEMS[0]);correct(f,id);}else{const b=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[id].answer);b.click();}f.flush();assert.equal(g.state.celebrationPending,false);assert.equal(d.getElementById('summon-confetti'),null);assert.equal(g.golems.length,full?199:0);}});
