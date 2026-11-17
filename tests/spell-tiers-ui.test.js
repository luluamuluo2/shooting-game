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
 return {dom,document,g:window.__game,frame(now){frame(now);},flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('three real tornado tiers damage once and use one central scaled funnel',()=>{
 for(let tier=0;tier<3;tier++){const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);const e=g.enemies[0],hp=e.hp,origin=e.mesh.position.clone();g.castSpell('tornado',tier);g.updateSpellEffects(.7);assert.ok(Math.abs(e.hp-hp*(1-[.3,.6,.9][tier]))<1e-9);assert.equal(e.tornado.tier,tier);assert.ok(e.tornado.end.z<=origin.z+1e-8);assert.ok(Math.hypot(e.tornado.end.x,e.tornado.end.z-7)+1e-8>=Math.hypot(origin.x,origin.z-7));g.updateSharedWind();assert.equal(g.sharedWindField.children.length,1);assert.equal(g.sharedWindField.children[0].scale.x,2.1*[.8,1.3,1.8][tier]);const after=e.hp;g.updateSpellEffects(.1);assert.equal(e.hp,after);}
});
test('three real meteor percentages, snow durations and blackhole complete durations',()=>{
 for(let tier=0;tier<3;tier++){const {g}=setup();g.reset();for(let i=0;i<10;i++)g.spawn(rules.ENEMIES[0]);g.castSpell('meteor',tier);assert.equal(g.spellEffects[0].selected.length,[3,6,9][tier]);g.updateSpellEffects(1.2);assert.equal(g.enemies.length,10-[3,6,9][tier]);g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('blizzard',tier);assert.equal(g.enemies[0].frozenUntil,[3,5,8][tier]);g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('blackhole',tier);const duration=[1.5,3,5][tier];g.updateSpellEffects(duration-.01);assert.equal(g.enemies.length,1);g.updateSpellEffects(.02);assert.equal(g.enemies.length,0);}
});
test('all eighteen spell previews are real and long tiers finish only after their duration',()=>{
 for(const reward of rules.SPELL_REWARDS){const {g}=setup({url:'http://localhost/?spellPreview='+reward.typeId+'&autoplay=1'});assert.equal(g.previewReward.tier,reward.tier);for(let i=0;i<30;i++)g.stepSpellPreview(.1);if(rules.spellSpec(reward.spellKey,reward.tier).duration>=5)assert.equal(g.previewRunning,true);for(let i=0;i<70;i++)g.stepSpellPreview(.1);assert.equal(g.previewRunning,false);}
});
test('tier snapshots resume without repeated thunder and absent tiers retain legacy damage',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('tornado',2);g.updateSpellEffects(.3);const saved=g.captureSave();assert.equal(saved.spellEffects[0].tier,2);const h=setup().g;assert.equal(h.restoreSave(saved),true);h.state.mode='playing';const before=h.enemies[0].hp;h.updateSpellEffects(.4);assert.ok(Math.abs(h.enemies[0].hp-before*.1)<1e-8);const applied=h.captureSave(),j=setup().g;assert.equal(j.restoreSave(applied),true);j.state.mode='playing';assert.equal(j.enemies[0].tornado.tier,2);const hp=j.enemies[0].hp;j.updateSpellEffects(.1);assert.equal(j.enemies[0].hp,hp);delete saved.spellEffects[0].tier;const legacy=setup().g;assert.equal(legacy.restoreSave(saved),true);legacy.state.mode='playing';legacy.updateSpellEffects(.4);assert.equal(legacy.enemies[0].hp,before*.5);assert.equal(legacy.effectSpec(legacy.spellEffects[0]).scale,1);
});
test('tier-scaled meteor pellets retain world target landing and blackhole keeps its true center',()=>{
 for(let tier=0;tier<3;tier++){const {g}=setup();g.reset();for(let i=0;i<10;i++)g.spawn(rules.ENEMIES[0]);g.castSpell('meteor',tier);const effect=g.spellEffects[0];effect.selected.forEach((e,i)=>e.mesh.position.set(-7+i*.7,.2,-3-i*.3));g.updateSpellEffects(1.2);effect.mesh.updateMatrixWorld(true);for(const {enemy,mesh} of effect.rocks){const world=mesh.getWorldPosition(new THREE.Vector3());assert.ok(world.distanceTo(enemy.mesh.position)<1e-9,'landing is world target, not scaled position');}const primary=effect.primary.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(primary.x)<1e-9);assert.ok(Math.abs(primary.z+5)<1e-9);g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('blackhole',tier);const hole=g.spellEffects[0];hole.mesh.updateMatrixWorld(true);assert.ok(hole.holeFrame.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(0,6,-5))<1e-9);}
});
