import {createRewardPreviewPainter} from '../src/reward-previews.js';
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
 const ctx={createRewardPreviewPainter,...savegame,...rules,createTitanModel,poseTitanAttack,createPlantSystem,THREE:{...THREE,WebGLRenderer:Renderer},window,document,HTMLInputElement:window.HTMLInputElement,devicePixelRatio:1,innerWidth:options.width||1200,innerHeight:options.height||800,performance:{now:()=>0},requestAnimationFrame(fn){frame=fn;},addEventListener:window.addEventListener.bind(window),setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},console};
 vm.createContext(ctx);const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');vm.runInContext(src,ctx);
 testUI.set(window.__game,{document,flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}});
 return {dom,document,g:window.__game,setRandom(fn){ctx.qaRandom=fn;vm.runInContext('Math.random=qaRandom',ctx);},frame(now){frame(now);},flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('fire and water tiers use real one-time percentage damage and a single elemental column',()=>{
 for(const key of ['fire-tornado','water-tornado'])for(let tier=0;tier<3;tier++){const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);const e=g.enemies[0],hp=e.hp;g.castSpell(key,tier);g.updateSpellEffects(.69);assert.equal(e.hp,hp);g.updateSpellEffects(.01);assert.ok(Math.abs(e.hp-hp*(1-[.3,.6,.9][tier]))<1e-9);assert.equal(e.tornado.key,key);assert.equal(e.tornado.tier,tier);const after=e.hp;g.updateSpellEffects(.1);assert.equal(e.hp,after);g.updateSharedWind();assert.equal(g.sharedWindField.children.length,1);assert.equal(g.sharedWindField.userData.element,key);assert.equal(g.sharedWindField.children[0].scale.x,2.1*[.8,1.3,1.8][tier]);assert.equal(g.elementalGround.visible,true);assert.equal(g.elementalGround.userData.flood.visible,key==='water-tornado');assert.equal(g.sharedWindField.children[0].userData.elementParticles.filter(p=>p.visible).length,48);g.reset();assert.equal(g.elementalGround.visible,false);}
});
test('elemental snapshots restore delayed frozen flights without replay and overlapping casts stay one column',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('fire-tornado',1);g.updateSpellEffects(.7);const e=g.enemies[0];e.frozenUntil=5;g.updateSpellEffects(1.3);assert.equal(g.spellEffects.length,0);const saved=g.captureSave(),h=setup().g;assert.equal(h.restoreSave(saved),true);h.state.mode='playing';const hp=h.enemies[0].hp;h.updateSharedWind();assert.equal(h.sharedWindField.userData.element,'fire-tornado');h.updateEnemySpell(h.enemies[0],.1);assert.equal(h.enemies[0].hp,hp);h.enemies[0].frozenUntil=0;h.castSpell('water-tornado',2);h.updateSpellEffects(.7);h.updateSharedWind();assert.equal(h.sharedWindField.children.length,1);assert.equal(h.sharedWindField.userData.element,'water-tornado');
});
test('all six added catalog previews execute the actual elemental spells with no progress storage',()=>{
 for(const reward of rules.SPELL_REWARDS.filter(r=>r.spellKey.includes('-tornado'))){const {g,dom}=setup({url:'http://localhost/?spellPreview='+reward.typeId+'&autoplay=1'});assert.equal(g.previewMode,true);for(let i=0;i<11;i++)g.stepSpellPreview(.1);g.updateSharedWind();assert.equal(g.sharedWindField.userData.element,reward.spellKey);assert.equal(g.enemies[0].tornado.tier,reward.tier);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),null);}
});

test('ten villagers spawn safely, roam without overlaps and legacy health remains unchanged',()=>{const {g,document:d}=setup();g.reset();assert.equal(g.state.health,10);assert.equal(g.villagers.length,10);assert.match(d.getElementById('villager-count').textContent,/10 \/ 10/);for(let i=0;i<600;i++){g.updateVillagers(.05);for(const v of g.villagers)assert.equal(g.villageFree(v.position.x,v.position.z,v),true);}const old=g.captureSave();old.state.health=5;assert.equal(g.restoreSave(old),true);assert.equal(g.state.health,5);assert.equal(g.villagers.filter(v=>v.visible).length,5);assert.match(d.getElementById('villager-count').textContent,/5 \/ 10/);});
