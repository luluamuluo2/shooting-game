import {createTitanModel,poseTitanAttack} from '../src/titans.js';
// Headless logic smoke test: mock DOM/renderer, NOT a real browser or visual test.
import {createPlantSystem} from '../src/plants.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as Three from 'three';import * as rules from '../src/rules.js';
class Element{constructor(){this.children=[];this.value='';this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.handlers={};this.classList={add(){},remove(){},toggle(){}};}set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html;}appendChild(e){this.children.push(e);}addEventListener(k,fn){this.handlers[k]=fn;}setAttribute(){}focus(){}select(){}setPointerCapture(){}}
const htmlIds=new Set([...fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const elements=new Map(),get=id=>{if(!htmlIds.has(id))return null;if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const dirs=['forward','left','backward','right'].map(d=>{const e=new Element();e.dataset.move=d;return e;});const events={};let frame;class FakeRenderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}
let now=0,timerId=0;const timers=new Map();
function advance(ms){const target=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=target;}
const ctx={...rules,createTitanModel,poseTitanAttack,supplyOffers:(health,count,random)=>rules.supplyOffers(health,count,random,10),createPlantSystem:options=>createPlantSystem({...options,random:()=>0}),THREE:{...Three,WebGLRenderer:FakeRenderer},document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:selector=>selector==='[data-sound-toggle]'?[get('sound')]:dirs,addEventListener(k,f){events[k]=f;}},window:{},HTMLInputElement:Element,devicePixelRatio:1,innerWidth:1440,innerHeight:900,performance:{now:()=>0},requestAnimationFrame:f=>frame=f,addEventListener(k,f){events[k]=f;},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),console};vm.createContext(ctx);let src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');src+='\nwindow.__qa={player,get enemies(){return enemies;},get touchKeys(){return [...touchKeys];},get fireHeld(){return fireHeld;},camera,look,character,scene,moveBody,villagers,villageFree,updateVillagers,get effects(){return effects;}};';vm.runInContext(src,ctx);const g=ctx.window.__game;
// Deterministic reward fixture for the pre-existing all-reward regression suite.
// Separate tests below exercise the real random opening path without this fixture.
function selectReward(i){
 if(g.state.mode==='quiz'&&!g.offers.includes(i)&&!vm.runInContext(`rewardFull(${i})`,ctx)){
  vm.runInContext(`offers=[${i},...offers.filter(id=>id!==${i})].slice(0,3);renderCards()`,ctx);
 }
 g.selectQuestion(i);
}
function prepareChoice(){advance(1800);}
function chooseCorrect(i){prepareChoice();g.answer(g.questions[i].answer);}
function chooseWrong(){prepareChoice();const options=get('answer-options').children;const selected=vm.runInContext('selected',ctx);g.answer(Number(options.find(b=>Number(b.textContent)!==g.questions[selected].answer).textContent));}

get('start').onclick();assert.equal(g.state.mode,'playing');for(let i=0;i<3;i++){g.state.shot=0;g.shoot();g.updateBurst(.1);}assert.equal(g.state.mode,'quiz');assert.equal(g.state.ammo,0);const elapsed=g.state.elapsed;frame(100);assert.equal(g.state.elapsed,elapsed);assert.equal(g.questions.length,rules.SPELL_REWARD_START+rules.SPELL_REWARDS.length);
for(let i=0;i<3;i++){if(i)g.openQuiz();selectReward(i);chooseWrong();assert.equal(g.state.mode,'failed');advance(1800);g.openQuiz();selectReward(i);chooseCorrect(i);assert.equal(g.state.mode,'reward');assert.equal(g.state.ammo,[9,18,3][i]);g.answer();assert.equal(g.state.solved,i+1);advance(900);assert.equal(g.state.mode,'playing');}
get('pause').onclick();const t=g.state.elapsed;frame(200);assert.equal(g.state.elapsed,t);get('resume').onclick();const z=ctx.window.__qa.player.position.z;events.keydown({key:'w',target:{},preventDefault(){}});frame(300);assert.ok(ctx.window.__qa.player.position.z<z);console.log('PASS mocked-runtime: start, 9 shots to quiz, pause, wrong answer, three rewards, duplicate submit, resume, keyboard move');

const qa=ctx.window.__qa;g.reset();assert.equal(qa.camera.position.y,1.8);assert.equal(qa.player.visible,false);
qa.look(-Math.PI/2/.0025,0);events.keydown({key:'w',target:{},preventDefault(){}});const px=qa.player.position.x;frame(400);assert.ok(qa.player.position.x<px,'forward follows yaw');events.keyup({key:'w'});
qa.look(0,99999);assert.ok(Math.abs(qa.camera.rotation.x)<=1.25,'pitch clamped');
g.reset();const enemy={mesh:qa.character(true),hp:40,speed:0,phase:0};enemy.mesh.position.set(0,0,-3);qa.scene.add(enemy.mesh);qa.enemies.push(enemy);g.shoot();assert.equal(enemy.hp,30,'center ray hits enemy');g.cancelBurst();g.state.shot=0;qa.look(0,-400);g.shoot();assert.equal(enemy.hp,30,'looking above enemy misses');
let lockRequests=0;get('world').requestPointerLock=()=>{lockRequests++;ctx.document.pointerLockElement=get('world');events.pointerlockchange();};ctx.document.exitPointerLock=()=>{ctx.document.pointerLockElement=null;events.pointerlockchange();};
g.reset();assert.equal(lockRequests,1);g.openQuiz();assert.equal(g.state.mode,'quiz','unlock must not override quiz');assert.equal(ctx.document.pointerLockElement,null);get('close-quiz').onclick();assert.equal(lockRequests,2);ctx.document.pointerLockElement=null;events.pointerlockchange();assert.equal(g.state.mode,'paused','Esc/unlock pauses');
g.reset();ctx.document.pointerLockElement=null;const ammo=g.state.ammo;get('world').handlers.pointerdown({pointerId:90,pointerType:'touch',clientX:100,clientY:100});get('world').handlers.pointermove({pointerId:90,clientX:130,clientY:100});assert.equal(g.state.ammo,ammo,'touch look must not shoot');assert.ok(qa.camera.rotation.y<0);
const evt=(id,currentTarget)=>({pointerId:id,currentTarget,preventDefault(){}});dirs[0].onpointerdown(evt(1,dirs[0]));get('touch-fire').onpointerdown(evt(2,get('touch-fire')));events.pointerup({pointerId:90});assert.ok(qa.touchKeys.includes('forward'));assert.equal(qa.fireHeld,true);events.pointerup({pointerId:2});assert.ok(qa.touchKeys.includes('forward'));assert.equal(qa.fireHeld,false);events.pointerup({pointerId:1});assert.equal(qa.touchKeys.length,0);
const p=new Three.Vector3(-7,0,-5);qa.moveBody(p,0,-1);assert.equal(p.z,-5,'crate blocks movement');
console.log('PASS first-person: eye camera, yaw movement, pitch clamp, center-ray hit/miss, lock/quiz/resume/Esc, independent multitouch, collision');
// Exercise every model and behavior with real Three geometry, mocked rendering only.
for(const type of rules.ENEMIES){g.reset();for(let attempt=0;attempt<100&&!g.enemies.length;attempt++)g.spawn(type);assert.equal(g.enemies.length,1,type.id+' spawns');const e=g.enemies[0];assert.equal(e.hp,type.hp);assert.ok(e.mesh.userData.bar);e.mesh.position.set(0,0,-8);if(type.neutral){g.updateEnemy(e,.1);assert.ok(e.mesh.position.z>-8);g.damageEnemy(e,10);assert.equal(e.angry,true);}if(type.ranged||type.charge){e.cooldown=0;g.updateEnemy(e,.1);assert.ok(e.tell>0);g.updateEnemy(e,1.2);assert.ok(type.ranged||e.charging>0);}if(type.mount){g.damageEnemy(e,type.mountHP);assert.equal(e.detached,true);assert.equal(e.type.id,type.mount);}g.damageEnemy(e,1000);assert.equal(g.enemies.length,type.split?2:0);}
g.reset();for(let attempt=0;attempt<200&&g.enemies.length<100;attempt++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,100);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,100);g.openQuiz();const positions=g.enemies.map(e=>e.mesh.position.clone());frame(1000);g.enemies.forEach((e,i)=>assert.ok(e.mesh.position.equals(positions[i])));console.log('PASS roster: all 13 spawn/models/health/death, neutral aggro, ranged/charge tells, mount dismount, 100 cap, quiz freezes enemies');

for(const type of rules.ENEMIES){const mesh=g.monsterModel(type);mesh.updateMatrixWorld(true);const indicators=[...mesh.userData.bar.children,mesh.userData.warn];for(const indicator of indicators){indicator.visible=true;const pos=indicator.getWorldPosition(new Three.Vector3());const ray=new Three.Raycaster(new Three.Vector3(pos.x,pos.y,pos.z+5),new Three.Vector3(0,0,-1));assert.equal(ray.intersectObject(indicator,true).length,0,type.id+' HUD must not intercept bullets');indicator.visible=false;assert.equal(ray.intersectObject(indicator,true).length,0,type.id+' hidden HUD must not intercept bullets');}}
console.log('PASS all 13 models: visible/hidden healthbars and warning indicators excluded from ray hits');

// Village defense: no enemies behind the guard, one breach = one evacuee.
g.reset();for(const type of rules.ENEMIES){g.reset();g.spawn(type);assert.ok(g.enemies[0].mesh.position.z<-13);assert.ok(Math.abs(g.enemies[0].mesh.position.x)<=4.6);}
g.reset();qa.look(-Math.PI/.0025,0);assert.ok(Math.abs(qa.camera.rotation.y-Math.PI)<1e-9);qa.look(-Math.PI*4/.0025,0);assert.ok(Math.abs(Math.abs(qa.camera.rotation.y)-Math.PI)<1e-9);g.reset();
for(const key of ['w','s','a','d']){events.keydown({key,target:{},preventDefault(){}});for(let i=0;i<300;i++)frame(2000+i*50);events.keyup({key});assert.ok(qa.player.position.z>=6&&qa.player.position.z<=8);assert.ok(Math.abs(qa.player.position.x)<=5);g.reset();}
g.spawn(rules.ENEMIES[0]);g.spawn(rules.ENEMIES[0]);for(const e of [...g.enemies]){e.mesh.position.z=3;g.updateEnemy(e,.05);}assert.equal(g.state.health,3);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,0);assert.equal(qa.villagers.filter(v=>v.visible).length,3);
for(let i=0;i<3;i++){g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.z=3;g.updateEnemy(g.enemies[0],.05);}assert.equal(g.state.health,0);assert.equal(g.state.mode,'over');assert.equal(qa.villagers.filter(v=>v.visible).length,0);
g.reset();assert.equal(qa.villagers.filter(v=>v.visible).length,5);assert.equal(g.state.health,5);assert.equal(qa.effects.length,0);
// All 13 attackers, including ranged/neutral/mounts, can actually reach the line.
for(const type of rules.ENEMIES){g.reset();g.spawn(type);const e=g.enemies[0];for(let i=0;i<1400&&g.enemies.length;i++)g.updateEnemy(e,.05);assert.equal(g.enemies.length,0,type.id+' does not get stuck');assert.equal(g.state.health,4,type.id+' one breach');}
g.reset();g.spawn(rules.ENEMIES.find(t=>t.ranged));let e=g.enemies[0];e.cooldown=0;g.updateEnemy(e,.1);g.updateEnemy(e,1.2);assert.ok(qa.effects.some(e=>e.projectile));const snapshots=qa.effects.map(e=>[e.life,e.mesh.position.clone()]);g.openQuiz();const hp=g.state.health;for(let i=0;i<100;i++)frame(50000+i*50);assert.equal(g.state.health,hp);qa.effects.forEach((e,i)=>{assert.equal(e.life,snapshots[i][0]);assert.ok(e.mesh.position.equals(snapshots[i][1]));});
console.log('PASS defense: 13 frontal spawns and unblocked marches, yaw/position bounds, simultaneous breaches, game over, reset, quiz freezes projectiles, protected villagers');

// From either extreme of the platform, the opposite lane at the defense line
// remains aimable while every permitted center direction still faces forward.
for(const side of [-1,1]){g.reset();qa.player.position.set(side*5,0,6);const target=new Three.Vector3(-side*4.6,0,3);const dx=target.x-qa.player.position.x,dz=target.z-qa.player.position.z;const aim=Math.atan2(-dx,-dz);qa.look(-aim/.0025,0);assert.ok(Math.abs(qa.camera.rotation.y-aim)<1e-9,'opposite breach corner aimable');assert.ok(qa.camera.getWorldDirection(new Three.Vector3()).z<0,'aim stays forward');}
console.log('PASS cross-lane aim: both extreme guard positions can aim at opposite breach corner without turning backward');

// Fourth reward is independent of the weapon index and cannot strand an empty gun.
g.reset();g.openQuiz();assert.equal(get('question-cards').children.length,3);assert.ok(!g.offers.includes(3));selectReward(3);g.answer(g.questions[3].answer);assert.equal(g.state.mode,'quiz');get('close-quiz').onclick();
g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.z=3;g.updateEnemy(g.enemies[0],.05);g.state.ammo=0;g.openQuiz();selectReward(3);chooseWrong();assert.equal(g.state.health,4);advance(1800);g.openQuiz();selectReward(3);chooseCorrect(3);assert.equal(g.state.health,4);assert.equal(g.streak,1);chooseCorrect(3);assert.equal(g.state.health,5);assert.equal(g.state.weapon,0);assert.equal(g.state.ammo,9);const solved=g.state.solved;g.answer();assert.equal(g.state.solved,solved);assert.equal(qa.villagers.filter(v=>v.visible).length,5);advance(900);g.state.shot=0;g.shoot();assert.equal(g.state.ammo,8);
// Safe rear roaming, frozen during math, and no friendly fire even facing rear.
g.reset();const starts=qa.villagers.map(v=>v.position.clone());for(let i=0;i<12000;i++){qa.updateVillagers(.05);for(const v of qa.villagers){assert.ok(qa.villageFree(v.position.x,v.position.z,v));}}assert.ok(qa.villagers.some((v,i)=>v.position.distanceTo(starts[i])>1));g.openQuiz();const walks=JSON.stringify(qa.villagers.map(v=>[v.position.toArray(),v.userData.walk]));qa.updateVillagers(5);assert.equal(JSON.stringify(qa.villagers.map(v=>[v.position.toArray(),v.userData.walk])),walks);get('close-quiz').onclick();qa.look(-Math.PI/.0025,0);for(let i=0;i<3;i++){g.state.shot=0;g.shoot();}assert.equal(g.state.health,5);g.reset();assert.equal(qa.villagers.filter(v=>v.visible).length,5);console.log('PASS rescue and village: full disabled, wrong answer, empty-ammo rescue, duplicate submit, 10-minute safe roaming, quiz freezes walk, 360 view, no friendly fire, restart');

// Summons: real scene/AI/math logic, renderer remains mocked.
for(let i=0;i<6;i++){
 g.reset();g.state.ammo=0;g.openQuiz();selectReward(i+4);
 for(let n=1;n<=3;n++){chooseCorrect(i+4);assert.equal(g.state.mode,n===3?'reward':'quiz');assert.equal(g.golems.length,n===3?1:0);}
 assert.equal(g.golems[0].type.id,rules.GOLEMS[i].id);assert.equal(g.state.ammo,9);assert.equal(g.state.solved,3);g.answer();assert.equal(g.golems.length,1);advance(900);
 const guard=g.golems[0];guard.hp=10000;/* Isolate autonomous attack from survivability after DPS nerf. */g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.set(guard.mesh.position.x,0,-5);let attacked=false;
 for(let n=0;n<600&&g.enemies.length;n++){g.updateGolems(.05);for(const e of [...g.enemies])g.updateEnemy(e,.05);if(g.enemies[0]?.hp<40)attacked=true;}
 assert.ok(attacked||g.state.kills>0,guard.type.id+' autonomous attack');assert.equal(g.state.kills,1,guard.type.id+' kills normal enemy');assert.equal(g.state.health,5);
 g.damageGolem(guard,10000);assert.equal(g.golems.length,0);assert.match(get('toast').textContent,/退场/);
}
g.reset();g.openQuiz();selectReward(4);chooseCorrect(4);assert.equal(g.streak,1);chooseWrong();assert.equal(g.streak,0);assert.equal(g.golems.length,0);advance(1800);g.openQuiz();selectReward(4);chooseCorrect(4);selectReward(5);assert.equal(g.streak,0);get('close-quiz').onclick();g.openQuiz();selectReward(4);assert.equal(g.streak,0);
g.reset();for(let i=0;i<rules.GOLEM_CAP;i++)assert.ok(g.summonGolem(rules.GOLEMS[i%3]));assert.equal(g.summonGolem(rules.GOLEMS[3]),false);g.openQuiz();assert.ok(g.offers.every(i=>i<3||i>=rules.SPELL_REWARD_START));assert.equal(get('question-cards').children.length,3);selectReward(4);assert.equal(g.streak,0);const snapshotsG=g.golems.map(g=>[g.hp,g.mesh.position.clone(),g.cooldown]);g.updateGolems(10);g.golems.forEach((e,i)=>{assert.equal(e.hp,snapshotsG[i][0]);assert.ok(e.mesh.position.equals(snapshotsG[i][1]));assert.equal(e.cooldown,snapshotsG[i][2]);});get('close-quiz').onclick();
// Enemy retargets after guard retreat; restart clears every summon.
const guard=g.golems[0];g.spawn(rules.ENEMIES[0]);const attacker=g.enemies[0];attacker.mesh.position.copy(guard.mesh.position);g.updateEnemy(attacker,.7);assert.ok(guard.hp<guard.type.hp);for(const ally of [...g.golems])g.damageGolem(ally,10000);const before=attacker.mesh.position.z;g.updateEnemy(attacker,.1);assert.ok(attacker.mesh.position.z>before);g.summonGolem(rules.GOLEMS[0]);g.reset();assert.equal(g.golems.length,0);assert.equal(g.streak,0);
// All weapons ignore friendly golems, including RPG splash.
for(let w=0;w<3;w++){g.reset();g.summonGolem(rules.GOLEMS[0]);const ally=g.golems[0];ally.mesh.position.set(0,0,0);g.state.weapon=w;g.state.ammo=5;g.shoot();assert.equal(ally.hp,40);assert.equal(g.state.health,5);}
console.log('PASS golems: all six 3-question rewards/AI/defeats, streak reset/switch/exit, 3 cap, frozen quiz, enemy retaliation/retarget, reset, all-weapon friendly fire protection');

// A second click/Enter after advancing sees an empty input: do not erase progress.

g.reset();g.openQuiz();selectReward(4);
const oldButtons=[...get('answer-options').children],correct=oldButtons.find(b=>Number(b.textContent)===g.questions[4].answer);
correct.onclick();correct.onclick();assert.equal(g.streak,1);assert.equal(g.state.solved,1);
advance(1800);const newQ=g.questions[4];correct.onclick();assert.equal(g.streak,1);assert.equal(g.questions[4],newQ);
assert.equal(get('answer-options').children.length,4);
const wrong=get('answer-options').children.find(b=>Number(b.textContent)!==newQ.answer);wrong.onclick();wrong.onclick();assert.equal(g.streak,0);assert.equal(g.state.solved,1);assert.match(get('feedback').textContent,/进度已重置/);
advance(1800);advance(1800);assert.equal(g.streak,0);
let prevented=false;get('quiz').handlers.keydown({repeat:true,key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true);
console.log('PASS four choices: double click, stale button after next, wrong reset, duplicate next, held Enter');

// Actual random UI path, no reward fixture: exactly 3 cards and stable offers.
for(let run=0;run<40;run++){
 g.reset();g.state.health=run%2?4:5;if(run%3===0)for(let i=0;i<rules.GOLEM_CAP;i++)g.summonGolem(rules.GOLEMS[i%3]);
 g.openQuiz();const offers=[...g.offers],cards=get('question-cards').children;
 assert.equal(cards.length,3);assert.equal(new Set(offers).size,3);
 assert.deepEqual(cards.map(b=>Number(b.dataset.reward)),offers);assert.ok(cards.every(b=>!b.disabled));
 assert.ok(!offers.includes(3)||g.state.health<5);assert.ok(!offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START))||rules.usedSlots(g.golems)<rules.GOLEM_CAP);
 const omitted=Array.from({length:17},(_,i)=>i).find(i=>!offers.includes(i));g.selectQuestion(omitted);assert.equal(vm.runInContext('selected',ctx),-1);
 cards[0].onclick();chooseWrong();assert.deepEqual([...g.offers],offers);advance(1800);assert.deepEqual([...g.offers],offers);
 if(offers[1]!==undefined)cards[1].onclick();assert.deepEqual([...g.offers],offers);assert.equal(g.streak,0);
 const health=g.state.health;frame(60000+run*50);assert.equal(g.state.health,health);
}
g.reset();g.state.ammo=0;g.openQuiz();get('close-quiz').onclick();assert.equal(g.state.mode,'quiz','no bypass of empty-ammo supply');
g.reset();events.keydown({key:'r'});assert.equal(g.state.mode,'quiz');assert.equal(get('question-cards').children.length,3);
console.log('PASS random supply UI: 3 unique valid cards, unavailable categories omitted, unoffered rewards rejected, stable on wrong/next/switch, pause, R, no empty-ammo close bypass');

// Auto transition timing and cancellation use a deterministic clock, no wall time.
g.reset();g.openQuiz();selectReward(4);
let q=g.questions[4],buttons=[...get('answer-options').children];
buttons.find(b=>Number(b.textContent)===q.answer).onclick({detail:1});
assert.equal(g.streak,1);advance(899);assert.equal(g.questions[4],q);advance(1);assert.notEqual(g.questions[4],q);
let fresh=g.questions[4];buttons[0].onclick({detail:1});assert.equal(g.streak,1);
get('answer-options').children[0].onclick({detail:2});assert.equal(g.streak,1);
const correctIndex=get('answer-options').children.findIndex(b=>Number(b.textContent)===fresh.answer);
get('quiz').handlers.keydown({key:String(correctIndex+1),repeat:true,preventDefault(){}});assert.equal(g.streak,1);
get('quiz').handlers.keydown({key:String(correctIndex+1),repeat:false,preventDefault(){}});assert.equal(g.streak,2);
ctx.document.hidden=true;advance(900);assert.equal(g.questions[4],fresh);ctx.document.hidden=false;advance(900);assert.notEqual(g.questions[4],fresh);
const wrongNow=get('answer-options').children.find(b=>Number(b.textContent)!==g.questions[4].answer);wrongNow.onclick();q=g.questions[4];advance(1799);assert.equal(g.questions[4],q);advance(1);assert.equal(g.state.mode,'playing');assert.equal(g.streak,0);g.openQuiz();selectReward(4);
// Cancel pending next on switch, close/reopen, restart and completion on restart.
g.answer(g.questions[4].answer);selectReward(0);q=g.questions[0];advance(2000);assert.equal(g.questions[0],q);assert.equal(g.streak,0);
selectReward(4);g.answer(g.questions[4].answer);get('close-quiz').onclick();g.openQuiz();selectReward(4);q=g.questions[4];advance(2000);assert.equal(g.questions[4],q);assert.equal(g.streak,0);
g.answer(g.questions[4].answer);g.reset();advance(2000);assert.equal(g.state.mode,'playing');assert.equal(g.state.solved,0);
g.openQuiz();selectReward(0);g.answer(g.questions[0].answer);assert.equal(g.state.mode,'reward');g.reset();advance(2000);assert.equal(g.state.mode,'playing');assert.equal(g.state.solved,0);
assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('id="next-question"'));
console.log('PASS auto answers: 900/1800ms feedback, automatic next, number keys, double clicks, stale buttons, held keys, hidden tab, switch/close/reset timer cancellation, no next button');

// Final reward automatically returns only after readable feedback, including hidden tabs.
g.reset();g.openQuiz();selectReward(0);const finalButton=get('answer-options').children.find(b=>Number(b.textContent)===g.questions[0].answer);finalButton.onclick({detail:1});const solvedOnce=g.state.solved;assert.equal(g.state.mode,'reward');advance(899);assert.equal(g.state.mode,'reward');ctx.document.hidden=true;advance(1);assert.equal(g.state.mode,'reward');ctx.document.hidden=false;advance(900);assert.equal(g.state.mode,'playing');assert.equal(g.state.ammo,9);finalButton.onclick({detail:1});assert.equal(g.state.solved,solvedOnce);assert.equal(g.state.ammo,9);assert.equal(qa.fireHeld,false);assert.equal(g.state.shot,rules.WEAPONS[g.state.weapon].interval);assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('id="continue"'));
// All six types patrol, stay inside the defense bounds, avoid static blockers, and freeze in quizzes.
for(const type of rules.GOLEMS){
 g.reset();g.summonGolem(type);const ally=g.golems[0],start=ally.mesh.position.clone();let traveled=0;
 for(let n=0;n<2400;n++){const before=ally.mesh.position.clone();g.updateGolems(.05);traveled+=ally.mesh.position.distanceTo(before);assert.ok(ally.mesh.position.x>=-6&&ally.mesh.position.x<=6&&ally.mesh.position.z>=-6&&ally.mesh.position.z<=1.8);assert.ok(vm.runInContext('!blockers.some(([x,z,hx,hz])=>Math.abs(golems[0].mesh.position.x-x)<hx+.4&&Math.abs(golems[0].mesh.position.z-z)<hz+.4)',ctx));}
 assert.ok(traveled>10,type.id+' patrols instead of standing still');
 g.openQuiz();const before=ally.mesh.position.clone(),time=ally.patrolTime;g.updateGolems(10);assert.ok(ally.mesh.position.equals(before));assert.equal(ally.patrolTime,time);get('close-quiz').onclick();
 // A stale/out-of-bounds patrol target is discarded before continuing.
 ally.patrol=new Three.Vector3(100,0,100);ally.stuck=.7;g.updateGolems(.05);assert.ok(ally.patrol&&ally.patrol.x<=5.5&&ally.patrol.z<=1.3);
 // Enemy acquired during patrol preempts wandering and is attacked.
 g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.copy(ally.mesh.position).add(new Three.Vector3(0,0,-.8));ally.cooldown=0;g.updateGolems(.05);assert.equal(ally.patrol,null);assert.ok(g.enemies[0].hp<40);
}
// Scheduler uses active playtime, not time spent in the quiz.
g.reset();g.state.elapsed=240;g.state.spawn=0;frame(vm.runInContext("previous+50",ctx));assert.ok(Math.abs(g.state.spawn-1.45)<1e-9);g.openQuiz();const frozenSpawn=g.state.spawn,frozenElapsed=g.state.elapsed;frame(vm.runInContext("previous+1000",ctx));assert.equal(g.state.spawn,frozenSpawn);assert.equal(g.state.elapsed,frozenElapsed);
console.log('PASS v10: automatic final return, hidden-tab feedback, stale final click, half ammo, no continue page, six golem patrols/bounds/collisions/stuck retarget/freeze/combat, bounded active-time spawn ramp');

{
// Every golem taunts at 6 units; every enemy follows then performs real melee damage.
for(const allyType of rules.GOLEMS){
 g.reset();g.summonGolem(allyType);const ally=g.golems[0];ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);const enemy=g.enemies[0];enemy.mesh.position.set(4,0,-2);const distance=enemy.mesh.position.distanceTo(ally.mesh.position);g.updateEnemy(enemy,.1);assert.equal(enemy.guard,ally);assert.ok(enemy.mesh.position.distanceTo(ally.mesh.position)<distance);assert.equal(ally.hp,allyType.hp);
 for(let n=0;n<160&&ally.hp===allyType.hp;n++)g.updateEnemy(enemy,.05);assert.ok(ally.hp<allyType.hp,allyType.id+' taunts and receives melee');
}
for(const enemyType of rules.ENEMIES){
 g.reset();g.summonGolem(rules.GOLEMS[3]);const ally=g.golems[0];ally.mesh.position.set(0,0,0);g.spawn(enemyType);const enemy=g.enemies[0];enemy.mesh.position.set(0,0,-3);enemy.tell=1;enemy.charging=.8;
 for(let n=0;n<160&&ally.hp===ally.type.hp;n++)g.updateEnemy(enemy,.05);
 assert.equal(enemy.guard,ally);assert.ok(ally.hp<ally.type.hp,enemyType.id+' damages taunter');assert.equal(enemy.tell,0);assert.equal(enemy.charging,0);assert.equal(g.state.health,5);
}
// Redstone must close to two units before dealing its unchanged 24-damage melee hit.
g.reset();g.summonGolem(rules.GOLEMS[5]);let ally=g.golems[0];ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);let enemy=g.enemies[0];enemy.mesh.position.set(0,0,-5);ally.cooldown=0;g.updateGolems(.1);assert.equal(enemy.hp,40);assert.ok(ally.mesh.position.z<0);for(let n=0;n<100&&enemy.hp===40;n++)g.updateGolems(.05);assert.equal(enemy.hp,16);assert.ok(ally.mesh.position.distanceTo(enemy.mesh.position)<=2);
// Nearest initial target, stable overlapping target, death retarget, and resume village advance.
g.reset();g.summonGolem(rules.GOLEMS[0]);g.summonGolem(rules.GOLEMS[1]);const [left,right]=g.golems;left.mesh.position.set(-2,0,0);right.mesh.position.set(2,0,0);g.spawn(rules.ENEMIES[0]);enemy=g.enemies[0];enemy.mesh.position.set(-1,0,-3);g.updateEnemy(enemy,.05);assert.equal(enemy.guard,left);right.mesh.position.copy(enemy.mesh.position).add(new Three.Vector3(.5,0,0));g.updateEnemy(enemy,.05);assert.equal(enemy.guard,left);g.damageGolem(left,10000);g.updateEnemy(enemy,.05);assert.equal(enemy.guard,right);g.damageGolem(right,10000);const zAfter=enemy.mesh.position.z;g.updateEnemy(enemy,.05);assert.equal(enemy.guard,undefined);assert.ok(enemy.mesh.position.z>zAfter);
// Outside aura goes on threatening the village, not all enemies are globally pulled.
g.reset();g.summonGolem(rules.GOLEMS[0]);ally=g.golems[0];ally.mesh.position.set(-5,0,-4);g.spawn(rules.ENEMIES[0]);enemy=g.enemies[0];enemy.mesh.position.set(5,0,2.9);g.updateEnemy(enemy,.2);assert.equal(g.state.health,4);
// A taunted enemy must route around the crate at (-7,-7), not hit through it or get stuck.
g.reset();g.summonGolem(rules.GOLEMS[3]);ally=g.golems[0];ally.mesh.position.set(-5.5,0,-5.5);g.spawn(rules.ENEMIES[0]);enemy=g.enemies[0];enemy.mesh.position.set(-8.5,0,-8.5);const hpBefore=ally.hp;
for(let n=0;n<600&&ally.hp===hpBefore;n++){g.updateEnemy(enemy,.05);assert.ok(vm.runInContext('!blockers.some(([x,z,hx,hz])=>Math.abs(enemies[0].mesh.position.x-x)<hx+.4&&Math.abs(enemies[0].mesh.position.z-z)<hz+.4)',ctx));}assert.ok(ally.hp<hpBefore,'taunted enemy routes around crate and attacks');
g.openQuiz();const frozenEnemy=enemy.mesh.position.clone(),frozenHP=ally.hp;g.updateEnemy(enemy,10);assert.ok(enemy.mesh.position.equals(frozenEnemy));assert.equal(ally.hp,frozenHP);
console.log('PASS v11: six melee taunting golems, all 13 enemy pursuit/actual damage, redstone closes before hit, nearest/stable/dead retarget, unaffected village threats, crate routing, quiz freeze');

}

// A wrong answer terminates every reward challenge, including the final streak answer.
for(let reward=0;reward<17;reward++){
 g.reset();g.state.health=4;g.state.ammo=0;g.openQuiz();selectReward(reward);
 const need=reward<3?1:reward===3?2:3;for(let n=1;n<need;n++)chooseCorrect(reward);prepareChoice();
 const oldCards=get('question-cards').children,oldQuestions=g.questions,oldOptions=get('answer-options').children;
 const wrongButton=oldOptions.find(b=>Number(b.textContent)!==g.questions[reward].answer);wrongButton.onclick({detail:1});
 assert.equal(g.state.mode,'failed');assert.equal(g.streak,0);assert.equal(g.state.ammo,0);assert.equal(g.state.health,4);assert.equal(g.golems.length,0);
 g.selectQuestion(0);g.nextQuestion();g.answer(oldQuestions[reward].answer);oldCards[0].onclick();assert.equal(g.state.mode,'failed');assert.equal(g.state.solved,need-1);
 const elapsed=g.state.elapsed;frame(vm.runInContext('previous+50',ctx));assert.equal(g.state.elapsed,elapsed);advance(1799);assert.equal(g.state.mode,'failed');advance(1);assert.equal(g.state.mode,'playing');assert.equal(qa.fireHeld,false);assert.equal(g.state.ammo,0);
 for(let n=0;n<5;n++){g.shoot();frame(vm.runInContext('previous+50',ctx));}assert.equal(g.state.mode,'playing','no automatic empty-ammo loop');
 events.keydown({key:' ',repeat:true,target:{},preventDefault(){}});g.shoot();assert.equal(g.state.mode,'playing','held space cannot reopen');events.keyup({key:' '});
 events.keydown({key:' ',repeat:false,target:{},preventDefault(){}});assert.equal(g.state.mode,'quiz');assert.equal(g.streak,0);assert.notEqual(g.questions,oldQuestions);assert.notEqual(get('question-cards').children,oldCards);assert.equal(g.offers.length,3);assert.equal(new Set(g.offers).size,3);
 wrongButton.onclick({detail:1});assert.equal(g.state.mode,'quiz');assert.equal(g.state.solved,need-1);assert.equal(vm.runInContext('selected',ctx),-1);
}
// With ammo remaining, failure keeps ammo/weapon and R starts a fresh round.
g.reset();g.state.weapon=1;g.state.ammo=7;g.openQuiz();selectReward(1);chooseWrong();advance(1800);assert.equal(g.state.mode,'playing');assert.equal(g.state.weapon,1);assert.equal(g.state.ammo,7);events.keydown({key:'r',repeat:false});assert.equal(g.state.mode,'quiz');assert.equal(g.streak,0);
// Restart cancels failed-round return; hidden tab does not silently resume battle.
g.reset();g.state.ammo=0;g.openQuiz();selectReward(0);chooseWrong();ctx.document.hidden=true;advance(1800);assert.equal(g.state.mode,'failed');ctx.document.hidden=false;g.reset();g.openQuiz();advance(4000);assert.equal(g.state.mode,'quiz');assert.equal(g.state.solved,0);
console.log('PASS wrong-round termination: all 10 rewards fail without reward/retry, no empty loop, fresh space rerolls, stale cards/answers ignored, ammo preservation, R, freeze/hidden/reset safety');

// All six golems visibly strike with shoulder-pivot arms on the exact damage update.
for(const type of rules.GOLEMS.filter(t=>!t.split)){
 g.reset();g.summonGolem(type);const ally=g.golems[0];ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);const foe=g.enemies[0];foe.mesh.position.set(0,0,-1);foe.hp=1000;foe.maxHP=1000;ally.cooldown=0;
 assert.equal(ally.mesh.userData.arms.length,2);assert.ok(ally.mesh.userData.arms.every(a=>a.rotation.x===0));
 g.updateGolems(.01);assert.equal(foe.hp,1000-type.damage);assert.equal(ally.swing,.32);assert.ok(ally.mesh.userData.arms.every(a=>a.rotation.x===-1.45));
 g.openQuiz();const angles=ally.mesh.userData.arms.map(a=>a.rotation.x);g.updateGolems(1);assert.deepEqual(ally.mesh.userData.arms.map(a=>a.rotation.x),angles);assert.equal(foe.hp,1000-type.damage);get('close-quiz').onclick();
 g.updateGolems(.16);assert.ok(ally.mesh.userData.arms.every(a=>a.rotation.x<0&&a.rotation.x>-1.45));g.updateGolems(.16);assert.ok(ally.mesh.userData.arms.every(a=>Math.abs(a.rotation.x)<1e-9));assert.equal(foe.hp,1000-type.damage);
 const remaining=ally.cooldown;g.updateGolems(remaining+.001);assert.equal(foe.hp,1000-2*type.damage);assert.equal(ally.swing,.32);assert.ok(ally.mesh.userData.arms.every(a=>a.rotation.x===-1.45));g.damageGolem(ally,10000);const after=foe.hp;g.updateGolems(10);assert.equal(foe.hp,after);assert.equal(g.golems.length,0);
}
console.log('PASS arm strikes: six types, exact hit synchronization, shoulder pivots, natural 320ms return, pause freeze, original repeated-attack timing, death removal');

{
const bigEnemy=rules.ENEMIES.find(t=>t.id==='slime'),bigAlly=rules.GOLEMS.find(t=>t.id==='slime');
// Reservation makes splitting guaranteed even at the full 30-slot enemy budget.
g.reset();for(let n=0;n<50;n++)g.spawn(bigEnemy);assert.equal(g.enemies.length,50);assert.equal(rules.usedSlots(g.enemies),100);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,50);
const parents=[...g.enemies];for(const e of parents)g.damageEnemy(e,1000);assert.equal(g.enemies.length,100);assert.equal(g.state.kills,50);assert.ok(g.enemies.every(e=>e.type===rules.SMALL_SLIME_ENEMY&&e.hp===20&&e.mesh.scale.x===.55));
for(const e of parents)g.damageEnemy(e,1000);assert.equal(g.enemies.length,100);assert.equal(g.state.kills,50);for(const e of [...g.enemies])g.damageEnemy(e,1000);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,150);
// Real lava AoE kills both parents; newly split children are not hit by that same attack.
g.reset();g.summonGolem(rules.GOLEMS.find(t=>t.id==='lava'));let ally=g.golems[0];ally.mesh.position.set(0,0,0);ally.cooldown=0;for(let n=0;n<2;n++){g.spawn(bigEnemy);g.enemies[n].mesh.position.set(n*.7,0,-1);g.enemies[n].hp=1;}g.updateGolems(.01);assert.equal(g.state.kills,2);assert.equal(g.enemies.length,4);assert.ok(g.enemies.every(e=>e.hp===20));
// A full 50-slot party can always split into 100 bodies, without recursive summons.
g.reset();for(let n=0;n<rules.GOLEM_CAP;n++)assert.ok(g.summonGolem(bigAlly));const bigGuards=[...g.golems];for(const e of bigGuards)g.damageGolem(e,1000);assert.equal(g.golems.length,100);assert.equal(rules.usedSlots(g.golems),50);assert.ok(g.golems.every(a=>a.type===rules.SMALL_SLIME_GOLEM&&a.mesh.scale.x===.6&&a.mesh.userData.arms.length===2));for(const e of bigGuards)g.damageGolem(e,1000);assert.equal(g.golems.length,100);assert.equal(g.summonGolem(bigAlly),false);g.openQuiz();assert.ok(g.offers.every(i=>i<4||i>=rules.SPELL_REWARD_START));get('close-quiz').onclick();
g.damageGolem(g.golems[0],1000);assert.equal(g.golems.length,99);assert.equal(g.summonGolem(bigAlly),false);g.openQuiz();assert.ok(g.offers.every(i=>i<4||i>=rules.SPELL_REWARD_START));get('close-quiz').onclick();g.damageGolem(g.golems[0],1000);assert.equal(rules.usedSlots(g.golems),49);assert.ok(g.summonGolem(bigAlly));assert.equal(rules.usedSlots(g.golems),50);
// Slime is a random-supply reward with 20-range questions and a 3-correct streak.
g.reset();g.openQuiz();selectReward(10);assert.equal(g.questions[10].max,20);for(let n=0;n<3;n++)chooseCorrect(10);assert.equal(g.state.mode,'reward');assert.equal(g.golems[0].type,bigAlly);advance(900);
// Child golems inherit taunt, patrol, melee and swing; enemy retargets from dead parent.
ally=g.golems[0];ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);let enemy=g.enemies[0];enemy.mesh.position.set(0,0,-2);g.updateEnemy(enemy,.01);assert.equal(enemy.guard,ally);g.damageGolem(ally,1000);g.updateEnemy(enemy,.01);assert.ok(g.golems.includes(enemy.guard));assert.equal(enemy.guard.type,rules.SMALL_SLIME_GOLEM);
let child=g.golems[0];child.mesh.position.set(0,0,0);enemy.mesh.position.set(0,0,-1);child.cooldown=0;g.updateGolems(.01);assert.ok(enemy.hp<40);assert.equal(child.swing,.32);assert.ok(child.mesh.userData.arms.every(a=>a.rotation.x===-1.45));
for(const e of [...g.enemies])g.damageEnemy(e,1000);const before=child.mesh.position.clone();for(let n=0;n<100;n++)g.updateGolems(.05);assert.ok(child.mesh.position.distanceTo(before)>.2);g.openQuiz();const frozen=child.mesh.position.clone();g.updateGolems(10);assert.ok(child.mesh.position.equals(frozen));get('close-quiz').onclick();for(const e of [...g.golems])g.damageGolem(e,1000);assert.equal(g.golems.length,0);
// Small zombies remain valid taunt targets, and breaches do not count as kills or split.
g.reset();g.spawn(bigEnemy);let big=g.enemies[0];big.mesh.position.set(0,0,3);g.updateEnemy(big,.01);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,0);assert.equal(g.state.health,4);
g.reset();g.spawn(bigEnemy);big=g.enemies[0];big.mesh.position.set(0,0,-1);g.damageEnemy(big,1000);g.summonGolem(bigAlly);ally=g.golems[0];ally.mesh.position.set(0,0,0);for(const e of g.enemies){g.updateEnemy(e,.01);assert.equal(e.guard,ally);assert.ok(e.mesh.userData.bar&&e.mesh.userData.warn);}g.reset();assert.equal(g.enemies.length,0);assert.equal(g.golems.length,0);
console.log('PASS slime: guaranteed full-budget 2-way split, one generation, duplicate death guards, lava AoE snapshot, 3 slots/6 bodies, half-slot eligibility, 3-question reward, child patrol/taunt/strike/freeze, retarget/breach/reset');
}

// The actual RPG raycast/AoE likewise cannot hit the newborn split forms in its own snapshot.
{
g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));const parent=g.enemies[0];parent.mesh.position.set(0,0,-1);parent.hp=1;qa.look(0,40);g.state.weapon=2;g.state.ammo=3;g.state.shot=0;g.shoot();assert.equal(g.state.kills,1);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(e=>e.type===rules.SMALL_SLIME_ENEMY&&e.hp===20));g.updateEnemy(parent,10);assert.equal(g.state.health,5);g.damageEnemy(parent,100);assert.equal(g.state.kills,1);console.log('PASS actual RPG: single parent kill, two undamaged children, stale dead parent cannot breach or score twice');
}

{
const signatures=new Set();
for(const type of rules.GOLEMS.filter(g=>g.basic)){
 const reward=rules.GOLEMS.indexOf(type)+4;g.reset();g.state.ammo=0;g.openQuiz();selectReward(reward);assert.equal(g.questions[reward].max,10);
 for(let n=0;n<3;n++){chooseCorrect(reward);assert.equal(g.golems.length,n===2?1:0);}assert.equal(g.state.mode,'reward');assert.equal(g.state.ammo,9);const ally=g.golems[0];assert.equal(ally.type,type);assert.equal(ally.hp,23);assert.equal(ally.mesh.userData.appearance,type.id);g.answer();assert.equal(g.golems.length,1);advance(900);
 const parts=[];ally.mesh.traverse(o=>{if(o.isMesh)parts.push([o.geometry.type,o.material.color.getHex(),o.material.opacity,...o.position.toArray(),...o.scale.toArray()]);});signatures.add(JSON.stringify(parts));
 if(type.id==='glass'){const body=ally.mesh.children[0];assert.equal(body.material.opacity,.42);assert.equal(body.material.transparent,true);assert.equal(vm.runInContext(`material(${type.color}).opacity`,ctx),1,'glass does not mutate shared materials');}
 // Weak allies still deal the same basic hit and have no split, range or slow effect.
 ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);const enemy=g.enemies[0];enemy.mesh.position.set(0,0,-1);ally.cooldown=0;g.updateGolems(.01);assert.equal(enemy.hp,35);assert.equal(enemy.speed,.8);assert.equal(ally.swing,.32);g.updateEnemy(enemy,.01);assert.equal(enemy.guard,ally);
 g.damageGolem(ally,1000);assert.equal(g.golems.length,0);g.damageGolem(ally,1000);assert.equal(g.golems.length,0);
}
assert.equal(signatures.size,6,'distinct material/geometry appearances');
g.reset();g.spawn(rules.ENEMIES.find(e=>e.id==='mounted'));const rider=g.enemies[0];rider.mesh.position.set(0,0,-8);g.updateEnemy(rider,.5);assert.ok(Math.abs(rider.mesh.position.z-(-7.3))<1e-9);g.damageEnemy(rider,rider.type.mountHP);assert.equal(rider.type.id,'normal');assert.equal(rider.speed,.8,'dismounted rider returns to normal speed');
console.log('PASS basic golems: six unique cosmetic models, glass material isolation, 10-range three-answer summons, identical 23HP/5 damage, taunt/strikes/no extra effects, no split; mounted +12 percent and normal dismount speed');
}

// Reward cards and HUD derive HP from the rules; splitting children use the new 18 HP.
for(const type of rules.GOLEMS.filter(t=>['wood','slime','dirt','glass','honey','grass','watermelon','pumpkin'].includes(t.id))){
 g.reset();g.openQuiz();const reward=rules.GOLEMS.indexOf(type)+4;selectReward(reward);const card=get('question-cards').children.find(b=>Number(b.dataset.reward)===reward);assert.ok(card.innerHTML.includes(`生命${type.hp}`));
 for(let n=0;n<3;n++)chooseCorrect(reward);const ally=g.golems[0];assert.equal(ally.hp,type.hp);assert.ok(get('golem-status').textContent.includes(`${type.name}×1`));advance(900);
 if(type.split){g.damageGolem(ally,60);assert.equal(g.golems.length,2);assert.ok(g.golems.every(a=>a.hp===18));assert.ok(get('golem-status').textContent.includes('×2'));for(const child of [...g.golems])g.damageGolem(child,18);assert.equal(g.golems.length,0);}
}
console.log('PASS reduced HP: exact reward card/HUD/summon HP and 60-to-two-18 split, no extra generation');

{
// Full standard party, capacity UI, no pile-up at the old three spawn positions.
g.reset();for(let n=0;n<50;n++)assert.ok(g.summonGolem(rules.GOLEMS[n%rules.GOLEMS.length]));assert.equal(g.golems.length,50);assert.equal(g.summonGolem(rules.GOLEMS[0]),false);assert.equal(new Set(g.golems.map(a=>a.mesh.position.toArray().join(','))).size,50);assert.match(get('golem-status').textContent,/名额 50 \/ 50/);assert.ok(get('golem-status').textContent.length<300);g.openQuiz();assert.ok(g.offers.every(i=>i<4||i>=rules.SPELL_REWARD_START));get('close-quiz').onclick();
// Explicitly free one normal slot and check a new golem reward becomes available.
g.damageGolem(g.golems.find(a=>!a.type.split),10000);assert.equal(rules.usedSlots(g.golems),49);g.openQuiz();selectReward(4);assert.equal(vm.runInContext('selected',ctx),4);get('close-quiz').onclick();
// 100 small allies + 30 enemies for 600 rendered-loop steps (renderer mocked, not GPU/FPS).
g.reset();const slime=rules.GOLEMS.find(t=>t.id==='slime');for(let n=0;n<50;n++)g.summonGolem(slime);for(const a of [...g.golems])g.damageGolem(a,10000);assert.equal(g.golems.length,100);assert.match(get('golem-status').textContent,/傀儡 100只 · 名额 50 \/ 50/);assert.ok(get('golem-status').textContent.length<100);
for(const a of g.golems)a.hp=1000000;for(let n=0;n<100;n++){g.spawn(rules.ENEMIES[0]);const e=g.enemies.at(-1);e.mesh.position.set(-3+(n%4)*2,0,-4-Math.floor(n/4));e.hp=1000000;}
const durations=[],started=performance.now();for(let n=0;n<600;n++){const at=performance.now();frame(vm.runInContext('previous+1000/60',ctx));durations.push(performance.now()-at);assert.ok(g.golems.length<=100&&rules.usedSlots(g.golems)<=50);assert.ok(g.golems.every(a=>Number.isFinite(a.mesh.position.x)&&Number.isFinite(a.hp)));}
const total=performance.now()-started;durations.sort((a,b)=>a-b);assert.equal(g.golems.length,100);assert.equal(g.enemies.length,100);g.openQuiz();const positions=g.golems.map(a=>a.mesh.position.clone());frame(vm.runInContext('previous+1000',ctx));g.golems.forEach((a,i)=>assert.ok(a.mesh.position.equals(positions[i])));g.reset();assert.equal(g.golems.length,0);
console.log(`PASS capacity50: standard/full/half/free slots, 50 distinct spawn points, compact UI, 100-child stress + 100 enemies / 600 steps in ${total.toFixed(0)}ms; p95 ${durations[570].toFixed(2)}ms, max ${durations.at(-1).toFixed(2)}ms (CPU mock only, not browser FPS)`);
}

{
// Switch from legacy category fixture to the actual four-category random supplies.
ctx.supplyOffers=rules.supplyOffers;const ps=g.plantSystem;
for(let i=0;i<rules.PLANTS.length;i++){
 g.reset();g.state.ammo=0;g.openQuiz();selectReward(rules.PLANT_REWARD_START+i);
 for(let n=0;n<3;n++)chooseCorrect(rules.PLANT_REWARD_START+i);assert.equal(g.state.mode,'reward');assert.equal(ps.plants.length,1);const elapsed=g.state.elapsed;frame(vm.runInContext('previous+1000',ctx));assert.equal(g.state.elapsed,elapsed);g.answer();g.autoDeployPlant();assert.equal(ps.plants.length,1);assert.equal(ps.plants[0].cooldown,rules.PLANTS[i].interval);advance(900);assert.equal(g.state.mode,'playing');assert.equal(g.state.ammo,9);assert.equal(ps.plants[0].type,rules.PLANTS[i]);
}
g.reset();g.state.ammo=0;g.openQuiz();selectReward(17);chooseCorrect(17);chooseWrong();advance(1800);assert.equal(g.state.mode,'playing');assert.equal(ps.plants.length,0);assert.equal(g.state.ammo,0);g.shoot(true);selectReward(17);for(let n=0;n<3;n++)chooseCorrect(17);g.reset();advance(2000);g.autoDeployPlant();assert.equal(ps.plants.length,0);
const seenPlants=new Set();for(let n=0;n<150;n++){g.reset();g.openQuiz();g.offers.filter(i=>i>=17&&i<25).forEach(i=>seenPlants.add(i));}assert.equal(seenPlants.size,8);
g.reset();for(let slot=0;slot<10;slot++)assert.ok(ps.add(rules.PLANTS[0],slot));g.openQuiz();assert.ok(g.offers.every(i=>i<17||i>=rules.PLANT_UPGRADE_START));g.selectQuestion(17);assert.equal(vm.runInContext('selected',ctx),-1);get('close-quiz').onclick();ps.remove(ps.plants[0]);g.openQuiz();selectReward(17);for(let n=0;n<3;n++)chooseCorrect(17);advance(900);assert.equal(ps.plants.length,10);assert.ok(ps.plants.some(p=>p.slot===0));
// Space can fill while a question is in progress: completed reward stays pending, not lost.
g.reset();g.state.ammo=0;g.openQuiz();selectReward(17);chooseCorrect(17);for(let slot=0;slot<10;slot++)ps.add(rules.PLANTS[1],slot);chooseCorrect(17);chooseCorrect(17);assert.equal(g.state.mode,'reward');assert.equal(ps.plants.length,10);assert.ok(vm.runInContext('pendingPlant',ctx));advance(900);assert.equal(g.state.ammo,9);g.openQuiz();assert.ok(g.offers.every(i=>i<17||i>=rules.PLANT_UPGRADE_START));ps.remove(ps.plants[2]);g.autoDeployPlant();assert.equal(ps.plants.length,9);get('close-quiz').onclick();g.autoDeployPlant();assert.equal(ps.plants.length,10);assert.equal(ps.plants.at(-1).slot,2);assert.equal(ps.plants.at(-1).type,rules.PLANTS[0]);g.autoDeployPlant();assert.equal(ps.plants.length,10);
// Uniform draw over only empty slots, deterministic samples across every equal-sized interval.
vm.runInContext("globalThis.__originalRandom=Math.random",ctx);const counts=new Map();for(let n=0;n<800;n++){g.reset();ps.add(rules.PLANTS[0],1);ps.add(rules.PLANTS[0],4);vm.runInContext(`pendingPlant=PLANTS[2];Math.random=()=>${(n+.5)/800}`,ctx);g.autoDeployPlant();const slot=ps.plants.at(-1).slot;counts.set(slot,(counts.get(slot)||0)+1);}assert.deepEqual([...counts.values()],[100,100,100,100,100,100,100,100]);vm.runInContext('Math.random=globalThis.__originalRandom',ctx);
console.log('PASS auto plants: eight rewards, 900ms return, full filtering, changed-space retained reward, occupied slots, uniform empty draw, duplicate/reset/wrong/pause safety');
// Local contact works at every deployment slot, including ±0.6 approach offsets and all types.
for(let slot=0;slot<10;slot++)for(const type of rules.ENEMIES)for(const offset of [-.6,.6]){
 g.reset();ps.add(rules.PLANTS[0],slot);g.spawn(type);const e=g.enemies[0],s=rules.PLANT_SLOTS[slot];e.mesh.position.set(s.x+offset,0,s.z-2);for(let n=0;n<100&&ps.plants.length;n++)g.updateEnemy(e,.05);assert.equal(ps.plants.length,0,`${s.label}/${type.id}/${offset} contacts plant`);
}
// Real movement slow is exactly 20%, refreshes, and expires without changing base speed.
g.reset();g.spawn(rules.ENEMIES[0]);let e=g.enemies[0];e.mesh.position.set(0,0,-10);g.state.elapsed=10;ps.impact(rules.PLANTS[5],e.mesh.position,e);g.updateEnemy(e,.5);assert.ok(Math.abs(e.mesh.position.z+9.68)<1e-9);assert.equal(e.speed,.8);g.state.elapsed=11;ps.impact(rules.PLANTS[5],e.mesh.position,e);assert.equal(e.slowUntil,13);const z=e.mesh.position.z;g.state.elapsed=13;g.updateEnemy(e,.5);assert.ok(Math.abs(e.mesh.position.z-z-.4)<1e-9);
// Plant AoE handles splitting once, never affects allies; player shots ignore friendly plants.
g.reset();g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));e=g.enemies[0];e.mesh.position.set(0,0,-1);e.hp=1;g.summonGolem(rules.GOLEMS[0]);const hp=g.golems[0].hp;ps.impact(rules.PLANTS[4],e.mesh.position,e);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(a=>a.hp===20));assert.equal(g.golems[0].hp,hp);
g.reset();ps.add(rules.PLANTS[0],2);qa.player.position.x=-4;g.spawn(rules.ENEMIES[0]);e=g.enemies[0];e.mesh.position.set(-4,0,-1);g.state.shot=0;g.shoot();assert.equal(e.hp,30);assert.equal(ps.plants.length,1);
// Max-party scene with all six repeating plants and eight enemies, no GPU claims.
g.reset();for(let n=0;n<50;n++)g.summonGolem(rules.GOLEMS.find(t=>t.id==='slime'));for(const a of [...g.golems])g.damageGolem(a,1000);for(const a of g.golems)a.hp=1000000;for(let i=0;i<10;i++)ps.add(rules.PLANTS[i%8],i);for(let n=0;n<100;n++){g.spawn(rules.ENEMIES[0]);const a=g.enemies.at(-1);a.mesh.position.set((n%3-1)*.3,0,-3-Math.floor(n/3)*.3);a.hp=1000000;}
const start=performance.now();for(let n=0;n<600;n++)frame(vm.runInContext('previous+1000/60',ctx));assert.equal(g.golems.length,100);assert.equal(g.enemies.length,100);assert.equal(ps.plants.length,10);assert.ok(ps.shots.length<30);console.log(`PASS plants integrated: 8 rewards/deployments, wrong/reset/duplicate/full-slot guards, 168 actual route contacts, slow/expiry, AoE split, friendly rays; max100 allies+10 plants+100 enemies 600 CPU mock steps ${(performance.now()-start).toFixed(0)}ms`);g.reset();assert.equal(ps.plants.length,0);assert.equal(ps.shots.length,0);
// The original eight slots remain reachable from normal birth lanes before breach. New outer slots require a diverted approach.
for(let slot=1;slot<9;slot++)for(const type of rules.ENEMIES){
 g.reset();ps.add(rules.PLANTS[0],slot);g.spawn(type);const e=g.enemies[0],x=[-4.6,-3.9,-3.4,-.6,.6,3.4,3.9,4.6][slot-1];e.mesh.position.set(x,0,-16);
 for(let n=0;n<1000&&ps.plants.length;n++)g.updateEnemy(e,.05);
 assert.equal(ps.plants.length,0,`legal spawn to slot ${slot}/${type.id}`);assert.equal(g.state.health,5);
}
// Actual scene ray geometry and projectile lifetime at all birth-region corners.
for(let slot=0;slot<10;slot++)for(const x of [-4.6,4.6])for(const type of rules.PLANTS){
 g.reset();ps.add(type,slot);g.spawn(rules.ENEMIES[0]);const e=g.enemies[0];e.mesh.position.set(x,0,-16);qa.scene.updateMatrixWorld(true);ps.update(type.interval);assert.equal(ps.shots.length,1);
 for(let n=0;n<50;n++){qa.scene.updateMatrixWorld(true);ps.updateShots(.05);}assert.equal(e.hp,40-type.damage,`real scene distant ${slot}/${x}/${type.id}`);
}
console.log('PASS plant row: 84 legal birth-to-contact routes before breach; 96 real-scene distant projectile hits; original taunt/bounds/pause regressions pass');

}


// Every type, including actual split children: full interval blocks a second hit while arms recover unchanged.
for(const type of [...rules.GOLEMS,rules.SMALL_SLIME_GOLEM]){
 g.reset();if(type===rules.SMALL_SLIME_GOLEM){g.summonGolem(rules.GOLEMS.find(t=>t.split));g.damageGolem(g.golems[0],999);g.damageGolem(g.golems[1],999);}else g.summonGolem(type);
 const ally=g.golems[0];assert.equal(ally.type,type);ally.mesh.position.set(0,0,0);g.spawn(rules.ENEMIES[0]);const enemy=g.enemies[0];enemy.mesh.position.set(0,0,-1);enemy.hp=1000;ally.cooldown=0;g.updateGolems(.01);assert.equal(enemy.hp,1000-type.damage);assert.equal(ally.cooldown,type.interval);g.updateGolems(.32);assert.ok(ally.mesh.userData.arms.every(a=>Math.abs(a.rotation.x)<1e-9));g.updateGolems(type.interval-.32-.001);assert.equal(enemy.hp,1000-type.damage);g.updateGolems(.002);assert.equal(enemy.hp,1000-type.damage*2);
}
console.log('PASS 14 golem forms: new cooldown, unchanged damage/320ms animation, actual split child interval');
// Timed titans use active battle time, one titan and twenty of thirty enemy slots.
g.reset();g.state.elapsed=rules.TITAN_FIRST-.01;assert.equal(g.updateTitanSpawn(),false);g.state.elapsed=rules.TITAN_FIRST;assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies[0].type,rules.TITANS[0]);assert.equal(g.enemies[0].hp,600);assert.equal(rules.usedSlots(g.enemies),20);g.state.elapsed+=rules.TITAN_INTERVAL;assert.equal(g.updateTitanSpawn(),false);g.damageEnemy(g.enemies[0],9999);assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies[0].type,rules.TITANS[1]);g.damageEnemy(g.enemies[0],9999);g.state.elapsed+=rules.TITAN_INTERVAL;g.openQuiz();assert.equal(g.updateTitanSpawn(),false);get('close-quiz').onclick();assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies[0].type,rules.TITANS[2]);g.reset();g.state.elapsed=rules.TITAN_FIRST;for(let i=0;i<81;i++)g.spawn(rules.ENEMIES[0]);assert.equal(g.updateTitanSpawn(),false);g.damageEnemy(g.enemies[0],999);assert.equal(g.updateTitanSpawn(),true);assert.equal(rules.usedSlots(g.enemies),100);
for(const type of rules.TITANS){
 g.reset();g.spawn(type);const e=g.enemies[0];assert.equal(e.hp,type.hp);assert.ok(type.hp>=300&&type.hp<=1400);const bounds=new Three.Box3().setFromObject(e.mesh);assert.ok(bounds.max.y>=16);assert.equal(e.mesh.scale.x,4);assert.ok(type.id==='witherzilla'?e.mesh.userData.legs.length===0:e.mesh.userData.legs.length>=2);assert.ok(e.mesh.userData.bar&&e.mesh.userData.fill&&e.mesh.userData.warn);
 const pos=e.mesh.position.clone();g.openQuiz();g.updateEnemy(e,100);assert.ok(e.mesh.position.equals(pos));get('close-quiz').onclick();
 g.summonGolem(rules.GOLEMS[3]);const ally=g.golems[0];ally.mesh.position.set(0,0,-3);e.mesh.position.set(0,0,-5);g.updateEnemy(e,.1);assert.equal(e.guard,ally);const hp=ally.hp;for(let n=0;n<30;n++){g.updateEnemy(e,.1);g.updateTitanShots(.1);}assert.ok(ally.hp<hp);e.mesh.position.set(0,0,-4);ally.cooldown=0;const before=e.hp;g.updateGolems(.01);assert.equal(e.hp,before-ally.type.damage);
 // Clearance radius avoids a crate, while a live golem draws the titan around it.
 e.mesh.position.set(0,0,-11);ally.mesh.position.set(0,0,-3);const routedGuardHP=ally.hp;for(let n=0;n<800;n++){g.updateEnemy(e,.05);g.updateTitanShots(.05);assert.ok(vm.runInContext('!blockers.some(([x,z,hx,hz])=>Math.abs(enemies[0].mesh.position.x-x)<hx+5.99&&Math.abs(enemies[0].mesh.position.z-z)<hz+5.99)',ctx));if(!g.golems.length)break;}if(type.id==='witherzilla'){assert.equal(e.mesh.position.z,-11,'ranged attack stays at 8 center units');assert.ok(ally.hp<routedGuardHP,'stationary fireballs really damage guard');}else assert.ok(e.mesh.position.z>-9);assert.equal(e.mesh.position.y,0);
 const kills=g.state.kills;g.damageEnemy(e,9999);g.damageEnemy(e,9999);assert.equal(g.state.kills,kills+1);assert.equal(g.enemies.length,0);
 g.spawn(type);const breach=g.enemies[0];breach.mesh.position.z=3;g.updateEnemy(breach,.01);g.updateEnemy(breach,.01);assert.equal(g.state.health,4);assert.equal(g.enemies.length,0);
}
g.reset();assert.equal(g.enemies.length,0);assert.equal(get('boss-status').textContent.includes('undefined'),false);console.log('PASS titans: timing/cap/rotation, models, pause, taunt/melee, large-body obstacle routing, death/breach idempotency and reset');
// Giant body edges remain hittable: bullets use real meshes, plants and melee use a bounded body radius.
for(const type of rules.TITANS){
 g.reset();g.spawn(type);let e=g.enemies[0];e.mesh.position.set(0,0,-4);qa.look(0,-Math.atan2(4.2,11)/.0025);qa.scene.updateMatrixWorld(true);g.state.shot=0;g.shoot(true);assert.equal(e.hp,type.hp-10,`${type.id} center gun hit`);
 g.summonGolem(rules.GOLEMS[3]);const ally=g.golems[0];ally.mesh.position.set(0,0,-1);ally.cooldown=0;const hp=e.hp;g.updateGolems(.01);assert.equal(e.hp,hp-20,'surface melee at center distance 3');
 const at=e.mesh.position.clone();at.x+=6.2;const before=e.hp;g.plantSystem.impact(rules.PLANTS[4],at,null);assert.equal(e.hp,before-6,'AoE radius 1.5 reaches titan surface 4.8 from center');
}
console.log('PASS titan surface targeting: real player mesh rays, golem edge melee and plant edge AoE');

// Exact three-titan attack timings and star-reaper HUD/reset maximum.
for(const type of rules.TITANS.filter(t=>t.id!=='witherzilla')){g.reset();g.spawn(type);const boss=g.enemies[0];boss.mesh.position.set(0,0,-2);g.summonGolem(rules.GOLEMS[3]);const ally=g.golems[0];ally.mesh.position.set(0,0,0);const hp=ally.hp;g.updateEnemy(boss,.59);assert.equal(ally.hp,hp);g.updateEnemy(boss,.011);assert.equal(ally.hp,hp-16);g.updateEnemy(boss,1.19);assert.equal(ally.hp,hp-16);g.updateEnemy(boss,.011);assert.equal(ally.hp,hp-32);}
g.reset();g.state.elapsed=90;g.updateTitanSpawn();assert.equal(g.enemies[0].maxHP,600);assert.match(get('boss-status').textContent,/600 \/ 600/);g.damageEnemy(g.enemies[0],100);vm.runInContext('hud()',ctx);assert.match(get('boss-status').textContent,/500 \/ 600/);g.reset();g.state.elapsed=90;g.updateTitanSpawn();assert.match(get('boss-status').textContent,/600 \/ 600/);console.log('PASS warden600: spawn/maxHP/live HUD/reset and all titan exact 16 damage/.6 first/1.2 repeat');
{
g.reset();vm.runInContext('titanCountdown()',ctx);assert.match(get('boss-timer').textContent,/1:30/);g.state.elapsed=60;vm.runInContext('titanCountdown()',ctx);assert.match(get('boss-timer').textContent,/0:30.*准备/);g.openQuiz();const t=g.state.elapsed;frame(vm.runInContext('previous+1000',ctx));assert.equal(g.state.elapsed,t);assert.match(get('boss-timer').textContent,/计时暂停/);get('close-quiz').onclick();g.state.elapsed=90;for(let i=0;i<81;i++)g.spawn(rules.ENEMIES[0]);vm.runInContext('titanCountdown()',ctx);assert.match(get('boss-timer').textContent,/等待战场空位/);assert.doesNotMatch(get('boss-timer').textContent,/0:00/);g.damageEnemy(g.enemies[0],9999);g.updateTitanSpawn();vm.runInContext('titanCountdown()',ctx);assert.match(get('boss-timer').textContent,/仍在场/);assert.doesNotMatch(get('boss-timer').textContent,/\d:\d/);g.reset();assert.match(get('boss-timer').textContent,/1:30/);assert.match(get('plant-status').textContent,/植物 0\/10/);for(let i=0;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);assert.match(get('plant-status').textContent,/植物 10\/10/);g.openQuiz();assert.ok(g.offers.every(i=>i<rules.PLANT_REWARD_START||i>=rules.PLANT_UPGRADE_START));console.log('PASS countdown: 90s/urgent/pause/full waiting/live titan/reset, and HUD10/full filtering');

}


{
 const type=rules.ENEMIES.find(e=>e.id==='magma-slime'),child=rules.SMALL_MAGMA_SLIME_ENEMY;
 g.reset();for(let i=0;i<50;i++)g.spawn(type);assert.equal(rules.usedSlots(g.enemies),100);
 const parents=[...g.enemies];for(const e of parents){assert.equal(e.hp,90);assert.equal(e.mesh.children[0].material.color.getHex(),type.color);g.damageEnemy(e,999);}
 assert.equal(g.enemies.length,100);assert.equal(g.state.kills,50);assert.ok(g.enemies.every(e=>e.type===child&&e.hp===30&&e.mesh.scale.x===.55));
 for(const e of parents)g.damageEnemy(e,999);assert.equal(g.state.kills,50);
 for(const e of [...g.enemies])g.damageEnemy(e,999);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,150);
 g.reset();g.spawn(type);const parent=g.enemies[0];parent.mesh.position.set(0,0,-1);parent.hp=1;g.plantSystem.impact(rules.PLANTS[4],parent.mesh.position,parent);assert.equal(g.state.kills,1);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(e=>e.hp===30&&e.type===child));
 g.summonGolem(rules.GOLEMS[0]);const guard=g.golems[0];guard.mesh.position.set(0,0,0);for(const e of g.enemies){g.updateEnemy(e,.01);assert.equal(e.guard,guard);}
 g.reset();g.spawn(type);const breach=g.enemies[0];breach.mesh.position.z=3;g.updateEnemy(breach,.01);assert.equal(g.enemies.length,0);assert.equal(g.state.kills,0);assert.equal(g.state.health,4);
 g.reset();g.spawn(type);let target=g.enemies[0];target.mesh.position.set(0,0,-1);target.hp=1;qa.look(0,40);g.state.weapon=2;g.state.ammo=3;g.state.shot=0;g.shoot();assert.equal(g.state.kills,1);assert.ok(g.enemies.every(e=>e.type===child&&e.hp===30));
 g.reset();g.summonGolem(rules.GOLEMS.find(t=>t.id==='lava'));let ally=g.golems[0];ally.mesh.position.set(0,0,0);ally.cooldown=0;g.spawn(type);target=g.enemies[0];target.mesh.position.set(0,0,-1);target.hp=1;g.updateGolems(.01);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(e=>e.type===child&&e.hp===30));
 const positions=g.enemies.map(e=>e.mesh.position.clone());g.openQuiz();frame(500000);g.enemies.forEach((e,i)=>assert.ok(e.mesh.position.equals(positions[i])));
 g.reset();assert.equal(g.enemies.length,0);console.log('PASS magma: 90/30 health, red-orange model, full-budget split once, duplicate death, plant AoE, taunt, breach and reset');
}

// Every scheduled boss occurs once before the cycle repeats; dead bosses leave no residual actors.
g.reset();for(let i=0;i<rules.TITANS.length+1;i++){g.state.elapsed=(i+1)*rules.TITAN_INTERVAL;assert.equal(g.updateTitanSpawn(),true);assert.equal(g.enemies[0].type,rules.TITANS[i%rules.TITANS.length]);g.damageEnemy(g.enemies[0],99999);assert.equal(g.enemies.length,0);}
for(const type of rules.TITANS.filter(t=>['adamant-destroyer','bedrock-golem','lifestealer'].includes(t.id))){g.reset();g.spawn(type);const boss=g.enemies[0];boss.mesh.position.set(0,0,-2);g.summonGolem(rules.GOLEMS[3]);g.golems[0].mesh.position.set(0,0,0);g.updateEnemy(boss,.61);assert.ok(boss.mesh.userData.arms.every(a=>a.rotation.x<-.5));g.updateEnemy(boss,.41);assert.ok(boss.mesh.userData.arms.every(a=>a.rotation.x===0));}
console.log('PASS 9-titan complete rotation, no ghost thunder, and golem titan hammer swings');

// Capacity boundaries: ordinary 30, titan20+ordinary10, no overflow or double titan.
g.reset();for(let i=0;i<100;i++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,100);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,100);
g.damageEnemy(g.enemies[0],999);g.spawn(rules.ENEMIES.find(t=>t.id==='slime'));assert.equal(rules.usedSlots(g.enemies),99,'large slime cannot fit last one slot');g.spawn(rules.ENEMIES[0]);assert.equal(rules.usedSlots(g.enemies),100);
for(const type of rules.TITANS){g.reset();g.spawn(type);for(let i=0;i<80;i++)g.spawn(rules.ENEMIES[0]);assert.equal(rules.usedSlots(g.enemies),100);assert.equal(g.enemies.length,81);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,81);g.state.elapsed=90;assert.equal(g.updateTitanSpawn(),false);}
// Five big slimes plus one titan fill the budget; ten children replace them exactly.
g.reset();g.spawn(rules.TITANS[0]);for(let i=0;i<40;i++)g.spawn(rules.ENEMIES.find(t=>t.id==='magma-slime'));assert.equal(rules.usedSlots(g.enemies),100);for(const e of g.enemies.filter(e=>e.type.split))g.damageEnemy(e,999);assert.equal(g.enemies.length,81);assert.equal(rules.usedSlots(g.enemies),100);
g.reset();g.state.elapsed=90;for(let i=0;i<81;i++)g.spawn(rules.ENEMIES[0]);vm.runInContext('titanCountdown()',ctx);assert.match(get('boss-timer').textContent,/需空出20名额/);assert.equal(g.updateTitanSpawn(),false);g.damageEnemy(g.enemies[0],999);assert.equal(g.updateTitanSpawn(),true);assert.equal(rules.usedSlots(g.enemies),100);
console.log('PASS capacity100: all9 titans20+80, waiting HUD20, 99+large rejection, 100-normal cap, full-capacity slime split');

// Giant ground footprint stays inside the 17-unit arena border on clear center routes.
for(const type of rules.TITANS){g.reset();g.spawn(type);const boss=g.enemies[0];boss.mesh.position.set(0,0,-11);vm.runInContext('walkToward(enemies[0],new THREE.Vector3(0,0,-100),100,1)',ctx);assert.equal(boss.mesh.position.z,-11);assert.ok(boss.mesh.position.z-type.bodyRadius>=-17);}
// A golem already in reach of the enlarged surface does not walk underneath it.
g.reset();g.spawn(rules.TITANS[0]);g.enemies[0].mesh.position.set(0,0,-4);g.summonGolem(rules.GOLEMS[3]);const surfaceGuard=g.golems[0];surfaceGuard.mesh.position.set(0,0,0);surfaceGuard.cooldown=0;const surfacePos=surfaceGuard.mesh.position.clone();g.updateGolems(.1);assert.ok(surfaceGuard.mesh.position.equals(surfacePos));assert.equal(g.enemies[0].hp,580);
console.log('PASS giants: arena footprint edge, surface-melee stop, 9 exact quadrupled models and scaled navigation/hit tests');
// A giant can approach a taunting guard standing beside a crate without clipping.
g.reset();g.spawn(rules.TITANS[0]);const cornerBoss=g.enemies[0];cornerBoss.mesh.position.set(0,0,-11);g.summonGolem(rules.GOLEMS[3]);const cornerGuard=g.golems[0];cornerGuard.mesh.position.set(-5.5,0,-6);let cornerMoved=false;for(let i=0;i<1200;i++){g.updateEnemy(cornerBoss,.05);if(cornerBoss.mesh.position.distanceTo(new Three.Vector3(0,0,-11))>.1)cornerMoved=true;}assert.ok(cornerMoved,'giant should approach guard beside obstacle');assert.ok(cornerGuard.hp<180,'giant should reach melee surface beside obstacle');
// Actual UI guarantees are independent, including full categories and a half-slot remainder.
for(const guardFull of [false,true])for(const plantFull of [false,true])for(const health of [4,5]){
 g.reset();g.state.health=health;if(guardFull)for(let i=0;i<50;i++)g.summonGolem(rules.GOLEMS[0]);if(plantFull)for(let i=0;i<10;i++)g.plantSystem.add(rules.PLANTS[0],i);g.openQuiz();assert.equal(g.offers.length,3);assert.equal(new Set(g.offers).size,3);assert.equal(g.offers.some(i=>i>=17&&i<25),!plantFull);assert.equal(g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)),!guardFull);assert.ok(health<5||!g.offers.includes(3));
}
g.reset();for(let i=0;i<99;i++)g.summonGolem(rules.SMALL_SLIME_GOLEM);assert.equal(rules.usedSlots(g.golems),49.5);g.openQuiz();assert.ok(g.offers.some(i=>i>=17));assert.ok(!g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)));get('close-quiz').onclick();g.damageGolem(g.golems[0],999);g.openQuiz();assert.ok(g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)));assert.ok(g.offers.some(i=>i>=17));
g.reset();vm.runInContext('pendingPlant=PLANTS[0]',ctx);g.openQuiz();assert.ok(!g.offers.some(i=>i>=17&&i<25));assert.ok(g.offers.some(i=>(i>=4&&i<17)||(i>=rules.SPECIAL_GOLEM_START&&i<rules.SPELL_REWARD_START)));
console.log('PASS supply guarantees: actual UI 8 capacity/health combinations, 49.5/49 boundary and pending-plant filtering');
// Production timed spawns are inside the expanded-body boundary and never jump on first movement.
for(let index=0;index<rules.TITANS.length;index++){
 g.reset();vm.runInContext(`titanIndex=${index}`,ctx);g.state.elapsed=rules.TITAN_FIRST;assert.equal(g.updateTitanSpawn(),true);const boss=g.enemies[0],pos=boss.mesh.position.clone();assert.equal(pos.z,-11);assert.equal(boss.type.modelScale,4);g.updateEnemy(boss,.05);assert.ok(boss.mesh.position.distanceTo(pos)<=boss.speed*.05+1e-8,'no spawn-to-navigation snap');
 for(let n=0;n<1800&&g.enemies.includes(boss);n++){g.updateEnemy(boss,.05);assert.ok(Math.abs(boss.mesh.position.x)+boss.type.bodyRadius<=17+1e-8);assert.ok(boss.mesh.position.z-boss.type.bodyRadius>=-17-1e-8);}
 assert.ok(!g.enemies.includes(boss),`${boss.type.id} natural center lane reaches defense`);assert.equal(g.state.health,4);
}
console.log('PASS 4x titans: 9 production spawn boundaries, no first-step snap and natural center-lane breach');
// Capacity smoke only: 10 fully upgraded single-target plants emit all 1000 actual meshes.
// This is a short CPU/mock-renderer check, not a GPU or sustained mobile FPS claim.
const volleyPlants=g.plantSystem;g.reset();for(let i=0;i<10;i++){volleyPlants.add(rules.PLANTS[0],i);volleyPlants.plants.at(-1).upgrades.multi=99;}g.spawn(rules.ENEMIES[0]);g.enemies[0].hp=1000000;g.enemies[0].mesh.position.set(0,0,-2);const volleyStart=performance.now();volleyPlants.update(1.5);assert.equal(volleyPlants.shots.length,1000);volleyPlants.updateShots(.05);assert.ok(volleyPlants.shots.length<=1000);console.log(`PASS 1000 actual projectile capacity + one CPU simulation step in ${(performance.now()-volleyStart).toFixed(0)}ms (no GPU/FPS claim)`);g.reset();assert.equal(volleyPlants.shots.length,0);
