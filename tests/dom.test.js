import {createTitanModel} from '../src/titans.js';
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
function setup(){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'http://localhost/',pretendToBeVisual:true});
 const {window}=dom,document=window.document;document.exitPointerLock=()=>{};
 const timers=new Map();let timerId=0;
 class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}setClearColor(){}clear(){}setViewport(){}setScissor(){}setScissorTest(){}render(){}}
 const ctx={...rules,createTitanModel,createPlantSystem,THREE:{...THREE,WebGLRenderer:Renderer},window,document,HTMLInputElement:window.HTMLInputElement,devicePixelRatio:1,innerWidth:1200,innerHeight:800,performance:{now:()=>0},requestAnimationFrame(){},addEventListener:window.addEventListener.bind(window),setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},console};
 vm.createContext(ctx);const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');vm.runInContext(src,ctx);
 return {dom,document,g:window.__game,flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('real HTML DOM: start/restart, auto plants, wrong answers, stale callbacks, no missing-node placeholders',()=>{
 const f=setup(),{document:d,g}=f;
 assert.equal(d.getElementById('plant-placement'),null);assert.equal(d.getElementById('does-not-exist'),null);
 // Call the actual handler so exceptions propagate instead of only becoming DOM error events.
 assert.doesNotThrow(()=>d.getElementById('start').onclick());assert.equal(g.state.mode,'playing');assert.ok(d.getElementById('welcome').classList.contains('hidden'));
 g.state.elapsed=60;g.summonGolem(rules.GOLEMS[0]);assert.ok(d.getElementById('boss-timer').classList.contains('soon'));g.state.elapsed=80;g.summonGolem(rules.GOLEMS[0]);assert.ok(d.getElementById('boss-timer').classList.contains('imminent'));g.reset();assert.match(d.getElementById('boss-timer').textContent,/1:30/);
 for(let i=17;i<25;i++){
  let found=false;for(let n=0;n<200;n++){g.reset();g.state.ammo=0;g.openQuiz();if(g.offers.includes(i)){found=true;break;}}assert.ok(found);g.selectQuestion(i);
  for(let n=0;n<3;n++){const answer=g.questions[i].answer;const button=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)===answer);assert.ok(button);button.click();button.click();if(n<2)f.flush();}
  assert.equal(g.plantSystem.plants.length,1);assert.equal(g.state.mode,'reward');assert.equal(g.state.ammo,9);assert.equal(d.querySelector('#plant-placement'),null);f.flush();assert.equal(g.state.mode,'playing');assert.ok(d.getElementById('quiz').classList.contains('hidden'));
  assert.doesNotThrow(()=>d.getElementById('restart').onclick());assert.equal(g.plantSystem.plants.length,0);f.flush();assert.equal(g.plantSystem.plants.length,0);
 }
 g.openQuiz();const i=g.offers[0];g.selectQuestion(i);const wrong=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[i].answer);wrong.click();assert.equal(g.state.mode,'failed');f.flush();assert.equal(g.state.mode,'playing');
 // Every literal DOM lookup and reset-overlay ID must belong to shipped HTML.
 const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');for(const [,id] of src.matchAll(/\$\('([^']+)'\)/g))assert.ok(d.getElementById(id),`missing #${id}`);
 f.dom.window.close();
});


test('entry catalog uses every real model, fits portrait/landscape, and never starts battle',()=>{
 const {document:d,g}=setup();assert.equal(g.state.mode,'welcome');d.getElementById('open-catalog').onclick();assert.equal(g.state.mode,'catalog');assert.equal(g.state.elapsed,0);
 assert.deepEqual(g.catalogGroups.map(x=>x.types.length).join(','),[rules.TITANS.length,rules.ENEMIES.length+2,rules.PLANTS.length,rules.WEAPONS.length].join(','));
 const stage=d.getElementById('catalog-stage');
 for(let group=0;group<4;group++){g.selectCatalogGroup(group);for(let index=0;index<g.catalogGroups[group].types.length;index++){
  d.getElementById('catalog-select').onchange({target:{value:String(index)}});const model=g.catalogModel(group,index);assert.ok(model.isObject3D);assert.equal(g.catalogPivot.children[0],model);assert.ok(new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).length()>0);
  for(const [width,height] of [[340,300],[700,200],[1000,500]]){stage.getBoundingClientRect=()=>({left:0,bottom:height,width,height});g.renderCatalog(0);g.catalogCamera.updateMatrixWorld(true);g.catalogPivot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g.catalogPivot);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const point=new THREE.Vector3(x,y,z).project(g.catalogCamera);assert.ok(Math.abs(point.x)<=1.01&&Math.abs(point.y)<=1.01,'whole model fits '+group+':'+index);}}
 }}
 assert.equal(g.enemies.length,0);assert.equal(g.plantSystem.plants.length,0);assert.equal(g.state.elapsed,0);d.getElementById('catalog-next').onclick();d.getElementById('catalog-prev').onclick();d.getElementById('catalog-turn').onclick();d.getElementById('catalog-zoom-in').onclick();d.getElementById('catalog-zoom-out').onclick();d.getElementById('catalog-reset').onclick();
 for(let i=0;i<3;i++){g.closeCatalog();assert.equal(g.state.mode,'welcome');g.openCatalog();}g.closeCatalog();d.getElementById('start').onclick();assert.equal(g.state.mode,'playing');g.openCatalog();assert.equal(g.state.mode,'playing','entry-only gallery cannot interrupt battle');assert.equal(d.getElementById('catalog').classList.contains('hidden'),true);
});
