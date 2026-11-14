export const WEAPONS = Object.freeze([
 {name:'手枪',range:10,ammo:18,damage:10,interval:.35,radius:0,color:0xf6ca62,icon:'⌖'},
 {name:'步枪',range:20,ammo:36,damage:8,interval:.16,radius:0,color:0x78d9cf,icon:'≋'},
 {name:'RPG',range:50,ammo:5,damage:24,interval:1.1,radius:3.5,color:0xfb9173,icon:'✹'},
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
 {id:'mounted',name:'骑马僵尸',hp:100,speed:1.25,unlock:170,color:0x6f9578,mount:'normal',mountHP:60,animal:true},
 {id:'zoglin',name:'僵尸疣猪兽',hp:120,speed:.65,unlock:190,color:0xc58f83,animal:true,charge:true,boss:true},
]);
export function splashDamage(distance,weapon=WEAPONS[2]){return distance>=weapon.radius?0:Math.round(weapon.damage*(1-.5*Math.max(0,distance)/weapon.radius));}
export function eligibleEnemies(elapsed,active=[]){return ENEMIES.filter(t=>t.unlock<=elapsed&&(!t.ranged||!active.some(e=>e.type.ranged))&&(!t.charge||!active.some(e=>e.type.charge))&&(!t.neutral||!active.some(e=>e.type.neutral)));}
