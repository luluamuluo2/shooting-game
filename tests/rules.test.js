import test from 'node:test';import assert from 'node:assert/strict';import {question,checkAnswer,newQuestions,WEAPONS} from '../src/rules.js';
test('all arithmetic stays in the advertised range',()=>{for(const max of [10,20,50])for(let i=0;i<10000;i++){const q=question(max);for(const n of [q.a,q.b,q.answer])assert.ok(Number.isInteger(n)&&n>=0&&n<=max);assert.equal(q.answer,q.op==='+'?q.a+q.b:q.a-q.b);}});
test('boundary random inputs are valid',()=>{for(const r of [0,.499999,.5,.999999])for(const max of [10,20,50]){const q=question(max,()=>r);assert.ok(q.answer>=0&&q.answer<=max);}});
test('one question per weapon and clear ammo amounts',()=>{assert.deepEqual(newQuestions().map(q=>q.max),[10,20,50]);assert.deepEqual(WEAPONS.map(w=>w.ammo),[9,18,3]);});
test('answer validation does not accept blank, expressions, negative or decimal inputs',()=>{assert.ok(checkAnswer(' 12 ',12));for(const s of ['', ' ', '12x','6+6','12.0','-0'])assert.equal(checkAnswer(s,12),false);assert.ok(checkAnswer('0',0));});
import {ENEMIES,splashDamage,eligibleEnemies} from '../src/rules.js';
test('13 distinct enemies and progressive introduction',()=>{assert.equal(ENEMIES.length,13);assert.equal(new Set(ENEMIES.map(e=>e.id)).size,13);assert.deepEqual(eligibleEnemies(0).map(e=>e.id),['normal']);assert.equal(eligibleEnemies(200).length,13);assert.ok(!eligibleEnemies(200,[{type:{ranged:true,charge:true,neutral:true}}]).some(e=>e.ranged||e.charge||e.neutral));});
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
  assert.ok(cards.every(i=>Number.isInteger(i)&&i>=0&&i<10));
  assert.ok(health<5||!cards.includes(3));assert.ok(guards<GOLEM_CAP||cards.every(i=>i<4));
  cards.forEach(i=>seen.add(i));const categories=cards.map(i=>i<3?'weapon':i===3?'villager':'golem');
  if(new Set(categories).size<3)sameCategory=true;
 }
 assert.equal(seen.size,10);assert.ok(sameCategory);
 assert.deepEqual(supplyOffers(5,3,()=>0),[0,1,2]);
 assert.deepEqual(supplyOffers(4,0,()=>.999999),[9,8,7]);
});
test('first-card category probabilities are balanced, not biased by six golem types',()=>{
 let seed=321;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),counts=[0,0,0];
 for(let n=0;n<30000;n++){const i=supplyOffers(4,0,rng)[0];counts[i<3?0:i===3?1:2]++;}
 assert.ok(counts.every(n=>n>9500&&n<10500),counts.join(','));
});

import {spawnInterval,ENEMY_CAP} from '../src/rules.js';
test('spawn frequency ramps by battle time with bounded cap',()=>{
 assert.deepEqual([0,60,120,180,240,3600].map(spawnInterval),[5.5,4.5,3.5,2.5,1.5,1.5]);
 assert.equal(spawnInterval(-1),5.5);assert.equal(ENEMY_CAP,8);
 for(let t=1;t<1000;t++)assert.ok(spawnInterval(t)<=spawnInterval(t-1)&&spawnInterval(t)>=1.5);
});
