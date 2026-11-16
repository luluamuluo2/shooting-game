import test from 'node:test';import assert from 'node:assert/strict';import {question,checkAnswer,newQuestions,WEAPONS} from '../src/rules.js';
test('all arithmetic stays in the advertised range',()=>{for(const max of [10,20,50])for(let i=0;i<11000;i++){const q=question(max);for(const n of [q.a,q.b,q.answer])assert.ok(Number.isInteger(n)&&n>=0&&n<=max);assert.equal(q.answer,q.op==='+'?q.a+q.b:q.a-q.b);}});
test('boundary random inputs are valid',()=>{for(const r of [0,.499999,.5,.999999])for(const max of [10,20,50]){const q=question(max,()=>r);assert.ok(q.answer>=0&&q.answer<=max);}});
test('one question per weapon and clear ammo amounts',()=>{assert.deepEqual(newQuestions().map(q=>q.max),[10,20,50]);assert.deepEqual(WEAPONS.map(w=>w.ammo),[9,18,3]);});
test('answer validation does not accept blank, expressions, negative or decimal inputs',()=>{assert.ok(checkAnswer(' 12 ',12));for(const s of ['', ' ', '12x','6+6','12.0','-0'])assert.equal(checkAnswer(s,12),false);assert.ok(checkAnswer('0',0));});
import {ENEMIES,splashDamage,eligibleEnemies} from '../src/rules.js';
test('15 distinct enemies and progressive introduction',()=>{assert.equal(ENEMIES.length,15);assert.equal(new Set(ENEMIES.map(e=>e.id)).size,15);assert.deepEqual(eligibleEnemies(0).map(e=>e.id),['normal']);assert.equal(eligibleEnemies(200).length,15);assert.ok(!eligibleEnemies(200,[{type:{ranged:true,charge:true,neutral:true}}]).some(e=>e.ranged||e.charge||e.neutral));});
test('RPG falloff and no ordinary one-shot',()=>{assert.equal(splashDamage(0),24);assert.equal(splashDamage(1.75),18);assert.equal(splashDamage(3.5),0);assert.ok(ENEMIES.find(e=>e.id==='normal').hp>WEAPONS[2].damage);assert.ok(ENEMIES.every(e=>e.hp>0));});

import {answerChoices} from '../src/rules.js';
test('four unique bounded options for every possible answer, including boundaries',()=>{
 for(const max of [10,20,50])for(let answer=0;answer<=max;answer++)for(const random of [()=>0,()=>.999999,Math.random]){
  const choices=answerChoices({answer,max},random);
  assert.equal(choices.length,4);assert.equal(new Set(choices).size,4);
  assert.equal(choices.filter(n=>n===answer).length,1);
  assert.ok(choices.every(n=>Number.isInteger(n)&&n>=0&&n<=max&&Math.abs(n-answer)<=5));
 }
});
test('seeded 30000 choices distribute correct positions without fixed-slot bias',()=>{
 let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),counts=[0,0,0,0];
 for(let i=0;i<30000;i++){const q=question([10,20,50][i%3],random);counts[answerChoices(q,random).indexOf(q.answer)]++;}
 assert.ok(counts.every(n=>n>7000&&n<8000),counts.join(','));
});

import {supplyOffers,GOLEM_CAP} from '../src/rules.js';
test('random supplies always have three different eligible concrete rewards',()=>{
 let seed=2468;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const seen=new Set();let sameCategory=false;
 for(const health of [1,4,5])for(const guards of [0,2,GOLEM_CAP])for(let n=0;n<3000;n++){
  const cards=supplyOffers(health,guards,rng);assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);
  assert.ok(cards.every(i=>Number.isInteger(i)&&i>=0&&i<17));
  assert.ok(health<5||!cards.includes(3));assert.ok(guards<GOLEM_CAP||cards.every(i=>i<4));
  cards.forEach(i=>seen.add(i));const categories=cards.map(i=>i<3?'weapon':i===3?'villager':'golem');
  if(new Set(categories).size<3)sameCategory=true;
 }
 assert.equal(seen.size,17);assert.ok(sameCategory);
 assert.deepEqual(supplyOffers(5,GOLEM_CAP,()=>0).sort(),[0,1,2]);
 assert.deepEqual(supplyOffers(4,0,()=>.999999),[16,15,14]);
});
test('guaranteed plant and golem cards respect every independent capacity combination',()=>{
 let seed=321;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),positions=[new Set(),new Set()];
 for(const health of [1,5])for(const guards of [0,49,49.5,50])for(const plants of [0,9,10])for(let n=0;n<1000;n++){
  const cards=supplyOffers(health,guards,rng,plants),hasG=cards.some(i=>i>=4&&i<17),hasP=cards.some(i=>i>=17);
  assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);assert.equal(hasG,guards<=49);assert.equal(hasP,plants<10);assert.ok(health<5||!cards.includes(3));
  if(guards<=49&&plants<10){cards.forEach((id,i)=>{if(id>=17)positions[0].add(i);if(id>=4&&id<17)positions[1].add(i);});}
 }
 assert.ok(positions.every(p=>p.size===3));
});

import {spawnInterval,ENEMY_CAP} from '../src/rules.js';
test('spawn frequency ramps by battle time with bounded cap',()=>{
 assert.deepEqual([0,60,120,180,240,3600].map(spawnInterval),[5.5,4.5,3.5,2.5,1.5,1.5]);
 assert.equal(spawnInterval(-1),5.5);assert.equal(ENEMY_CAP,100);
 for(let t=1;t<1000;t++)assert.ok(spawnInterval(t)<=spawnInterval(t-1)&&spawnInterval(t)>=1.5);
});

import {GOLEMS,TAUNT_RADIUS,ENEMY_MELEE_REACH} from '../src/rules.js';
test('all thirteen golems are melee with a common short-range taunt',()=>{
 assert.equal(TAUNT_RADIUS,6);assert.equal(ENEMY_MELEE_REACH,1.6);
 assert.ok(GOLEMS.every(g=>g.reach<=2&&g.reach>=1.6));
 const redstone=GOLEMS.find(g=>g.id==='redstone');assert.equal(redstone.damage,24);assert.equal(redstone.interval,7);assert.equal(redstone.reach,2);
 assert.equal(GOLEMS.find(g=>g.id==='lava').radius,2.5);
});

import {SMALL_SLIME_ENEMY,SMALL_SLIME_GOLEM,usedSlots} from '../src/rules.js';
test('one-generation slime split budgets and half-slot supply eligibility',()=>{
 const zombie=ENEMIES.find(t=>t.id==='slime'),ally=GOLEMS.find(t=>t.id==='slime');
 assert.ok(zombie.split&&ally.split);assert.ok(!SMALL_SLIME_ENEMY.split&&!SMALL_SLIME_GOLEM.split);
 assert.equal(zombie.slots,2);assert.equal(usedSlots([{type:SMALL_SLIME_ENEMY},{type:SMALL_SLIME_ENEMY}]),2);
 assert.equal(usedSlots([{type:SMALL_SLIME_GOLEM},{type:SMALL_SLIME_GOLEM}]),1);
 for(let n=0;n<100;n++)assert.ok(supplyOffers(5,GOLEM_CAP-.5).every(i=>i<3));
 assert.ok(supplyOffers(5,GOLEM_CAP-1,()=>.99999).some(i=>i>=4));
});

test('six low-tier cosmetic golems have identical combat values and 10-range math',()=>{
 const variants=GOLEMS.filter(g=>g.basic);assert.deepEqual(variants.map(g=>g.id),['dirt','glass','honey','grass','watermelon','pumpkin']);
 assert.equal(GOLEMS.length,13);assert.equal(new Set(GOLEMS.map(g=>g.id)).size,13);
 for(const g of variants){assert.deepEqual([g.hp,g.damage,g.interval,g.speed,g.reach,g.math],[23,5,1.5,1.2,1.7,10]);assert.ok(!g.split&&!g.radius&&!g.slots);assert.equal(g.appearance,g.id);}
 const seen=new Set();let seed=654;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let n=0;n<10000;n++)supplyOffers(5,0,rng).filter(i=>i>=4).forEach(i=>seen.add(GOLEMS[i-4].id));assert.ok(variants.every(g=>seen.has(g.id)));
});
test('only mounted zombie gets the requested 12 percent speed increase',()=>{
 assert.equal(ENEMIES.find(e=>e.id==='mounted').speed,1.4);assert.ok(Math.abs((1.4/1.25-1)-.12)<1e-9);
 const unchanged={normal:.8,baby:1.3,husk:.65,villager:.7,drowned:.7,armored:.55,piglin:1,horse:1.4,chicken:1.35,camel:.85,nautilus:.55,zoglin:.65,slime:.65};
 for(const [id,speed] of Object.entries(unchanged))assert.equal(ENEMIES.find(e=>e.id===id).speed,speed,id);
});

test('requested golem HP reductions are exact; unrelated HP and combat stats stay fixed',()=>{
 const hp={wood:40,copper:120,gold:70,iron:180,lava:150,redstone:110,slime:60,dirt:23,glass:23,honey:23,grass:23,watermelon:23,pumpkin:23};
 for(const g of GOLEMS)assert.equal(g.hp,hp[g.id],g.id);
 assert.equal(SMALL_SLIME_GOLEM.hp,18);assert.equal(SMALL_SLIME_GOLEM.damage,6);assert.equal(SMALL_SLIME_GOLEM.slots,.5);
 assert.equal(GOLEMS.find(g=>g.id==='wood').damage,8);assert.equal(GOLEMS.find(g=>g.id==='slime').damage,12);
 assert.equal(ENEMIES.find(e=>e.id==='slime').hp,60);assert.equal(SMALL_SLIME_ENEMY.hp,20);
});

test('50-slot golem cap and half-slot eligibility',()=>{
 assert.equal(GOLEM_CAP,50);
 for(const slots of [49.5,50])for(let n=0;n<1000;n++)assert.ok(supplyOffers(4,slots).every(i=>i<4));
 assert.ok(supplyOffers(5,49,()=>.9999).some(i=>i>=4));
 assert.equal(usedSlots(Array.from({length:100},()=>({type:SMALL_SLIME_GOLEM}))),50);
});


test('all golems including split children have 3–4 single-target DPS, with only intervals changed',()=>{
 const all=[...GOLEMS,SMALL_SLIME_GOLEM];const hp=[40,120,70,180,150,110,60,23,23,23,23,23,23,18],damage=[8,10,7,20,12,24,12,5,5,5,5,5,5,6],interval=[2.4,3,2,6,3.5,7,3.5,1.5,1.5,1.5,1.5,1.5,1.5,1.8];
 all.forEach((g,i)=>{assert.deepEqual([g.hp,g.damage,g.interval],[hp[i],damage[i],interval[i]]);assert.ok(g.damage/g.interval>=3&&g.damage/g.interval<=4);});assert.equal(GOLEMS.find(g=>g.id==='lava').radius,2.5);assert.equal(SMALL_SLIME_GOLEM.slots,.5);
});
test('three bounded slow titans, fixed active-time schedule and explicit collision budgets',async()=>{
 const {TITANS,TITAN_FIRST,TITAN_INTERVAL}=await import('../src/rules.js');assert.equal(TITAN_FIRST,90);assert.equal(TITAN_INTERVAL,90);assert.deepEqual(TITANS.slice(0,3).map(t=>[t.hp,t.speed]),[[1200,.35],[600,.28],[900,.22]]);assert.ok(TITANS.every(t=>t.slots===20&&t.modelScale===4&&t.bodyRadius===6&&t.hitRadius===4.8&&t.titan&&t.boss));
});


import {SMALL_MAGMA_SLIME_ENEMY} from '../src/rules.js';
test('magma slimes clone all ordinary properties except identity, color and 1.5x health',()=>{
 const big=ENEMIES.find(e=>e.id==='slime'),magma=ENEMIES.find(e=>e.id==='magma-slime');
 for(const [a,b] of [[big,magma],[SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY]]){const strip=({id,name,hp,color,...rest})=>rest;assert.deepEqual(strip(a),strip(b));assert.equal(b.hp,a.hp*1.5);assert.notEqual(a.color,b.color);}
 for(const t of [0,74.99,75,100,1000]){const eligible=eligibleEnemies(t);assert.equal(eligible.includes(big),eligible.includes(magma));assert.equal(eligible.filter(e=>e===magma).length,t>=75?1:0);}
 assert.ok(!SMALL_MAGMA_SLIME_ENEMY.split);assert.ok(!ENEMIES.includes(SMALL_MAGMA_SLIME_ENEMY));
});


test('six additional grounded titans preserve the old roster and exclude ghost thunder',async()=>{
 const {TITANS}=await import('../src/rules.js');
 assert.deepEqual(TITANS.slice(3).map(t=>t.id),['adamant-destroyer','bedrock-golem','god-skeleton','executor-dragon','witherzilla','lifestealer']);
 assert.equal(new Set(TITANS.map(t=>t.id)).size,9);
 assert.ok(TITANS.slice(3).every(t=>t.hp>=300&&t.hp<1200&&t.speed<=.3&&!t.ranged&&!t.charge));
});
