import {VILLAGER_CAP,isTornadoSpell,spellSpec,SPELL_REWARDS,WEAPONS,GOLEMS,SMALL_SLIME_GOLEM,ENEMIES,SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY,TITANS,PLANTS,PLANT_SLOTS,GOLEM_CAP,ENEMY_CAP} from './rules.js';
export const SAVE_KEY='block-guardians-save-v1';
export const SAVE_VERSION=1;
export const MAX_SAVE_BYTES=2*1024*1024;
export const MAX_SAVE_ROUND=100000n;
const enemyTypes=new Map([...ENEMIES,SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY,...TITANS].map(t=>[t.id,t]));
const golemTypes=new Map([...GOLEMS,SMALL_SLIME_GOLEM].map(t=>[t.id,t]));
const plantTypes=new Set(PLANTS.map(t=>t.id));
const fail=path=>{throw new Error('存档数据无效：'+path);};
const obj=(v,p,allowed)=>{
 if(!v||Object.prototype.toString.call(v)!=='[object Object]')fail(p);
 const proto=Object.getPrototypeOf(v);if(proto!==null&&proto.constructor?.name!=='Object')fail(p);
 for(const key of Object.keys(v))if(['__proto__','constructor','prototype'].includes(key)||(allowed&&!allowed.includes(key)))fail(p+'.'+key);
 return v;
};
const num=(v,p,min=0,max=1e12)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(p);return v;};
const int=(v,p,min=0,max=Number.MAX_SAFE_INTEGER)=>{num(v,p,min,max);if(!Number.isSafeInteger(v))fail(p);return v;};
const bool=(v,p)=>{if(typeof v!=='boolean')fail(p);};
const vec=(v,p)=>{if(!Array.isArray(v)||v.length!==3)fail(p);v.forEach((n,i)=>num(n,p+'.'+i,-1e8,1e8));};
const decimal=(v,p,maxDigits=32)=>{if(typeof v!=='string'||v.length>maxDigits||!/^(0|[1-9][0-9]*)$/.test(v))fail(p);return BigInt(v);};
const round=(v,p)=>{const n=decimal(v,p,6);if(n<1n||n>MAX_SAVE_ROUND)fail(p);return n;};
const arr=(v,p,max)=>{if(!Array.isArray(v)||v.length>max)fail(p);return v;};
const optionalNumber=(o,key,p,min=0,max=1e12)=>{if(o[key]!==undefined)num(o[key],p+'.'+key,min,max);};
export function validateSave(snapshot){
 const s=obj(snapshot,'snapshot',['version','state','titanIndex','nextTitan','spawnIndex','seenTypes','player','plants','golems','enemies','pendingPlant','snowUntil','savedAt','spellEffects','supplyRound']);if(s.version!==SAVE_VERSION)fail('version');
 const st=obj(s.state,'state',['weapon','ammo','health','kills','solved','wrong','elapsed','round','bossKills','spawn','shot']);int(st.weapon,'state.weapon',0,WEAPONS.length-1);int(st.ammo,'state.ammo',0,WEAPONS[st.weapon].ammo);int(st.health,'state.health',1,VILLAGER_CAP);
 for(const k of ['kills','solved'])int(st[k],'state.'+k);if(st.wrong!==undefined)int(st.wrong,'state.wrong');num(st.elapsed,'state.elapsed');round(st.round,'state.round');decimal(st.bossKills,'state.bossKills');num(st.spawn,'state.spawn',-1e6,1e6);num(st.shot,'state.shot',0,1e6);
 if(decimal(s.titanIndex,'titanIndex')>MAX_SAVE_ROUND*9n)fail('titanIndex');num(s.nextTitan,'nextTitan');int(s.spawnIndex,'spawnIndex');
 const seen=arr(s.seenTypes,'seenTypes',enemyTypes.size);if(new Set(seen).size!==seen.length||seen.some(id=>!enemyTypes.has(id)))fail('seenTypes');
 const player=obj(s.player,'player',['position','yaw','pitch']);vec(player.position,'player.position');if(player.position[0]<-5||player.position[0]>5||player.position[1]!==0||player.position[2]<6||player.position[2]>8)fail('player.position');num(player.yaw,'player.yaw',-1e12,1e12);num(player.pitch,'player.pitch',-1.25,1.25);
 const slots=new Set();for(const [i,p] of arr(s.plants,'plants',PLANT_SLOTS.length).entries()){
  obj(p,'plant',['typeId','slot','upgrades','cooldown']);if(!plantTypes.has(p.typeId))fail('plants.'+i+'.typeId');int(p.slot,'plant.slot',0,PLANT_SLOTS.length-1);if(slots.has(p.slot))fail('plants.duplicateSlot');slots.add(p.slot);
  const u=obj(p.upgrades,'plant.upgrades',['multi','area','slow']);int(u.multi,'plant.multi',0,99);int(u.area,'plant.area',0,3);int(u.slow,'plant.slow',0,3);num(p.cooldown,'plant.cooldown',-1e6,1e6);
 }
 let used=0;for(const g of arr(s.golems,'golems',GOLEM_CAP*2)){
  obj(g,'golem',['typeId','position','hp','cooldown','swing']);const t=golemTypes.get(g.typeId);if(!t)fail('golem.typeId');used+=t.slots??1;vec(g.position,'golem.position');if(Math.abs(g.position[0])>13||g.position[1]!==0||g.position[2]<-6||g.position[2]>1.8)fail('golem.position');num(g.hp,'golem.hp',Number.MIN_VALUE,t.hp);num(g.cooldown,'golem.cooldown',-1e6,1e6);num(g.swing,'golem.swing',0,10);
 }if(used>GOLEM_CAP)fail('golems.capacity');
 used=0;let bosses=0;for(const e of arr(s.enemies,'enemies',ENEMY_CAP+1)){
  obj(e,'enemy',['typeId','position','guardIndex','hp','maxHP','round','hpUnits','maxHPUnits','speed','cooldown','phase','angry','tell','charging','detached','melee','swing','slowUntil','slowAmount','frozenUntil','target','chargeDir','tornado']);const t=enemyTypes.get(e.typeId);if(!t)fail('enemy.typeId');used+=t.slots??1;if(e.guardIndex!==undefined)int(e.guardIndex,'enemy.guardIndex',-1,s.golems.length-1);vec(e.position,'enemy.position');if(Math.abs(e.position[0])>17||e.position[1]<0||e.position[1]>64||Math.abs(e.position[2])>17)fail('enemy.position');
  num(e.hp,'enemy.hp',Number.MIN_VALUE,Number.MAX_VALUE);num(e.maxHP,'enemy.maxHP',Number.MIN_VALUE,Number.MAX_VALUE);if(e.hp>e.maxHP)fail('enemy.hp>max');
  if(t.titan){bosses++;const r=round(e.round,'enemy.round'),hp=decimal(e.hpUnits,'enemy.hpUnits',31000),max=decimal(e.maxHPUnits,'enemy.maxHPUnits',31000);if(hp<=0n||hp>max||max!==BigInt(t.hp)*1000000n*(1n<<(r-1n)))fail('enemy.bigHealth');}
  else if(e.maxHP>10000||e.hpUnits!==undefined||e.maxHPUnits!==undefined||e.round!==undefined)fail('enemy.normalHealth');
  num(e.speed,'enemy.speed',0,20);num(e.cooldown,'enemy.cooldown',-1e12,1e12);num(e.phase,'enemy.phase',-1e12,1e12);bool(e.angry,'enemy.angry');bool(e.detached,'enemy.detached');
  for(const k of ['tell','charging','melee'])optionalNumber(e,k,'enemy',-1,100);for(const k of ['swing','slowUntil','frozenUntil'])optionalNumber(e,k,'enemy');optionalNumber(e,'slowAmount','enemy',0,.8);
  for(const k of ['target','chargeDir'])if(e[k]!==undefined&&e[k]!==null)vec(e[k],'enemy.'+k);
  if(e.tell>0&&!e.target)fail('enemy.target');if(e.charging>0&&!e.chargeDir)fail('enemy.chargeDir');
  if(e.tornado!==undefined&&e.tornado!==null){obj(e.tornado,'enemy.tornado',['start','end','time','tier','key']);if(e.tornado.key!==undefined&&!isTornadoSpell(e.tornado.key))fail('tornado.key');if(e.tornado.tier!==undefined)int(e.tornado.tier,'tornado.tier',0,2);vec(e.tornado.start,'tornado.start');vec(e.tornado.end,'tornado.end');num(e.tornado.time,'tornado.time',0,1.2);const [x,y,z]=e.tornado.end,limit=t.titan?11:15;if(Math.abs(x)>limit||Math.abs(z)>limit||y!==0)fail('tornado.end');const [sx,sy,sz]=e.tornado.start;if(Math.abs(sx)>17||Math.abs(sz)>17||sy<0||sy>64)fail('tornado.start');}
 }if(bosses>1||used>ENEMY_CAP+(bosses?20:0))fail('enemies.capacity');
 if(s.supplyRound!==undefined&&s.supplyRound!==null){const r=obj(s.supplyRound,'supplyRound',['offers','rerollsRemaining','locked','selected']);const offers=arr(r.offers,'supplyRound.offers',3);if(offers.length!==3||new Set(offers).size!==3)fail('supplyRound.offers');offers.forEach(id=>int(id,'supplyRound.offer',0,SPELL_REWARDS.at(-1).id));int(r.rerollsRemaining,'supplyRound.rerollsRemaining',0,3);bool(r.locked,'supplyRound.locked');int(r.selected,'supplyRound.selected',-1,SPELL_REWARDS.at(-1).id);if(r.locked?!offers.includes(r.selected):r.selected!==-1)fail('supplyRound.selected');}
 if(s.spellEffects!==undefined){const ids=new Set();for(const effect of arr(s.spellEffects,'spellEffects',1000)){
  obj(effect,'spellEffect',['id','key','tier','time','applied','targets','selected','origins']);int(effect.id,'spellEffect.id');if(ids.has(effect.id))fail('spellEffect.duplicateId');ids.add(effect.id);
  if(effect.tier!==undefined)int(effect.tier,'spellEffect.tier',0,2);const spec=spellSpec(effect.key,effect.tier??null);if(!spec)fail('spellEffect.key');num(effect.time,'spellEffect.time',0,spec.duration);bool(effect.applied,'spellEffect.applied');
  const targets=arr(effect.targets,'spellEffect.targets',ENEMY_CAP+1);if(new Set(targets).size!==targets.length)fail('spellEffect.duplicateTarget');targets.forEach(i=>int(i,'spellEffect.target',0,s.enemies.length-1));
  const selected=arr(effect.selected,'spellEffect.selected',targets.length);if(new Set(selected).size!==selected.length||selected.some(i=>!targets.includes(i))||(effect.key!=='meteor'&&selected.length))fail('spellEffect.selected');
  const origins=arr(effect.origins,'spellEffect.origins',targets.length);if(origins.length!==targets.length)fail('spellEffect.origins');origins.forEach(v=>{vec(v,'spellEffect.origin');if(Math.abs(v[0])>17||Math.abs(v[2])>17||v[1]<0||v[1]>64)fail('spellEffect.origin');});
 }}
 if(s.pendingPlant!==null&&!plantTypes.has(s.pendingPlant))fail('pendingPlant');num(s.snowUntil,'snowUntil');optionalNumber(s,'savedAt','snapshot');
 return snapshot;
}
export function encodeSave(snapshot){validateSave(snapshot);const text=JSON.stringify(snapshot);if(new TextEncoder().encode(text).length>MAX_SAVE_BYTES)fail('size');return text;}
export function decodeSave(text){if(typeof text!=='string'||text.length>MAX_SAVE_BYTES||new TextEncoder().encode(text).length>MAX_SAVE_BYTES)fail('size');let value;try{value=JSON.parse(text);}catch{fail('JSON');}validateSave(value);return value;}
export function readSave(storage){const text=storage.getItem(SAVE_KEY);return text===null?null:decodeSave(text);}
export function writeSave(storage,snapshot){const text=encodeSave(snapshot);storage.setItem(SAVE_KEY,text);return text;}
