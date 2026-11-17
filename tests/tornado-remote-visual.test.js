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
test('three tornado variants share the remote VFX center with adjusted preview framing',()=>{
 for(const key of ['tornado','fire-tornado','water-tornado'])for(const tier of [0,1,2])for(const [width,height] of [[1200,800],[360,740],[740,360]]){
  const suffix=tier===0?'':tier===1?'-super':'-promax';const {g}=setup({url:'http://localhost/?spellPreview='+key+suffix+'&autoplay=1',width,height});
  for(let i=0;i<10;i++)g.stepSpellPreview(.1);g.updateSharedWind();const column=g.sharedWindField.children[0];assert.equal(column.position.z,-11);assert.equal(g.elementalGround.position.z,-11);const effect=g.spellEffects.find(e=>e.key===key),scale=rules.spellSpec(key,tier).scale;assert.ok(Math.abs(effect.mesh.position.z-(-5*(1-scale)-6))<1e-9);assert.match(g.spellDescription(key,tier),/敌方远端/);
  g.previewCamera.updateMatrixWorld(true);column.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(column);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(g.previewCamera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'remote wind remains in preview');}
 }
});
