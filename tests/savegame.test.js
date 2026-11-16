import test from 'node:test';import assert from 'node:assert/strict';
import {encodeSave,decodeSave,readSave,writeSave,SAVE_KEY,MAX_SAVE_BYTES} from '../src/savegame.js';
import {TITANS,installBossHealth} from '../src/rules.js';
const sample=()=>({version:1,state:{weapon:0,ammo:9,health:5,kills:0,solved:0,elapsed:0,round:'1',bossKills:'0',spawn:1,shot:0},titanIndex:'0',nextTitan:90,spawnIndex:0,seenTypes:[],player:{position:[0,0,7],yaw:0,pitch:0},plants:[],golems:[],enemies:[],pendingPlant:null,snowUntil:0});
const ordinary=()=>({typeId:'normal',position:[0,0,-10],hp:40,maxHP:40,speed:.8,cooldown:4,phase:0,angry:true,tell:0,charging:0,detached:false,melee:.6,swing:0,slowUntil:0,slowAmount:0,frozenUntil:0});
const golem=()=>({typeId:'wood',position:[0,0,0],hp:40,cooldown:.5,swing:0});
const boss=(r=1n)=>{const type=TITANS[0],health=installBossHealth({type},r);return {...ordinary(),typeId:type.id,hp:health.hp,maxHP:health.maxHP,round:String(r),hpUnits:String(health.hpUnits),maxHPUnits:String(health.maxHPUnits),speed:type.speed};};
test('version 1 round trip preserves state without mutation or coercion',()=>{
 const s=sample();s.state.spawn=-.5;s.plants=[{typeId:'pea',slot:0,upgrades:{multi:99,area:0,slow:3},cooldown:.4}];s.golems=[golem()];s.enemies=[ordinary()];s.enemies[0].tornado={start:[1,0,-9],end:[0,0,-15],time:.6};s.enemies[0].frozenUntil=10;s.pendingPlant='corn';s.snowUntil=10;
 const before=structuredClone(s),text=encodeSave(s);assert.deepEqual(decodeSave(text),s);assert.deepEqual(s,before);assert.notEqual(decodeSave(text),s);
});
test('high round exact health and counters survive JSON safely',()=>{
 const s=sample();s.state.round='100000';s.titanIndex='900000';s.state.bossKills='900000';s.enemies=[boss(100000n)];assert.deepEqual(decodeSave(encodeSave(s)),s);
 s.state.round='100001';assert.throws(()=>encodeSave(s));s.state.round='1';s.enemies[0].hpUnits='1'.repeat(31001);assert.throws(()=>encodeSave(s));
});
test('weighted capacities permit 400 small golems and temporary 420 enemy slots only with one Boss',()=>{
 const s=sample();s.golems=Array.from({length:400},()=>({...golem(),typeId:'small-slime',hp:18}));s.enemies=Array.from({length:400},ordinary);s.enemies.push(boss());assert.doesNotThrow(()=>encodeSave(s));
 s.golems.push({...golem(),typeId:'small-slime',hp:18});assert.throws(()=>encodeSave(s));s.golems.pop();s.enemies[0]=boss();assert.throws(()=>encodeSave(s));
 s.enemies=Array.from({length:401},ordinary);assert.throws(()=>encodeSave(s));s.enemies=Array.from({length:201},()=>({...ordinary(),typeId:'slime',hp:60,maxHP:60}));assert.throws(()=>encodeSave(s));
 s.enemies=Array.from({length:200},()=>({...ordinary(),typeId:'magma-slime',hp:90,maxHP:90}));assert.doesNotThrow(()=>encodeSave(s));
});
test('strict IDs, distinct plant slots, bounded upgrades and health reject corrupt data',()=>{
 const mutations=[s=>s.version=2,s=>s.state.ammo=10,s=>s.state.weapon=9,s=>s.state.health=6,s=>s.state.round='-1',s=>s.state.round='1e5',s=>s.titanIndex='900001',s=>s.titanIndex='99999999999999999999999999999999',s=>s.state.elapsed=Infinity,s=>s.player.position=[0,NaN,0],s=>s.player.pitch=2,s=>s.pendingPlant='unknown',s=>s.seenTypes=['unknown'],s=>s.seenTypes=['normal','normal'],s=>s.golems=[{...golem(),typeId:'unknown'}],s=>s.golems=[{...golem(),hp:41}],s=>s.enemies=[{...ordinary(),hp:41}],s=>s.enemies=[{...ordinary(),hp:0}],s=>s.enemies=[{...ordinary(),maxHP:10001}],s=>s.enemies=[{...ordinary(),angry:'yes'}],s=>s.enemies=[{...ordinary(),hpUnits:'1'}],s=>s.enemies=[{...boss(),hpUnits:'0'}],s=>s.enemies=[{...boss(),maxHPUnits:'5'}],s=>s.enemies=[{...ordinary(),tornado:{start:[0,0,0],end:[0,0,0],time:1.3}}]];
 for(const change of mutations){const s=sample();change(s);assert.throws(()=>encodeSave(s));}
 const s=sample(),p={typeId:'pea',slot:0,upgrades:{multi:0,area:0,slow:0},cooldown:0};s.plants=[p,{...p}];assert.throws(()=>encodeSave(s));s.plants=[p];p.upgrades.multi=100;assert.throws(()=>encodeSave(s));p.upgrades.multi=0;p.typeId='unknown';assert.throws(()=>encodeSave(s));
});
test('warning and charge vectors are required; detached rider may retain original maxHP',()=>{
 const s=sample();s.enemies=[{...ordinary(),tell:.3}];assert.throws(()=>encodeSave(s));s.enemies[0].target=[0,0,3];assert.doesNotThrow(()=>encodeSave(s));s.enemies[0].charging=.5;assert.throws(()=>encodeSave(s));s.enemies[0].chargeDir=[0,0,1];assert.doesNotThrow(()=>encodeSave(s));
 s.enemies=[{...ordinary(),hp:20,maxHP:100,detached:true}];assert.doesNotThrow(()=>encodeSave(s));
});
test('malformed, oversized, non-finite and unversioned saves fail without touching storage',()=>{
 for(const text of ['','null','{}','[]','{bad','{"version":1}',' '.repeat(MAX_SAVE_BYTES+1)])assert.throws(()=>decodeSave(text));
 const s=sample();s.extra='a'.repeat(MAX_SAVE_BYTES);assert.throws(()=>encodeSave(s));
 let current='prior',writes=0;const storage={getItem:()=>current,setItem(k,v){assert.equal(k,SAVE_KEY);writes++;current=v;}};
 const invalid=sample();invalid.version=99;assert.throws(()=>writeSave(storage,invalid));assert.equal(current,'prior');assert.equal(writes,0);assert.throws(()=>readSave(storage));assert.equal(current,'prior');
});
test('storage helpers use one atomic key and expose quota/access errors without clearing good save',()=>{
 const s=sample();let current=null,writes=0;const storage={getItem:k=>{assert.equal(k,SAVE_KEY);return current;},setItem(k,v){assert.equal(k,SAVE_KEY);writes++;current=v;}};
 assert.equal(readSave(storage),null);const text=writeSave(storage,s);assert.equal(text,current);assert.equal(writes,1);assert.deepEqual(readSave(storage),s);
 const old=current;storage.setItem=()=>{throw new Error('QuotaExceededError');};assert.throws(()=>writeSave(storage,s),/Quota/);assert.equal(current,old);assert.throws(()=>readSave({getItem(){throw new Error('denied');}}),/denied/);
});

test('cross-realm plain snapshots encode, while prototype and unknown state pollution is rejected',async()=>{
 const vm=await import('node:vm'),s=sample(),foreign=vm.runInNewContext('('+JSON.stringify(s)+')');
 assert.deepEqual(decodeSave(encodeSave(foreign)),s);
 for(const key of ['__proto__','constructor','prototype','mode','reward']){
  const corrupt=JSON.parse(JSON.stringify(s));Object.defineProperty(corrupt.state,key,{value:{polluted:true},enumerable:true});assert.throws(()=>encodeSave(corrupt));assert.throws(()=>decodeSave(JSON.stringify(corrupt)));
 }
 assert.equal({}.polluted,undefined);
});
test('dead states and out-of-playfield positions cannot replace a playable save',()=>{
 const changes=[s=>s.state.health=0,s=>s.player.position=[6,0,7],s=>s.player.position=[0,1,7],s=>s.player.position=[0,0,9],
 s=>s.golems=[{...golem(),position:[6.1,0,0]}],s=>s.golems=[{...golem(),position:[0,0,1.9]}],s=>s.enemies=[{...ordinary(),position:[18,0,0]}],s=>s.enemies=[{...ordinary(),position:[0,65,0]}],
 s=>s.enemies=[{...boss(),tornado:{start:[0,0,0],end:[12,0,0],time:0}}],s=>s.enemies=[{...ordinary(),tornado:{start:[0,0,0],end:[0,0,-16],time:0}}]];
 for(const change of changes){const s=sample();change(s);assert.throws(()=>encodeSave(s));}
});

test('spell stages serialize strict snapshot indices without duplicate targets or foreign selection',()=>{
 const s=sample();s.enemies=[ordinary()];s.spellEffects=[{id:1,key:'meteor',time:.6,applied:false,targets:[0],selected:[0],origins:[[0,0,-10]]}];assert.deepEqual(decodeSave(encodeSave(s)),s);
 for(const mutate of [e=>e.targets=[0,0],e=>e.selected=[1],e=>e.origins=[],e=>e.time=1.7,e=>e.key='evil',e=>e.applied='false']){const bad=structuredClone(s);mutate(bad.spellEffects[0]);assert.throws(()=>encodeSave(bad));}
 const old=sample();assert.doesNotThrow(()=>decodeSave(encodeSave(old)));
});

test('wrong count and pending reroll budget validate while legacy saves remain readable',()=>{
 const old=sample();assert.doesNotThrow(()=>decodeSave(encodeSave(old)));const s=sample();s.state.wrong=7;s.supplyRound={offers:[0,4,17],rerollsRemaining:1,locked:false,selected:-1};assert.deepEqual(decodeSave(encodeSave(s)),s);
 for(const change of [x=>x.state.wrong=-1,x=>x.state.wrong=.5,x=>x.supplyRound.rerollsRemaining=4,x=>x.supplyRound.offers=[0,0,4],x=>x.supplyRound.offers=[0,4,77],x=>x.supplyRound.selected=4,x=>x.supplyRound.locked=true]){const bad=structuredClone(s);change(bad);assert.throws(()=>encodeSave(bad));}
 s.supplyRound.locked=true;s.supplyRound.selected=4;assert.doesNotThrow(()=>encodeSave(s));
});
