import test from 'node:test';
import assert from 'node:assert/strict';
import {spellChance,spellRewardForRoll,liveEnemyCount,supplyOffers,SPELL_REWARDS} from '../src/rules.js';
const SPELL_KEYS=[...new Set(SPELL_REWARDS.map(r=>r.spellKey))];
test('live enemy bodies exclude dead and count titans/half-slot children once',()=>{
 assert.equal(liveEnemyCount([{hp:1,type:{slots:20,titan:true}},{hpUnits:1n,hp:0},{hp:2,type:{slots:.5}},{hp:0},{hp:-1},{hpUnits:0n,hp:100}]),3);
});
test('dynamic spell boundaries, equal six types and unchanged tier proportions',()=>{
 for(const [count,chance] of [[0,.03],[29,.03],[30,.05],[79,.05],[80,.08],[149,.08],[150,.1],[400,.1]]){
  assert.equal(spellChance(count),chance);assert.equal(spellRewardForRoll(.3+chance,count),null);assert.equal(spellRewardForRoll(.3-1e-8,count),null);
  for(let i=0;i<6;i++)for(const [f,tier] of [[.3,0],[.75,1],[.95,2]]){const r=spellRewardForRoll(.3+chance*(i+f)/6,count);assert.equal(r.spellKey,SPELL_KEYS[i]);assert.equal(r.tier,tier);}
  const hits=Array.from({length:6},()=>[0,0,0]);for(let j=0;j<60000;j++){const r=spellRewardForRoll((j+.5)/60000,count);if(r)hits[SPELL_KEYS.indexOf(r.spellKey)][r.tier]++;}
  for(const bins of hits)assert.deepEqual(bins,[60000*chance/6*.6,60000*chance/6*.3,60000*chance/6*.1].map(Math.round));
 }
});
test('actual three-card sampler expands only spell band, maintaining guarantees',()=>{
 for(const count of [0,30,80,150]){let seed=428;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};let spells=0;for(let i=0;i<15000;i++){const cards=supplyOffers(5,0,rng,0,[],count);const n=cards.filter(id=>SPELL_REWARDS.some(r=>r.id===id)).length;assert.ok(n<=1);spells+=n;assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);}assert.ok(Math.abs(spells/15000-spellChance(count))<.012);}
});
