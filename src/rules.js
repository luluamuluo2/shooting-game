export const WEAPONS = Object.freeze([
 {name:'手枪',range:10,ammo:9,damage:10,interval:.24,burst:3,burstInterval:.045,radius:0,color:0xf6ca62,icon:'⌖'},
 {name:'步枪',range:20,ammo:18,damage:8,interval:.12,burst:3,burstInterval:.03,radius:0,color:0x78d9cf,icon:'≋'},
 {name:'RPG',range:50,ammo:3,damage:24,interval:1.1,radius:3.5,color:0xfb9173,icon:'✹'},
]);
export function question(max, random=Math.random){
 const n=()=>Math.floor(random()*(max+1)); let a=n(),b=n();
 if(random()<.5){b=Math.floor(random()*(max-a+1));return {a,b,op:'+',answer:a+b,max};}
 if(a<b)[a,b]=[b,a];return {a,b,op:'−',answer:a-b,max};
}
export function checkAnswer(input, expected){return /^\d{1,2}$/.test(input.trim())&&Number(input)===expected;}
export function newQuestions(random=Math.random){return WEAPONS.map(w=>question(w.range,random));}
export function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

// Original child-friendly adaptations, not Minecraft's combat values.
export const ENEMIES=Object.freeze([
 {id:'normal',name:'普通僵尸',hp:40,speed:.8,unlock:0,color:0x8ebd75},
 {id:'baby',name:'小僵尸',hp:20,speed:1.3,unlock:20,color:0xa5ce80,scale:.65},
 {id:'husk',name:'尸壳',hp:50,speed:.65,unlock:35,color:0xc3af77},
 {id:'villager',name:'僵尸村民',hp:40,speed:.7,unlock:50,color:0x9eaf7b},
 {id:'drowned',name:'溺尸',hp:40,speed:.7,unlock:65,color:0x68b8bb,ranged:true},
 {id:'armored',name:'装甲僵尸',hp:80,speed:.55,unlock:80,color:0x8098a8},
 {id:'piglin',name:'僵尸猪灵',hp:50,speed:1,unlock:95,color:0xcb9895,neutral:true},
 {id:'horse',name:'僵尸马',hp:60,speed:1.4,unlock:110,color:0x80a47b,animal:true},
 {id:'chicken',name:'鸡骑士',hp:40,speed:1.35,unlock:125,color:0xe7dfbb,mount:'baby',mountHP:20,animal:true},
 {id:'camel',name:'尸壳骆驼',hp:80,speed:.85,unlock:140,color:0xc6a26a,animal:true,charge:true},
 {id:'nautilus',name:'僵尸鹦鹉螺',hp:60,speed:.55,unlock:155,color:0xa492c1,ranged:true},
 {id:'mounted',name:'骑马僵尸',hp:100,speed:1.4,unlock:170,color:0x6f9578,mount:'normal',mountHP:60,animal:true},
 {id:'slime',name:'粘液块僵尸',hp:60,speed:.65,unlock:75,color:0x7ccf58,slime:true,split:true,slots:2},
 {id:'magma-slime',name:'岩浆粘液块僵尸',hp:90,speed:.65,unlock:75,color:0xe65328,slime:true,split:true,slots:2},
 {id:'zoglin',name:'僵尸疣猪兽',hp:120,speed:.65,unlock:190,color:0xc58f83,animal:true,charge:true,boss:true},
]);
export function splashDamage(distance,weapon=WEAPONS[2]){return distance>=weapon.radius?0:Math.round(weapon.damage*(1-.5*Math.max(0,distance)/weapon.radius));}
export function eligibleEnemies(elapsed,active=[]){return ENEMIES.filter(t=>t.unlock<=elapsed&&(!t.ranged||!active.some(e=>e.type.ranged))&&(!t.charge||!active.some(e=>e.type.charge))&&(!t.neutral||!active.some(e=>e.type.neutral)));}

// Original game balancing, not vanilla Minecraft attributes. Distances are world units.
export const GOLEM_CAP=200;
export const TAUNT_RADIUS=6;
export const ENEMY_MELEE_REACH=1.6;
export const GOLEMS=Object.freeze([
 {id:'wood',name:'木傀儡',hp:40,damage:8,interval:2.4,speed:1.5,reach:1.7,math:10,color:0xa87949,skill:'轻巧近战'},
 {id:'copper',name:'铜傀儡',hp:120,damage:10,interval:3,speed:1.2,reach:1.8,math:20,color:0xc78050,skill:'均衡近战'},
 {id:'gold',name:'金傀儡',hp:70,damage:7,interval:2,speed:2.1,reach:1.7,math:20,color:0xe7c34e,skill:'快速连击，生命较低'},
 {id:'iron',name:'铁傀儡',hp:180,damage:20,interval:6,speed:.85,reach:2,math:20,color:0xc8d7d1,skill:'高生命前排'},
 {id:'lava',name:'岩浆傀儡',hp:150,damage:12,interval:3.5,speed:.9,reach:2,math:50,color:0xda7842,radius:2.5,skill:'目标周围2.5格范围攻击'},
 {id:'redstone',name:'红石傀儡',hp:110,damage:24,interval:7,speed:1,reach:2,math:50,color:0x956f76,skill:'近战重击'},
 {id:'slime',name:'粘液块傀儡',hp:60,damage:12,interval:3.5,speed:1.2,reach:1.8,math:20,color:0x69c896,slime:true,split:true,skill:'退场分裂2只小粘液傀儡'},
 {id:'dirt',name:'泥土傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0x927052,appearance:'dirt',basic:true,skill:'基础近战 · 仅外观不同'},
 {id:'glass',name:'玻璃傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0x9adce9,appearance:'glass',basic:true,skill:'基础近战 · 仅外观不同'},
 {id:'honey',name:'蜂蜜傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0xe4aa35,appearance:'honey',basic:true,skill:'基础近战 · 仅外观不同'},
 {id:'grass',name:'草方块傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0x94734d,appearance:'grass',basic:true,skill:'基础近战 · 仅外观不同'},
 {id:'watermelon',name:'西瓜傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0x69a447,appearance:'watermelon',basic:true,skill:'基础近战 · 仅外观不同'},
 {id:'pumpkin',name:'南瓜傀儡',hp:23,damage:5,interval:1.5,speed:1.2,reach:1.7,math:10,color:0xe99439,appearance:'pumpkin',basic:true,skill:'基础近战 · 仅外观不同'},
]);

// Nearby, distinct distractors; Fisher-Yates gives every answer position equal odds.
export function answerChoices(q, random=Math.random){
 const candidates=[];
 for(let n=Math.max(0,q.answer-5);n<=Math.min(q.max,q.answer+5);n++)if(n!==q.answer)candidates.push(n);
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 return shuffle([q.answer,...shuffle(candidates).slice(0,3)]);
}

// Guarantee one plant and one golem whenever their independent capacities permit.
// One mutually exclusive roll: super20%, ultimate10%, tornado1.5%, blizzard1.5%, ordinary67%.
// An unavailable drawn tier becomes ordinary; never reroll/redistribute its chance.
// A golem special satisfies its guarantee; spells keep the ordinary golem guarantee.
// Fill remaining cards by category, without duplicate concrete rewards, then shuffle.
export function supplyOffers(health, golemCount, random=Math.random, plantCount=PLANT_SLOTS.length,upgradePool=[]){
 const golemPool=golemCount+1<=GOLEM_CAP?GOLEMS.map((_,i)=>i+4):[];
 const plantPool=plantCount<PLANT_SLOTS.length?PLANTS.map((_,i)=>i+PLANT_REWARD_START):[];
 const groups=[[0,1,2],...(health<5?[[3]]:[]),...(golemPool.length?[golemPool]:[]),...(plantPool.length?[plantPool]:[]),...(upgradePool.length?[[...upgradePool]]:[])];
 const result=[],draw=pool=>result.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
 if(plantPool.length)draw(plantPool);
 const roll=random(),tier=roll<.2?'super':roll<.3?'ultimate':null,spell=roll>=.3&&roll<.315?SPELL_REWARDS[0]:roll>=.315&&roll<.33?SPELL_REWARDS[1]:null;
 const specials=SPECIAL_GOLEM_REWARDS.filter(r=>r.tier===tier&&golemCount+r.count*(GOLEMS.find(g=>g.id===r.typeId).slots??1)<=GOLEM_CAP);
 if(specials.length){
  result.push(specials[Math.floor(random()*specials.length)].id);
 }else{if(golemPool.length)draw(golemPool);if(spell)result.push(spell.id);}
 while(result.length<3){const available=groups.filter(g=>g.length);draw(available[Math.floor(random()*available.length)]);}
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}

// Active battle time only: 5.5s initially, 1s faster per minute, floor at 1.5s.
export const ENEMY_CAP=400;
export function spawnInterval(elapsed){return Math.max(1.5,5.5-Math.max(0,elapsed)/60);}

// Small forms are split-only, never offered as separate summons/spawns.
export const SMALL_SLIME_ENEMY=Object.freeze({id:'small-slime',name:'小粘液僵尸',hp:20,speed:1,unlock:0,color:0x99db68,slime:true,scale:.55,slots:1});
export const SMALL_MAGMA_SLIME_ENEMY=Object.freeze({...SMALL_SLIME_ENEMY,id:'small-magma-slime',name:'小岩浆粘液僵尸',hp:30,color:0xff873b});
export const SMALL_SLIME_GOLEM=Object.freeze({id:'small-slime',name:'小粘液傀儡',hp:18,damage:6,interval:1.8,speed:1.5,reach:1.6,math:20,color:0x8be0af,slime:true,scale:.6,slots:.5,skill:'小型近战，不再分裂'});
export function usedSlots(actors){return actors.reduce((sum,a)=>sum+(a.type.slots??1),0);}

export const PLANTS=Object.freeze([
 {id:'pea',name:'豌豆射手',damage:4,interval:1.5,math:10,color:0x83c65d},
 {id:'cactus',name:'仙人掌',damage:7,interval:2.5,math:10,color:0x4fa779},
 {id:'corn',name:'玉米投手',damage:5,interval:2,math:10,color:0xf0cf59,lob:true,radius:1},
 {id:'cabbage',name:'卷心菜投手',damage:6,interval:2.5,math:20,color:0x9cc878,lob:true,radius:2},
 {id:'melon',name:'西瓜投手',damage:6,interval:3.5,math:20,color:0x54ad68,lob:true,radius:2},
 {id:'ice-melon',name:'冰瓜投手',damage:4,interval:4,math:50,color:0x88d9ed,lob:true,radius:5,slow:.2},
 {id:'cannon',name:'玉米加农炮',damage:16,interval:7,math:50,color:0xe3c35a,lob:true,radius:5},
 {id:'cherry',name:'樱桃投手',damage:6,interval:3.5,math:20,color:0xd95f64,radius:2,lob:true},
]);
export const PLANT_RANGE=21;
export const PLANT_REWARD_START=4+GOLEMS.length;
export const PLANT_SLOTS=Object.freeze([-6.5,-5.2,-3.9,-2.6,-1.2,1.2,2.6,3.9,5.2,6.5].map((x,i)=>({x,z:1.7,label:['左1外','左2','左3','左4','左5内','右1内','右2','右3','右4','右5外'][i]})));


// Horizontal distance at launch, inclusive upper boundaries. All eight plants use this.
export function plantAccuracy(distance){return distance<=5?1:distance<=10?.85:distance<=15?.65:distance<=PLANT_RANGE?.45:0;}

export const TITAN_FIRST=90,TITAN_INTERVAL=90;
export const TITANS=Object.freeze([
 {id:'star-reaper',name:'星辉死神',hp:1200,speed:.35,color:0x68baff,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'warden',name:'监守者',hp:600,speed:.28,color:0x21555b,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'ender-dragon',name:'末影龙',hp:900,speed:.22,color:0x53436e,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'adamant-destroyer',name:'终极艾德曼毁灭者',hp:1100,speed:.25,color:0xc6c9ca,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'bedrock-golem',name:'终极基岩傀儡泰坦',hp:1000,speed:.2,color:0x434047,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'god-skeleton',name:'神·骷髅泰坦',hp:800,speed:.3,color:0xc7c7bd,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'executor-dragon',name:'执行之龙',hp:1300,speed:.22,color:0x433a50,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'witherzilla',name:'凋灵斯拉',hp:1400,speed:.24,color:0x292a2f,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
 {id:'lifestealer',name:'终极生命窃魂者',hp:950,speed:.28,color:0x9bec7a,titan:true,boss:true,slots:20,modelScale:4,bodyRadius:6,hitRadius:4.8},
].sort((a,b)=>a.hp-b.hp)); // Stable sort preserves authored order when HP ties.


// Per-instance plant progression. Base definitions remain immutable.
export const PLANT_UPGRADE_START=PLANT_REWARD_START+PLANTS.length;
export const PLANT_UPGRADES=PLANTS.flatMap((p,i)=>[{plantId:p.id,kind:p.radius?'area':'multi',name:p.radius?'扩大范围':'多重射击',math:p.math},{plantId:p.id,kind:'slow',name:'强化减速',math:p.math}].map((u,j)=>({...u,id:PLANT_UPGRADE_START+i*2+j}))).concat(PLANTS.filter(p=>p.radius).map((p,i)=>({plantId:p.id,kind:'multi',name:'多重射击',math:p.math,id:PLANT_UPGRADE_START+PLANTS.length*2+i})));
export function normalizePlant(p){const current=PLANTS.find(t=>t.id===p.type.id);if(current)p.type=current;return p;}
export function plantStats(p){normalizePlant(p);const u=p.upgrades||{},base=p.type.slow||.1,level=u.slow||0;const strength=Math.min(3,Math.max(0,level));return {...p.type,projectiles:Math.min(100,1+(u.multi||0)),radius:p.type.radius?p.type.radius*Math.min(9,1+3*Math.max(0,u.area||0)):undefined,slow:Math.min(.8,(p.type.slow||0)+base*strength),slowStrength:strength};}
export function canUpgradePlant(p,kind){normalizePlant(p);const u=p.upgrades||{};return kind==='multi'?(u.multi||0)<99:kind==='area'?!!p.type.radius&&(u.area||0)<3:kind==='slow'?(u.slow||0)<3:false;}
export const SPECIAL_GOLEM_START=PLANT_UPGRADE_START+PLANT_UPGRADES.length;
export const SPECIAL_GOLEM_REWARDS=Object.freeze(GOLEMS.flatMap((g,i)=>[
 {id:SPECIAL_GOLEM_START+i*2,typeId:g.id,count:2,need:4,tier:'super',math:g.math},
 {id:SPECIAL_GOLEM_START+i*2+1,typeId:g.id,count:3,need:5,tier:'ultimate',math:g.math},
]));
export const SPELL_REWARD_START=SPECIAL_GOLEM_START+SPECIAL_GOLEM_REWARDS.length;
export const SPELL_REWARDS=Object.freeze([
 {id:SPELL_REWARD_START,typeId:'tornado',name:'龙卷风',math:20,need:3},
 {id:SPELL_REWARD_START+1,typeId:'blizzard',name:'暴风雪',math:20,need:3},
]);
// Percentage reduction does not trigger deaths/splits; the caller owns lifecycle.
// Subtract floor(current*30/100), retaining ceil(current*70/100) at micro-HP precision.
export function applyTornadoDamage(enemy){
 if(typeof enemy.hpUnits==='bigint'){const damage=enemy.hpUnits*3n/10n;enemy.hpUnits-=damage;return damage;}
 const before=enemy.hp;enemy.hp*=.7;return before-enemy.hp;
}
export function availablePlantUpgrades(plants){return PLANT_UPGRADES.filter(u=>plants.some(p=>p.type.id===u.plantId&&canUpgradePlant(p,u.kind))).map(u=>u.id);}

// Successful appearances, not kills, advance the nine-boss cycle.
export function bossRoundForCount(count){const n=BigInt(count);return n>0n?(n-1n)/BigInt(TITANS.length)+1n:1n;}
// Successful Boss kills only. Underflow becomes zero, handled by the capacity-bound scheduler.
export function bossKillSpawnInterval(elapsed,kills=0n){
 const count=BigInt(kills);if(count<=0n)return spawnInterval(elapsed);
 if(count>1840n)return 0;
 return spawnInterval(elapsed)*Math.pow(1.5,-Number(count));
}
const HP_UNITS=1000000n;
function toHPUnits(value){const v=Math.max(0,Number.isFinite(value)?value:0),whole=Math.trunc(v);return BigInt(whole)*HP_UNITS+BigInt(Math.round((v-whole)*Number(HP_UNITS)));}
export function installBossHealth(enemy,round=1n){enemy.round=BigInt(round)<1n?1n:BigInt(round);enemy.maxHPUnits=BigInt(enemy.type.hp)*HP_UNITS*(1n<<(enemy.round-1n));enemy.hpUnits=enemy.maxHPUnits;
 const finite=units=>Math.min(Number.MAX_VALUE,Number(units/HP_UNITS)+Number(units%HP_UNITS)/Number(HP_UNITS));
 Object.defineProperty(enemy,'hp',{enumerable:true,configurable:true,get(){return finite(this.hpUnits);},set(v){this.hpUnits=toHPUnits(v);}});
 Object.defineProperty(enemy,'maxHP',{enumerable:true,configurable:true,get(){return finite(this.maxHPUnits);}});return enemy;}
export function enemyHealthRatio(e){return e.hpUnits!==undefined?Number(e.hpUnits*1000000n/e.maxHPUnits)/1000000:Math.max(0,e.hp/e.maxHP);}
export function enemyHealthText(e,max=false){if(e.hpUnits===undefined)return String(Math.max(0,Math.ceil(max?e.maxHP:e.hp)));const n=((max?e.maxHPUnits:e.hpUnits)+HP_UNITS-1n)/HP_UNITS,s=n.toString();return s.length>12?s[0]+'.'+s.slice(1,6)+'e'+(s.length-1):s;}
export function applyEnemyDamage(e,damage){if(e.hpUnits!==undefined){const units=toHPUnits(damage);e.hpUnits=e.hpUnits>units?e.hpUnits-units:0n;}else e.hp-=damage;}

// Exact integer attack scaling follows the instance's spawn round, never global time.
// Convert only after comparing against a finite target HP, so huge rounds cannot overflow.
export function bossAttackDamage(enemy){const round=BigInt(enemy.round??1n);return 16n<<(round>1n?round-1n:0n);}
export function bossAttackText(enemy){const s=bossAttackDamage(enemy).toString();return s.length>12?s[0]+'.'+s.slice(1,6)+'e'+(s.length-1):s;}

// Render-space safety only: logic HP/damage/rounds remain exact and unbounded.
export const TITAN_RENDER_SCALE_LIMIT=1_000_000;
export function titanRoundScale(round=1n){
 const exponent=BigInt(round)>1n?BigInt(round)-1n:0n;
 return exponent>31n?TITAN_RENDER_SCALE_LIMIT:Math.min(TITAN_RENDER_SCALE_LIMIT,4*1.5**Number(exponent));
}
