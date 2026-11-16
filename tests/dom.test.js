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
  assert.doesNotThrow(()=>{d.getElementById('restart').onclick();d.getElementById('restart').onclick();});assert.equal(g.plantSystem.plants.length,0);f.flush();assert.equal(g.plantSystem.plants.length,0);
 }
 g.openQuiz();const i=g.offers[0];g.selectQuestion(i);const wrong=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[i].answer);wrong.click();assert.equal(g.state.mode,'failed');f.flush();assert.equal(g.state.mode,'playing');
 // Every literal DOM lookup and reset-overlay ID must belong to shipped HTML.
 const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');for(const [,id] of src.matchAll(/\$\('([^']+)'\)/g))assert.ok(d.getElementById(id),`missing #${id}`);
 f.dom.window.close();
});


test('entry catalog uses every real model, fits portrait/landscape, and never starts battle',()=>{
 const {document:d,g}=setup();assert.equal(g.state.mode,'welcome');d.getElementById('open-catalog').onclick();assert.equal(g.state.mode,'catalog');assert.equal(g.state.elapsed,0);
 assert.deepEqual(g.catalogGroups.map(x=>x.types.length).join(','),[rules.TITANS.length,rules.ENEMIES.length+2,rules.PLANTS.length,rules.WEAPONS.length,rules.SPELL_REWARDS.length].join(','));
 const stage=d.getElementById('catalog-stage');
 for(let group=0;group<4;group++){g.selectCatalogGroup(group);for(let index=0;index<g.catalogGroups[group].types.length;index++){
  d.getElementById('catalog-select').onchange({target:{value:String(index)}});const model=g.catalogModel(group,index);assert.ok(model.isObject3D);assert.equal(g.catalogPivot.children[0],model);assert.ok(new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).length()>0);
  for(const [width,height] of [[340,300],[700,200],[1000,500]]){stage.getBoundingClientRect=()=>({left:0,bottom:height,width,height});g.renderCatalog(0);g.catalogCamera.updateMatrixWorld(true);g.catalogPivot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g.catalogPivot);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const point=new THREE.Vector3(x,y,z).project(g.catalogCamera);assert.ok(Math.abs(point.x)<=1.01&&Math.abs(point.y)<=1.01,'whole model fits '+group+':'+index);}}
 }}
 assert.equal(g.enemies.length,0);assert.equal(g.plantSystem.plants.length,0);assert.equal(g.state.elapsed,0);d.getElementById('catalog-next').onclick();d.getElementById('catalog-prev').onclick();d.getElementById('catalog-turn').onclick();d.getElementById('catalog-zoom-in').onclick();d.getElementById('catalog-zoom-out').onclick();d.getElementById('catalog-reset').onclick();
 for(let i=0;i<3;i++){g.closeCatalog();assert.equal(g.state.mode,'welcome');g.openCatalog();}g.closeCatalog();d.getElementById('start').onclick();assert.equal(g.state.mode,'playing');g.openCatalog();assert.equal(g.state.mode,'playing','entry-only gallery cannot interrupt battle');assert.equal(d.getElementById('catalog').classList.contains('hidden'),true);
});

test('upgrade cards need two answers, keep summon guarantees, fail without reward, and work at full plant capacity',()=>{
 const f=setup(),{g,document:d}=f;g.reset();g.plantSystem.add(rules.PLANTS[0],0);const plant=g.plantSystem.plants[0];
 function draw(){for(let n=0;n<500;n++){if(g.state.mode==='quiz')d.getElementById('close-quiz').onclick();freshQuiz(g);assert.ok(g.offers.some(i=>i>=17&&i<25));assert.ok(g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)));if(g.offers.includes(25))return;}assert.fail('upgrade card absent');}
 function correct(){g.answer(g.questions[25].answer);f.flush();}
 draw();g.selectQuestion(25);correct();assert.equal(plant.upgrades.multi,0);correct();assert.equal(plant.upgrades.multi,1);assert.equal(g.state.mode,'playing');
 draw();g.selectQuestion(25);correct();const wrong=[...d.querySelectorAll('#answer-options button')].map(b=>Number(b.textContent)).find(x=>x!==g.questions[25].answer);g.answer(wrong);f.flush();assert.equal(g.state.mode,'playing');assert.equal(plant.upgrades.multi,1);
 for(let i=1;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);let found=false;for(let n=0;n<500;n++){freshQuiz(g);assert.ok(g.offers.every(i=>i<17||i>=25));if(g.offers.includes(25)){found=true;break;}d.getElementById('close-quiz').onclick();}assert.ok(found);g.selectQuestion(25);correct();correct();assert.equal(g.plantSystem.plants.reduce((n,p)=>n+p.upgrades.multi,0),2);
});
test('manual titan is immediate, preserves ordinary enemies, one boss only and resets next countdown',()=>{
 const {g,document:d}=setup();assert.equal(g.updateTitanSpawn(true),false);g.reset();for(let n=0;n<400;n++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,400);const old=[...g.enemies];g.state.elapsed=12;d.getElementById('challenge-boss').onclick();assert.equal(g.enemies.length,401);assert.ok(old.every(e=>g.enemies.includes(e)));assert.equal(rules.usedSlots(g.enemies),420);assert.equal(g.enemies.at(-1).type.id,rules.TITANS[0].id);assert.equal(d.getElementById('challenge-boss').disabled,true);assert.equal(g.updateTitanSpawn(true),false);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,401);g.damageEnemy(g.enemies.at(-1),100000);g.titanCountdown();assert.match(d.getElementById('boss-timer').textContent,/1:30/);for(const e of [...g.enemies])g.damageEnemy(e,100000);g.state.elapsed=101;assert.equal(g.updateTitanSpawn(),false);g.state.elapsed=102;assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies.at(-1).type.id,rules.TITANS[1].id);g.reset();g.openQuiz();assert.equal(g.updateTitanSpawn(true),false);assert.equal(g.enemies.length,0);
});

test('compact plant and golem counts share one non-modal flow stack',()=>{const {document:d}=setup();assert.equal(d.getElementById('plant-status').parentElement,d.getElementById('defense-status'));assert.equal(d.getElementById('golem-status').parentElement,d.getElementById('defense-status'));assert.equal(d.getElementById('defense-status').querySelector('button'),null);assert.equal(d.getElementById('plant-upgrade-panel'),null);});

test('pistol and rifle fire timed independent three-round bursts; leftovers enter quiz only after final bullet',()=>{
 const {g}=setup();for(const weapon of [0,1])for(const ammo of [1,2,3,5]){g.reset();g.state.weapon=weapon;g.state.ammo=ammo;g.shoot(true);assert.equal(g.state.ammo,ammo-1);assert.equal(g.state.mode,ammo===1?'quiz':'playing');g.shoot(true);assert.equal(g.state.ammo,ammo-1,'repeat trigger cannot overlap burst');if(ammo>1){g.updateBurst(rules.WEAPONS[weapon].burstInterval-.001);assert.equal(g.state.ammo,ammo-1);g.updateBurst(.001);assert.equal(g.state.ammo,ammo-2);assert.equal(g.state.mode,ammo===2?'quiz':'playing');}g.updateBurst(1);assert.equal(g.state.ammo,Math.max(0,ammo-3));assert.equal(g.state.mode,ammo<=3?'quiz':'playing');assert.equal(g.state.burstRemaining,0);}
 g.reset();g.spawn(rules.ENEMIES[0]);const enemy=g.enemies[0];enemy.hp=100;enemy.mesh.position.set(0,0,-3);g.shoot();assert.equal(enemy.hp,90);enemy.mesh.position.x=100;g.updateBurst(.045);assert.equal(enemy.hp,90,'second bullet ray independently misses moved target');enemy.mesh.position.x=0;g.updateBurst(.045);assert.equal(enemy.hp,80,'third bullet independently hits again');assert.equal(g.state.ammo,6);
 g.reset();g.state.weapon=2;g.state.ammo=3;g.shoot();assert.equal(g.state.ammo,2);assert.equal(g.state.shot,1.1);assert.equal(g.state.burstRemaining,0);g.updateBurst(2);assert.equal(g.state.ammo,2);
});
test('pause, manual resupply and restart cancel queued rounds without hidden ammo loss',()=>{
 const {g,document:d}=setup();for(const action of ['pause','quiz','reset']){g.reset();g.shoot();assert.equal(g.state.ammo,8);assert.equal(g.state.burstRemaining,2);if(action==='pause')d.getElementById('pause').onclick();else if(action==='quiz')g.openQuiz();else g.reset();const ammo=g.state.ammo;g.updateBurst(99);assert.equal(g.state.ammo,ammo);assert.equal(g.state.burstRemaining,0);if(action==='pause'){d.getElementById('resume').onclick();g.updateBurst(99);assert.equal(g.state.ammo,8);}}
});

test('nine appearances per round: mixed manual/natural, kill/breach, HP only, reset and pause',()=>{
 const {g,document:d}=setup();g.reset();for(let index=0;index<19;index++){g.state.elapsed+=90;assert.equal(g.updateTitanSpawn(index%2===0),true);const boss=g.enemies.at(-1),round=Math.floor(index/9)+1;assert.equal(boss.type,rules.TITANS[index%9]);assert.equal(boss.hp,boss.type.hp*2**(round-1));assert.equal(boss.maxHP,boss.hp);assert.equal(boss.speed,boss.type.speed);assert.equal(g.state.round,BigInt(round));assert.equal(g.titanCount,BigInt(index+1));assert.match(d.getElementById('boss-status').textContent,new RegExp('第'+round+'轮'));assert.equal(g.updateTitanSpawn(true),false);if(index%2){boss.mesh.position.z=3;g.updateEnemy(boss,.01);g.state.health=5;}else g.damageEnemy(boss,boss.hp);assert.equal(g.enemies.length,0);}
 g.openQuiz();const count=g.titanCount;assert.equal(g.updateTitanSpawn(true),false);assert.equal(g.titanCount,count);g.reset();assert.equal(g.state.round,1n);assert.equal(g.titanCount,0n);assert.equal(g.updateTitanSpawn(true),true);assert.equal(g.enemies[0].hp,600);
});
test('high-frequency spawns catch up only to free capacity, with no backlog after full field',()=>{
 const {g}=setup();g.reset();g.state.elapsed=300;g.state.round=2n;g.state.bossKills=1n;g.state.spawn=.1;g.updateNormalSpawns(.1);assert.ok(Math.abs(g.state.spawn-1)<1e-9);assert.equal(g.enemies.length,1);g.reset();g.state.elapsed=300;g.state.round=2000n;g.state.bossKills=2000n;g.state.spawn=0;g.updateNormalSpawns(.05);assert.equal(rules.usedSlots(g.enemies),400);assert.ok(Number.isFinite(g.state.spawn));const before=[...g.enemies];g.updateNormalSpawns(1000);assert.equal(g.enemies.length,before.length);assert.ok(before.every(e=>g.enemies.includes(e)));g.damageEnemy(g.enemies.find(e=>(e.type.slots||1)===1),100000);g.updateNormalSpawns(.05);assert.equal(rules.usedSlots(g.enemies),400);g.openQuiz();const slots=rules.usedSlots(g.enemies);g.updateNormalSpawns(100);assert.equal(rules.usedSlots(g.enemies),slots);
});

test('extreme-round boss still receives plant damage and slow without Infinity HUD',()=>{const {g,document:d}=setup();g.reset();g.state.round=2048n;g.spawn(rules.TITANS[0]);const boss=g.enemies[0],hp=boss.hpUnits;g.plantSystem.impact({...rules.PLANTS[0],slow:.8},boss.mesh.position,boss);assert.equal(hp-boss.hpUnits,4000000n);assert.equal(boss.slowAmount,.5);g.titanCountdown();g.summonGolem(rules.GOLEMS[0]);assert.match(d.getElementById('boss-status').textContent,/第2048轮/);assert.ok(!d.getElementById('boss-status').textContent.includes('Infinity'));assert.ok(Number.isFinite(boss.hp));});

test('god skeleton uses double axe, raises before melee and chops on unchanged damage cadence',()=>{
 const {g,document:d}=setup();g.reset();const type=rules.TITANS.find(t=>t.id==='god-skeleton');g.spawn(type);const boss=g.enemies[0];assert.equal(boss.mesh.userData.weapon,'double-bone-axe');assert.ok(boss.mesh.userData.axe.parent===boss.mesh.userData.axeArm);assert.equal(g.monsterModel(rules.TITANS.find(t=>t.id==='star-reaper')).userData.axeArm,undefined,'star scythe unchanged');const colors=[];boss.mesh.userData.axe.traverse(o=>{if(o.isMesh)colors.push(o.material.color.getHex());});assert.ok(colors.includes(0x92743a));assert.ok(colors.includes(0xe2e1d9));assert.ok(!colors.includes(0x8b6949),'no old brown bow');
 g.summonGolem(rules.GOLEMS[3]);const ally=g.golems[0];ally.mesh.position.set(0,0,-3);boss.mesh.position.set(0,0,-5);const hp=ally.hp;boss.mesh.updateMatrixWorld(true);const restHead=boss.mesh.userData.axe.localToWorld(new THREE.Vector3(0,1.55,0)).y;g.updateEnemy(boss,.49);boss.mesh.updateMatrixWorld(true);assert.ok(boss.mesh.userData.axe.localToWorld(new THREE.Vector3(0,1.55,0)).y>restHead+1,"axe head visibly lifts");assert.equal(ally.hp,hp);assert.ok(boss.mesh.userData.axeArm.rotation.x<-1.4);const raised=boss.mesh.userData.axeArm.rotation.x;d.getElementById('pause').onclick();g.updateEnemy(boss,5);assert.equal(boss.mesh.userData.axeArm.rotation.x,raised);d.getElementById('resume').onclick();g.updateEnemy(boss,.111);assert.equal(ally.hp,hp-16);assert.ok(boss.mesh.userData.axeArm.rotation.x>0,'downward follow-through');g.updateEnemy(boss,.4);assert.equal(boss.mesh.userData.axeArm.rotation.x,0);assert.equal(ally.hp,hp-16);g.updateEnemy(boss,.79);assert.equal(ally.hp,hp-16);g.updateEnemy(boss,.011);assert.equal(ally.hp,hp-32);assert.equal(boss.speed,type.speed);assert.equal(boss.hp,type.hp);
 const preview=g.catalogModel(0,rules.TITANS.indexOf(type));assert.equal(preview.userData.weapon,'double-bone-axe');assert.ok(preview.userData.axe.children.length>=10);
});

test('all titan attack rigs animate, reset, freeze, and preserve body anchor; gallery is harmless',()=>{
 const {g,document:d}=setup();g.reset();
 for(const type of rules.TITANS){
  const mesh=g.monsterModel(type),rig=mesh.userData.attackRig;assert.ok(rig&&rig.nodes.length,type.id);
  const origin=mesh.position.clone(),scale=mesh.scale.clone();g.poseTitanAttack(mesh,type,.7,0);
  g.poseTitanAttack(mesh,type,0,1);assert.ok(rig.nodes.some(({node,rotation,position})=>!node.rotation.equals(rotation)||!node.position.equals(position)),type.id+' strike pose');
  g.poseTitanAttack(mesh,type,0,0);assert.ok(rig.nodes.every(({node,rotation,position})=>node.rotation.equals(rotation)&&node.position.equals(position)),type.id+' exact rest');
  assert.ok(mesh.position.equals(origin)&&mesh.scale.equals(scale));assert.ok(rig.lights.every(l=>!l.visible));
  g.reset();g.spawn(type);g.summonGolem(rules.GOLEMS[3]);const boss=g.enemies[0],guard=g.golems[0];boss.mesh.position.set(0,0,-3);guard.mesh.position.set(0,0,0);const hp=guard.hp;
  g.updateEnemy(boss,.49);const pose=boss.mesh.userData.attackRig.nodes.map(x=>[...x.node.position.toArray(),...x.node.rotation.toArray()]);d.getElementById('pause').onclick();g.updateEnemy(boss,2);g.updateTitanShots(2);assert.deepEqual(boss.mesh.userData.attackRig.nodes.map(x=>[...x.node.position.toArray(),...x.node.rotation.toArray()]),pose);assert.equal(guard.hp,hp);d.getElementById('resume').onclick();
  g.updateEnemy(boss,.111);if(type.id==='witherzilla'){assert.equal(guard.hp,hp);g.updateTitanShots(1);}assert.equal(guard.hp,hp-16,type.id);
  g.updateEnemy(boss,.4);assert.ok(boss.mesh.userData.attackRig.nodes.every(({node,rotation,position})=>node.rotation.equals(rotation)&&node.position.equals(position)),type.id+' recovered');
 }
 g.reset();g.state.mode='welcome';g.openCatalog();g.renderCatalog(.5);assert.equal(g.titanShots.length,0);assert.equal(g.enemies.length,0);g.closeCatalog();assert.equal(g.state.mode,'welcome');
});

test('wither fireballs travel, taunt, hit once, obey pause/target removal/restart and retain village breach',()=>{
 const {g,document:d}=setup(),type=rules.TITANS.find(t=>t.id==='witherzilla');
 function start(){g.reset();g.spawn(type);g.summonGolem(rules.GOLEMS[3]);const boss=g.enemies[0],guard=g.golems[0];boss.mesh.position.set(0,0,-10);guard.mesh.position.set(0,0,0);return {boss,guard};}
 let {boss,guard}=start(),hp=guard.hp;g.updateEnemy(boss,.59);assert.equal(g.titanShots.length,0);g.updateEnemy(boss,.011);assert.equal(g.titanShots.length,1);assert.equal(guard.hp,hp,'no instant hit');const shot=g.titanShots[0],pos=shot.mesh.position.clone();assert.ok(pos.y>10,'shot really leaves giant mouth');
 d.getElementById('pause').onclick();g.updateTitanShots(5);assert.ok(shot.mesh.position.equals(pos));d.getElementById('resume').onclick();g.updateTitanShots(.1);assert.ok(!shot.mesh.position.equals(pos));assert.equal(guard.hp,hp);g.updateTitanShots(1);assert.equal(guard.hp,hp-16);assert.equal(g.titanShots.length,0);g.updateTitanShots(1);assert.equal(guard.hp,hp-16);
 g.updateEnemy(boss,1.19);assert.equal(g.titanShots.length,0);g.updateEnemy(boss,.011);assert.equal(g.titanShots.length,1);g.damageGolem(guard,9999);assert.equal(g.titanShots.length,0);
 ({boss,guard}=start());g.updateEnemy(boss,.61);g.damageEnemy(boss,9999);assert.equal(g.titanShots.length,0);assert.equal(guard.hp,guard.type.hp);
 ({boss,guard}=start());g.updateEnemy(boss,.61);g.reset();assert.equal(g.titanShots.length,0);
 ({boss,guard}=start());guard.mesh.position.z=3;g.updateEnemy(boss,.61);assert.equal(g.titanShots.length,0,'outside 12');
 ({boss,guard}=start());g.summonGolem(rules.GOLEMS[3]);const taunter=g.golems[1];taunter.mesh.position.set(0,0,-5);g.updateEnemy(boss,.61);assert.equal(g.titanShots[0].target,taunter,'within6 taunt before other ranged target');
 g.reset();g.spawn(type);boss=g.enemies[0];const health=g.state.health;boss.mesh.position.z=3;g.updateEnemy(boss,.01);assert.equal(g.state.health,health-1);assert.equal(g.enemies.length,0);assert.equal(g.titanShots.length,0);
});

test('wither shot obstruction and lifetime prevent stale or through-wall hits',()=>{
 const {g}=setup();g.reset();g.spawn(rules.TITANS.find(t=>t.id==='witherzilla'));g.summonGolem(rules.GOLEMS[3]);const boss=g.enemies[0],guard=g.golems[0];boss.mesh.position.set(0,0,-3);guard.mesh.position.set(0,0,0);g.updateEnemy(boss,.61);assert.equal(g.titanShots.length,1);const shot=g.titanShots[0];shot.mesh.position.set(-7,1,-9);guard.mesh.position.set(-7,0,-5);const hp=guard.hp;g.updateTitanShots(.2);assert.equal(g.titanShots.length,0);assert.equal(guard.hp,hp,'crate blocks actual segment');
 g.reset();g.spawn(rules.TITANS.find(t=>t.id==='witherzilla'));g.summonGolem(rules.GOLEMS[3]);g.enemies[0].mesh.position.set(0,0,-3);g.golems[0].mesh.position.set(0,0,0);g.updateEnemy(g.enemies[0],.61);g.updateTitanShots(3.01);assert.equal(g.titanShots.length,0);assert.equal(g.golems[0].hp,g.golems[0].type.hp);
});

test('super and ultimate cards deliver exact identical batches after 4/5 answers and never on failure',()=>{
 const {g,document:d,flush}=setup();
 function draw(tier,typeId){freshQuiz(g);for(let n=0;n<3000;n++){const id=g.offers.find(id=>id>=rules.SPECIAL_GOLEM_START&&id<rules.SPELL_REWARD_START&&rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START].tier===tier&&(!typeId||rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START].typeId===typeId));if(id!==undefined)return id;d.getElementById('close-quiz').onclick();freshQuiz(g);}assert.fail('special never drawn');}
 for(const tier of ['super','ultimate']){
  g.reset();const id=draw(tier),spec=rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START],card=d.querySelector('[data-reward="'+id+'"]');assert.ok(card.classList.contains(tier));assert.match(card.textContent,new RegExp('连续答对'+spec.need+'题'));g.state.ammo=0;g.selectQuestion(id);
  for(let n=0;n<spec.need;n++){const v=g.questions[id].answer;g.answer(v);g.answer(v);if(n<spec.need-1){assert.equal(g.golems.length,0);flush();}}
  assert.equal(g.golems.length,spec.count);assert.ok(g.golems.every(a=>a.type.id===spec.typeId));assert.equal(g.state.ammo,9);flush();assert.equal(g.state.mode,'playing');
  g.reset();const failed=draw(tier);g.selectQuestion(failed);g.answer(g.questions[failed].answer);flush();g.answer(Number([...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[failed].answer).textContent));flush();assert.equal(g.golems.length,0);assert.equal(g.state.mode,'playing');
 }
 g.reset();const id=draw('super','slime'),r=rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START];g.selectQuestion(id);for(let n=0;n<r.need;n++){g.answer(g.questions[id].answer);if(n<r.need-1)flush();}assert.equal(rules.usedSlots(g.golems),2);const parents=[...g.golems];for(const p of parents)g.damageGolem(p,999);assert.equal(g.golems.length,4);assert.equal(rules.usedSlots(g.golems),2);assert.ok(g.golems.every(a=>a.type===rules.SMALL_SLIME_GOLEM));flush();
 // Capacity unexpectedly changes while answering: all-or-nothing, not a partial batch.
 g.reset();const conflict=draw('ultimate');g.selectQuestion(conflict);for(let n=0;n<199;n++)g.summonGolem(rules.GOLEMS[0]);for(let n=0;n<5;n++){g.answer(g.questions[conflict].answer);if(n<4)flush();}assert.equal(g.golems.length,199);assert.equal(g.state.mode,'reward');flush();assert.equal(g.state.mode,'playing');
});

test('special guarantees respect half-slots, full plants, pause and canceled old answers',()=>{
 const {g,document:d,flush}=setup();
 for(const occupied of [197,197.5,198,198.5,199,199.5,200]){
  g.reset();for(let n=0;n<occupied*2;n++)g.summonGolem(rules.SMALL_SLIME_GOLEM);freshQuiz(g);
  const specials=g.offers.filter(i=>(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START));assert.ok(specials.length<=(occupied<=198?1:0));
  if(specials.length)assert.ok(rules.SPECIAL_GOLEM_REWARDS[specials[0]-rules.SPECIAL_GOLEM_START].count<=200-occupied);
  assert.ok(g.offers.some(i=>i>=17&&i<25));assert.equal(g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)),occupied<=199);
 }
 g.reset();for(let i=0;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);let id;for(let n=0;n<500;n++){freshQuiz(g);id=g.offers.find(i=>(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START));if(id!==undefined)break;d.getElementById('close-quiz').onclick();}assert.notEqual(id,undefined);g.selectQuestion(id);const positions=g.plantSystem.plants.map(p=>p.mesh.position.toArray());g.updateGolems(10);assert.deepEqual(g.plantSystem.plants.map(p=>p.mesh.position.toArray()),positions);g.answer(g.questions[id].answer);g.reset();flush();assert.equal(g.golems.length,0);assert.equal(g.state.mode,'playing');
});

test('only real titan kills speed normal spawning; appearance rounds still scale HP alone',()=>{
 const {g,document:d}=setup();g.reset();g.state.elapsed=300;g.state.spawn=1.5;
 g.spawn(rules.TITANS[0]);let boss=g.enemies[0];g.damageEnemy(boss,boss.hp);assert.equal(g.state.bossKills,1n);assert.equal(g.state.spawn,1);assert.match(d.getElementById('boss-timer').textContent,/击败1泰坦.*1.50/);g.damageEnemy(boss,9999);assert.equal(g.state.bossKills,1n);
 g.spawn(rules.ENEMIES.find(t=>t.id==='zoglin'));g.damageEnemy(g.enemies[0],9999);assert.equal(g.state.bossKills,1n,'ordinary boss flag does not count');
 g.spawn(rules.TITANS[1]);boss=g.enemies[0];boss.mesh.position.z=3;g.updateEnemy(boss,.01);assert.equal(g.state.bossKills,1n,'escape not kill');
 g.spawn(rules.TITANS[2]);g.damageEnemy(g.enemies[0],9999);assert.equal(g.state.bossKills,2n);assert.ok(Math.abs(g.state.spawn-2/3)<1e-9);g.reset();assert.equal(g.state.bossKills,0n);
 for(let n=0;n<10;n++){g.state.elapsed+=90;g.state.spawn=1.5;assert.equal(g.updateTitanSpawn(n%2===0),true);const b=g.enemies[0];assert.equal(b.hp,b.type.hp*(n<9?1:2));assert.equal(g.state.spawn,1.5,'new round does not speed spawns');b.mesh.position.z=3;g.updateEnemy(b,.01);g.state.health=5;}
 assert.equal(g.state.round,2n);assert.equal(g.state.bossKills,0n);g.state.elapsed=300;g.state.spawn=.1;g.updateNormalSpawns(.1);assert.equal(g.state.spawn,1.5);
});

test('AOE multi upgrade uses two-answer reward without colliding with shifted special golem cards',()=>{
 const {g,document:d,flush}=setup();g.reset();const type=rules.PLANTS.find(p=>p.id==='corn');g.plantSystem.add(type,0);
 const id=rules.PLANT_UPGRADES.find(u=>u.plantId===type.id&&u.kind==='multi').id;assert.ok(id<rules.SPECIAL_GOLEM_START);let found=false;
 for(let n=0;n<2000;n++){freshQuiz(g);assert.ok(g.offers.filter(i=>(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)).length<=1);if(g.offers.includes(id)){found=true;break;}d.getElementById('close-quiz').onclick();}
 assert.ok(found);g.selectQuestion(id);g.answer(g.questions[id].answer);flush();g.answer(g.questions[id].answer);assert.equal(g.plantSystem.plants[0].upgrades.multi,1);assert.equal(g.golems.length,0);assert.equal(g.plantSystem.plants[0].upgrades.area,0);flush();assert.equal(g.state.mode,'playing');
});

test('always-on companion HUD groups types and updates spawn, death, split and reset',()=>{
 const {g,document:d}=setup();g.reset();assert.match(d.getElementById('plant-status').textContent,/暂无/);assert.match(d.getElementById('golem-status').textContent,/暂无/);
 for(let n=0;n<5;n++)g.plantSystem.add(rules.PLANTS[0],n);
 for(let n=0;n<3;n++)g.summonGolem(rules.GOLEMS[0]);
 assert.match(d.getElementById('plant-status').textContent,new RegExp(rules.PLANTS[0].name+'×5'));
 g.plantSystem.remove(g.plantSystem.plants[0]);assert.match(d.getElementById('plant-status').textContent,new RegExp(rules.PLANTS[0].name+'×4'));
 assert.match(d.getElementById('golem-status').textContent,new RegExp(rules.GOLEMS[0].name+'×3'));
 g.damageGolem(g.golems[0],999);assert.match(d.getElementById('golem-status').textContent,new RegExp(rules.GOLEMS[0].name+'×2'));
 const slime=rules.GOLEMS.find(t=>t.split);g.summonGolem(slime);g.damageGolem(g.golems.at(-1),999);
 assert.match(d.getElementById('golem-status').textContent,new RegExp(rules.SMALL_SLIME_GOLEM.name+'×2'));
 g.reset();assert.match(d.getElementById('plant-status').textContent,/暂无/);assert.match(d.getElementById('golem-status').textContent,/暂无/);
});
test('counts never open a modal or pause battle, and I shortcut is removed',()=>{
 const {g,document:d,dom}=setup();g.reset();g.spawn(rules.ENEMIES[0]);const enemy=g.enemies[0],before=enemy.mesh.position.clone();
 d.getElementById('defense-status').click();dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'i'}));
 assert.equal(g.state.mode,'playing');g.updateEnemy(enemy,.2);assert.ok(!enemy.mesh.position.equals(before));
 assert.equal(d.getElementById('defense-details'),null);assert.equal(g.openDefenseDetails,undefined);assert.equal(g.defenseData,undefined);
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(g.state.mode,'paused');d.getElementById('resume').click();assert.equal(g.state.mode,'playing');
});
test('small split golems count as bodies in compact HUD without duplicated rows',()=>{
 const {g,document:d}=setup();g.reset();for(let n=0;n<400;n++)g.summonGolem(rules.SMALL_SLIME_GOLEM);
 assert.match(d.getElementById('golem-status').textContent,/400只/);assert.match(d.getElementById('golem-status').textContent,new RegExp(rules.SMALL_SLIME_GOLEM.name+'×400'));
 g.damageGolem(g.golems[0],999);assert.match(d.getElementById('golem-status').textContent,new RegExp(rules.SMALL_SLIME_GOLEM.name+'×399'));
});
test('compact counts remain current after supply failure, success, and pause resume',()=>{
 const {g,document:d,flush}=setup();g.reset();g.openQuiz();const id=g.offers.find(i=>i<3)??g.offers[0];g.selectQuestion(id);
 const wrong=Number([...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[id].answer).textContent);g.answer(wrong);flush();assert.equal(g.state.mode,'playing');
 g.openQuiz();const reward=g.offers[0];g.selectQuestion(reward);for(let n=0;n<5&&g.state.mode==='quiz';n++){g.answer(g.questions[reward].answer);flush();}if(g.state.mode==='reward')flush();assert.equal(g.state.mode,'playing');
 assert.equal(d.getElementById('plant-status').textContent,'植物 '+g.plantSystem.plants.length+'/'+rules.PLANT_SLOTS.length+' · '+g.companionCounts(g.plantSystem.plants));
 d.getElementById('pause').click();d.getElementById('resume').click();assert.equal(g.state.mode,'playing');
 assert.equal(d.getElementById('golem-status').textContent,'傀儡 '+g.golems.length+'只 · 名额 '+rules.usedSlots(g.golems)+' / '+rules.GOLEM_CAP+' · '+g.companionCounts(g.golems));
});

test('nine titans double melee/fireball damage each round while growing without changing cadence',()=>{
 const {g,document:d}=setup();
 for(const round of [1n,2n,3n])for(const type of rules.TITANS){
  g.reset();g.state.round=round;g.spawn(type);g.summonGolem(rules.GOLEMS[3]);const boss=g.enemies[0],ally=g.golems[0];boss.mesh.position.set(0,0,-3);ally.mesh.position.set(0,0,0);const hp=ally.hp,expected=16*2**Number(round-1n);
  assert.equal(boss.mesh.scale.x,rules.titanRoundScale(round));assert.equal(boss.type.bodyRadius,6);g.updateEnemy(boss,.59);assert.equal(ally.hp,hp);g.updateEnemy(boss,.011);
  if(type.id==='witherzilla'){assert.equal(ally.hp,hp);assert.equal(g.titanShots[0].damage,BigInt(expected));g.updateTitanShots(1);}
  assert.equal(ally.hp,hp-expected,type.id+' round '+round);g.summonGolem(rules.GOLEMS[0]);assert.match(d.getElementById('boss-status').textContent,new RegExp('攻击 '+expected));g.updateEnemy(boss,1.19);assert.equal(ally.hp,hp-expected);g.updateEnemy(boss,.011);if(type.id==='witherzilla')g.updateTitanShots(1);assert.equal(ally.hp,hp-expected*2);
 }
});
test('extreme round damage is exact BigInt, lethal without Infinity, and village breach remains one',()=>{
 const {g,document:d}=setup();
 for(const id of ['warden','witherzilla']){
  g.reset();g.state.round=2048n;g.spawn(rules.TITANS.find(t=>t.id===id));g.summonGolem(rules.GOLEMS[3]);const boss=g.enemies[0],ally=g.golems[0];boss.mesh.position.set(0,0,-3);ally.mesh.position.set(0,0,0);assert.equal(rules.bossAttackDamage(boss),16n*(1n<<2047n));g.updateEnemy(boss,.61);if(id==='witherzilla'){assert.equal(g.titanShots[0].damage,16n*(1n<<2047n));g.state.round=1n;g.updateTitanShots(1);}assert.equal(ally.hp,0);assert.equal(g.golems.length,0);assert.ok(!d.getElementById('boss-status').textContent.includes('Infinity'));const health=g.state.health;boss.mesh.position.z=3;g.updateEnemy(boss,.01);assert.equal(g.state.health,health-1);
 }
 g.reset();g.state.round=100n;g.spawn(rules.ENEMIES.find(t=>t.id==='zoglin'));g.summonGolem(rules.GOLEMS[3]);const e=g.enemies[0],ally=g.golems[0];e.mesh.position.set(0,0,-1);ally.mesh.position.set(0,0,0);const hp=ally.hp;g.updateEnemy(e,.61);assert.equal(ally.hp,hp-16,'ordinary boss flag does not scale');
});

test('all nine titans grow uniformly per appearance round without enlarging navigation footprint',()=>{
 const {g}=setup();
 for(const round of [1n,2n,3n,2048n])for(const type of rules.TITANS){
  g.reset();g.state.round=round;g.spawn(type);const e=g.enemies[0],scale=rules.titanRoundScale(round);
  assert.equal(e.mesh.scale.x,scale);assert.equal(e.mesh.scale.y,scale);assert.equal(e.mesh.scale.z,scale);assert.ok(Number.isFinite(scale));
  assert.equal(e.type.bodyRadius,6);assert.equal(e.type.hitRadius,4.8);
  assert.equal(Boolean(e.mesh.userData.combatCore),round>1n);
  if(round>1n){e.mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(e.mesh.userData.combatCore),size=box.getSize(new THREE.Vector3());assert.ok(Math.abs(size.y-2)<1e-5);assert.ok(Math.abs(size.x-9.6)<1e-4);}
 }
 assert.deepEqual([1n,2n,3n].map(rules.titanRoundScale),[4,6,9]);
 g.reset();g.updateTitanSpawn(true);assert.equal(g.enemies[0].mesh.scale.x,4);
});

test('grown titan contact core is ray hittable at player height and remains reachable to friendly melee',()=>{
 const {g}=setup();
 for(const round of [2n,3n,2048n])for(const type of rules.TITANS){
  g.reset();g.state.round=round;g.spawn(type);const e=g.enemies[0];e.mesh.position.set(0,0,-3);e.mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1.8,7),new THREE.Vector3(0,0,-1),0,30);
  assert.ok(ray.intersectObject(e.mesh.userData.combatCore,true).length,type.id+' core');
  g.summonGolem(rules.GOLEMS[0]);const ally=g.golems[0];ally.mesh.position.set(0,0,0);ally.cooldown=0;const before=e.hpUnits;g.updateGolems(.01);assert.ok(e.hpUnits<before,type.id+' melee');
 }
});

test('all four spell cards require three choices, never double-release, fail cleanly and replenish empty ammo',()=>{
 const f=setup(),{g,document:d,flush}=f;
 function draw(id){for(let n=0;n<4000;n++){freshQuiz(g);if(g.offers.includes(id))return;d.getElementById('close-quiz').click();}assert.fail('spell absent');}
 for(const spec of rules.SPELL_REWARDS){
  g.reset();g.spawn(rules.ENEMIES[0]);const e=g.enemies[0];draw(spec.id);assert.match(d.querySelector(`[data-reward="${spec.id}"]`).textContent,/连续答对3题/);g.state.ammo=0;g.selectQuestion(spec.id);
  for(let n=0;n<3;n++){g.answer(g.questions[spec.id].answer);g.answer(g.questions[spec.id].answer);if(n<2){assert.ok(!e.tornado&&!e.frozenUntil);flush();}}
  assert.equal(g.state.solved,3);assert.equal(g.state.ammo,9);assert.equal(g.spellEffects.length,1);assert.equal(g.spellEffects[0].key,spec.typeId);
  const p=e.mesh.position.clone();g.updateEnemy(e,2);assert.deepEqual(e.mesh.position.toArray(),p.toArray());flush();assert.equal(g.state.mode,'playing');
  g.reset();g.spawn(rules.ENEMIES[0]);const failed=g.enemies[0];draw(spec.id);g.selectQuestion(spec.id);g.answer(g.questions[spec.id].answer);flush();const wrong=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[spec.id].answer);wrong.click();flush();assert.ok(!failed.tornado&&!failed.frozenUntil);assert.equal(g.state.mode,'playing');
 }
});
test('tornado snapshot flies then lands in legal front boundary and removes exact current HP50% after lightning, no landing damage',()=>{
 const {g}=setup();for(const type of [rules.ENEMIES[0],rules.ENEMIES.find(t=>t.split),...rules.TITANS]){
  g.reset();g.state.round=2048n;g.spawn(type);const e=g.enemies[0];e.mesh.position.set(0,0,0);g.damageEnemy(e,3);const before=e.hpUnits??e.hp;g.castSpell('tornado');assert.ok(!e.tornado);g.updateSpellEffects(.7);assert.ok(e.tornado);const landing=e.tornado.end.clone();assert.ok(landing.z<0);assert.ok(Math.abs(landing.x)<= (type.titan?11:15));
  g.updateEnemy(e,.6);assert.ok(e.mesh.position.y>3.9);assert.equal(e.hpUnits??e.hp,typeof before==='bigint'?before-before/2n:before*.5);g.state.mode='paused';const pos=e.mesh.position.clone();g.updateEnemy(e,20);assert.deepEqual(e.mesh.position.toArray(),pos.toArray());g.state.mode='playing';g.updateEnemy(e,.6);
  assert.deepEqual(e.mesh.position.toArray(),landing.toArray());assert.equal(e.hpUnits??e.hp,typeof before==='bigint'?before-before/2n:before*.5);assert.equal(e.tornado,null);assert.ok(g.enemies.includes(e));g.updateEnemy(e,.01);assert.ok(Number.isFinite(e.mesh.position.x));
 }
});
test('blizzard freezes only existing enemies for battle time, one effective hit kills, splits do not inherit',()=>{
 const {g}=setup();g.reset();g.updateTitanSpawn(true);const boss=g.enemies[0];g.spawn(rules.ENEMIES.find(t=>t.split));const slime=g.enemies.find(e=>e.type.split);g.castSpell('blizzard');g.spawn(rules.ENEMIES[0]);const fresh=g.enemies.at(-1);assert.ok(!fresh.frozenUntil);const pos=boss.mesh.position.clone();g.updateEnemy(boss,5);assert.deepEqual(boss.mesh.position.toArray(),pos.toArray());g.damageEnemy(boss,0);assert.ok(g.enemies.includes(boss));g.damageEnemy(boss,1);assert.ok(!g.enemies.includes(boss));assert.equal(g.state.bossKills,1n);g.damageEnemy(boss,99);assert.equal(g.state.bossKills,1n);
 g.damageEnemy(slime,1);const children=g.enemies.filter(e=>e.type===rules.SMALL_SLIME_ENEMY);assert.equal(children.length,2);assert.ok(children.every(e=>!e.frozenUntil));assert.equal(slime.spellMarker,null);
 g.castSpell('blizzard');const hp=fresh.hp;g.state.elapsed+=3;g.updateEnemy(fresh,.01);assert.ok(!fresh.frozenUntil);g.damageEnemy(fresh,1);assert.equal(fresh.hp,hp-1);g.reset();assert.equal(g.enemies.length,0);
});

test('spell overlap, airborne death and restart clear markers without touching later enemies',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));const e=g.enemies[0];g.castSpell('tornado');g.updateSpellEffects(.7);g.updateEnemy(e,.4);const airborne=e.mesh.position.clone();g.castSpell('blizzard');g.updateEnemy(e,1);assert.deepEqual(e.mesh.position.toArray(),airborne.toArray());g.state.elapsed+=3;g.updateEnemy(e,.8);assert.equal(e.mesh.position.y,0);assert.equal(e.tornado,null);
 g.castSpell('tornado');g.updateSpellEffects(.7);g.updateEnemy(e,.6);const marker=e.spellMarker;g.damageEnemy(e,9999);assert.equal(marker,null);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(c=>c.mesh.position.y===0&&!c.tornado&&!c.frozenUntil));
 g.castSpell('blizzard');const markers=g.enemies.map(c=>c.spellMarker);g.reset();assert.ok(markers.every(m=>m.parent===null));g.castSpell('tornado');g.castSpell('blizzard');assert.equal(g.enemies.length,0);
});

test('tornado uses three shared large columns while all enemies still rise twelve and lose only half',()=>{
 const {g}=setup();g.reset();for(let i=0;i<400;i++)g.spawn(rules.ENEMIES[0]);const hp=g.enemies[0].hp;g.castSpell('tornado');g.updateSpellEffects(.7);g.updateSharedWind();const wind=g.sharedWindField;assert.equal(wind.children.length,3);assert.equal(wind.visible,true);assert.ok(g.enemies.every(e=>e.tornado&&!e.spellMarker&&e.hp===hp*.5));for(const column of wind.children){const box=new THREE.Box3().setFromObject(column),size=box.getSize(new THREE.Vector3());assert.ok(size.y>=33);assert.ok(size.x>=16);}
 for(const e of g.enemies)g.updateEnemy(e,.6);assert.ok(g.enemies.every(e=>e.mesh.position.y===12));g.state.elapsed+=.6;g.updateSharedWind();const rotation=wind.children[0].rotation.y;g.state.mode='paused';g.updateSharedWind();assert.equal(wind.children[0].rotation.y,rotation);g.state.mode='playing';for(const e of g.enemies)g.updateEnemy(e,.6);g.updateSharedWind();assert.ok(g.enemies.every(e=>e.mesh.position.y===0&&e.hp===hp*.5));assert.equal(wind.visible,false);
 g.castSpell('tornado');g.updateSpellEffects(.7);g.updateSharedWind();const h=setup().g;assert.equal(h.restoreSave(g.captureSave()),true);h.updateSharedWind();assert.equal(h.sharedWindField.children.length,3);assert.equal(h.sharedWindField.visible,true);h.reset();assert.equal(h.sharedWindField.visible,false);
});
test('blizzard snow has three moving depth layers, freezes/hides with pause and ends at three battle seconds',()=>{
 const {g}=setup();g.reset();g.castSpell('blizzard');g.updateSpellWeather(.1);const snow=g.spellSnow,attr=snow.geometry.attributes.position;assert.equal(attr.count,1200);assert.ok(snow.material.map);assert.equal(snow.visible,true);assert.ok(new Set(Array.from({length:1200},(_,i)=>Math.floor(-attr.array[i*3+2]/6))).size>=3);const before=Array.from(attr.array);g.updateSpellWeather(.1);assert.notDeepEqual(Array.from(attr.array),before);
 g.state.mode='quiz';const paused=Array.from(attr.array);g.updateSpellWeather(20);assert.equal(snow.visible,false);assert.deepEqual(Array.from(attr.array),paused);g.state.mode='playing';g.state.elapsed=2.99;g.updateSpellWeather(.01);assert.equal(snow.visible,true);g.state.elapsed=3;g.updateSpellWeather(.01);assert.equal(snow.visible,false);
 g.castSpell('blizzard');g.updateSpellWeather(.01);assert.equal(snow.visible,true);g.reset();assert.equal(snow.visible,false);g.updateSpellWeather(.01);assert.equal(snow.visible,false);
});

test('audio toggles exist in all views, sync persisted state and immediately silence active voices',()=>{
 const {g,document:d,dom}=setup();const gains=[],oscillators=[];let resumes=0;
 class AudioContext{constructor(){this.currentTime=1;this.destination={};}resume(){resumes++;return Promise.resolve();}createGain(){const gain={gain:{value:0,setValueAtTime(v){this.value=v;},cancelScheduledValues(){},exponentialRampToValueAtTime(){}},connect(target){this.target=target;},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;}createOscillator(){const osc={frequency:{},connect(target){this.target=target;},start(){this.started=true;},stop(time){if(time===undefined){this.stopped=true;this.onended?.();}},disconnect(){this.disconnected=true;}};oscillators.push(osc);return osc;}}
 dom.window.AudioContext=AudioContext;assert.equal(g.soundOn,true);const buttons=[...d.querySelectorAll('[data-sound-toggle]')];assert.equal(buttons.length,5);for(const id of ['welcome','quiz','paused','catalog'])assert.ok(d.querySelector('#'+id+' [data-sound-toggle]'));
 g.tone(400,5);g.tone(500,5);assert.equal(g.activeVoiceCount,2);assert.equal(gains[0].target!==undefined,true);assert.ok(gains.slice(1).every(node=>node.target===gains[0]));buttons[1].click();assert.equal(g.soundOn,false);assert.equal(gains[0].gain.value,0);assert.equal(g.activeVoiceCount,0);assert.ok(oscillators.every(o=>o.stopped&&o.disconnected));assert.ok(buttons.every(b=>b.getAttribute('aria-pressed')==='false'&&b.textContent.includes('关')));assert.equal(dom.window.localStorage.getItem('block-guardians-sound'),'off');g.tone(300);assert.equal(oscillators.length,2);
 g.reset();g.openQuiz();assert.equal(g.soundOn,false);buttons[2].click();assert.equal(g.soundOn,true);assert.equal(gains[0].gain.value,1);assert.ok(resumes>=3);assert.equal(oscillators.length,3);assert.equal(dom.window.localStorage.getItem('block-guardians-sound'),'on');dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'m',cancelable:true}));assert.equal(g.soundOn,false);
});
test('sound choice restores on load and unavailable storage or audio stays safe',()=>{
 const off=setup({preference:'off'});assert.equal(off.g.soundOn,false);assert.ok([...off.document.querySelectorAll('[data-sound-toggle]')].every(b=>b.textContent.includes('关')));off.g.reset();assert.equal(off.g.soundOn,false);
 const on=setup({preference:'on'});assert.equal(on.g.soundOn,true);const blocked=setup({storageBlocked:true});assert.equal(blocked.g.soundOn,true);assert.doesNotThrow(()=>blocked.g.setSound(false));assert.doesNotThrow(()=>blocked.g.setSound(true));assert.doesNotThrow(()=>blocked.g.tone(500));assert.equal(blocked.g.soundOn,true);
});

test('200 allies have distinct legal spawn centers and cloned glass resources release on death/reset',()=>{
 const {g}=setup();g.reset();const glass=rules.GOLEMS.find(t=>t.id==='glass');for(let i=0;i<200;i++)assert.ok(g.summonGolem(glass));assert.equal(g.summonGolem(glass),false);assert.equal(new Set(g.golems.map(a=>a.mesh.position.toArray().join(','))).size,200);assert.ok(g.golems.every(a=>Math.abs(a.mesh.position.x)<=5.6&&a.mesh.position.z>=-5.5&&a.mesh.position.z<=1.3));
 let disposed=0,owned=0;for(const a of g.golems)for(const m of a.mesh.userData.ownedMaterials){owned++;m.addEventListener('dispose',()=>disposed++);}assert.ok(owned>200);g.damageGolem(g.golems[0],999);assert.ok(disposed>0);g.reset();assert.equal(disposed,owned);assert.equal(g.golems.length,0);
});

test('save restores exact high-round health, allies, plant upgrades and active spell into safe pause',()=>{
 const f=setup(),{g,dom}=f;g.reset();g.state.elapsed=123;g.state.round=2048n;g.state.bossKills=99n;g.state.ammo=4;g.state.health=3;g.state.solved=55;
 g.spawn(rules.TITANS[0]);g.damageEnemy(g.enemies[0],7);g.summonGolem(rules.SMALL_SLIME_GOLEM);g.golems[0].hp=8;g.plantSystem.add(rules.PLANTS[2],4);g.plantSystem.plants[0].upgrades={multi:99,area:3,slow:3};g.castSpell('tornado');g.updateSpellEffects(.7);g.updateEnemy(g.enemies[0],.3);g.castSpell('blizzard');const before=g.captureSave();assert.equal(g.saveProgress(true),true);const text=dom.window.localStorage.getItem(savegame.SAVE_KEY);assert.ok(text.length<2*1024*1024);
 const second=setup({savedText:text});assert.ok(!second.document.getElementById('continue-save').classList.contains('hidden'));second.document.getElementById('continue-save').click();assert.equal(second.g.state.mode,'paused');assert.equal(second.g.state.health,3);assert.equal(second.g.state.ammo,4);assert.equal(second.g.state.round,2048n);assert.equal(second.g.enemies[0].hpUnits,g.enemies[0].hpUnits);assert.equal(second.g.golems[0].hp,8);assert.equal(rules.usedSlots(second.g.golems),.5);assert.deepEqual({...second.g.plantSystem.plants[0].upgrades},{multi:99,area:3,slow:3});assert.equal(second.g.enemies[0].tornado.time,.3);assert.equal(second.g.enemies[0].frozenUntil,126);
 const restored=second.g.captureSave();assert.equal(savegame.encodeSave(restored),savegame.encodeSave(before));second.document.getElementById('resume').click();second.g.state.elapsed=126;second.g.updateEnemy(second.g.enemies[0],.9);assert.equal(second.g.enemies[0].mesh.position.y,0);
});
test('unfinished quiz is canceled on restore, granted rewards never replay, and pending burst is discarded',()=>{
 const f=setup(),{g,dom,document:d,flush}=f;g.reset();let id;for(let tries=0;tries<100&&id===undefined;tries++){freshQuiz(g);id=g.offers.find(i=>i>=4&&i<17);if(id===undefined)d.getElementById('close-quiz').click();}assert.notEqual(id,undefined);g.selectQuestion(id);g.answer(g.questions[id].answer);assert.equal(g.saveProgress(),true);const text=dom.window.localStorage.getItem(savegame.SAVE_KEY);const other=setup({savedText:text});other.document.getElementById('continue-save').click();assert.equal(other.g.state.mode,'paused');assert.equal(other.g.golems.length,0);assert.equal(other.g.streak,0);assert.equal(other.g.state.solved,1);
 flush();g.answer(g.questions[id].answer);flush();g.answer(g.questions[id].answer);assert.equal(g.state.mode,'reward');assert.equal(g.golems.length,1);assert.equal(g.saveProgress(),true);const reward=setup({savedText:dom.window.localStorage.getItem(savegame.SAVE_KEY)});reward.document.getElementById('continue-save').click();reward.flush();assert.equal(reward.g.golems.length,1);assert.equal(reward.g.state.mode,'paused');
 g.reset();g.shoot();assert.equal(g.state.ammo,8);assert.equal(g.saveProgress(),true);const burst=setup({savedText:dom.window.localStorage.getItem(savegame.SAVE_KEY)});burst.document.getElementById('continue-save').click();assert.equal(burst.g.state.ammo,8);assert.equal(burst.g.state.burstRemaining,0);
});
test('autosave/pagehide, damaged storage, explicit new-game confirmation and failed writes preserve old save',()=>{
 const f=setup(),{g,dom,document:d}=f;d.getElementById('start').click();const initial=dom.window.localStorage.getItem(savegame.SAVE_KEY);assert.ok(initial);g.state.elapsed=5;f.frame(50);const automatic=dom.window.localStorage.getItem(savegame.SAVE_KEY);assert.notEqual(automatic,initial);g.state.solved=7;dom.window.dispatchEvent(new dom.window.Event('pagehide'));assert.equal(savegame.decodeSave(dom.window.localStorage.getItem(savegame.SAVE_KEY)).state.solved,7);
 const second=setup({savedText:automatic});second.document.getElementById('start').click();assert.equal(second.g.state.mode,'welcome');assert.equal(second.dom.window.localStorage.getItem(savegame.SAVE_KEY),automatic);second.document.getElementById('start').click();assert.equal(second.g.state.mode,'playing');assert.equal(second.g.state.elapsed,0);
 const broken=setup({savedText:'bad json'});assert.ok(broken.document.getElementById('continue-save').classList.contains('hidden'));assert.equal(broken.dom.window.localStorage.getItem(savegame.SAVE_KEY),'bad json');assert.match(broken.document.querySelector('[data-save-status]').textContent,/损坏/);
 const old=dom.window.localStorage.getItem(savegame.SAVE_KEY);const proto=Object.getPrototypeOf(dom.window.localStorage),original=proto.setItem;proto.setItem=()=>{throw new Error('quota');};g.state.solved=9;assert.equal(g.saveProgress(true),false);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),old);proto.setItem=original;assert.match(d.querySelector('[data-save-status]').textContent,/保存失败/);
 const unavailable=setup({storageBlocked:true});unavailable.g.reset();assert.equal(unavailable.g.saveProgress(true),false);
});

test('full-capacity snapshot remains compact, resumes all bodies, and unchanged manual saves are deduplicated',()=>{
 const {g,dom}=setup();g.reset();for(let i=0;i<400;i++){g.summonGolem(rules.SMALL_SLIME_GOLEM);g.spawn(rules.ENEMIES[0]);}g.updateTitanSpawn(true);for(let i=0;i<10;i++)g.plantSystem.add(rules.PLANTS[i%8],i);
 const started=performance.now();assert.equal(g.saveProgress(),true);const text=dom.window.localStorage.getItem(savegame.SAVE_KEY);assert.ok(text.length<500000);let writes=0;const prototype=Object.getPrototypeOf(dom.window.localStorage),write=prototype.setItem;prototype.setItem=function(...args){writes++;return write.apply(this,args);};assert.equal(g.saveProgress(true),true);assert.equal(writes,0);prototype.setItem=write;
 assert.equal(g.restoreSave(savegame.decodeSave(text)),true);assert.equal(g.golems.length,400);assert.equal(rules.usedSlots(g.golems),200);assert.equal(g.enemies.length,401);assert.equal(rules.usedSlots(g.enemies),420);assert.equal(g.plantSystem.plants.length,10);assert.equal(g.state.mode,'paused');console.log(`full save ${text.length} chars; encode+rebuild ${(performance.now()-started).toFixed(0)}ms CPU mock`);
});

test('resume preserves a current taunt target and attack countdown without a free attack or reset',()=>{
 const {g,document:d}=setup();g.reset();g.spawn(rules.TITANS[0]);g.summonGolem(rules.GOLEMS[3]);const e=g.enemies[0],a=g.golems[0];e.mesh.position.set(0,0,-3);a.mesh.position.set(0,0,0);g.updateEnemy(e,.3);assert.equal(e.guard,a);const hp=a.hp,remaining=e.melee;const snapshot=g.captureSave();assert.equal(snapshot.enemies[0].guardIndex,0);assert.equal(g.restoreSave(snapshot),true);assert.equal(g.enemies[0].guard,g.golems[0]);assert.equal(g.enemies[0].melee,remaining);d.getElementById('resume').click();g.updateEnemy(g.enemies[0],.29);assert.equal(g.golems[0].hp,hp);g.updateEnemy(g.enemies[0],.02);assert.equal(g.golems[0].hp,hp-16);
});

test('meteor selects snapshot 80 percent without replacement, kills once and retains normal splits',()=>{
 const {g}=setup();g.reset();for(let i=0;i<10;i++)g.spawn(rules.ENEMIES[0]);g.castSpell('meteor');const effect=g.spellEffects[0];assert.equal(effect.selected.length,8);assert.equal(new Set(effect.selected).size,8);g.spawn(rules.ENEMIES[0]);const fresh=g.enemies.at(-1);g.updateSpellEffects(1.19);assert.equal(g.state.kills,0);g.updateSpellEffects(.01);assert.equal(g.state.kills,8);assert.equal(g.enemies.length,3);assert.ok(g.enemies.includes(fresh));g.updateSpellEffects(10);assert.equal(g.state.kills,8);
 g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));g.castSpell('meteor');g.updateSpellEffects(1.2);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(e=>e.type===rules.SMALL_SLIME_ENEMY));
});
test('blackhole removes snapshot descendants but not later spawns, bosses count exactly once',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));const slime=g.enemies[0];g.updateTitanSpawn(true);g.castSpell('blackhole');g.damageEnemy(slime,999);assert.equal(g.enemies.filter(e=>e.type===rules.SMALL_SLIME_ENEMY).length,2);g.spawn(rules.ENEMIES[0]);const fresh=g.enemies.at(-1);g.updateSpellEffects(.75);assert.ok(g.enemies.find(e=>e.type.titan).mesh.position.y>0);g.state.mode='paused';g.updateSpellEffects(5);assert.equal(g.spellEffects[0].time,.75);g.state.mode='playing';g.updateSpellEffects(.75);assert.deepEqual([...g.enemies],[fresh]);assert.equal(g.state.bossKills,1n);g.updateSpellEffects(10);assert.equal(g.state.bossKills,1n);
 g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));g.castSpell('blackhole');g.updateSpellEffects(1.5);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,1);
});
test('four spell saves resume pending stages without repeat damage or resurrecting selection',()=>{
 for(const key of ['tornado','blizzard','meteor','blackhole']){
  const f=setup(),g=f.g;g.reset();g.state.round=2048n;g.spawn(rules.TITANS[0]);g.castSpell(key);g.updateSpellEffects(.3);const snapshot=g.captureSave();assert.doesNotThrow(()=>savegame.encodeSave(snapshot));const other=setup(),h=other.g;assert.equal(h.restoreSave(snapshot),true);assert.equal(h.spellEffects.length,1);assert.equal(h.spellEffects[0].key,key);assert.equal(h.spellEffects[0].time,.3);h.state.mode='playing';const before=h.enemies[0].hpUnits;h.updateSpellEffects(.4);
  if(key==='tornado'){assert.equal(h.enemies[0].hpUnits,before-before/2n);const after=h.captureSave(),third=setup().g;assert.equal(third.restoreSave(after),true);third.state.mode='playing';third.updateSpellEffects(.1);assert.equal(third.enemies[0].hpUnits,h.enemies[0].hpUnits);third.updateEnemy(third.enemies[0],1.2);assert.equal(third.enemies[0].hpUnits,h.enemies[0].hpUnits);}
  if(key==='meteor'||key==='blackhole'){h.updateSpellEffects(2);assert.equal(h.enemies.length,0);assert.equal(h.state.bossKills,1n);const final=h.captureSave();assert.equal(h.restoreSave(final),true);h.state.mode='playing';h.updateSpellEffects(2);assert.equal(h.state.bossKills,1n);}
 }
});
test('four-spell large snapshot pressure stays bounded and reset removes all effects',()=>{
 const {g}=setup();g.reset();for(let i=0;i<400;i++)g.spawn(rules.ENEMIES[0]);g.castSpell('meteor');assert.equal(g.spellEffects[0].selected.length,320);g.castSpell('blackhole');const text=savegame.encodeSave(g.captureSave());assert.ok(text.length<2*1024*1024);g.updateSpellEffects(1.5);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,400);g.reset();assert.equal(g.spellEffects.length,0);assert.equal(g.spellSnow.visible,false);
});

test('spell presentation has large meteor, moving clouds, delayed thunder and distinct blackhole palette',()=>{
 const {g}=setup();g.reset();g.castSpell('tornado');let effect=g.spellEffects[0];const x=effect.clouds[0].position.x;assert.ok(effect.bolts.length>=8);g.updateSpellEffects(.5);assert.ok(effect.clouds[0].position.x>x+20);assert.ok(effect.bolts.some(m=>m.visible));
 g.reset();g.castSpell('meteor');effect=g.spellEffects[0];assert.equal(effect.primary.scale.x,4.5);const y=effect.primary.position.y;g.updateSpellEffects(.6);assert.ok(effect.primary.position.y<y);g.updateSpellEffects(.6);assert.equal(effect.applied,true);assert.ok(g.spellEffects.includes(effect));g.updateSpellEffects(.4);assert.equal(effect.mesh.parent,null);
 g.reset();g.castSpell('blackhole');effect=g.spellEffects[0];const color=effect.palette.color.getHex();g.updateSpellEffects(1.3);assert.notEqual(effect.palette.color.getHex(),color);assert.ok(effect.holeFrame.scale.x<2);assert.ok(effect.holeFrame.scale.y<.7);assert.ok(Math.abs(effect.holeFrame.scale.x/effect.holeFrame.scale.y-2/.7)<1e-10);g.reset();assert.equal(effect.mesh.parent,null);
});

test('spell catalog creates and replaces isolated frames without touching live state or storage',()=>{
 const f=setup(),{g,document:d,dom}=f;const sentinel='keep-this-existing-save';dom.window.localStorage.setItem(savegame.SAVE_KEY,sentinel);g.openCatalog();const before={elapsed:g.state.elapsed,kills:g.state.kills,solved:g.state.solved,round:g.state.round,health:g.state.health};
 g.selectCatalogGroup(4);assert.equal(g.catalogGroups[4].types.length,4);let previous;
 for(let i=0;i<4;i++){d.getElementById('catalog-select').onchange({target:{value:String(i)}});const frame=g.spellPreviewFrame;assert.ok(frame);assert.equal(new dom.window.URL(frame.src).searchParams.get('spellPreview'),rules.SPELL_REWARDS[i].typeId);assert.equal(frame.title,rules.SPELL_REWARDS[i].name+'真实法术演示');if(previous)assert.equal(previous.isConnected,false);previous=frame;assert.equal(g.enemies.length,0);assert.equal(g.spellEffects.length,0);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),sentinel);}
 d.getElementById('catalog-replay').click();assert.notEqual(g.spellPreviewFrame,previous);assert.equal(previous.isConnected,false);d.getElementById('catalog-stop').click();assert.match(d.getElementById('catalog-spell-status').textContent,/已停止/);d.getElementById('catalog-explain').click();assert.equal(d.getElementById('catalog-explain').getAttribute('aria-expanded'),'true');
 const active=g.spellPreviewFrame;g.selectCatalogGroup(0);assert.equal(g.spellPreviewFrame,null);assert.equal(active.isConnected,false);g.selectCatalogGroup(4);const last=g.spellPreviewFrame;g.closeCatalog();assert.equal(last.isConnected,false);assert.equal(g.spellPreviewFrame,null);assert.equal(g.state.mode,'welcome');for(const k of Object.keys(before))assert.equal(g.state[k],before[k]);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),sentinel);
});
test('actual preview instances use real spell damage and never read, write or restore progress',()=>{
 for(const key of ['tornado','blizzard','meteor','blackhole']){
  const f=setup({url:'http://localhost/?spellPreview='+key,storageBlocked:true}),{g,document:d}=f;assert.equal(g.previewMode,true);assert.equal(g.enemies.length,11);assert.equal(g.enemies.filter(e=>e.type.titan).length,1);const first=g.enemies[0],hp=first.hp;assert.equal(g.saveProgress(true),false);assert.equal(g.inspectSave(),false);assert.equal(g.restoreSave({}),false);g.openQuiz();g.shoot(true);assert.equal(g.questions.length,0);assert.equal(g.state.ammo,9);assert.equal(g.activeVoiceCount,0);
  for(let i=0;i<90;i++)g.stepSpellPreview(.05);
  if(key==='tornado'){assert.equal(g.enemies.length,11);assert.equal(first.hp,hp*.5);assert.equal(first.mesh.position.y,0);assert.ok(first.mesh.position.z<-10);}
  if(key==='meteor'){assert.equal(g.enemies.length,2);assert.equal(g.state.kills,9);}
  if(key==='blackhole'||key==='blizzard'){assert.equal(g.enemies.length,0);assert.equal(g.state.kills,11);assert.equal(g.state.bossKills,1n);}
  assert.equal(g.activeVoiceCount,0);g.resetSpellPreview(false);assert.equal(g.enemies.length,11);assert.equal(g.spellEffects.length,0);assert.equal(g.previewRunning,false);assert.equal(g.state.kills,0);g.stepSpellPreview(10);assert.equal(g.enemies.length,11);assert.equal(g.previewClock,0);g.resetSpellPreview(true);assert.equal(g.previewRunning,true);assert.equal(g.enemies.length,11);
 }
});
test('preview background pause and guarded control messages preserve timing and progress bytes',()=>{
 const f=setup({url:'http://localhost/?spellPreview=blackhole'}),{g,dom,document:d}=f;dom.window.localStorage.setItem(savegame.SAVE_KEY,'saved-game');dom.window.localStorage.setItem('block-guardians-sound','off');g.stepSpellPreview(.5);const clock=g.previewClock;Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new dom.window.Event('visibilitychange'));g.stepSpellPreview(30);assert.equal(g.previewClock,clock);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),'saved-game');
 Object.defineProperty(d,'hidden',{configurable:true,value:false});g.stepSpellPreview(.1);assert.ok(g.previewClock>clock);const before=g.previewClock;dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin:'https://wrong.example',source:dom.window,data:{kind:'block-spell-control',action:'stop'}}));assert.equal(g.previewRunning,true);dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin:'http://localhost',source:dom.window,data:{kind:'block-spell-control',action:'stop',sound:true}}));assert.equal(g.previewRunning,false);assert.equal(g.previewClock,0);assert.equal(g.enemies.length,11);assert.equal(dom.window.localStorage.getItem('block-guardians-sound'),'off');dom.window.dispatchEvent(new dom.window.Event('pagehide'));assert.equal(g.enemies.length,0);assert.equal(dom.window.localStorage.getItem(savegame.SAVE_KEY),'saved-game');
});

test('preview back-forward cache pauses without replaying and presentation fits narrow viewports',()=>{
 const f=setup({url:'http://localhost/?spellPreview=tornado'}),{g,dom}=f;g.stepSpellPreview(.5);const clock=g.previewClock;const hide=new dom.window.Event('pagehide');Object.defineProperty(hide,'persisted',{value:true});dom.window.dispatchEvent(hide);g.stepSpellPreview(20);assert.equal(g.previewClock,clock);assert.equal(g.enemies.length,11);const show=new dom.window.Event('pageshow');Object.defineProperty(show,'persisted',{value:true});dom.window.dispatchEvent(show);g.stepSpellPreview(.1);assert.ok(g.previewClock>clock);assert.equal(g.spellEffects.length,1);
 for(const [width,height] of [[320,240],[700,200],[1000,500]]){
  const preview=setup({url:'http://localhost/?spellPreview=meteor',width,height}).g;preview.stepSpellPreview(.25);const camera=preview.previewCamera;camera.updateMatrixWorld(true);const primary=preview.spellEffects[0].primary;primary.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(primary);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=1.01&&Math.abs(p.y)<=1.01,'meteor with trail fits '+width+'x'+height);}
 }
});

test('wrong answer counter counts one real submission, persists and defaults old saves to zero',()=>{
 const f=setup(),{g,document:d,flush}=f;g.reset();g.openQuiz();const id=g.offers[0];g.selectQuestion(id);const wrong=[...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[id].answer),value=Number(wrong.textContent);wrong.click();wrong.click();g.answer(value);assert.equal(g.state.wrong,1);assert.equal(g.state.solved,0);assert.match(d.getElementById('wrong').textContent,/1/);assert.equal(g.supplyRound,null);const saved=g.captureSave();assert.equal(saved.state.wrong,1);const h=setup().g;assert.equal(h.restoreSave(saved),true);assert.equal(h.state.wrong,1);const old=structuredClone(saved);delete old.state.wrong;delete old.supplyRound;assert.equal(h.restoreSave(old),true);assert.equal(h.state.wrong,0);flush();g.openQuiz();assert.equal(g.supplyRound.rerollsRemaining,3);g.reset();assert.equal(g.state.wrong,0);
});
test('rerolls are bounded to three, preserve guarantees, survive close and exact saved budget',()=>{
 const f=setup(),{g,document:d,dom}=f;g.reset();g.openQuiz();assert.equal(g.supplyRound.rerollsRemaining,3);for(let i=2;i>=0;i--){assert.equal(g.rerollSupplies(),true);assert.equal(g.supplyRound.rerollsRemaining,i);assert.equal(g.offers.length,3);assert.equal(new Set(g.offers).size,3);assert.ok(g.offers.some(id=>id>=17&&id<25));assert.ok(g.offers.some(id=>id>=4&&id<17||id>=rules.SPECIAL_GOLEM_START&&id<rules.SPELL_REWARD_START));assert.ok(g.offers.filter(id=>id>=rules.SPECIAL_GOLEM_START).length<=1);assert.equal(JSON.parse(dom.window.localStorage.getItem(savegame.SAVE_KEY)).supplyRound.rerollsRemaining,i);}
 const cards=[...g.offers];assert.equal(g.rerollSupplies(),false);assert.equal(d.getElementById('reroll-supplies').disabled,true);d.getElementById('close-quiz').click();g.openQuiz();assert.deepEqual([...g.offers],cards);assert.equal(g.supplyRound.rerollsRemaining,0);
 const h=setup().g;assert.equal(h.restoreSave(g.captureSave()),true);h.state.mode='playing';h.openQuiz();assert.equal(h.supplyRound.rerollsRemaining,0);assert.deepEqual([...h.offers],cards);assert.equal(h.rerollSupplies(),false);
});
test('selection locks reroll across close and restore, error starts a new round without awarding',()=>{
 const f=setup(),{g,document:d,flush}=f;g.reset();g.openQuiz();g.rerollSupplies();const id=g.offers[0];g.selectQuestion(id);assert.equal(g.supplyRound.locked,true);assert.equal(g.rerollSupplies(),false);assert.equal(d.getElementById('reroll-supplies').disabled,true);d.getElementById('close-quiz').click();g.openQuiz();assert.equal(g.supplyRound.rerollsRemaining,2);assert.equal(g.supplyRound.locked,true);assert.equal(g.rerollSupplies(),false);
 const other=setup(),h=other.g;h.restoreSave(g.captureSave());h.state.mode='playing';h.openQuiz();assert.equal(h.supplyRound.selected,id);assert.equal(h.supplyRound.locked,true);assert.equal(h.rerollSupplies(),false);const wrong=[...other.document.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==h.questions[id].answer);wrong.click();assert.equal(h.state.wrong,1);assert.equal(h.golems.length,0);assert.equal(h.plantSystem.plants.length,0);other.flush();h.openQuiz();assert.equal(h.supplyRound.rerollsRemaining,3);assert.equal(h.supplyRound.locked,false);
});

test('enhanced meteor and blackhole animate deterministic shared geometry and retain exact impact times',()=>{
 const {g}=setup();g.reset();for(let i=0;i<10;i++)g.spawn(rules.ENEMIES[0]);g.castSpell('meteor');let effect=g.spellEffects[0];assert.equal(effect.primary.userData.flames.length,12);assert.equal(effect.primary.userData.embers.length,20);assert.equal(effect.shockRings.length,3);const flame=effect.primary.userData.flames[0],y=flame.scale.y;g.updateSpellEffects(.4);assert.notEqual(flame.scale.y,y);g.state.mode='paused';const time=effect.time;g.updateSpellEffects(5);assert.equal(effect.time,time);g.state.mode='playing';g.updateSpellEffects(.79);assert.equal(g.state.kills,0);g.updateSpellEffects(.01);assert.equal(g.state.kills,8);g.updateSpellEffects(.1);assert.ok(effect.shockRings.some(w=>w.visible));g.updateSpellEffects(.3);assert.equal(effect.mesh.parent,null);
 g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('blackhole');effect=g.spellEffects[0];assert.equal(effect.diskBits.length,96);assert.equal(effect.warpRings.length,3);assert.ok(effect.darkRim);const p=effect.diskBits[0].position.clone();g.updateSpellEffects(.6);assert.notDeepEqual(effect.diskBits[0].position.toArray(),p.toArray());const h=setup().g;assert.equal(h.restoreSave(g.captureSave()),true);assert.equal(h.spellEffects[0].diskBits.length,96);h.state.mode='playing';h.updateSpellEffects(.9);assert.equal(h.enemies.length,0);assert.equal(h.state.kills,1);assert.equal(h.spellEffects.length,0);
});
test('reroll storage failures visibly warn without spending more than the local three uses',()=>{
 const {g,document:d}=setup({storageBlocked:true});g.reset();g.openQuiz();assert.match(d.getElementById('reroll-hint').textContent,/存储不可用/);for(let n=0;n<3;n++)assert.equal(g.rerollSupplies(),true);assert.equal(g.rerollSupplies(),false);assert.match(d.getElementById('reroll-hint').textContent,/存储不可用/);
});

test('angular transparent ice encloses actual bodies at every titan scale and never blocks raycasts',()=>{
 const {g}=setup();assert.equal(g.frostGeometry.type,'BoxGeometry');assert.equal(g.frostEdgesGeometry.type,'EdgesGeometry');assert.ok(g.frostMaterial.opacity>0&&g.frostMaterial.opacity<.3);assert.equal(g.frostMaterial.depthWrite,false);
 for(const type of [...rules.ENEMIES,rules.SMALL_SLIME_ENEMY,rules.SMALL_MAGMA_SLIME_ENEMY,...rules.TITANS])for(const round of type.titan?[1n,3n,2048n]:[1n]){
  g.reset();g.state.round=round;g.spawn(type);const e=g.enemies[0];e.mesh.rotation.y=.7;g.castSpell('blizzard');const ice=e.spellMarker;assert.ok(ice);assert.equal(ice.children.length,2);assert.equal(ice.children[0].geometry,g.frostGeometry);assert.ok(ice.children[1].isLineSegments);ice.updateMatrixWorld(true);const inverse=ice.matrixWorld.clone().invert();
  e.mesh.traverse(o=>{if(!o.isMesh||!o.geometry)return;let a=o;while(a&&a!==e.mesh){if(a===e.mesh.userData.bar||a===e.mesh.userData.warn||!a.visible)return;a=a.parent;}if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);assert.ok(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))<=.501,type.id+' enclosed');}});
  const hits=[];ice.children.forEach(o=>o.raycast(new THREE.Raycaster(),hits));assert.equal(hits.length,0);const before=ice.position.clone();e.mesh.position.x+=1;g.positionSpellMarker(e);assert.ok(Math.abs(ice.position.x-before.x-1)<1e-6);g.damageEnemy(e,1);assert.equal(g.enemies.includes(e),false);assert.equal(ice.parent,null);
 }
});
test('blackhole keeps a flattened deep-black core and all luminous disk blocks outside it',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);g.castSpell('blackhole');const effect=g.spellEffects[0];assert.equal(effect.hole.material.color.getHex(),0);assert.equal(effect.hole.material.type,'MeshBasicMaterial');assert.equal(effect.hole.material.toneMapped,false);assert.equal(effect.hole.material.fog,false);assert.equal(effect.hole.parent,effect.holeFrame);assert.equal(effect.disk.parent,effect.holeFrame);assert.ok(effect.hole.position.z>0);
 for(let i=0;i<14;i++){g.updateSpellEffects(.1);assert.ok(Math.abs(effect.holeFrame.scale.x/effect.holeFrame.scale.y-2/.7)<1e-10);assert.equal(effect.hole.material.color.getHex(),0);for(const bit of effect.diskBits)assert.ok(Math.hypot(bit.position.x,bit.position.y)-.2>4);}
 const h=setup().g;assert.equal(h.restoreSave(g.captureSave()),true);assert.equal(h.spellEffects[0].hole.material.color.getHex(),0);assert.ok(Math.abs(h.spellEffects[0].holeFrame.scale.x/h.spellEffects[0].holeFrame.scale.y-2/.7)<1e-10);h.state.mode='playing';h.updateSpellEffects(.2);assert.equal(h.state.kills,1);assert.equal(h.spellEffects.length,0);
});

test('ice follows blackhole translation and shrink immediately, including saved overlap restore',()=>{
 const {g}=setup();g.reset();g.spawn(rules.ENEMIES[0]);const e=g.enemies[0];g.castSpell('blizzard');g.castSpell('blackhole');g.updateSpellEffects(.75);const marker=e.spellMarker;const expected=marker.userData.center.clone().applyMatrix4(e.mesh.matrixWorld);assert.ok(marker.position.distanceTo(expected)<1e-8);assert.ok(marker.scale.x<marker.userData.size.x);
 const h=setup().g;assert.equal(h.restoreSave(g.captureSave()),true);const restored=h.enemies[0];const center=restored.spellMarker.userData.center.clone().applyMatrix4(restored.mesh.matrixWorld);assert.ok(restored.spellMarker.position.distanceTo(center)<1e-8);h.state.mode='playing';h.updateSpellEffects(.25);h.updateEnemySpell(restored,.25);const next=restored.spellMarker.userData.center.clone().applyMatrix4(restored.mesh.matrixWorld);assert.ok(restored.spellMarker.position.distanceTo(next)<1e-8);h.updateSpellEffects(.5);assert.equal(h.enemies.length,0);assert.equal(restored.spellMarker,null);
});

test('ordinary spawn band is continuous, broad, model-safe and navigable for every type',()=>{
 const {g}=setup();let seed=321;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const bins=Array(6).fill(0),unique=new Set();
 for(const type of rules.ENEMIES){const mesh=g.monsterModel(type),r=g.spawnRadius(type,mesh);
  for(let i=0;i<150;i++){const p=g.normalSpawnPosition(type,mesh,rng);assert.ok(p);assert.ok(Math.abs(p.x)<=13&&p.z>=-15&&p.z<=-9);assert.ok(Math.abs(p.x)+r<17&&Math.abs(p.z)+r<17);assert.ok(g.clearWalk(p,p,r+.25));
   if(i<3){const goal=new THREE.Vector3(p.x,0,3);assert.ok(g.clearWalk(p,goal)||g.walkingRoute(p,goal,[-15,15,-15,15]).length>0);}
   bins[Math.min(5,Math.floor((p.x+13)/26*6))]++;unique.add(p.x.toFixed(3));
  }
 }
 assert.ok(unique.size>1500);assert.ok(bins.every(n=>n>40),JSON.stringify(bins));
});
test('ordinary crowded spawns retain capacity and same clocks without changing titan entrance',()=>{
 const {g}=setup();g.reset();g.state.elapsed=300;const before=g.state.spawn;
 for(let n=0;n<400;n++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,400);assert.equal(g.state.spawn,before);
 const positions=g.enemies.map(e=>e.mesh.position);assert.ok(new Set(positions.map(p=>p.x.toFixed(3)+','+p.z.toFixed(3))).size>390);
 g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,400);assert.equal(g.updateTitanSpawn(true),true);const boss=g.enemies.find(e=>e.type.titan);assert.equal(boss.mesh.position.x,0);assert.equal(boss.mesh.position.z,-11);
 const saved=g.captureSave();assert.ok(saved);assert.equal(g.restoreSave(saved),true);assert.equal(g.enemies.length,401);
});
