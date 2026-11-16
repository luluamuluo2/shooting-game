import * as THREE from 'three';
import './style.css';
import {createTitanModel} from './titans.js';
import {createPlantSystem} from './plants.js';
import {PLANT_UPGRADE_START,PLANT_UPGRADES,plantStats,availablePlantUpgrades,TITANS,TITAN_FIRST,TITAN_INTERVAL,PLANTS,PLANT_SLOTS,PLANT_RANGE,PLANT_REWARD_START,WEAPONS,SMALL_MAGMA_SLIME_ENEMY,SMALL_SLIME_ENEMY,SMALL_SLIME_GOLEM,usedSlots,ENEMIES,ENEMY_CAP,spawnInterval,GOLEMS,GOLEM_CAP,TAUNT_RADIUS,ENEMY_MELEE_REACH,splashDamage,eligibleEnemies,supplyOffers,question,answerChoices,clamp} from './rules.js';
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
const villageTrees=[];function tree(x,z,s=1){villageTrees.push([x,z,.3*s,.3*s]);const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);box(.6,3,.6,0x745942,0,1.5,0,g);box(2.6,1.8,2.6,0x4d8056,0,3.4,0,g);box(2,1.2,2,0x639765,0,4.7,0,g);box(1.2,.8,1.2,0x7ca772,0,5.6,0,g);g.scale.setScalar(s);}
for(let i=0;i<26;i++){const angle=i/26*Math.PI*2,r=18+rand()*3;tree(Math.sin(angle)*r,Math.cos(angle)*r,.75+rand()*.55);}
for(let i=0;i<42;i++){const x=(rand()-.5)*34,z=(rand()-.5)*34;if(Math.abs(x)<3||Math.abs(z)<3)continue;box(.12,.35,.12,0x527f47,x,.2,z);box(.32,.22,.32,[0xf4ce69,0xe8a7a1,0xeae7c7][i%3],x,.48,z);}
for(let i=-9;i<=9;i++){if(Math.abs(i)<2)continue;box(.22,1.15,.22,0xd8c596,i*2,.6,-17);box(1.95,.16,.15,0xc3ad7e,i*2,.8,-17);box(.22,1.15,.22,0xd8c596,-17,.6,i*2);box(.15,.16,1.95,0xc3ad7e,-17,.8,i*2);}
function hut(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(3,2.9,2.7,0xc7a979,0,1.45,0,g);box(3.5,.6,3.3,0x477878,0,3,0,g);box(2.7,.6,2.8,0x3e686c,0,3.5,0,g);box(1,.9,.05,0xa4d9d3,.7,1.8,1.38,g);box(.7,1.7,.08,0x78634e,-.7,.85,1.38,g);box(.4,1.2,.4,0xc6b69b,1,3.9,-.6,g);}hut(-11,-11);hut(11,-13);
for(const [x,z] of [[-7,-7],[8,8],[-11,8],[10,-7]]){box(1.25,1.2,1.25,0xaa8660,x,.6,z);box(1.3,.15,1.3,0xc6ab79,x,1.25,z);}
// Axis-separated movement gives simple sliding along the solid huts and crates.
const blockers=[[-11,-11,1.5,1.35],[11,-13,1.5,1.35],...[[ -7,-7],[8,8],[-11,8],[10,-7]].map(([x,z])=>[x,z,.65,.65])];
function moveBody(pos,dx,dz,radius=.4){const free=(x,z)=>!blockers.some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+radius&&Math.abs(z-bz)<hz+radius);const x=clamp(pos.x+dx,-15,15),z=clamp(pos.z+dz,-15,15);if(free(x,pos.z))pos.x=x;if(free(pos.x,z))pos.z=z;}
// Short visibility-graph routes around expanded static obstacle corners.
function clearWalk(a,b,radius=.4){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));for(let n=0;n<=steps;n++){const t=n/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(blockers.some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+radius+.02&&Math.abs(z-bz)<hz+radius+.02))return false;}return true;}
function walkingRoute(start,end,bounds,radius=.4){
 const inside=p=>p.x>=bounds[0]&&p.x<=bounds[1]&&p.z>=bounds[2]&&p.z<=bounds[3];
 const nodes=[start.clone(),end.clone()];
 for(const [x,z,hx,hz] of blockers)for(const dx of [-1,1])for(const dz of [-1,1]){const p=new THREE.Vector3(x+dx*(hx+radius+.18),0,z+dz*(hz+radius+.18));if(inside(p)&&clearWalk(p,p,radius))nodes.push(p);}
 const distances=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();distances[0]=0;
 for(let n=0;n<nodes.length;n++){let at=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(at<0||distances[i]<distances[at]))at=i;if(at<0||!Number.isFinite(distances[at]))break;if(at===1){const route=[];for(let j=1;j!==0;j=prev[j])route.unshift(nodes[j]);return route;}done.add(at);for(let j=0;j<nodes.length;j++)if(!done.has(j)&&clearWalk(nodes[at],nodes[j],radius)){const d=distances[at]+nodes[at].distanceTo(nodes[j]);if(d<distances[j]){distances[j]=d;prev[j]=at;}}}
 return [];
}
function walkToward(actor,target,speed,dt,bounds=[-15,15,-15,15]){
 const radius=actor.type?.bodyRadius??.4;if(actor.type?.titan)bounds=[Math.max(bounds[0],-17+radius),Math.min(bounds[1],17-radius),Math.max(bounds[2],-17+radius),Math.min(bounds[3],17-radius)];const pos=actor.mesh.position,end=target.clone();end.y=0;end.x=clamp(end.x,bounds[0],bounds[1]);end.z=clamp(end.z,bounds[2],bounds[3]);
 // A giant cannot place its center on a guard beside a crate, but can hit from its surface.
 if(actor.type?.titan&&actor.guard&&!clearWalk(end,end,radius)){
  const reach=ENEMY_MELEE_REACH+(actor.type.hitRadius??0)-.1,candidates=[];
  for(let i=0;i<16;i++){const angle=i*Math.PI/8,p=end.clone().add(new THREE.Vector3(Math.cos(angle)*reach,0,Math.sin(angle)*reach));if(p.x>=bounds[0]&&p.x<=bounds[1]&&p.z>=bounds[2]&&p.z<=bounds[3]&&clearWalk(p,p,radius)&&clearWalk(p,end))candidates.push(p);}
  candidates.sort((a,b)=>a.distanceToSquared(pos)-b.distanceToSquared(pos));if(candidates.length)end.copy(candidates[0]);
 }
 let waypoint=end;actor.navTime=(actor.navTime??0)-dt;
 if(!clearWalk(pos,end,radius)){
  if(!actor.route||actor.navTime<=0||!actor.navEnd||actor.navEnd.distanceTo(end)>.7){actor.route=walkingRoute(pos,end,bounds,radius);actor.navEnd=end.clone();actor.navTime=.5;}
  while(actor.route.length&&actor.route[0].distanceTo(pos)<.12)actor.route.shift();
  if(!actor.route.length)return false;waypoint=actor.route[0];
 }else actor.route=null;
 const delta=waypoint.clone().sub(pos);delta.y=0;const d=delta.length();if(d<.01)return false;delta.multiplyScalar(Math.min(speed*dt,d)/d);moveBody(pos,delta.x,delta.z,radius);pos.x=clamp(pos.x,bounds[0],bounds[1]);pos.z=clamp(pos.z,bounds[2],bounds[3]);return true;
}
function character(zombie=false){const g=new THREE.Group();const skin=zombie?0x8ebd75:0xe6be91,shirt=zombie?0x708da0:0xe7ba5b,pants=zombie?0x666786:0x3c7881;box(.8,.85,.48,shirt,0,1.15,0,g);box(.65,.65,.65,skin,0,1.9,0,g);if(!zombie)box(.69,.2,.69,0x674b3d,0,2.2,0,g);box(.1,.12,.03,0x263e39,-.16,1.94,.335,g);box(.1,.12,.03,0x263e39,.16,1.94,.335,g);box(.19,.05,.035,zombie?0x688756:0x9a6f55,0,1.75,.34,g);const legs=[box(.3,.65,.36,pants,-.23,.36,0,g),box(.3,.65,.36,pants,.23,.36,0,g)];box(.3,.6,.3,skin,-.56,1.25,zombie?.25:0,g);box(.3,.6,.3,skin,.56,1.25,zombie?.25:.18,g);g.userData.legs=legs;return g;}
// A broad rear courtyard, independent of the fixed enemy approach lanes.
box(27,1,14,0x668b4e,0,-.55,26);box(28,2,15,0x6e6450,0,-2,26);
for(let x=-12;x<=12;x+=2)for(let z=22;z<=32;z+=2)box(1.97,.07,1.97,0x91ac67,x,-.02,z);
hut(-9,27);hut(9,27);blockers.push([-9,27,1.5,1.35],[9,27,1.5,1.35]);
for(let z=10;z<=30;z+=1.5)box(2.2,.08,1.45,0xd6d1b2,0,.04,z);
for(let x=-12;x<=12;x+=2){box(.2,1.2,.2,0xd8c596,x,.6,32);box(1.95,.16,.15,0xc3ad7e,x,.85,32);}
for(const x of [-12,12])for(let z=22;z<=30;z+=2){box(.2,1.2,.2,0xd8c596,x,.6,z);box(.15,.16,1.95,0xc3ad7e,x,.85,z);}
const villagers=[];
for(let i=0;i<5;i++){const v=character();v.children[0].material=material([0xe7ba5b,0x7fb4ac,0xb497cd,0xe49b73,0x94ad68][i]);v.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});scene.add(v);villagers.push(v);}
function placeVillager(v,i){let x=(i-2)*2,z=12+i%2*2;if(!villageFree(x,z,v)){outer:for(let zz=10.5;zz<=24;zz+=1.5)for(let xx=-6;xx<=6;xx+=1.5)if(villageFree(xx,zz,v)){x=xx;z=zz;break outer;}}v.position.set(x,0,z);v.rotation.y=Math.PI;v.userData.walk={target:null,idle:.3+i*.35,phase:i};v.userData.legs.forEach(l=>l.rotation.x=0);}
function villageFree(x,z,own){return x>=-7&&x<=7&&z>=10&&z<=25&&![...blockers,...villageTrees].some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+.65&&Math.abs(z-bz)<hz+.65)&&!villagers.some(v=>v!==own&&v.visible&&Math.hypot(x-v.position.x,z-v.position.z)<1.15);}
function updateVillagers(dt){if(state.mode!=='playing')return;for(const v of villagers){if(!v.visible)continue;const w=v.userData.walk;if(w.idle>0){w.idle-=dt;continue;}if(!w.target){for(let attempt=0;attempt<12;attempt++){const x=-6+Math.random()*12,z=10.5+Math.random()*14;if(villageFree(x,z,v)){w.target={x,z};break;}}if(!w.target){w.idle=.5;continue;}}
 const dx=w.target.x-v.position.x,dz=w.target.z-v.position.z,d=Math.hypot(dx,dz),step=Math.min(d,.65*dt);const x=v.position.x+dx/(d||1)*step,z=v.position.z+dz/(d||1)*step;
 if(d<.15||!villageFree(x,z,v)){w.target=null;w.idle=.7+Math.random()*2;v.userData.legs.forEach(l=>l.rotation.x=0);continue;}v.position.set(x,0,z);v.rotation.y=Math.atan2(dx,dz);w.phase+=dt*5;v.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(w.phase+i*Math.PI)*.28);
}}
villagers.forEach(placeVillager);
box(12,.1,4,0xb8b391,0,.04,7);
for(let x=-8;x<=8;x+=1)box(.65,.07,.22,0xefc359,x,.08,3);
for(const x of [-8.5,8.5]){box(.2,2,.2,0x806645,x,1,3);box(.8,.6,.12,0xefc359,x,1.8,3);}
const player=character();scene.add(player);const gun=new THREE.Group();camera.add(gun);gun.position.set(.32,-.28,-.58);gun.rotation.y=Math.PI;box(.2,.2,.65,0x36514c,0,0,.15,gun);box(.16,.3,.16,0x4c6358,0,-.15,0,gun);box(.22,.22,.48,0xe6be91,0,-.19,-.23,gun);
const ring=new THREE.Mesh(new THREE.RingGeometry(.8,.94,32),new THREE.MeshBasicMaterial({color:0xffe6a3,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;scene.add(ring);
const state={mode:'welcome',weapon:0,ammo:WEAPONS[0].ammo,health:5,kills:0,solved:0,elapsed:0,spawn:0,shot:0,burstRemaining:0,burstTimer:0,burstWeapon:0,invincible:0};let pendingPlant=null;let golems=[],streak=0,choiceValues=[],questionToken=0,answerLocked=true;let enemies=[],effects=[],questions=[],offers=[],selected=-1,fireHeld=false,soundOn=false,audio;
const plantSystem=createPlantSystem({THREE,scene,box,material,getEnemies:()=>enemies,getMode:()=>state.mode,getTime:()=>state.elapsed,damageEnemy,blockedBetween,toast,onChange:()=>hud()});
const movePointers=new Map(),firePointers=new Set();
const keys=new Set(),touchKeys=new Set(),raycaster=new THREE.Raycaster();
let yaw=0,pitch=0,lookPointer=null,lastLook=null;
const coarse=()=>window.matchMedia?.('(pointer: coarse)').matches??false;
function syncAim(){camera.position.copy(player.position);camera.position.y+=1.8;camera.rotation.set(pitch,yaw,0,'YXZ');player.rotation.y=yaw+Math.PI;camera.updateMatrixWorld();}
function look(dx,dy){yaw=Math.atan2(Math.sin(yaw-dx*.0025),Math.cos(yaw-dx*.0025));pitch=clamp(pitch-dy*.0025,-1.25,1.25);syncAim();}
function releaseLook(){lookPointer=null;lastLook=null;document.exitPointerLock?.();}
function captureLook(){
 if(coarse())return;
 if(!canvas.requestPointerLock){toast('按住画面拖动转向，空格射击');return;}
 try{const request=canvas.requestPointerLock();request?.catch(()=>toast('鼠标未锁定：按住画面拖动转向，空格射击'));}catch{toast('按住画面拖动转向，空格射击');}
}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&state.mode==='playing')pause();});
document.addEventListener('pointerlockerror',()=>{if(state.mode==='playing')toast('鼠标未锁定：按住画面拖动转向，空格射击');});
function tone(freq,duration=.08){if(!soundOn)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.035,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function golemSummary(){
 if(golems.length<=6)return golems.map(g=>`${g.type.name} ${Math.ceil(g.hp)}/${g.type.hp}`).join(' · ')||'答对3题召唤伙伴';
 const groups=new Map();for(const g of golems)groups.set(g.type.name,(groups.get(g.type.name)||0)+1);
 return `总生命 ${Math.ceil(golems.reduce((sum,g)=>sum+g.hp,0))}/${golems.reduce((sum,g)=>sum+g.type.hp,0)} · `+[...groups].map(([name,n])=>`${name}×${n}`).join(' · ');
}
function titanCountdown(){
 const panel=$('boss-timer'),active=enemies.some(e=>e.type?.titan),remaining=Math.max(0,Math.ceil(nextTitan-state.elapsed)),paused=state.mode!=='playing';
 $('challenge-boss').disabled=state.mode!=='playing'||active;$('challenge-boss').textContent=active?'泰坦正在场上':'立即挑战下一位泰坦 · B';panel.classList.toggle('hidden',state.mode==='welcome'||state.mode==='over');panel.classList.toggle('soon',!active&&remaining<=30);panel.classList.toggle('imminent',!active&&remaining<=10);
 let label=active?'泰坦仍在场 · 下一位等待本场结束':remaining>0?`下一位泰坦 ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}${remaining<=30?' · 准备好，慢慢来！':''}`:usedSlots(enemies)+TITANS[titanIndex%TITANS.length].slots>ENEMY_CAP?`泰坦等待战场空位 · 需空出${TITANS[titanIndex%TITANS.length].slots}名额`:'泰坦即将到来';
 if(paused)label+=' · 计时暂停';if(panel.textContent!==label)panel.textContent=label;
}
function titanHud(){titanCountdown();const boss=enemies.find(e=>e.type?.titan),panel=$('boss-status');panel.classList.toggle('hidden',!boss);if(boss){const label=`泰坦 · ${boss.type.name}  ${Math.max(0,Math.ceil(boss.hp))} / ${boss.maxHP}`;if(panel.textContent!==label)panel.textContent=label;panel.style.setProperty('--boss-health',`${Math.max(0,boss.hp/boss.maxHP)*100}%`);}}
function plantUpgradeSummary(p){const s=plantStats(p);return `${p.type.radius?'范围'+Math.round(s.radius/p.type.radius*100)+'%':s.projectiles+'发/轮'} · 减速${Math.round(s.slow*100)}%（升级强度${Math.round(s.slowStrength*100)}%${p.type.slow?"＋初始20%减速":""}）`;}
function hud(){titanHud();$('plant-upgrades').textContent=plantSystem.plants.map(p=>PLANT_SLOTS[p.slot].label+' '+p.type.name+'：'+plantUpgradeSummary(p)).join('；')||'尚未部署植物';$('golem-status').textContent=`傀儡 ${golems.length}只 · 名额 ${usedSlots(golems)} / ${GOLEM_CAP} · `+golemSummary()+` · 植物 ${plantSystem.plants.length}/${PLANT_SLOTS.length}`;const w=WEAPONS[state.weapon];$('hearts').textContent='● '.repeat(state.health)+'○ '.repeat(5-state.health);$('villager-count').textContent=`${state.health} / 5 位村民`;$('hearts').setAttribute('aria-label',`还有 ${state.health} 位村民安全`);villagers.forEach((v,i)=>v.visible=i<state.health);$('score').textContent=String(state.kills).padStart(2,'0');$('solved').innerHTML=`${state.solved} <small>题</small>`;$('weapon-name').textContent=w.name+(w.burst?' · 三连发':'');$('weapon-icon').textContent=w.icon;$('ammo').textContent=state.ammo;$('capacity').textContent=` / ${w.ammo}`;$('ammo-fill').style.width=`${state.ammo/w.ammo*100}%`;gun.scale.set(w.radius?1.5:1,w.radius?1.5:1,state.weapon===1?1.7:1);}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2300);}
function clearEnemies(){plantSystem.clear();pendingPlant=null;for(const g of golems)scene.remove(g.mesh);golems=[];streak=0;for(const e of enemies)scene.remove(e.mesh);enemies=[];for(const e of effects){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=[];}
function reset(){cancelQuizTransition();clearEnemies();titanIndex=0;nextTitan=TITAN_FIRST;seenTypes.clear();spawnIndex=0;Object.assign(state,{mode:'playing',weapon:0,ammo:WEAPONS[0].ammo,health:5,kills:0,solved:0,elapsed:0,spawn:1,shot:0,burstRemaining:0,burstTimer:0,burstWeapon:0,invincible:0});villagers.forEach(placeVillager);player.position.set(0,0,7);player.rotation.y=Math.PI;yaw=0;pitch=0;player.visible=false;syncAim();captureLook();keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;for(const id of ['welcome','paused','quiz'])$(id).classList.add('hidden');hud();toast('守住前方黄线，保护身后的 5 位村民！');}
function pause(){if(state.mode!=='playing')return;cancelBurst();state.mode='paused';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();$('pause-title').textContent='世界暂停了';$('pause-copy').textContent='僵尸也在原地等你。准备好了再出发。';$('resume').classList.remove('hidden');$('paused').classList.remove('hidden');}
function end(){cancelQuizTransition();state.mode='over';releaseLook();fireHeld=false;$('pause-title').textContent='村民已全部撤离';$('pause-copy').textContent=`防线被突破了。你击退了 ${state.kills} 只僵尸，完成了 ${state.solved} 道题。再来一次，你会更熟练！`;$('resume').classList.add('hidden');$('paused').classList.remove('hidden');}
const rewardSpecs=[...WEAPONS.map(w=>({name:w.name,max:w.range,need:1,icon:w.icon,detail:`${w.ammo} 发弹药${w.burst?' · 每次三连发消耗3发':''}`})),{name:'补充村民',max:20,need:2,icon:'♥',detail:'+1 位村民，最多5位'},...GOLEMS.map(g=>({name:g.name,max:g.math,need:3,icon:'◆',detail:`生命${g.hp} · 伤害${g.damage} / ${g.interval}秒 · DPS ${(g.damage/g.interval).toFixed(2)} · ${g.skill} · ${TAUNT_RADIUS}格嘲讽`})),...PLANTS.map(p=>({name:p.name,max:p.math,need:3,icon:'✿',detail:`${p.damage}伤害 / ${p.interval}秒 · 射程${PLANT_RANGE} · 远距离会打偏${p.slow?' · 20%减速2秒':''}`}))];
rewardSpecs.push(...PLANT_UPGRADES.map(u=>({name:PLANTS.find(p=>p.id===u.plantId).name+' · '+u.name,max:u.math,need:2,icon:'↑',detail:(u.kind==='multi'?'每轮+1发，单颗全伤，上限100发':u.kind==='area'?'半径+基础300个百分点，最多3次：400%→700%→900%':'减速升级强度每次+100%，最多3次/300%；普通10%→20%→30%，冰瓜40%→60%→80%，泰坦最多50%')+' · 随机升级同种未封顶的一株；死亡丢失'})));
function rewardFull(i){if(i>=PLANT_UPGRADE_START)return !availablePlantUpgrades(plantSystem.plants).includes(i);return i===3?state.health>=5:i>=PLANT_REWARD_START?Boolean(pendingPlant)||plantSystem.plants.length>=PLANT_SLOTS.length:i>=4?usedSlots(golems)+1>GOLEM_CAP:false;}
function renderCards(){ $('question-cards').innerHTML='';offers.forEach(i=>{const r=rewardSpecs[i],b=document.createElement('button');b.type='button';b.dataset.reward=String(i);b.disabled=rewardFull(i);b.setAttribute('aria-pressed',String(selected===i));b.classList.toggle('selected',selected===i);b.innerHTML=`<span class="gun">${r.icon}</span><b>${r.name}</b><small>${r.max}以内 · 连续答对${r.need}题<br>${r.detail}</small><strong>${b.disabled?'已满员':`${questions[i].a} ${questions[i].op} ${questions[i].b} = ?`}</strong>`;b.onclick=()=>selectQuestion(i);$('question-cards').appendChild(b);});}
function openQuiz(){if(state.mode!=='playing')return;cancelBurst();cancelQuizTransition();state.mode='quiz';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();$('question-cards').classList.remove('hidden');offers=supplyOffers(state.health,usedSlots(golems),Math.random,pendingPlant?PLANT_SLOTS.length:plantSystem.plants.length,availablePlantUpgrades(plantSystem.plants));questions=rewardSpecs.map(r=>question(r.max));selected=-1;answerLocked=true;questionToken++;streak=0;$('answer-area').classList.add('hidden');$('close-quiz').classList.toggle('hidden',state.ammo===0);renderCards();$('quiz').classList.remove('hidden');$('question-cards').children[0]?.focus();}
let quizTimer=null;
function cancelQuizTransition(){clearTimeout(quizTimer);quizTimer=null;questionToken++;answerLocked=true;}
function afterFeedback(delay,action){
 const token=questionToken,mode=state.mode;
 const advance=()=>{if(token!==questionToken||state.mode!==mode)return;
  // A background tab must not silently skip the explanation.
  if(document.hidden){quizTimer=setTimeout(advance,delay);return;}
  quizTimer=null;action();
 };
 quizTimer=setTimeout(advance,delay);
}
function showQuestion(message=''){
 cancelQuizTransition();
 const q=questions[selected],r=rewardSpecs[selected],token=++questionToken;
 choiceValues=answerChoices(q);answerLocked=false;
 $('expression').textContent=`${q.a} ${q.op} ${q.b} = ?`;
 $('answer-options').innerHTML='';
 choiceValues.forEach((value,index)=>{
  const b=document.createElement('button');b.type='button';b.textContent=String(value);
  b.setAttribute('aria-label',`选项 ${index+1}：${value}`);
  b.onclick=e=>{if((e?.detail||0)>1)return;answer(value,token);};$('answer-options').appendChild(b);
 });
 $('feedback').textContent=`${message} ${r.name}：连续答对 ${streak} / ${r.need} 题。点选答案即提交，也可按数字键 1–4。`;
 $('answer-area').classList.remove('hidden');$('expression').focus({preventScroll:false});
}
function selectQuestion(i){if(state.mode!=='quiz'||!offers.includes(i)||!questions[i]||rewardFull(i))return;if(selected===i)return;streak=0;selected=i;renderCards();showQuestion('答错将结束本轮且不发奖励；切换补给重新计数。');}
function nextQuestion(){if(state.mode!=='quiz'||!answerLocked||selected<0)return;questions[selected]=question(rewardSpecs[selected].max);renderCards();showQuestion();}
function answer(value,token=questionToken){
 if(state.mode!=='quiz'||selected<0||(selected<PLANT_REWARD_START&&rewardFull(selected))||answerLocked||token!==questionToken||!choiceValues.includes(value))return;
 answerLocked=true;const q=questions[selected],r=rewardSpecs[selected];
 for(const b of $('answer-options').children){b.disabled=true;const n=Number(b.textContent);b.classList.toggle('correct',n===q.answer);b.classList.toggle('incorrect',n===value&&n!==q.answer);}
 if(value!==q.answer){streak=0;state.mode='failed';selected=-1;$('close-quiz').classList.add('hidden');$('feedback').textContent=`${q.a} ${q.op} ${q.b} = ${q.answer}。进度已重置，本轮结束，不发奖励。稍后回到战斗，没弹时再次射击可重新抽取补给。`;tone(240,.1);afterFeedback(1800,()=>{continueGame();toast('本轮补给结束。没弹时再次射击重新抽取，也可以按 R 补给。');});return;}
 state.solved++;streak++;hud();tone(660,.2);
 if(streak<r.need){$('feedback').textContent=`答对啦！${r.name}：连续答对 ${streak} / ${r.need} 题。即将进入下一题。`;afterFeedback(900,nextQuestion);return;}
 if(selected>=PLANT_UPGRADE_START){const u=PLANT_UPGRADES[selected-PLANT_UPGRADE_START],p=plantSystem.upgrade(u.plantId,u.kind);state.mode='reward';if(p&&state.ammo===0){state.weapon=0;state.ammo=WEAPONS[0].ammo;}hud();$('feedback').textContent=p?`${p.type.name}升级成功！${plantUpgradeSummary(p)}`:'可升级植物已不在场，本轮没有升级奖励。';afterFeedback(900,continueGame);return;}
 if(selected>=PLANT_REWARD_START){pendingPlant=PLANTS[selected-PLANT_REWARD_START];state.mode='reward';const result=autoDeployPlant();if(state.ammo===0){state.weapon=0;state.ammo=WEAPONS[0].ammo;}hud();$('close-quiz').classList.add('hidden');$('feedback').textContent=`答对啦！${result||'种植位暂满，植物已保留，出现空位后自动部署'}。即将自动返回战斗。`;afterFeedback(900,continueGame);return;}
 let reward;if(selected===3){placeVillager(villagers[state.health],state.health);state.health++;reward='1 位村民回到安全后院';}else if(selected>=4){summonGolem(GOLEMS[selected-4]);reward=`${r.name}加入前线保护村民`;}else{state.weapon=selected;state.ammo=WEAPONS[selected].ammo;reward=`${r.name}已装好 ${state.ammo} 发弹药`;}
 if(selected>=3&&state.ammo===0){state.weapon=0;state.ammo=WEAPONS[0].ammo;reward+=`，附赠手枪${WEAPONS[0].ammo}发`;}
 state.mode='reward';hud();$('close-quiz').classList.add('hidden');$('feedback').textContent=`答对啦！连续答对 ${r.need} / ${r.need} 题。${reward}，即将自动返回战斗。`;afterFeedback(900,()=>{continueGame();toast(`补给完成！${reward}`);});
}
function autoDeployPlant(){
 if(!pendingPlant||!['reward','playing'].includes(state.mode))return '';
 const empty=PLANT_SLOTS.map((_,i)=>i).filter(i=>!plantSystem.plants.some(p=>p.slot===i));if(!empty.length)return '';
 const slot=empty[Math.floor(Math.random()*empty.length)],type=pendingPlant;if(!plantSystem.add(type,slot))return '';pendingPlant=null;
 const message=`${type.name}已随机部署到${PLANT_SLOTS[slot].label}`;toast(message);return message;
}
function continueGame(){if(state.mode==='quiz'&&state.ammo===0)return;cancelBurst();cancelQuizTransition();const rewarded=state.mode==='reward';state.mode='playing';captureLook();if(rewarded)state.invincible=0;state.shot=WEAPONS[state.weapon].interval;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;$('quiz').classList.add('hidden');$('paused').classList.add('hidden');if(rewarded)toast('补给完成！继续守住前方黄线。');}
$('start').onclick=reset;$('restart').onclick=reset;$('resume').onclick=continueGame;$('pause').onclick=pause;$('resupply').onclick=openQuiz;$('close-quiz').onclick=continueGame;$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=`音效：${soundOn?'开':'关'}`;$('sound').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');tone(500);};
$('quiz').addEventListener('keydown',e=>{
 if(e.repeat&&(e.key==='Enter'||e.key===' '||/^[1-4]$/.test(e.key))){e.preventDefault();return;}
 if(state.mode==='quiz'&&/^[1-4]$/.test(e.key)){e.preventDefault();answer(choiceValues[Number(e.key)-1]);}
});

addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.mode==='catalog'){closeCatalog();return;}if(state.mode==='playing')pause();return;}if(state.mode!=='playing')return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)shoot(true);}if(k==='r'&&!e.repeat)openQuiz();if(k==='b'&&!e.repeat)updateTitanSpawn(true);});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function releasePointer(e){movePointers.delete(e.pointerId);touchKeys.clear();for(const direction of movePointers.values())touchKeys.add(direction);firePointers.delete(e.pointerId);fireHeld=firePointers.size>0;if(lookPointer===e.pointerId){lookPointer=null;lastLook=null;}}
canvas.addEventListener('pointermove',e=>{
 if(state.mode!=='playing')return;
 if(document.pointerLockElement===canvas)look(e.movementX||0,e.movementY||0);
 else if(lookPointer===e.pointerId&&lastLook){look(e.clientX-lastLook.x,e.clientY-lastLook.y);lastLook={x:e.clientX,y:e.clientY};}
});
canvas.addEventListener('pointerdown',e=>{
 if(state.mode!=='playing')return;
 if(state.ammo===0&&(e.pointerType==='touch'||e.button===0)){shoot(true);return;}
 if(e.pointerType==='touch'||document.pointerLockElement!==canvas){lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
 if(e.button!==0)return;firePointers.add(e.pointerId);fireHeld=true;shoot(true);
});
addEventListener('pointerup',releasePointer);addEventListener('pointercancel',releasePointer);
for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{if(state.mode!=='playing')return;e.preventDefault();b.setPointerCapture(e.pointerId);movePointers.set(e.pointerId,b.dataset.move);touchKeys.add(b.dataset.move);};b.onpointerup=releasePointer;b.onpointercancel=releasePointer;}
$('touch-fire').onpointerdown=e=>{if(state.mode!=='playing')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);firePointers.add(e.pointerId);fireHeld=true;shoot(true);};$('touch-fire').onpointerup=releasePointer;$('touch-fire').onpointercancel=releasePointer;

function monsterModel(type){
 if(type.titan)return createTitanModel(type,{THREE,box,material});
 const g=type.slime||type.animal||type.id==='nautilus'?new THREE.Group():character(true);g.userData.legs??=[];
 if(!type.slime&&!type.animal&&type.id!=='nautilus'){g.children[1].material=material(type.color);g.children[0].material=material(type.id==='husk'?0xb79b6a:type.id==='villager'?0x94725b:type.id==='drowned'?0x4d919d:0x708da0);}
 if(type.slime){const magma=type.id.includes('magma');box(1.6,1.6,1.6,type.color,0,.85,0,g);box(1.1,.65,.1,magma?0xffa33b:0x75ab45,0,.6,.81,g);for(const x of [-.36,.36])box(.24,.24,.08,magma?0x5a2018:0x294736,x,1.1,.84,g);}
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
let titanIndex=0,nextTitan=TITAN_FIRST;
function updateTitanSpawn(manual=false){if(state.mode!=='playing'||enemies.some(e=>e.type.titan)||(!manual&&(state.elapsed<nextTitan||usedSlots(enemies)+TITANS[titanIndex%TITANS.length].slots>ENEMY_CAP)))return false;const type=TITANS[titanIndex%TITANS.length];addEnemy(type,new THREE.Vector3(0,0,-17+type.bodyRadius));titanIndex++;nextTitan=state.elapsed+TITAN_INTERVAL;toast(`泰坦来袭：${type.name}！答题时依然安全暂停。`);hud();return true;}
$('challenge-boss').onclick=()=>updateTitanSpawn(true);
let spawnIndex=0;const seenTypes=new Set();
function spawn(forced){if(usedSlots(enemies)>=ENEMY_CAP)return;const types=eligibleEnemies(state.elapsed,enemies);if(!types.length)return;
 const unseen=types.filter(t=>!seenTypes.has(t.id));const type=forced||unseen[0]||types[(spawnIndex++)%types.length];
 if(usedSlots(enemies)+(type.slots??1)>ENEMY_CAP)return;
 // A charging boss never arrives while another charger is active.
 const lane=[-4,0,4][Math.floor(Math.random()*3)];const mesh=monsterModel(type);mesh.position.set(lane+(Math.random()-.5)*1.2,0,-14-Math.random()*2);
 if(mesh.position.distanceTo(player.position)<7||blockers.some(([x,z,hx,hz])=>Math.abs(mesh.position.x-x)<hx+1&&Math.abs(mesh.position.z-z)<hz+1))return;
 addEnemy(type,mesh.position,mesh);
 if(!seenTypes.has(type.id)){seenTypes.add(type.id);toast(`新伙伴：${type.name}${type.neutral?' · 守村模式中也会向防线前进':type.ranged?' · 黄色提示后发射装饰泡泡；越线才扣村民':type.charge?' · 黄色提示后直线冲刺':''}`);}
}
function splitPositions(position,bounds){
 const result=[];
 for(const radius of [.65,1.1,1.6])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,p=new THREE.Vector3(clamp(position.x+Math.cos(angle)*radius,bounds[0],bounds[1]),0,clamp(position.z+Math.sin(angle)*radius,bounds[2],bounds[3]));
  if(clearWalk(p,p)&&result.every(q=>q.distanceTo(p)>.5)){result.push(p);if(result.length===2)return result;}
 }
 // The parent's position was legal; retain both children even in a cramped corner.
 while(result.length<2)result.push(position.clone());return result;
}
function addEnemy(type,position,mesh=monsterModel(type)){
 mesh.position.copy(position);scene.add(mesh);enemies.push({mesh,type,hp:type.hp,maxHP:type.hp,speed:type.speed,cooldown:4,phase:Math.random()*6,angry:true,tell:0,charging:0,detached:false});
}
// These six variants share combat values; every difference below is purely cosmetic.
function decorateBasicGolem(mesh,type){
 const style=type.appearance;if(!style)return;
 const front=(w,h,color,x,y,z=.37)=>box(w,h,.045,color,x,y,z,mesh);
 if(style==='dirt'){
  for(const [x,y,w] of [[-.35,1.55,.28],[.22,1.1,.35],[.35,1.8,.2],[-.18,2.35,.16],[.12,2.58,.22]])front(w,.17,0x694b36,x,y,y>2?.34:.37);
  front(.18,.16,0xb39268,-.12,1.3);front(.2,.12,0xb39268,.2,2.18,.34);
 }else if(style==='glass'){
  mesh.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===type.color){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.42;o.material.depthWrite=false;o.material.roughness=.15;}});
  for(const [w,h,cy,depth] of [[1.22,1.32,1.35,.37],[.72,.67,2.35,.35]]){
   for(const x of [-w/2,w/2])front(.055,h,0xe9ffff,x,cy,depth);
   for(const y of [cy-h/2,cy+h/2])front(w,.055,0xe9ffff,0,y,depth);
  }
  const glint=front(.065,.65,0xffffff,.14,1.45,.39);glint.rotation.z=-.55;
 }else if(style==='honey'){
  // Raised six-sided honey cells, rather than a gameplay slowing effect.
  for(const [x,y] of [[-.28,1.55],[.28,1.55],[0,1.1],[0,2.35]]){
   const cell=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.06,6),material(0x9e671e));cell.rotation.x=Math.PI/2;cell.position.set(x,y,y>2?.35:.39);mesh.add(cell);
   front(.1,.13,0xffdd70,x,y,y>2?.39:.43);
  }
  front(.12,.35,0xffd460,.44,1.85);
 }else if(style==='grass'){
  box(1.23,.23,.74,0x65aa42,0,1.91,0,mesh);box(.73,.18,.69,0x7cbd48,0,2.7,0,mesh);
  for(const x of [-.42,-.12,.3])front(.16,.18,0x65aa42,x,1.74);
  front(.28,.15,0x725236,-.24,1.22);front(.19,.13,0xb19765,.3,1.02);
 }else if(style==='watermelon'){
  for(const x of [-.45,-.15,.15,.45])front(.09,1.27,0x356d36,x,1.35);
  for(const x of [-.25,0,.25])front(.06,.61,0x356d36,x,2.35,.35);
  front(.62,.55,0xd95359,0,1.43,.4);for(const x of [-.18,.05,.2])front(.045,.08,0x492f35,x,1.45,.43);
  box(.14,.22,.14,0x4d7537,0,2.76,0,mesh);
 }else if(style==='pumpkin'){
  for(const x of [-.45,-.15,.15,.45])front(.065,1.23,0xc56b29,x,1.35);
  for(const x of [-.2,.2])front(.16,.15,0x68432a,x,2.4,.36);
  front(.3,.08,0x68432a,0,2.18,.36);box(.18,.25,.18,0x66743a,0,2.8,0,mesh);
 }
}
function summonGolem(type,position=null){if(usedSlots(golems)+(type.slots??1)>GOLEM_CAP)return false;const mesh=new THREE.Group();const legs=[],arms=[];box(1.2,1.3,.7,type.color,0,1.35,0,mesh);box(.7,.65,.65,type.color,0,2.35,0,mesh);for(const x of [-.24,.24])box(.13,.12,.05,0x8fe5e7,x,2.4,.35,mesh);for(const x of [-.8,.8]){const shoulder=new THREE.Group();shoulder.position.set(x,1.75,0);mesh.add(shoulder);box(.4,1.2,.5,type.color,0,-.6,0,shoulder);arms.push(shoulder);}for(const x of [-.35,.35])legs.push(box(.4,.7,.5,type.color,x,.35,0,mesh));box(.35,.4,.05,type.id==='redstone'?0xff6059:0x7fc8b0,0,1.5,.38,mesh);
 decorateBasicGolem(mesh,type);if(type.slime)box(1.4,1.4,.9,type.color,0,1.4,0,mesh);if(type.scale)mesh.scale.setScalar(type.scale);const bar=new THREE.Group();bar.position.y=3;box(1.2,.14,.06,0x345652,0,0,0,bar);const fill=box(1.1,.1,.08,0x65e2e0,0,0,.04,bar);mesh.add(bar);mesh.userData={legs,arms,bar,fill,appearance:type.appearance??type.id};mesh.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});const spots=Array.from({length:5},(_,row)=>1-row*1.4).flatMap(z=>Array.from({length:10},(_,col)=>new THREE.Vector3(-5.4+col*1.2,0,z)));const spot=spots.find(p=>golems.every(g=>g.mesh.position.distanceTo(p)>1))||spots[golems.length%spots.length];const lane=spot.x;mesh.position.copy(position||spot);scene.add(mesh);golems.push({mesh,type,hp:type.hp,cooldown:.5,swing:0,home:lane,patrol:null,patrolTime:0,stuck:0});hud();return true;}
function damageGolem(g,damage){if(!golems.includes(g))return;g.hp=Math.max(0,g.hp-damage);burst(g.mesh.position,0x8edede,3);if(g.hp===0){scene.remove(g.mesh);golems=golems.filter(x=>x!==g);if(g.type.split){for(const pos of splitPositions(g.mesh.position,[-6,6,-6,1.8]))summonGolem(SMALL_SLIME_GOLEM,pos);toast('粘液块傀儡分成了2只小伙伴！');}else toast(`${g.type.name}退场了，可以再次答题召唤。`);}hud();}
function patrolTarget(g){
 // Pick a clear, reachable segment inside the defense area; never wander into the village.
 for(let attempt=0;attempt<24;attempt++){
  const point=new THREE.Vector3(-5.5+Math.random()*11,0,-5.5+Math.random()*6.8);
  if(point.distanceTo(g.mesh.position)<1)continue;
  const probe=g.mesh.position.clone(),delta=point.clone().sub(probe).multiplyScalar(1/30);let clear=true;
  for(let n=0;n<30;n++){const before=probe.clone();moveBody(probe,delta.x,delta.z);if(probe.distanceTo(before)<delta.length()*.9){clear=false;break;}}
  if(clear){g.patrol=point;g.patrolTime=0;g.stuck=0;return;}
 }
 g.patrol=null;g.patrolTime=0;
}
function updateGolems(dt){if(state.mode!=='playing')return;for(const g of [...golems]){g.cooldown=Math.max(0,g.cooldown-dt);g.swing=Math.max(0,g.swing-dt);const armAngle=-1.45*Math.sin((g.swing/.32)*Math.PI/2);g.mesh.userData.arms.forEach(a=>a.rotation.x=armAngle);const target=enemies.filter(e=>e.mesh.position.distanceTo(g.mesh.position)<=10).sort((a,b)=>b.mesh.position.z-a.mesh.position.z)[0];if(target){g.patrol=null;g.patrolTime=0;g.stuck=0;}else{g.patrolTime+=dt;if(!g.patrol||g.mesh.position.distanceTo(g.patrol)<.2||g.patrolTime>12||g.stuck>.6)patrolTarget(g);}let delta=target?target.mesh.position.clone().sub(g.mesh.position):(g.patrol||g.mesh.position).clone().sub(g.mesh.position);delta.y=0;const d=delta.length();g.mesh.userData.bar.rotation.y=yaw-g.mesh.rotation.y;g.mesh.userData.fill.scale.x=Math.max(.01,g.hp/g.type.hp);
 if(d>.05)g.mesh.rotation.y=Math.atan2(delta.x,delta.z);const moving=d>(target?g.type.reach+(target.type.hitRadius??0):.1)||(target&&!clearWalk(g.mesh.position,target.mesh.position));if(moving){const before=g.mesh.position.clone();walkToward(g,target?target.mesh.position:(g.patrol||g.mesh.position),g.type.speed,dt,[-6,6,-6,1.8]);g.mesh.position.x=clamp(g.mesh.position.x,-6,6);g.mesh.position.z=clamp(g.mesh.position.z,-6,1.8);if(!target)g.stuck=g.mesh.position.distanceTo(before)<g.type.speed*dt*.2?g.stuck+dt:0;}g.mesh.userData.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(state.elapsed*7+i*Math.PI)*.3:0);
 if(target&&d<=g.type.reach+(target.type.hitRadius??0)&&g.cooldown<=0){const a=g.mesh.position.clone(),b=target.mesh.position.clone();a.y=b.y=1.3;if(blockedBetween(a,b))continue;g.cooldown=g.type.interval;g.swing=.32;g.mesh.userData.arms.forEach(a=>a.rotation.x=-1.45);const pos=target.mesh.position.clone();for(const e of [...enemies])if(e===target||(g.type.radius&&Math.max(0,e.mesh.position.distanceTo(pos)-(e.type.hitRadius??0))<g.type.radius&&!blockedBetween(b,e.mesh.position.clone().add(new THREE.Vector3(0,1.3,0)))))damageEnemy(e,g.type.damage);burst(pos,g.type.color,6);hud();}
 }}
function loseVillager(){if(state.mode!=='playing')return;state.health=Math.max(0,state.health-1);hud();tone(150,.12);toast(`防线被突破，1 位村民安全撤离！还剩 ${state.health} 位。`);if(state.health===0)end();}
function breach(e){if(!enemies.includes(e))return;scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);loseVillager();}
function blockedBetween(a,b){const delta=b.clone().sub(a),length=delta.length();if(length<.01)return false;const ray=new THREE.Raycaster(a,delta.normalize(),.08,length-.08);const excluded=new Set([player,camera,ring,...enemies.map(e=>e.mesh),...effects.map(e=>e.mesh),...golems.map(g=>g.mesh),...plantSystem.plants.map(p=>p.mesh),...plantSystem.shots.map(p=>p.mesh),...plantSystem.markers]);const solids=scene.children.filter(o=>!excluded.has(o));return ray.intersectObjects(solids,true).length>0;}
function updateEnemy(e,dt){if(state.mode!=='playing'||!enemies.includes(e))return;const before=e.mesh.position.clone();plantSystem.contacts(e);updateEnemyMotion(e,dt);plantSystem.contacts(e,before,e.mesh.position);}
function updateEnemyMotion(e,dt){if(state.mode!=='playing'||!enemies.includes(e))return;e.swing=Math.max(0,(e.swing??0)-dt);(e.mesh.userData.arms??[]).forEach(a=>a.rotation.x=-1.25*Math.sin(e.swing/.4*Math.PI/2));if(e.mesh.position.z>=3){breach(e);return;}const slow=state.elapsed<(e.slowUntil||0)?1-Math.min(e.type?.titan ? .5 : .8,e.slowAmount??.2):1;
 // Keep a valid nearby target to avoid oscillating between overlapping taunt circles.
 const near=g=>golems.includes(g)&&g.hp>0&&g.mesh.position.distanceTo(e.mesh.position)<=TAUNT_RADIUS;
 const guard=near(e.guard)?e.guard:golems.filter(near).sort((a,b)=>a.mesh.position.distanceToSquared(e.mesh.position)-b.mesh.position.distanceToSquared(e.mesh.position))[0];
 if(guard!==e.guard){e.guard=guard;e.melee=.6;e.route=null;e.navTime=0;}
 if(guard){const delta=guard.mesh.position.clone().sub(e.mesh.position);delta.y=0;const d=delta.length();e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.tell=0;e.charging=0;e.mesh.userData.warn.visible=false;e.mesh.userData.bar.rotation.y=yaw-e.mesh.rotation.y;e.mesh.userData.fill.scale.x=Math.max(.01,e.hp/e.maxHP);
  const inReach=d<=ENEMY_MELEE_REACH+(e.type.hitRadius??0)&&clearWalk(e.mesh.position,guard.mesh.position);
  if(inReach){e.melee=(e.melee??.6)-dt;if(e.melee<=0){e.melee=1.2;e.swing=.4;(e.mesh.userData.arms??[]).forEach(a=>a.rotation.x=-1.25);damageGolem(guard,e.type.boss?16:e.type.charge?12:8);}}
  else{walkToward(e,guard.mesh.position,e.speed*slow,dt);e.melee=.6;}
  e.mesh.userData.legs.forEach((l,i)=>l.rotation.x=inReach?0:Math.sin(state.elapsed*6+e.phase+i*Math.PI)*.3);return;
 }

 const target=new THREE.Vector3(e.mesh.position.x,0,3.3);const delta=target.clone().sub(e.mesh.position),d=delta.length();e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.mesh.userData.bar.rotation.y=-e.mesh.rotation.y+yaw;e.mesh.userData.fill.scale.x=Math.max(.01,e.hp/e.maxHP);
 e.mesh.userData.warn.visible=e.tell>0;e.cooldown-=dt;
 if(e.type.id==='nautilus')e.mesh.position.y=.15+Math.sin(state.elapsed*2)*.1;
 if(!e.angry)return;
 if((e.type.ranged||e.type.charge)&&e.cooldown<=0&&e.tell<=0&&d>3){e.tell=1.2;e.target=target.clone();e.cooldown=6;}
 if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.type.ranged){const pos=e.mesh.position.clone();pos.y=1.4;const target=e.target.clone();target.y=1;const mesh=box(.35,.35,.35,0x8cdded,pos.x,pos.y,pos.z);effects.push({mesh,velocity:target.sub(pos).normalize().multiplyScalar(3),life:8,max:8,projectile:true});}else{e.chargeDir=e.target.clone().sub(e.mesh.position).normalize();e.charging=.85;}}}
 else if(e.charging>0){e.charging-=dt;moveBody(e.mesh.position,e.chargeDir.x*3*slow*dt,e.chargeDir.z*3*slow*dt);}
 else if(d>.05){if(e.type.titan)walkToward(e,target,e.speed*slow,dt);else{delta.normalize();moveBody(e.mesh.position,delta.x*e.speed*slow*dt,delta.z*e.speed*slow*dt);}}
 e.mesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(state.elapsed*6+e.phase+i*Math.PI)*.3);if(e.mesh.position.z>=3)breach(e);
}
function burst(pos,color,count=9){for(let i=0;i<count;i++){const mesh=box(.16,.16,.16,color,pos.x,pos.y+.8,pos.z);effects.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4+2,(Math.random()-.5)*5),life:.6,max:.6});}}
function damageEnemy(e,damage){if(!enemies.includes(e)||e.hp<=0)return;e.angry=true;e.hp-=damage;
 if(e.type?.mount&&!e.detached&&e.hp<=e.maxHP-e.type.mountHP&&e.hp>0){e.detached=true;const pos=e.mesh.position.clone(),type=ENEMIES.find(t=>t.id===e.type.mount);scene.remove(e.mesh);e.mesh=monsterModel(type);e.mesh.position.copy(pos);scene.add(e.mesh);e.type=type;e.speed=type.speed;toast("坐骑退场，小骑手继续前进！");}
burst(e.mesh.position,0xc4db8e,4);if(e.hp<=0){burst(e.mesh.position,0xf2d276,9);scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);state.kills++;if(e.type.split){const child=e.type.id==='magma-slime'?SMALL_MAGMA_SLIME_ENEMY:SMALL_SLIME_ENEMY;for(const pos of splitPositions(e.mesh.position,[-15,15,-15,2.85]))addEnemy(child,pos);toast(`${e.type.name}分裂成了2只${child.name}！`);}tone(440,.05);}}
function cancelBurst(){state.burstRemaining=0;state.burstTimer=0;}
function shoot(fresh=false){if(state.mode!=='playing')return;if(state.ammo<=0){if(fresh)openQuiz();return;}if(state.shot>0||state.burstRemaining>0)return;const w=WEAPONS[state.weapon];state.shot=w.interval;state.burstWeapon=state.weapon;state.burstRemaining=Math.min(w.burst||1,state.ammo)-1;state.burstTimer=w.burstInterval||0;fireRound();}
function updateBurst(dt){if(state.mode!=='playing')return;if(state.weapon!==state.burstWeapon){cancelBurst();return;}if(state.burstRemaining<=0)return;state.burstTimer-=dt;while(state.mode==='playing'&&state.burstRemaining>0&&state.burstTimer<=1e-9){state.burstRemaining--;state.burstTimer+=WEAPONS[state.weapon].burstInterval;fireRound();}}
function fireRound(){if(state.mode!=='playing'||state.ammo<=0)return;const w=WEAPONS[state.weapon];state.ammo--;tone(w.radius?95:320,.07);
 syncAim();scene.updateMatrixWorld(true);
 const origin=camera.position.clone(),direction=camera.getWorldDirection(new THREE.Vector3());
 raycaster.set(origin,direction);raycaster.far=30;
 const enemyMeshes=enemies.map(e=>e.mesh);
 // Scene geometry occludes shots; viewmodel and particles are excluded.
 const solids=scene.children.filter(o=>o!==player&&o!==camera&&o!==ring&&!enemyMeshes.includes(o)&&!effects.some(e=>e.mesh===o)&&!golems.some(g=>g.mesh===o)&&!plantSystem.plants.some(p=>p.mesh===o)&&!plantSystem.shots.some(p=>p.mesh===o)&&!plantSystem.markers.includes(o));
 const hits=raycaster.intersectObjects([...enemyMeshes,...solids],true);
 const impact=hits.find(h=>h.distance>.15),dist=impact?impact.distance:30;
 let hit=null;if(impact)hit=enemies.find(e=>{let o=impact.object;while(o){if(o===e.mesh)return true;o=o.parent;}return false;});
 const end=origin.clone().addScaledVector(direction,dist);if(w.radius){const explosion=hit?hit.mesh.position.clone():end.clone();for(const e of [...enemies]){const distance=Math.max(0,e.mesh.position.distanceTo(explosion)-(e.type.hitRadius??0));const a=explosion.clone();a.y+=1;const b=e.mesh.position.clone();b.y+=1;if(distance<w.radius&&!blockedBetween(a,b))damageEnemy(e,splashDamage(distance,w));}const mesh=new THREE.Mesh(new THREE.SphereGeometry(w.radius,16,8),new THREE.MeshBasicMaterial({color:0xffd48b,transparent:true,opacity:.4,wireframe:true}));mesh.position.copy(explosion);scene.add(mesh);effects.push({mesh,life:.35,max:.35,dispose:true});burst(explosion,0xf2ba62,16);}else if(hit)damageEnemy(hit,w.damage);
 const geo=new THREE.BufferGeometry().setFromPoints([origin,end]);const beam=new THREE.Line(geo,new THREE.LineBasicMaterial({color:w.color}));scene.add(beam);effects.push({mesh:beam,life:.09,max:.09,dispose:true});hud();if(state.ammo===0)openQuiz();}
// Isolated preview scene reuses the exact in-game model factories and renderer.
const catalogScene=new THREE.Scene();catalogScene.background=new THREE.Color(0x142a33);
catalogScene.add(new THREE.HemisphereLight(0xe6f8ff,0x59796b,3));const catalogLight=new THREE.DirectionalLight(0xffecd1,3);catalogLight.position.set(4,8,7);catalogScene.add(catalogLight);
const catalogCamera=new THREE.PerspectiveCamera(40,1,.01,500),catalogPivot=new THREE.Group();catalogScene.add(catalogPivot);
const catalogGroups=[{name:'泰坦 Boss',types:TITANS},{name:'怪物',types:[...ENEMIES,SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY]},{name:'植物',types:PLANTS},{name:'枪械',types:WEAPONS}];
let catalogGroup=0,catalogIndex=0,catalogAuto=true,catalogZoom=1,catalogRadius=1,catalogDrag=null;const catalogCache=new Map();
function catalogModel(group,index){const key=group+':'+index;if(catalogCache.has(key))return catalogCache.get(key);const type=catalogGroups[group].types[index];let mesh;
 if(group===2)mesh=plantSystem.model(type);else if(group===3){mesh=gun.clone();mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(type.radius?1.5:1,type.radius?1.5:1,index===1?1.7:1);mesh.visible=true;}else mesh=monsterModel(type);
 // Health/warning indicators belong to battle UI, not the model inspection.
 if(mesh.userData.bar)mesh.remove(mesh.userData.bar);if(mesh.userData.warn)mesh.remove(mesh.userData.warn);
 mesh.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3());mesh.position.sub(center);catalogCache.set(key,mesh);return mesh;
}
function showCatalogModel(){catalogPivot.clear();const mesh=catalogModel(catalogGroup,catalogIndex);catalogPivot.add(mesh);catalogPivot.rotation.set(0,.35,0);catalogZoom=1;mesh.updateMatrixWorld(true);catalogRadius=new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere()).radius;
 const type=catalogGroups[catalogGroup].types[catalogIndex];$('catalog-title').textContent=type.name+' · '+(catalogIndex+1)+' / '+catalogGroups[catalogGroup].types.length;
 $('catalog-info').textContent=catalogGroup===3?`单发伤害 ${type.damage} · 弹药 ${type.ammo}${type.burst?" · 三连发 / 每轮"+type.interval+"秒":" · 单发 / 1.1秒"}（与实战一样，共用枪身，以尺寸区分，含持枪手）`:catalogGroup===2?`伤害 ${type.damage} · 攻击间隔 ${type.interval} 秒`:`生命 ${type.hp} · 移动速度 ${type.speed}`;
 $('catalog-select').value=String(catalogIndex);
}
function selectCatalogGroup(index){catalogGroup=index;catalogIndex=0;$('catalog-select').innerHTML='';catalogGroups[index].types.forEach((type,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=type.name;$('catalog-select').appendChild(option);});[...$('catalog-tabs').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));showCatalogModel();}
function openCatalog(){if(state.mode!=='welcome')return;state.mode='catalog';$('welcome').classList.add('hidden');$('catalog').classList.remove('hidden');$('app').classList.add('catalog-open');selectCatalogGroup(catalogGroup);$('close-catalog').focus();}
function closeCatalog(){if(state.mode!=='catalog')return;catalogDrag=null;state.mode='welcome';$('catalog').classList.add('hidden');$('app').classList.remove('catalog-open');$('welcome').classList.remove('hidden');$('open-catalog').focus();}
function renderCatalog(dt){if(catalogAuto&&!catalogDrag)catalogPivot.rotation.y+=dt*.35;const rect=$('catalog-stage').getBoundingClientRect();const aspect=Math.max(.1,rect.width/Math.max(1,rect.height));catalogCamera.aspect=aspect;
 const half=Math.min(THREE.MathUtils.degToRad(catalogCamera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(catalogCamera.fov/2))*aspect));const distance=catalogRadius/Math.sin(half)*1.12/catalogZoom;catalogCamera.position.set(0,0,distance);catalogCamera.near=Math.max(.001,distance-catalogRadius*3);catalogCamera.far=distance+catalogRadius*4;catalogCamera.lookAt(0,0,0);catalogCamera.updateProjectionMatrix();
 renderer.setClearColor(0x142a33);renderer.clear();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.render(catalogScene,catalogCamera);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
catalogGroups.forEach((group,i)=>{const b=document.createElement('button');b.textContent=group.name;b.onclick=()=>selectCatalogGroup(i);$('catalog-tabs').appendChild(b);});
$('open-catalog').onclick=openCatalog;$('close-catalog').onclick=closeCatalog;$('catalog-select').onchange=e=>{catalogIndex=Number(e.target.value);showCatalogModel();};
for(const [id,delta] of [['catalog-prev',-1],['catalog-next',1]])$(id).onclick=()=>{catalogIndex=(catalogIndex+delta+catalogGroups[catalogGroup].types.length)%catalogGroups[catalogGroup].types.length;showCatalogModel();};
$('catalog-turn').onclick=()=>{catalogAuto=!catalogAuto;$('catalog-turn').textContent='自动旋转：'+(catalogAuto?'开':'关');};
$('catalog-zoom-in').onclick=()=>catalogZoom=clamp(catalogZoom*1.2,.6,2);$('catalog-zoom-out').onclick=()=>catalogZoom=clamp(catalogZoom/1.2,.6,2);$('catalog-reset').onclick=()=>{catalogPivot.rotation.set(0,.35,0);catalogZoom=1;};
$('catalog-stage').onpointerdown=e=>{catalogDrag={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);};
$('catalog-stage').onpointermove=e=>{if(!catalogDrag||catalogDrag.id!==e.pointerId)return;catalogPivot.rotation.y+=(e.clientX-catalogDrag.x)*.01;catalogPivot.rotation.x=clamp(catalogPivot.rotation.x+(e.clientY-catalogDrag.y)*.01,-1.2,1.2);catalogDrag.x=e.clientX;catalogDrag.y=e.clientY;};
$('catalog-stage').onpointerup=$('catalog-stage').onpointercancel=()=>catalogDrag=null;
let previous=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(state.mode==='catalog'){renderCatalog(dt);return;}
 titanCountdown();if(state.mode==='playing'){state.elapsed+=dt;state.shot=Math.max(0,state.shot-dt);updateBurst(dt);if(state.mode!=='playing'){renderer.render(scene,camera);return;}state.invincible=Math.max(0,state.invincible-dt);updateTitanSpawn();titanHud();state.spawn-=dt;if(state.spawn<=0){spawn();state.spawn=spawnInterval(state.elapsed);}
 let dx=0,dz=0;if(keys.has('w')||keys.has('arrowup')||touchKeys.has('forward'))dz--;if(keys.has('s')||keys.has('arrowdown')||touchKeys.has('backward'))dz++;if(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left'))dx--;if(keys.has('d')||keys.has('arrowright')||touchKeys.has('right'))dx++;const mag=Math.hypot(dx,dz)||1;const mx=(dx*Math.cos(yaw)+dz*Math.sin(yaw))/mag,mz=(-dx*Math.sin(yaw)+dz*Math.cos(yaw))/mag;moveBody(player.position,mx*4.2*dt,mz*4.2*dt);player.position.x=clamp(player.position.x,-5,5);player.position.z=clamp(player.position.z,6,8);
 syncAim();player.userData.legs.forEach((leg,i)=>leg.rotation.x=(dx||dz)?Math.sin(state.elapsed*12+i*Math.PI)*.45:0);
 updateGolems(dt);for(const e of [...enemies]){updateEnemy(e,dt);if(state.mode!=='playing')break;}
 autoDeployPlant();plantSystem.update(dt);plantSystem.updateShots(dt);if(fireHeld||keys.has(' '))shoot();updateVillagers(dt);for(const e of effects){if(state.mode!=='playing')break;e.life-=dt;if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);if(e.projectile){const p=e.mesh.position.clone();p.y=0;if(p.z>=3)e.life=0;if(blockers.some(([x,z,hx,hz])=>Math.abs(p.x-x)<hx+.2&&Math.abs(p.z-z)<hz+.2))e.life=0;}else e.velocity.y-=9*dt;e.mesh.rotation.x+=dt*5;}if(e.mesh.material.transparent)e.mesh.material.opacity=e.life/e.max*.4;}for(const e of effects.filter(e=>e.life<=0)){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=effects.filter(e=>e.life>0);
 }
 ring.position.set(player.position.x,.08,player.position.z);ring.visible=state.mode==='welcome'||state.invincible>0;ring.scale.setScalar(1+Math.sin(now/200)*.05);
 $('direction-hint').textContent=Math.cos(yaw)>0?'▲ 前方防线 · 僵尸来袭方向':'↶ 正在看后院 · 转身回到前方防线';$('crosshair').classList.toggle('hidden',state.mode!=='playing');$('controls-hint').textContent=document.pointerLockElement===canvas?'WASD 阵地移动 · 鼠标自由转头 · 左键射击 · R 补给 · Esc 暂停':'WASD 阵地移动 · 拖动自由转头 · 空格射击 · R 补给';gun.visible=state.mode!=='welcome';
 if(state.mode==='welcome'){const focus=new THREE.Vector3(2,0,0);camera.position.lerp(new THREE.Vector3(2,23,25),.04);camera.lookAt(focus);}else syncAim();renderer.render(scene,camera);
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();hud();player.position.set(6,0,1);player.rotation.y=-.4;requestAnimationFrame(animate);
// Read-only state inspection plus deterministic QA hooks, enabled only in Vite development.
if(import.meta.env.DEV)window.__game={updateBurst,cancelBurst,fireRound,titanCountdown,plantUpgradeSummary,catalogGroups,catalogModel,openCatalog,closeCatalog,selectCatalogGroup,renderCatalog,catalogCamera,catalogPivot,plantSystem,autoDeployPlant,updateTitanSpawn,state,openQuiz,selectQuestion,answer,nextQuestion,reset,shoot,get questions(){return questions;},get offers(){return [...offers];},get enemies(){return enemies;},spawn,monsterModel,damageEnemy,updateEnemy,summonGolem,damageGolem,updateGolems,get golems(){return golems;},get streak(){return streak;}};


