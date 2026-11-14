import test from 'node:test';import assert from 'node:assert/strict';import {question,checkAnswer,newQuestions,WEAPONS} from '../src/rules.js';
test('all arithmetic stays in the advertised range',()=>{for(const max of [10,20,50])for(let i=0;i<10000;i++){const q=question(max);for(const n of [q.a,q.b,q.answer])assert.ok(Number.isInteger(n)&&n>=0&&n<=max);assert.equal(q.answer,q.op==='+'?q.a+q.b:q.a-q.b);}});
test('boundary random inputs are valid',()=>{for(const r of [0,.499999,.5,.999999])for(const max of [10,20,50]){const q=question(max,()=>r);assert.ok(q.answer>=0&&q.answer<=max);}});
test('one question per weapon and clear ammo amounts',()=>{assert.deepEqual(newQuestions().map(q=>q.max),[10,20,50]);assert.deepEqual(WEAPONS.map(w=>w.ammo),[18,36,5]);});
test('answer validation does not accept blank, expressions, negative or decimal inputs',()=>{assert.ok(checkAnswer(' 12 ',12));for(const s of ['', ' ', '12x','6+6','12.0','-0'])assert.equal(checkAnswer(s,12),false);assert.ok(checkAnswer('0',0));});
import {ENEMIES,splashDamage,eligibleEnemies} from '../src/rules.js';
test('13 distinct enemies and progressive introduction',()=>{assert.equal(ENEMIES.length,13);assert.equal(new Set(ENEMIES.map(e=>e.id)).size,13);assert.deepEqual(eligibleEnemies(0).map(e=>e.id),['normal']);assert.equal(eligibleEnemies(200).length,13);assert.ok(!eligibleEnemies(200,[{type:{ranged:true,charge:true,neutral:true}}]).some(e=>e.ranged||e.charge||e.neutral));});
test('RPG falloff and no ordinary one-shot',()=>{assert.equal(splashDamage(0),24);assert.equal(splashDamage(1.75),18);assert.equal(splashDamage(3.5),0);assert.ok(ENEMIES.find(e=>e.id==='normal').hp>WEAPONS[2].damage);assert.ok(ENEMIES.every(e=>e.hp<=WEAPONS[0].damage*WEAPONS[0].ammo));});

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
