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
function setup(){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'http://localhost/',pretendToBeVisual:true});
 const {window}=dom,document=window.document;document.exitPointerLock=()=>{};
 const timers=new Map();let timerId=0;
 class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}setClearColor(){}clear(){}setViewport(){}setScissor(){}setScissorTest(){}render(){}}
 const ctx={...rules,createTitanModel,poseTitanAttack,createPlantSystem,THREE:{...THREE,WebGLRenderer:Renderer},window,document,HTMLInputElement:window.HTMLInputElement,devicePixelRatio:1,innerWidth:1200,innerHeight:800,performance:{now:()=>0},requestAnimationFrame(){},addEventListener:window.addEventListener.bind(window),setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},console};
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

test('upgrade cards need two answers, keep summon guarantees, fail without reward, and work at full plant capacity',()=>{
 const f=setup(),{g,document:d}=f;g.reset();g.plantSystem.add(rules.PLANTS[0],0);const plant=g.plantSystem.plants[0];
 function draw(){for(let n=0;n<500;n++){if(g.state.mode==='quiz')d.getElementById('close-quiz').onclick();g.openQuiz();assert.ok(g.offers.some(i=>i>=17&&i<25));assert.ok(g.offers.some(i=>(i>=4&&i<17)||i>=rules.SPECIAL_GOLEM_START));if(g.offers.includes(25))return;}assert.fail('upgrade card absent');}
 function correct(){g.answer(g.questions[25].answer);f.flush();}
 draw();g.selectQuestion(25);correct();assert.equal(plant.upgrades.multi,0);correct();assert.equal(plant.upgrades.multi,1);assert.equal(g.state.mode,'playing');
 draw();g.selectQuestion(25);correct();const wrong=[...d.querySelectorAll('#answer-options button')].map(b=>Number(b.textContent)).find(x=>x!==g.questions[25].answer);g.answer(wrong);f.flush();assert.equal(g.state.mode,'playing');assert.equal(plant.upgrades.multi,1);
 for(let i=1;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);let found=false;for(let n=0;n<500;n++){g.openQuiz();assert.ok(g.offers.every(i=>i<17||i>=25));if(g.offers.includes(25)){found=true;break;}d.getElementById('close-quiz').onclick();}assert.ok(found);g.selectQuestion(25);correct();correct();assert.equal(g.plantSystem.plants.reduce((n,p)=>n+p.upgrades.multi,0),2);
});
test('manual titan is immediate, preserves ordinary enemies, one boss only and resets next countdown',()=>{
 const {g,document:d}=setup();assert.equal(g.updateTitanSpawn(true),false);g.reset();for(let n=0;n<100;n++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,100);const old=[...g.enemies];g.state.elapsed=12;d.getElementById('challenge-boss').onclick();assert.equal(g.enemies.length,101);assert.ok(old.every(e=>g.enemies.includes(e)));assert.equal(rules.usedSlots(g.enemies),120);assert.equal(g.enemies.at(-1).type.id,rules.TITANS[0].id);assert.equal(d.getElementById('challenge-boss').disabled,true);assert.equal(g.updateTitanSpawn(true),false);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,101);g.damageEnemy(g.enemies.at(-1),100000);g.titanCountdown();assert.match(d.getElementById('boss-timer').textContent,/1:30/);for(const e of [...g.enemies])g.damageEnemy(e,100000);g.state.elapsed=101;assert.equal(g.updateTitanSpawn(),false);g.state.elapsed=102;assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies.at(-1).type.id,rules.TITANS[1].id);g.reset();g.openQuiz();assert.equal(g.updateTitanSpawn(true),false);assert.equal(g.enemies.length,0);
});

test('expanded upgrade information flows below golem HUD, not over it',()=>{const {document:d}=setup();assert.equal(d.getElementById('golem-status').parentElement,d.getElementById('defense-status'));assert.equal(d.getElementById('plant-upgrade-panel').parentElement,d.getElementById('defense-status'));assert.equal(d.getElementById('defense-status').children[0].id,'golem-status');});

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
 const {g}=setup();g.reset();g.state.elapsed=300;g.state.round=2n;g.state.bossKills=1n;g.state.spawn=.1;g.updateNormalSpawns(.1);assert.ok(Math.abs(g.state.spawn-1)<1e-9);assert.equal(g.enemies.length,1);g.reset();g.state.elapsed=300;g.state.round=2000n;g.state.bossKills=2000n;g.state.spawn=0;g.updateNormalSpawns(.05);assert.equal(rules.usedSlots(g.enemies),100);assert.ok(Number.isFinite(g.state.spawn));const before=[...g.enemies];g.updateNormalSpawns(1000);assert.equal(g.enemies.length,before.length);assert.ok(before.every(e=>g.enemies.includes(e)));g.damageEnemy(g.enemies.find(e=>(e.type.slots||1)===1),100000);g.updateNormalSpawns(.05);assert.equal(rules.usedSlots(g.enemies),100);g.openQuiz();const slots=rules.usedSlots(g.enemies);g.updateNormalSpawns(100);assert.equal(rules.usedSlots(g.enemies),slots);
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
 function draw(tier,typeId){g.openQuiz();for(let n=0;n<3000;n++){const id=g.offers.find(id=>id>=rules.SPECIAL_GOLEM_START&&rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START].tier===tier&&(!typeId||rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START].typeId===typeId));if(id!==undefined)return id;d.getElementById('close-quiz').onclick();g.openQuiz();}assert.fail('special never drawn');}
 for(const tier of ['super','ultimate']){
  g.reset();const id=draw(tier),spec=rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START],card=d.querySelector('[data-reward="'+id+'"]');assert.ok(card.classList.contains(tier));assert.match(card.textContent,new RegExp('连续答对'+spec.need+'题'));g.state.ammo=0;g.selectQuestion(id);
  for(let n=0;n<spec.need;n++){const v=g.questions[id].answer;g.answer(v);g.answer(v);if(n<spec.need-1){assert.equal(g.golems.length,0);flush();}}
  assert.equal(g.golems.length,spec.count);assert.ok(g.golems.every(a=>a.type.id===spec.typeId));assert.equal(g.state.ammo,9);flush();assert.equal(g.state.mode,'playing');
  g.reset();const failed=draw(tier);g.selectQuestion(failed);g.answer(g.questions[failed].answer);flush();g.answer(Number([...d.querySelectorAll('#answer-options button')].find(b=>Number(b.textContent)!==g.questions[failed].answer).textContent));flush();assert.equal(g.golems.length,0);assert.equal(g.state.mode,'playing');
 }
 g.reset();const id=draw('super','slime'),r=rules.SPECIAL_GOLEM_REWARDS[id-rules.SPECIAL_GOLEM_START];g.selectQuestion(id);for(let n=0;n<r.need;n++){g.answer(g.questions[id].answer);if(n<r.need-1)flush();}assert.equal(rules.usedSlots(g.golems),2);const parents=[...g.golems];for(const p of parents)g.damageGolem(p,999);assert.equal(g.golems.length,4);assert.equal(rules.usedSlots(g.golems),2);assert.ok(g.golems.every(a=>a.type===rules.SMALL_SLIME_GOLEM));flush();
 // Capacity unexpectedly changes while answering: all-or-nothing, not a partial batch.
 g.reset();const conflict=draw('ultimate');g.selectQuestion(conflict);for(let n=0;n<49;n++)g.summonGolem(rules.GOLEMS[0]);for(let n=0;n<5;n++){g.answer(g.questions[conflict].answer);if(n<4)flush();}assert.equal(g.golems.length,49);assert.equal(g.state.mode,'reward');flush();assert.equal(g.state.mode,'playing');
});

test('special guarantees respect half-slots, full plants, pause and canceled old answers',()=>{
 const {g,document:d,flush}=setup();
 for(const occupied of [47,47.5,48,48.5,49,49.5,50]){
  g.reset();for(let n=0;n<occupied*2;n++)g.summonGolem(rules.SMALL_SLIME_GOLEM);g.openQuiz();
  const specials=g.offers.filter(i=>i>=rules.SPECIAL_GOLEM_START);assert.equal(specials.length,occupied<=48?1:0);
  if(specials.length)assert.ok(rules.SPECIAL_GOLEM_REWARDS[specials[0]-rules.SPECIAL_GOLEM_START].count<=50-occupied);
  assert.ok(g.offers.some(i=>i>=17&&i<25));assert.equal(g.offers.some(i=>(i>=4&&i<17)||i>=rules.SPECIAL_GOLEM_START),occupied<=49);
 }
 g.reset();for(let i=0;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);g.openQuiz();const id=g.offers.find(i=>i>=rules.SPECIAL_GOLEM_START);assert.notEqual(id,undefined);g.selectQuestion(id);const positions=g.plantSystem.plants.map(p=>p.mesh.position.toArray());g.updateGolems(10);assert.deepEqual(g.plantSystem.plants.map(p=>p.mesh.position.toArray()),positions);g.answer(g.questions[id].answer);g.reset();flush();assert.equal(g.golems.length,0);assert.equal(g.state.mode,'playing');
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
 for(let n=0;n<2000;n++){g.openQuiz();assert.equal(g.offers.filter(i=>i>=rules.SPECIAL_GOLEM_START).length,1);if(g.offers.includes(id)){found=true;break;}d.getElementById('close-quiz').onclick();}
 assert.ok(found);g.selectQuestion(id);g.answer(g.questions[id].answer);flush();g.answer(g.questions[id].answer);assert.equal(g.plantSystem.plants[0].upgrades.multi,1);assert.equal(g.golems.length,0);assert.equal(g.plantSystem.plants[0].upgrades.area,0);flush();assert.equal(g.state.mode,'playing');
});
