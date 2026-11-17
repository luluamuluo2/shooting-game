import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANT_SLOTS,SPELL_REWARDS,spellSpec,spellRewardForRoll,applyTornadoDamage,supplyOffers} from '../src/rules.js';
import {encodeSave,decodeSave} from '../src/savegame.js';
test('14 slots retain old indexes, span both sides with clear spacing',()=>{
 assert.equal(PLANT_SLOTS.length,14);assert.deepEqual(PLANT_SLOTS.slice(0,10).map(p=>p.x),[-6.5,-5.2,-3.9,-2.6,-1.2,1.2,2.6,3.9,5.2,6.5]);assert.equal(PLANT_SLOTS.filter(p=>p.x<0).length,7);const xs=PLANT_SLOTS.map(p=>p.x).sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)assert.ok(xs[i]-xs[i-1]>=1.29);
});
test('twelve spell tiers keep old IDs and exact mechanics',()=>{
 assert.equal(SPELL_REWARDS.length,12);assert.equal(new Set(SPELL_REWARDS.map(r=>r.id)).size,12);for(const r of SPELL_REWARDS){const s=spellSpec(r.spellKey,r.tier);assert.equal(r.need,3);assert.equal(r.math,20);assert.equal(s.percent,[30,60,90][r.tier]);if(r.spellKey==='blizzard')assert.equal(s.duration,[3,5,8][r.tier]);if(r.spellKey==='blackhole')assert.equal(s.duration,[1.5,3,5][r.tier]);}
 for(const p of [30,60,90])for(const units of [1n,3n,1000001n,10n**1000n]){const e={hpUnits:units};applyTornadoDamage(e,p);assert.equal(e.hpUnits,units-units*BigInt(p)/100n);}
 assert.equal(spellSpec('tornado',null).percent,50);assert.equal(spellSpec('meteor',null).percent,80);
});
test('spell tier probability is total 3 percent, four equal types and 60/30/10 conditional tiers',()=>{
 const counts=Array(12).fill(0),n=400000;for(let i=0;i<n;i++){const r=spellRewardForRoll((i+.5)/n);if(r)counts[r.id-73]++;}assert.equal(counts.reduce((a,b)=>a+b),12000);assert.deepEqual(counts,[1800,1800,1800,1800,900,900,900,900,300,300,300,300]);
 for(const count of [13,14])for(const roll of [.3,.3045,.30675,.3075,.329999]){const cards=supplyOffers(5,0,()=>roll,count);assert.equal(cards.length,3);assert.equal(cards.filter(id=>id>=73).length,1);assert.equal(cards.some(id=>id>=17&&id<25),count===13);assert.ok(cards.some(id=>id>=4&&id<17));}
});
