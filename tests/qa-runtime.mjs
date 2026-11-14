// Headless logic smoke test: mock DOM/renderer, NOT a real browser or visual test.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as Three from 'three';import * as rules from '../src/rules.js';
class Element{constructor(){this.children=[];this.value='';this.style={};this.dataset={};this.handlers={};this.classList={add(){},remove(){},toggle(){}};}set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html;}appendChild(e){this.children.push(e);}addEventListener(k,fn){this.handlers[k]=fn;}setAttribute(){}focus(){}select(){}setPointerCapture(){}}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const dirs=['forward','left','backward','right'].map(d=>{const e=new Element();e.dataset.move=d;return e;});const events={};let frame;class FakeRenderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}
let now=0,timerId=0;const timers=new Map();
function advance(ms){const target=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=target;}
const ctx={...rules,THREE:{...Three,WebGLRenderer:FakeRenderer},document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>dirs,addEventListener(k,f){events[k]=f;}},window:{},HTMLInputElement:Element,devicePixelRatio:1,innerWidth:1440,innerHeight:900,performance:{now:()=>0},requestAnimationFrame:f=>frame=f,addEventListener(k,f){events[k]=f;},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),console};vm.createContext(ctx);let src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');src+='\nwindow.__qa={player,get enemies(){return enemies;},get touchKeys(){return [...touchKeys];},get fireHeld(){return fireHeld;},camera,look,character,scene,moveBody,villagers,villageFree,updateVillagers,get effects(){return effects;}};';vm.runInContext(src,ctx);const g=ctx.window.__game;
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

get('start').onclick();assert.equal(g.state.mode,'playing');for(let i=0;i<18;i++){g.state.shot=0;g.shoot();}assert.equal(g.state.mode,'quiz');assert.equal(g.state.ammo,0);const elapsed=g.state.elapsed;frame(100);assert.equal(g.state.elapsed,elapsed);assert.equal(g.questions.length,10);
for(let i=0;i<3;i++){if(i)g.openQuiz();selectReward(i);chooseWrong();assert.equal(g.state.mode,'quiz');chooseCorrect(i);assert.equal(g.state.mode,'reward');assert.equal(g.state.ammo,[18,36,5][i]);g.answer();assert.equal(g.state.solved,i+1);get('continue').onclick();assert.equal(g.state.mode,'playing');}
get('pause').onclick();const t=g.state.elapsed;frame(200);assert.equal(g.state.elapsed,t);get('resume').onclick();const z=ctx.window.__qa.player.position.z;events.keydown({key:'w',target:{},preventDefault(){}});frame(300);assert.ok(ctx.window.__qa.player.position.z<z);console.log('PASS mocked-runtime: start, 18 shots to quiz, pause, wrong answer, three rewards, duplicate submit, resume, keyboard move');

const qa=ctx.window.__qa;g.reset();assert.equal(qa.camera.position.y,1.8);assert.equal(qa.player.visible,false);
qa.look(-Math.PI/2/.0025,0);events.keydown({key:'w',target:{},preventDefault(){}});const px=qa.player.position.x;frame(400);assert.ok(qa.player.position.x<px,'forward follows yaw');events.keyup({key:'w'});
qa.look(0,99999);assert.ok(Math.abs(qa.camera.rotation.x)<=1.25,'pitch clamped');
g.reset();const enemy={mesh:qa.character(true),hp:40,speed:0,phase:0};enemy.mesh.position.set(0,0,-3);qa.scene.add(enemy.mesh);qa.enemies.push(enemy);g.shoot();assert.equal(enemy.hp,30,'center ray hits enemy');g.state.shot=0;qa.look(0,-400);g.shoot();assert.equal(enemy.hp,30,'looking above enemy misses');
let lockRequests=0;get('world').requestPointerLock=()=>{lockRequests++;ctx.document.pointerLockElement=get('world');events.pointerlockchange();};ctx.document.exitPointerLock=()=>{ctx.document.pointerLockElement=null;events.pointerlockchange();};
g.reset();assert.equal(lockRequests,1);g.openQuiz();assert.equal(g.state.mode,'quiz','unlock must not override quiz');assert.equal(ctx.document.pointerLockElement,null);get('close-quiz').onclick();assert.equal(lockRequests,2);ctx.document.pointerLockElement=null;events.pointerlockchange();assert.equal(g.state.mode,'paused','Esc/unlock pauses');
g.reset();ctx.document.pointerLockElement=null;const ammo=g.state.ammo;get('world').handlers.pointerdown({pointerId:90,pointerType:'touch',clientX:100,clientY:100});get('world').handlers.pointermove({pointerId:90,clientX:130,clientY:100});assert.equal(g.state.ammo,ammo,'touch look must not shoot');assert.ok(qa.camera.rotation.y<0);
const evt=(id,currentTarget)=>({pointerId:id,currentTarget,preventDefault(){}});dirs[0].onpointerdown(evt(1,dirs[0]));get('touch-fire').onpointerdown(evt(2,get('touch-fire')));events.pointerup({pointerId:90});assert.ok(qa.touchKeys.includes('forward'));assert.equal(qa.fireHeld,true);events.pointerup({pointerId:2});assert.ok(qa.touchKeys.includes('forward'));assert.equal(qa.fireHeld,false);events.pointerup({pointerId:1});assert.equal(qa.touchKeys.length,0);
const p=new Three.Vector3(-7,0,-5);qa.moveBody(p,0,-1);assert.equal(p.z,-5,'crate blocks movement');
console.log('PASS first-person: eye camera, yaw movement, pitch clamp, center-ray hit/miss, lock/quiz/resume/Esc, independent multitouch, collision');
// Exercise every model and behavior with real Three geometry, mocked rendering only.
for(const type of rules.ENEMIES){g.reset();for(let attempt=0;attempt<100&&!g.enemies.length;attempt++)g.spawn(type);assert.equal(g.enemies.length,1,type.id+' spawns');const e=g.enemies[0];assert.equal(e.hp,type.hp);assert.ok(e.mesh.userData.bar);e.mesh.position.set(0,0,-8);if(type.neutral){g.updateEnemy(e,.1);assert.ok(e.mesh.position.z>-8);g.damageEnemy(e,10);assert.equal(e.angry,true);}if(type.ranged||type.charge){e.cooldown=0;g.updateEnemy(e,.1);assert.ok(e.tell>0);g.updateEnemy(e,1.2);assert.ok(type.ranged||e.charging>0);}if(type.mount){g.damageEnemy(e,type.mountHP);assert.equal(e.detached,true);assert.equal(e.type.id,type.mount);}g.damageEnemy(e,1000);assert.equal(g.enemies.length,0);}
g.reset();for(let attempt=0;attempt<100&&g.enemies.length<8;attempt++)g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,8);g.spawn(rules.ENEMIES[0]);assert.equal(g.enemies.length,8);g.openQuiz();const positions=g.enemies.map(e=>e.mesh.position.clone());frame(1000);g.enemies.forEach((e,i)=>assert.ok(e.mesh.position.equals(positions[i])));console.log('PASS roster: all 13 spawn/models/health/death, neutral aggro, ranged/charge tells, mount dismount, 8 cap, quiz freezes enemies');

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
g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.z=3;g.updateEnemy(g.enemies[0],.05);g.state.ammo=0;g.openQuiz();selectReward(3);chooseWrong();assert.equal(g.state.health,4);chooseCorrect(3);assert.equal(g.state.health,4);assert.equal(g.streak,1);chooseCorrect(3);assert.equal(g.state.health,5);assert.equal(g.state.weapon,0);assert.equal(g.state.ammo,18);const solved=g.state.solved;g.answer();assert.equal(g.state.solved,solved);assert.equal(qa.villagers.filter(v=>v.visible).length,5);get('continue').onclick();g.state.shot=0;g.shoot();assert.equal(g.state.ammo,17);
// Safe rear roaming, frozen during math, and no friendly fire even facing rear.
g.reset();const starts=qa.villagers.map(v=>v.position.clone());for(let i=0;i<12000;i++){qa.updateVillagers(.05);for(const v of qa.villagers){assert.ok(qa.villageFree(v.position.x,v.position.z,v));}}assert.ok(qa.villagers.some((v,i)=>v.position.distanceTo(starts[i])>1));g.openQuiz();const walks=JSON.stringify(qa.villagers.map(v=>[v.position.toArray(),v.userData.walk]));qa.updateVillagers(5);assert.equal(JSON.stringify(qa.villagers.map(v=>[v.position.toArray(),v.userData.walk])),walks);get('close-quiz').onclick();qa.look(-Math.PI/.0025,0);for(let i=0;i<3;i++){g.state.shot=0;g.shoot();}assert.equal(g.state.health,5);g.reset();assert.equal(qa.villagers.filter(v=>v.visible).length,5);console.log('PASS rescue and village: full disabled, wrong answer, empty-ammo rescue, duplicate submit, 10-minute safe roaming, quiz freezes walk, 360 view, no friendly fire, restart');

// Summons: real scene/AI/math logic, renderer remains mocked.
for(let i=0;i<rules.GOLEMS.length;i++){
 g.reset();g.state.ammo=0;g.openQuiz();selectReward(i+4);
 for(let n=1;n<=3;n++){chooseCorrect(i+4);assert.equal(g.state.mode,n===3?'reward':'quiz');assert.equal(g.golems.length,n===3?1:0);}
 assert.equal(g.golems[0].type.id,rules.GOLEMS[i].id);assert.equal(g.state.ammo,18);assert.equal(g.state.solved,3);g.answer();assert.equal(g.golems.length,1);get('continue').onclick();
 const guard=g.golems[0];g.spawn(rules.ENEMIES[0]);g.enemies[0].mesh.position.set(guard.mesh.position.x,0,-5);let attacked=false;
 for(let n=0;n<600&&g.enemies.length;n++){g.updateGolems(.05);for(const e of [...g.enemies])g.updateEnemy(e,.05);if(g.enemies[0]?.hp<40)attacked=true;}
 assert.ok(attacked||g.state.kills>0,guard.type.id+' autonomous attack');assert.equal(g.state.kills,1,guard.type.id+' kills normal enemy');assert.equal(g.state.health,5);
 g.damageGolem(guard,10000);assert.equal(g.golems.length,0);assert.match(get('toast').textContent,/退场/);
}
g.reset();g.openQuiz();selectReward(4);chooseCorrect(4);assert.equal(g.streak,1);chooseWrong();assert.equal(g.streak,0);assert.equal(g.golems.length,0);chooseCorrect(4);selectReward(5);assert.equal(g.streak,0);get('close-quiz').onclick();g.openQuiz();selectReward(4);assert.equal(g.streak,0);
g.reset();for(let i=0;i<3;i++)assert.ok(g.summonGolem(rules.GOLEMS[i]));assert.equal(g.summonGolem(rules.GOLEMS[3]),false);g.openQuiz();assert.ok(g.offers.every(i=>i<3));assert.equal(get('question-cards').children.length,3);selectReward(4);assert.equal(g.streak,0);const snapshotsG=g.golems.map(g=>[g.hp,g.mesh.position.clone(),g.cooldown]);g.updateGolems(10);g.golems.forEach((e,i)=>{assert.equal(e.hp,snapshotsG[i][0]);assert.ok(e.mesh.position.equals(snapshotsG[i][1]));assert.equal(e.cooldown,snapshotsG[i][2]);});get('close-quiz').onclick();
// Enemy retargets after guard retreat; restart clears every summon.
const guard=g.golems[0];g.spawn(rules.ENEMIES[0]);const attacker=g.enemies[0];attacker.mesh.position.copy(guard.mesh.position);g.updateEnemy(attacker,.7);assert.ok(guard.hp<guard.type.hp);for(const ally of [...g.golems])g.damageGolem(ally,10000);const before=attacker.mesh.position.z;g.updateEnemy(attacker,.1);assert.ok(attacker.mesh.position.z>before);g.summonGolem(rules.GOLEMS[0]);g.reset();assert.equal(g.golems.length,0);assert.equal(g.streak,0);
// All weapons ignore friendly golems, including RPG splash.
for(let w=0;w<3;w++){g.reset();g.summonGolem(rules.GOLEMS[0]);const ally=g.golems[0];ally.mesh.position.set(0,0,0);g.state.weapon=w;g.state.ammo=5;g.shoot();assert.equal(ally.hp,80);assert.equal(g.state.health,5);}
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
 g.reset();g.state.health=run%2?4:5;if(run%3===0)for(let i=0;i<3;i++)g.summonGolem(rules.GOLEMS[i]);
 g.openQuiz();const offers=[...g.offers],cards=get('question-cards').children;
 assert.equal(cards.length,3);assert.equal(new Set(offers).size,3);
 assert.deepEqual(cards.map(b=>Number(b.dataset.reward)),offers);assert.ok(cards.every(b=>!b.disabled));
 assert.ok(!offers.includes(3)||g.state.health<5);assert.ok(!offers.some(i=>i>=4)||g.golems.length<3);
 const omitted=Array.from({length:10},(_,i)=>i).find(i=>!offers.includes(i));g.selectQuestion(omitted);assert.equal(vm.runInContext('selected',ctx),-1);
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
const wrongNow=get('answer-options').children.find(b=>Number(b.textContent)!==g.questions[4].answer);wrongNow.onclick();q=g.questions[4];advance(1799);assert.equal(g.questions[4],q);advance(1);assert.notEqual(g.questions[4],q);assert.equal(g.streak,0);
// Cancel pending next on switch, close/reopen, restart and completion on restart.
g.answer(g.questions[4].answer);selectReward(0);q=g.questions[0];advance(2000);assert.equal(g.questions[0],q);assert.equal(g.streak,0);
selectReward(4);g.answer(g.questions[4].answer);get('close-quiz').onclick();g.openQuiz();selectReward(4);q=g.questions[4];advance(2000);assert.equal(g.questions[4],q);assert.equal(g.streak,0);
g.answer(g.questions[4].answer);g.reset();advance(2000);assert.equal(g.state.mode,'playing');assert.equal(g.state.solved,0);
g.openQuiz();selectReward(0);g.answer(g.questions[0].answer);assert.equal(g.state.mode,'reward');g.reset();advance(2000);assert.equal(g.state.mode,'playing');assert.equal(g.state.solved,0);
assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('id="next-question"'));
console.log('PASS auto answers: 900/1800ms feedback, automatic next, number keys, double clicks, stale buttons, held keys, hidden tab, switch/close/reset timer cancellation, no next button');
