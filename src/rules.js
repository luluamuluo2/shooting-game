export const WEAPONS = Object.freeze([
 {name:'手枪',range:10,ammo:12,damage:1,interval:.30,radius:0,color:0xf6ca62,icon:'⌖'},
 {name:'步枪',range:20,ammo:24,damage:1,interval:.12,radius:0,color:0x78d9cf,icon:'≋'},
 {name:'RPG',range:50,ammo:3,damage:3,interval:.8,radius:4,color:0xfb9173,icon:'✹'},
]);
export function question(max, random=Math.random){
 const n=()=>Math.floor(random()*(max+1)); let a=n(),b=n();
 if(random()<.5){b=Math.floor(random()*(max-a+1));return {a,b,op:'+',answer:a+b,max};}
 if(a<b)[a,b]=[b,a];return {a,b,op:'−',answer:a-b,max};
}
export function checkAnswer(input, expected){return /^\d{1,2}$/.test(input.trim())&&Number(input)===expected;}
export function newQuestions(random=Math.random){return WEAPONS.map(w=>question(w.range,random));}
export function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
