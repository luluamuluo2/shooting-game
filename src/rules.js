export const WEAPONS = Object.freeze([
 {name:'手枪',range:10,ammo:9,damage:10,interval:.35,radius:0,color:0xf6ca62,icon:'⌖'},
 {name:'步枪',range:20,ammo:18,damage:8,interval:.16,radius:0,color:0x78d9cf,icon:'≋'},
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
 {id:'zoglin',name:'僵尸疣猪兽',hp:120,speed:.65,unlock:190,color:0xc58f83,animal:true,charge:true,boss:true},
]);
export function splashDamage(distance,weapon=WEAPONS[2]){return distance>=weapon.radius?0:Math.round(weapon.damage*(1-.5*Math.max(0,distance)/weapon.radius));}
export function eligibleEnemies(elapsed,active=[]){return ENEMIES.filter(t=>t.unlock<=elapsed&&(!t.ranged||!active.some(e=>e.type.ranged))&&(!t.charge||!active.some(e=>e.type.charge))&&(!t.neutral||!active.some(e=>e.type.neutral)));}

// Original game balancing, not vanilla Minecraft attributes. Distances are world units.
export const GOLEM_CAP=20;
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

// Draw a category uniformly, then an item uniformly within that category.
// Exact rewards cannot repeat; a category may repeat until its pool is exhausted.
// Three weapon rewards are always available, so no capacity state can dead-end.
export function supplyOffers(health, golemCount, random=Math.random, plantCount=6){
 const groups=[[0,1,2],...(health<5?[[3]]:[]),...(golemCount+1<=GOLEM_CAP?[GOLEMS.map((_,i)=>i+4)]:[]),...(plantCount<6?[PLANTS.map((_,i)=>i+PLANT_REWARD_START)]:[])];
 const result=[];
 for(let n=0;n<3;n++){
  const groupIndex=Math.floor(random()*groups.length),group=groups[groupIndex];
  const itemIndex=Math.floor(random()*group.length);
  result.push(group.splice(itemIndex,1)[0]);
  if(!group.length)groups.splice(groupIndex,1);
 }
 return result;
}

// Active battle time only: 5.5s initially, 1s faster per minute, floor at 1.5s.
export const ENEMY_CAP=8;
export function spawnInterval(elapsed){return Math.max(1.5,5.5-Math.max(0,elapsed)/60);}

// Small forms are split-only, never offered as separate summons/spawns.
export const SMALL_SLIME_ENEMY=Object.freeze({id:'small-slime',name:'小粘液僵尸',hp:20,speed:1,unlock:0,color:0x99db68,slime:true,scale:.55,slots:1});
export const SMALL_SLIME_GOLEM=Object.freeze({id:'small-slime',name:'小粘液傀儡',hp:18,damage:6,interval:1.8,speed:1.5,reach:1.6,math:20,color:0x8be0af,slime:true,scale:.6,slots:.5,skill:'小型近战，不再分裂'});
export function usedSlots(actors){return actors.reduce((sum,a)=>sum+(a.type.slots??1),0);}

export const PLANTS=Object.freeze([
 {id:'pea',name:'豌豆射手',damage:4,interval:1.5,math:10,color:0x83c65d},
 {id:'cactus',name:'仙人掌',damage:7,interval:2.5,math:10,color:0x4fa779},
 {id:'corn',name:'玉米投手',damage:5,interval:2,math:10,color:0xf0cf59,lob:true},
 {id:'cabbage',name:'卷心菜投手',damage:6,interval:2.5,math:20,color:0x9cc878,lob:true},
 {id:'melon',name:'西瓜投手',damage:6,interval:3.5,math:20,color:0x54ad68,lob:true,radius:1.5},
 {id:'ice-melon',name:'冰瓜投手',damage:4,interval:4,math:50,color:0x88d9ed,lob:true,radius:1.5,slow:.2},
 {id:'cannon',name:'玉米加农炮',damage:16,interval:7,math:50,color:0xe3c35a,lob:true},
 {id:'cherry',name:'樱桃投手',damage:6,interval:3.5,math:20,color:0xd95f64,radius:1.5,lob:true},
]);
export const PLANT_RANGE=21;
export const PLANT_REWARD_START=4+GOLEMS.length;
export const PLANT_SLOTS=Object.freeze([-4.5,-3.3,-.7,.7,3.3,4.5].map((x,i)=>({x,z:1.7,label:['左外','左中','左内','右内','右中','右外'][i]})));


// Horizontal distance at launch, inclusive upper boundaries. All eight plants use this.
export function plantAccuracy(distance){return distance<=5?1:distance<=10?.85:distance<=15?.65:distance<=PLANT_RANGE?.45:0;}

export const TITAN_FIRST=180,TITAN_INTERVAL=180;
export const TITANS=Object.freeze([
 {id:'star-reaper',name:'星辉死神',hp:1200,speed:.35,color:0x68baff,titan:true,boss:true,slots:2,bodyRadius:1.5,hitRadius:1.2},
 {id:'warden',name:'监守者',hp:600,speed:.28,color:0x21555b,titan:true,boss:true,slots:2,bodyRadius:1.5,hitRadius:1.2},
 {id:'ender-dragon',name:'末影龙',hp:900,speed:.22,color:0x53436e,titan:true,boss:true,slots:2,bodyRadius:1.5,hitRadius:1.2},
]);
