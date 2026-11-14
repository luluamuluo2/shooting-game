import * as THREE from 'three';
import './style.css';
import {WEAPONS,ENEMIES,splashDamage,eligibleEnemies,newQuestions,checkAnswer,clamp} from './rules.js';
const $=id=>document.getElementById(id),canvas=$('world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch{ $('webgl-error').classList.remove('hidden'); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b5d7dc');scene.fog=new THREE.Fog('#b5d7dc',38,85);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,120);camera.position.set(0,21,25);camera.rotation.order="YXZ";scene.add(camera);
const ambient=new THREE.HemisphereLight(0xe6f8ff,0x739858,2.6);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffecd1,3.1);sun.position.set(-15,28,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:70});sun.shadow.bias=-.001;scene.add(sun);
const mats=new Map();function material(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:1}));return mats.get(color);}
const cube=new THREE.BoxGeometry(1,1,1);function box(w,h,d,color,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(cube,material(color));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
box(43,1,43,0x668b4e,0,-.55,0);box(44,2,44,0x6e6450,0,-2,0);
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let x=-20;x<=20;x+=2)for(let z=-20;z<=20;z+=2){const col=[0x91ac67,0x86a35d,0x8eaa63,0x99b16d][Math.floor(rand()*4)];box(1.97,.07,1.97,col,x,-.02,z);}
// Stone approach paths and a small protected garden.
for(let i=-9;i<=9;i++)for(let j=-1;j<=1;j++){box(1.2,.08,1.2,0xd6d1b2,i*1.35,.04,j*1.35);if(Math.abs(i)>1)box(1.2,.08,1.2,0xd6d1b2,j*1.35,.04,i*1.35);}
function tree(x,z,s=1){const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);box(.6,3,.6,0x745942,0,1.5,0,g);box(2.6,1.8,2.6,0x4d8056,0,3.4,0,g);box(2,1.2,2,0x639765,0,4.7,0,g);box(1.2,.8,1.2,0x7ca772,0,5.6,0,g);g.scale.setScalar(s);}
for(let i=0;i<26;i++){const angle=i/26*Math.PI*2,r=18+rand()*3;tree(Math.sin(angle)*r,Math.cos(angle)*r,.75+rand()*.55);}
for(let i=0;i<42;i++){const x=(rand()-.5)*34,z=(rand()-.5)*34;if(Math.abs(x)<3||Math.abs(z)<3)continue;box(.12,.35,.12,0x527f47,x,.2,z);box(.32,.22,.32,[0xf4ce69,0xe8a7a1,0xeae7c7][i%3],x,.48,z);}
for(let i=-9;i<=9;i++){if(Math.abs(i)<2)continue;box(.22,1.15,.22,0xd8c596,i*2,.6,-17);box(1.95,.16,.15,0xc3ad7e,i*2,.8,-17);box(.22,1.15,.22,0xd8c596,-17,.6,i*2);box(.15,.16,1.95,0xc3ad7e,-17,.8,i*2);}
function hut(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(3,2.9,2.7,0xc7a979,0,1.45,0,g);box(3.5,.6,3.3,0x477878,0,3,0,g);box(2.7,.6,2.8,0x3e686c,0,3.5,0,g);box(1,.9,.05,0xa4d9d3,.7,1.8,1.38,g);box(.7,1.7,.08,0x78634e,-.7,.85,1.38,g);box(.4,1.2,.4,0xc6b69b,1,3.9,-.6,g);}hut(-11,-11);hut(11,-13);
for(const [x,z] of [[-7,-7],[8,8],[-11,8],[10,-7]]){box(1.25,1.2,1.25,0xaa8660,x,.6,z);box(1.3,.15,1.3,0xc6ab79,x,1.25,z);}
// Axis-separated movement gives simple sliding along the solid huts and crates.
const blockers=[[-11,-11,1.5,1.35],[11,-13,1.5,1.35],...[[ -7,-7],[8,8],[-11,8],[10,-7]].map(([x,z])=>[x,z,.65,.65])];
function moveBody(pos,dx,dz){const free=(x,z)=>!blockers.some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+.4&&Math.abs(z-bz)<hz+.4);const x=clamp(pos.x+dx,-15,15),z=clamp(pos.z+dz,-15,15);if(free(x,pos.z))pos.x=x;if(free(pos.x,z))pos.z=z;}
function character(zombie=false){const g=new THREE.Group();const skin=zombie?0x8ebd75:0xe6be91,shirt=zombie?0x708da0:0xe7ba5b,pants=zombie?0x666786:0x3c7881;box(.8,.85,.48,shirt,0,1.15,0,g);box(.65,.65,.65,skin,0,1.9,0,g);if(!zombie)box(.69,.2,.69,0x674b3d,0,2.2,0,g);box(.1,.12,.03,0x263e39,-.16,1.94,.335,g);box(.1,.12,.03,0x263e39,.16,1.94,.335,g);box(.19,.05,.035,zombie?0x688756:0x9a6f55,0,1.75,.34,g);const legs=[box(.3,.65,.36,pants,-.23,.36,0,g),box(.3,.65,.36,pants,.23,.36,0,g)];box(.3,.6,.3,skin,-.56,1.25,zombie?.25:0,g);box(.3,.6,.3,skin,.56,1.25,zombie?.25:.18,g);g.userData.legs=legs;return g;}
// Protected village sits behind a fixed, forward-facing guard platform.
const villagers=[];
for(let i=0;i<5;i++){const v=character();v.position.set((i-2)*1.5,0,11);v.rotation.y=Math.PI;v.children[0].material=material([0xe7ba5b,0x7fb4ac,0xb497cd,0xe49b73,0x94ad68][i]);v.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});scene.add(v);villagers.push(v);}
box(12,.1,4,0xb8b391,0,.04,7);
for(let x=-8;x<=8;x+=1)box(.65,.07,.22,0xefc359,x,.08,3);
for(const x of [-8.5,8.5]){box(.2,2,.2,0x806645,x,1,3);box(.8,.6,.12,0xefc359,x,1.8,3);}
const player=character();scene.add(player);const gun=new THREE.Group();camera.add(gun);gun.position.set(.32,-.28,-.58);gun.rotation.y=Math.PI;box(.2,.2,.65,0x36514c,0,0,.15,gun);box(.16,.3,.16,0x4c6358,0,-.15,0,gun);box(.22,.22,.48,0xe6be91,0,-.19,-.23,gun);
const ring=new THREE.Mesh(new THREE.RingGeometry(.8,.94,32),new THREE.MeshBasicMaterial({color:0xffe6a3,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;scene.add(ring);
const state={mode:'welcome',weapon:0,ammo:WEAPONS[0].ammo,health:5,kills:0,solved:0,elapsed:0,spawn:0,shot:0,invincible:0};let enemies=[],effects=[],questions=[],selected=-1,fireHeld=false,soundOn=false,audio;
const movePointers=new Map(),firePointers=new Set();
const keys=new Set(),touchKeys=new Set(),raycaster=new THREE.Raycaster();
let yaw=0,pitch=0,lookPointer=null,lastLook=null;
const coarse=()=>window.matchMedia?.('(pointer: coarse)').matches??false;
function syncAim(){camera.position.copy(player.position);camera.position.y+=1.8;camera.rotation.set(pitch,yaw,0,'YXZ');player.rotation.y=yaw+Math.PI;camera.updateMatrixWorld();}
function look(dx,dy){yaw=clamp(yaw-dx*.0025,-Math.PI*5/12,Math.PI*5/12);pitch=clamp(pitch-dy*.0025,-1.25,1.25);syncAim();}
function releaseLook(){lookPointer=null;lastLook=null;document.exitPointerLock?.();}
function captureLook(){
 if(coarse())return;
 if(!canvas.requestPointerLock){toast('按住画面拖动转向，空格射击');return;}
 try{const request=canvas.requestPointerLock();request?.catch(()=>toast('鼠标未锁定：按住画面拖动转向，空格射击'));}catch{toast('按住画面拖动转向，空格射击');}
}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&state.mode==='playing')pause();});
document.addEventListener('pointerlockerror',()=>{if(state.mode==='playing')toast('鼠标未锁定：按住画面拖动转向，空格射击');});
function tone(freq,duration=.08){if(!soundOn)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.035,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function hud(){const w=WEAPONS[state.weapon];$('hearts').textContent='● '.repeat(state.health)+'○ '.repeat(5-state.health);$('villager-count').textContent=`${state.health} / 5 位村民`;$('hearts').setAttribute('aria-label',`还有 ${state.health} 位村民安全`);villagers.forEach((v,i)=>v.visible=i<state.health);$('score').textContent=String(state.kills).padStart(2,'0');$('solved').innerHTML=`${state.solved} <small>题</small>`;$('weapon-name').textContent=w.name;$('weapon-icon').textContent=w.icon;$('ammo').textContent=state.ammo;$('capacity').textContent=` / ${w.ammo}`;$('ammo-fill').style.width=`${state.ammo/w.ammo*100}%`;gun.scale.set(w.radius?1.5:1,w.radius?1.5:1,state.weapon===1?1.7:1);}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2300);}
function clearEnemies(){for(const e of enemies)scene.remove(e.mesh);enemies=[];for(const e of effects){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=[];}
function reset(){clearEnemies();seenTypes.clear();spawnIndex=0;Object.assign(state,{mode:'playing',weapon:0,ammo:WEAPONS[0].ammo,health:5,kills:0,solved:0,elapsed:0,spawn:1,shot:0,invincible:0});player.position.set(0,0,7);player.rotation.y=Math.PI;yaw=0;pitch=0;player.visible=false;syncAim();captureLook();keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;for(const id of ['welcome','paused','quiz'])$(id).classList.add('hidden');hud();toast('守住前方黄线，保护身后的 5 位村民！');}
function pause(){if(state.mode!=='playing')return;state.mode='paused';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();$('pause-title').textContent='世界暂停了';$('pause-copy').textContent='僵尸也在原地等你。准备好了再出发。';$('resume').classList.remove('hidden');$('paused').classList.remove('hidden');}
function end(){state.mode='over';releaseLook();fireHeld=false;$('pause-title').textContent='村民已全部撤离';$('pause-copy').textContent=`防线被突破了。你击退了 ${state.kills} 只僵尸，完成了 ${state.solved} 道题。再来一次，你会更熟练！`;$('resume').classList.add('hidden');$('paused').classList.remove('hidden');}
function openQuiz(){if(state.mode!=='playing')return;state.mode='quiz';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();questions=newQuestions();selected=-1;$('answer-area').classList.add('hidden');$('continue').classList.add('hidden');$('question-cards').innerHTML='';$('close-quiz').classList.toggle('hidden',state.ammo===0);questions.forEach((q,i)=>{const b=document.createElement('button');b.innerHTML=`<span class="gun">${WEAPONS[i].icon}</span><b>${WEAPONS[i].name}</b><small>${q.max} 以内 · ${WEAPONS[i].ammo} 发</small><strong>${q.a} ${q.op} ${q.b} = ?</strong>`;b.onclick=()=>selectQuestion(i);$('question-cards').appendChild(b);});$('quiz').classList.remove('hidden');}
function selectQuestion(i){if(state.mode!=='quiz')return;selected=i;[...$('question-cards').children].forEach((b,j)=>b.classList.toggle('selected',i===j));const q=questions[i];$('expression').textContent=`${q.a} ${q.op} ${q.b} =`;$('answer').value='';$('feedback').textContent='输入答案，或点击下面的数字。';$('answer-area').classList.remove('hidden');$('answer').focus({preventScroll:true});}
function answer(){if(state.mode!=='quiz'||selected<0)return;if(checkAnswer($('answer').value,questions[selected].answer)){state.weapon=selected;state.ammo=WEAPONS[selected].ammo;state.solved++;state.mode='reward';hud();tone(660,.2);$('feedback').textContent=`答对了！获得 ${WEAPONS[selected].name}，补充 ${state.ammo} 发。`;$('answer-area').classList.add('hidden');$('question-cards').innerHTML=`<div style="text-align:center;width:100%;padding:20px"><span style="font-size:45px">✦</span><h2>答对了，太棒啦！</h2><p>${questions[selected].a} ${questions[selected].op} ${questions[selected].b} = ${questions[selected].answer}<br>${WEAPONS[selected].name}已装好 ${state.ammo} 发弹药</p></div>`;$('continue').classList.remove('hidden');$('close-quiz').classList.add('hidden');$('continue').focus();}else{$('feedback').textContent='还差一点点，再算算看。也可以选择另一道题。';$('answer').select();tone(240,.1);}}
function continueGame(){const rewarded=state.mode==='reward';state.mode='playing';captureLook();if(rewarded)state.invincible=0;state.shot=.35;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;$('quiz').classList.add('hidden');$('paused').classList.add('hidden');if(rewarded)toast('补给完成！继续守住前方黄线。');}
for(const k of ['1','2','3','4','5','6','7','8','9','0','←','清空']){const b=document.createElement('button');b.textContent=k;b.onclick=()=>{if(k==='←')$('answer').value=$('answer').value.slice(0,-1);else if(k==='清空')$('answer').value='';else if($('answer').value.length<2)$('answer').value+=k;};$('keypad').appendChild(b);}
$('start').onclick=reset;$('restart').onclick=reset;$('resume').onclick=continueGame;$('pause').onclick=pause;$('resupply').onclick=openQuiz;$('submit-answer').onclick=answer;$('continue').onclick=continueGame;$('close-quiz').onclick=continueGame;$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=`音效：${soundOn?'开':'关'}`;$('sound').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');tone(500);};
$('answer').addEventListener('input',()=>{$('answer').value=$('answer').value.replace(/[^0-9]/g,'').slice(0,2);});$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();answer();}});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.mode==='playing')pause();return;}if(e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){e.preventDefault();keys.add(k);}if(k==='r')openQuiz();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function releasePointer(e){movePointers.delete(e.pointerId);touchKeys.clear();for(const direction of movePointers.values())touchKeys.add(direction);firePointers.delete(e.pointerId);fireHeld=firePointers.size>0;if(lookPointer===e.pointerId){lookPointer=null;lastLook=null;}}
canvas.addEventListener('pointermove',e=>{
 if(state.mode!=='playing')return;
 if(document.pointerLockElement===canvas)look(e.movementX||0,e.movementY||0);
 else if(lookPointer===e.pointerId&&lastLook){look(e.clientX-lastLook.x,e.clientY-lastLook.y);lastLook={x:e.clientX,y:e.clientY};}
});
canvas.addEventListener('pointerdown',e=>{
 if(state.mode!=='playing')return;
 if(e.pointerType==='touch'||document.pointerLockElement!==canvas){lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
 if(e.button!==0)return;firePointers.add(e.pointerId);fireHeld=true;shoot();
});
addEventListener('pointerup',releasePointer);addEventListener('pointercancel',releasePointer);
for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{if(state.mode!=='playing')return;e.preventDefault();b.setPointerCapture(e.pointerId);movePointers.set(e.pointerId,b.dataset.move);touchKeys.add(b.dataset.move);};b.onpointerup=releasePointer;b.onpointercancel=releasePointer;}
$('touch-fire').onpointerdown=e=>{if(state.mode!=='playing')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);firePointers.add(e.pointerId);fireHeld=true;shoot();};$('touch-fire').onpointerup=releasePointer;$('touch-fire').onpointercancel=releasePointer;

function monsterModel(type){
 const g=type.animal||type.id==='nautilus'?new THREE.Group():character(true);g.userData.legs??=[];
 if(!type.animal&&type.id!=='nautilus'){g.children[1].material=material(type.color);g.children[0].material=material(type.id==='husk'?0xb79b6a:type.id==='villager'?0x94725b:type.id==='drowned'?0x4d919d:0x708da0);}
 if(type.scale)g.scale.setScalar(type.scale);
 if(type.id==='armored'){box(.95,.95,.6,type.color,0,1.2,0,g);box(.8,.25,.8,0xb0c1c8,0,2.23,0,g);}
 if(type.id==='villager')box(.2,.3,.3,0xafa47e,0,1.85,.45,g);
 if(type.id==='piglin'){box(.4,.23,.3,0xe0aca0,0,1.8,.4,g);box(.17,.28,.2,0xd3a39a,-.37,2.12,0,g);box(.17,.28,.2,0xd3a39a,.37,2.12,0,g);box(.12,.9,.12,0xe6ce7b,.65,1.25,.4,g);}
 if(type.animal){const bird=type.id==='chicken',big=type.id==='camel'||type.id==='zoglin';box(bird?.65:1,bird?.6:.85,bird?.8:1.7,type.color,0,bird?.55:1,0,g);box(bird?.4:.6,bird?.45:.8,.6,type.color,0,bird?1:1.55,bird?.4:.75,g);
 for(const x of [-.35,.35])for(const z of [-.55,.55])g.userData.legs.push(box(.18,.7,.2,type.color,x,.4,z,g));
 box(.1,.12,.04,0x263e39,-.17,bird?1.08:1.65,bird?.72:1.06,g);box(.1,.12,.04,0x263e39,.17,bird?1.08:1.65,bird?.72:1.06,g);
 if(bird)box(.3,.16,.3,0xe7b251,0,.95,.75,g);
 if(type.id==='camel'){box(.65,.55,.6,0xa78151,0,1.65,-.1,g);box(.4,.85,.4,type.color,0,1.85,.7,g);}
 if(type.id==='zoglin'){for(const x of [-.48,.48])box(.15,.5,.15,0xf2dfb4,x,1.3,1,g);}
 if(type.mount){const rider=character(true);rider.scale.setScalar(bird?.55:.72);rider.position.y=bird?.7:1.5;g.add(rider);g.userData.rider=rider;}
 if(big)g.scale.setScalar(1.12);
 }
 if(type.id==='nautilus'){box(1.3,1.3,.8,type.color,0,1.35,0,g);box(.85,.85,.86,0xe5c1a1,0,1.35,0,g);box(.4,.4,.9,0xb19bbd,0,1.35,0,g);for(const x of [-.4,0,.4])box(.18,.18,.8,0x85c3b1,x,.85,.6,g);}
 const bar=new THREE.Group();bar.position.y=type.mount?3.25:2.65;box(1.1,.12,.06,0x435653,0,0,0,bar);const fill=box(1,.08,.08,0xaee58d,0,0,.02,bar);g.add(bar);bar.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});g.userData.bar=bar;g.userData.fill=fill;
 const warn=box(.22,.4,.22,0xffbc57,0,type.mount?3.65:3.05,0,g);warn.visible=false;warn.raycast=()=>{};g.userData.warn=warn;return g;
}
let spawnIndex=0;const seenTypes=new Set();
function spawn(forced){if(enemies.length>=8)return;const types=eligibleEnemies(state.elapsed,enemies);if(!types.length)return;
 const unseen=types.filter(t=>!seenTypes.has(t.id));const type=forced||unseen[0]||types[(spawnIndex++)%types.length];
 // A charging boss never arrives while another charger is active.
 const lane=[-4,0,4][Math.floor(Math.random()*3)];const mesh=monsterModel(type);mesh.position.set(lane+(Math.random()-.5)*1.2,0,-14-Math.random()*2);
 if(mesh.position.distanceTo(player.position)<7||blockers.some(([x,z,hx,hz])=>Math.abs(mesh.position.x-x)<hx+1&&Math.abs(mesh.position.z-z)<hz+1))return;
 scene.add(mesh);enemies.push({mesh,type,hp:type.hp,maxHP:type.hp,speed:type.speed,cooldown:4,phase:Math.random()*6,angry:true,tell:0,charging:0,detached:false});
 if(!seenTypes.has(type.id)){seenTypes.add(type.id);toast(`新伙伴：${type.name}${type.neutral?' · 守村模式中也会向防线前进':type.ranged?' · 黄色提示后发射装饰泡泡；越线才扣村民':type.charge?' · 黄色提示后直线冲刺':''}`);}
}
function loseVillager(){if(state.mode!=='playing')return;state.health=Math.max(0,state.health-1);hud();tone(150,.12);toast(`防线被突破，1 位村民安全撤离！还剩 ${state.health} 位。`);if(state.health===0)end();}
function breach(e){scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);loseVillager();}
function blockedBetween(a,b){const delta=b.clone().sub(a),length=delta.length();if(length<.01)return false;const ray=new THREE.Raycaster(a,delta.normalize(),.08,length-.08);const solids=scene.children.filter(o=>o!==player&&o!==camera&&o!==ring&&!enemies.some(e=>e.mesh===o)&&!effects.some(e=>e.mesh===o));return ray.intersectObjects(solids,true).length>0;}
function updateEnemy(e,dt){if(e.mesh.position.z>=3){breach(e);return;}const target=new THREE.Vector3(e.mesh.position.x,0,3.3);const delta=target.clone().sub(e.mesh.position),d=delta.length();e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.mesh.userData.bar.rotation.y=-e.mesh.rotation.y+yaw;e.mesh.userData.fill.scale.x=Math.max(.01,e.hp/e.maxHP);
 e.mesh.userData.warn.visible=e.tell>0;e.cooldown-=dt;
 if(e.type.id==='nautilus')e.mesh.position.y=.15+Math.sin(state.elapsed*2)*.1;
 if(!e.angry)return;
 if((e.type.ranged||e.type.charge)&&e.cooldown<=0&&e.tell<=0&&d>3){e.tell=1.2;e.target=target.clone();e.cooldown=6;}
 if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.type.ranged){const pos=e.mesh.position.clone();pos.y=1.4;const target=e.target.clone();target.y=1;const mesh=box(.35,.35,.35,0x8cdded,pos.x,pos.y,pos.z);effects.push({mesh,velocity:target.sub(pos).normalize().multiplyScalar(3),life:8,max:8,projectile:true});}else{e.chargeDir=e.target.clone().sub(e.mesh.position).normalize();e.charging=.85;}}}
 else if(e.charging>0){e.charging-=dt;moveBody(e.mesh.position,e.chargeDir.x*3*dt,e.chargeDir.z*3*dt);}
 else if(d>.05){delta.normalize();moveBody(e.mesh.position,delta.x*e.speed*dt,delta.z*e.speed*dt);}
 e.mesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(state.elapsed*6+e.phase+i*Math.PI)*.3);if(e.mesh.position.z>=3)breach(e);
}
function burst(pos,color,count=9){for(let i=0;i<count;i++){const mesh=box(.16,.16,.16,color,pos.x,pos.y+.8,pos.z);effects.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4+2,(Math.random()-.5)*5),life:.6,max:.6});}}
function damageEnemy(e,damage){e.angry=true;e.hp-=damage;
 if(e.type?.mount&&!e.detached&&e.hp<=e.maxHP-e.type.mountHP&&e.hp>0){e.detached=true;const pos=e.mesh.position.clone(),type=ENEMIES.find(t=>t.id===e.type.mount);scene.remove(e.mesh);e.mesh=monsterModel(type);e.mesh.position.copy(pos);scene.add(e.mesh);e.type=type;e.speed=type.speed;toast("坐骑退场，小骑手继续前进！");}
burst(e.mesh.position,0xc4db8e,4);if(e.hp<=0){burst(e.mesh.position,0xf2d276,9);scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);state.kills++;tone(440,.05);}}
function shoot(){if(state.mode!=='playing'||state.shot>0||state.ammo<=0)return;const w=WEAPONS[state.weapon];state.shot=w.interval;state.ammo--;tone(w.radius?95:320,.07);
 syncAim();scene.updateMatrixWorld(true);
 const origin=camera.position.clone(),direction=camera.getWorldDirection(new THREE.Vector3());
 raycaster.set(origin,direction);raycaster.far=30;
 const enemyMeshes=enemies.map(e=>e.mesh);
 // Scene geometry occludes shots; viewmodel and particles are excluded.
 const solids=scene.children.filter(o=>o!==player&&o!==camera&&o!==ring&&!enemyMeshes.includes(o)&&!effects.some(e=>e.mesh===o));
 const hits=raycaster.intersectObjects([...enemyMeshes,...solids],true);
 const impact=hits.find(h=>h.distance>.15),dist=impact?impact.distance:30;
 let hit=null;if(impact)hit=enemies.find(e=>{let o=impact.object;while(o){if(o===e.mesh)return true;o=o.parent;}return false;});
 const end=origin.clone().addScaledVector(direction,dist);if(w.radius){const explosion=hit?hit.mesh.position.clone():end.clone();for(const e of [...enemies]){const distance=e.mesh.position.distanceTo(explosion);const a=explosion.clone();a.y+=1;const b=e.mesh.position.clone();b.y+=1;if(distance<w.radius&&!blockedBetween(a,b))damageEnemy(e,splashDamage(distance,w));}const mesh=new THREE.Mesh(new THREE.SphereGeometry(w.radius,16,8),new THREE.MeshBasicMaterial({color:0xffd48b,transparent:true,opacity:.4,wireframe:true}));mesh.position.copy(explosion);scene.add(mesh);effects.push({mesh,life:.35,max:.35,dispose:true});burst(explosion,0xf2ba62,16);}else if(hit)damageEnemy(hit,w.damage);
 const geo=new THREE.BufferGeometry().setFromPoints([origin,end]);const beam=new THREE.Line(geo,new THREE.LineBasicMaterial({color:w.color}));scene.add(beam);effects.push({mesh:beam,life:.09,max:.09,dispose:true});hud();if(state.ammo===0)openQuiz();}
let previous=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(state.mode==='playing'){state.elapsed+=dt;state.shot=Math.max(0,state.shot-dt);state.invincible=Math.max(0,state.invincible-dt);state.spawn-=dt;if(state.spawn<=0){spawn();state.spawn=Math.max(3.5,5.5-state.elapsed/120);}
 let dx=0,dz=0;if(keys.has('w')||keys.has('arrowup')||touchKeys.has('forward'))dz--;if(keys.has('s')||keys.has('arrowdown')||touchKeys.has('backward'))dz++;if(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left'))dx--;if(keys.has('d')||keys.has('arrowright')||touchKeys.has('right'))dx++;const mag=Math.hypot(dx,dz)||1;const mx=(dx*Math.cos(yaw)+dz*Math.sin(yaw))/mag,mz=(-dx*Math.sin(yaw)+dz*Math.cos(yaw))/mag;moveBody(player.position,mx*4.2*dt,mz*4.2*dt);player.position.x=clamp(player.position.x,-5,5);player.position.z=clamp(player.position.z,6,8);
 syncAim();player.userData.legs.forEach((leg,i)=>leg.rotation.x=(dx||dz)?Math.sin(state.elapsed*12+i*Math.PI)*.45:0);
 for(const e of [...enemies]){updateEnemy(e,dt);if(state.mode!=='playing')break;}
 if(fireHeld||keys.has(' '))shoot();for(const e of effects){if(state.mode!=='playing')break;e.life-=dt;if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);if(e.projectile){const p=e.mesh.position.clone();p.y=0;if(p.z>=3)e.life=0;if(blockers.some(([x,z,hx,hz])=>Math.abs(p.x-x)<hx+.2&&Math.abs(p.z-z)<hz+.2))e.life=0;}else e.velocity.y-=9*dt;e.mesh.rotation.x+=dt*5;}if(e.mesh.material.transparent)e.mesh.material.opacity=e.life/e.max*.4;}for(const e of effects.filter(e=>e.life<=0)){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=effects.filter(e=>e.life>0);
 }
 ring.position.set(player.position.x,.08,player.position.z);ring.visible=state.mode==='welcome'||state.invincible>0;ring.scale.setScalar(1+Math.sin(now/200)*.05);
 $('crosshair').classList.toggle('hidden',state.mode!=='playing');$('controls-hint').textContent=document.pointerLockElement===canvas?'WASD 阵地移动 · 鼠标看前方左右 · 左键射击 · R 补给 · Esc 暂停':'WASD 阵地移动 · 拖动看前方左右 · 空格射击 · R 补给';gun.visible=state.mode!=='welcome';
 if(state.mode==='welcome'){const focus=new THREE.Vector3(2,0,0);camera.position.lerp(new THREE.Vector3(2,23,25),.04);camera.lookAt(focus);}else syncAim();renderer.render(scene,camera);
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();hud();player.position.set(6,0,1);player.rotation.y=-.4;requestAnimationFrame(animate);
// Read-only state inspection plus deterministic QA hooks, enabled only in Vite development.
if(import.meta.env.DEV)window.__game={state,openQuiz,selectQuestion,answer,reset,shoot,get questions(){return questions;},get enemies(){return enemies;},spawn,monsterModel,damageEnemy,updateEnemy};
