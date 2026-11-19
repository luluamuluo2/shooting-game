import * as THREE from 'three';
import './style.css';
import {SAVE_KEY,encodeSave,decodeSave} from './savegame.js';
import {createTitanModel,poseTitanAttack} from './titans.js';
import {createPlantSystem} from './plants.js';
import {VILLAGER_CAP,liveEnemyCount,isTornadoSpell,spellSpec,SPELL_REWARD_START,SPELL_REWARDS,applyTornadoDamage,titanRoundScale,bossAttackDamage,bossAttackText,SPECIAL_GOLEM_START,SPECIAL_GOLEM_REWARDS,bossKillSpawnInterval,bossRoundForCount,installBossHealth,enemyHealthRatio,enemyHealthText,applyEnemyDamage,PLANT_UPGRADE_START,PLANT_UPGRADES,plantStats,availablePlantUpgrades,TITANS,TITAN_FIRST,TITAN_INTERVAL,PLANTS,PLANT_SLOTS,PLANT_RANGE,PLANT_REWARD_START,WEAPONS,SMALL_MAGMA_SLIME_ENEMY,SMALL_SLIME_ENEMY,SMALL_SLIME_GOLEM,usedSlots,ENEMIES,ENEMY_CAP,spawnInterval,GOLEMS,GOLEM_CAP,TAUNT_RADIUS,ENEMY_MELEE_REACH,splashDamage,eligibleEnemies,supplyOffers,question,answerChoices,clamp} from './rules.js';
const previewParams=new window.URLSearchParams(window.location.search);
const previewKey=previewParams.get('spellPreview'),previewReward=SPELL_REWARDS.find(r=>r.typeId===previewKey),previewMode=Boolean(previewReward);
const $=id=>document.getElementById(id),canvas=$('world');
if(previewMode){$('app').classList.add('spell-preview-mode');document.addEventListener('keydown',e=>{e.preventDefault();e.stopImmediatePropagation();},true);}

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
function walkFree(x,z,radius=.4){return !blockers.some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+radius&&Math.abs(z-bz)<hz+radius);}
function moveBody(pos,dx,dz,radius=.4){const free=(x,z)=>walkFree(x,z,radius);const x=clamp(pos.x+dx,-15,15),z=clamp(pos.z+dz,-15,15);if(free(x,pos.z))pos.x=x;if(free(pos.x,z))pos.z=z;}
// Short visibility-graph routes around expanded static obstacle corners.
function clearWalk(a,b,radius=.4){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));for(let n=0;n<=steps;n++){const t=n/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(!walkFree(x,z,radius))return false;}return true;}
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
for(let i=0;i<VILLAGER_CAP;i++){const v=character();v.children[0].material=material([0xe7ba5b,0x7fb4ac,0xb497cd,0xe49b73,0x94ad68][i%5]);v.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});scene.add(v);villagers.push(v);}
function placeVillager(v,i){let x=(i%5-2)*2,z=12+Math.floor(i/5)*3;if(!villageFree(x,z,v)){outer:for(let zz=10.5;zz<=24;zz+=1.5)for(let xx=-6;xx<=6;xx+=1.5)if(villageFree(xx,zz,v)){x=xx;z=zz;break outer;}}v.position.set(x,0,z);v.rotation.y=Math.PI;v.userData.walk={target:null,idle:.3+i*.35,phase:i};v.userData.legs.forEach(l=>l.rotation.x=0);}
function arrangeVillagers(){villagers.forEach(v=>v.visible=false);villagers.forEach((v,i)=>{placeVillager(v,i);v.visible=true;});}
function villageFree(x,z,own){return x>=-7&&x<=7&&z>=10&&z<=25&&![...blockers,...villageTrees].some(([bx,bz,hx,hz])=>Math.abs(x-bx)<hx+.65&&Math.abs(z-bz)<hz+.65)&&!villagers.some(v=>v!==own&&v.visible&&Math.hypot(x-v.position.x,z-v.position.z)<1.15);}
function updateVillagers(dt){if(state.mode!=='playing')return;for(const v of villagers){if(!v.visible)continue;const w=v.userData.walk;if(w.idle>0){w.idle-=dt;continue;}if(!w.target){for(let attempt=0;attempt<12;attempt++){const x=-6+Math.random()*12,z=10.5+Math.random()*14;if(villageFree(x,z,v)){w.target={x,z};break;}}if(!w.target){w.idle=.5;continue;}}
 const dx=w.target.x-v.position.x,dz=w.target.z-v.position.z,d=Math.hypot(dx,dz),step=Math.min(d,.65*dt);const x=v.position.x+dx/(d||1)*step,z=v.position.z+dz/(d||1)*step;
 if(d<.15||!villageFree(x,z,v)){w.target=null;w.idle=.7+Math.random()*2;v.userData.legs.forEach(l=>l.rotation.x=0);continue;}v.position.set(x,0,z);v.rotation.y=Math.atan2(dx,dz);w.phase+=dt*5;v.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(w.phase+i*Math.PI)*.28);
}}
arrangeVillagers();
box(12,.1,4,0xb8b391,0,.04,7);
for(let x=-8;x<=8;x+=1)box(.65,.07,.22,0xefc359,x,.08,3);
for(const x of [-8.5,8.5]){box(.2,2,.2,0x806645,x,1,3);box(.8,.6,.12,0xefc359,x,1.8,3);}
const player=character();scene.add(player);const gun=new THREE.Group();camera.add(gun);gun.position.set(.32,-.28,-.58);gun.rotation.y=Math.PI;box(.2,.2,.65,0x36514c,0,0,.15,gun);box(.16,.3,.16,0x4c6358,0,-.15,0,gun);box(.22,.22,.48,0xe6be91,0,-.19,-.23,gun);
const ring=new THREE.Mesh(new THREE.RingGeometry(.8,.94,32),new THREE.MeshBasicMaterial({color:0xffe6a3,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;scene.add(ring);
const state={mode:'welcome',weapon:0,ammo:WEAPONS[0].ammo,health:VILLAGER_CAP,kills:0,solved:0,wrong:0,luckyEarned:0,luckyPending:0,luckyRemaining:0,celebrationPending:false,elapsed:0,round:1n,bossKills:0n,spawn:0,shot:0,burstRemaining:0,burstTimer:0,burstWeapon:0,invincible:0};let pendingPlant=null,supplyRound=null;let golems=[],streak=0,choiceValues=[],questionToken=0,answerLocked=true;let enemies=[],effects=[],questions=[],offers=[],selected=-1,fireHeld=false,soundOn=loadSoundPreference(),audio,masterGain;
const activeVoices=new Set(),SOUND_KEY='block-guardians-sound';
const plantSystem=createPlantSystem({THREE,scene,box,material,getEnemies:()=>enemies,getMode:()=>state.mode,getTime:()=>state.elapsed,damageEnemy,blockedBetween,toast,onChange:()=>hud()});
const movePointers=new Map(),firePointers=new Set();
const keys=new Set(),touchKeys=new Set(),raycaster=new THREE.Raycaster();
let yaw=0,pitch=0,lookPointer=null,lastLook=null;
const coarse=()=>window.matchMedia?.('(pointer: coarse)').matches??false;
function syncAim(){if(previewMode)return;camera.position.copy(player.position);camera.position.y+=1.8;camera.rotation.set(pitch,yaw,0,'YXZ');player.rotation.y=yaw+Math.PI;camera.updateMatrixWorld();}
function look(dx,dy){if(previewMode)return;yaw=Math.atan2(Math.sin(yaw-dx*.0025),Math.cos(yaw-dx*.0025));pitch=clamp(pitch-dy*.0025,-1.25,1.25);syncAim();}
function releaseLook(){lookPointer=null;lastLook=null;document.exitPointerLock?.();}
function captureLook(){
 if(previewMode)return;
 if(coarse())return;
 if(!canvas.requestPointerLock){toast('按住画面拖动转向，空格射击');return;}
 try{const request=canvas.requestPointerLock();request?.catch(()=>toast('鼠标未锁定：按住画面拖动转向，空格射击'));}catch{toast('按住画面拖动转向，空格射击');}
}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&state.mode==='playing')pause();});
document.addEventListener('pointerlockerror',()=>{if(state.mode==='playing')toast('鼠标未锁定：按住画面拖动转向，空格射击');});
function loadSoundPreference(){if(previewMode)return false;try{return window.localStorage.getItem('block-guardians-sound')!=='off';}catch{return true;}}
function syncSoundButtons(){document.querySelectorAll('[data-sound-toggle]').forEach(button=>{button.textContent=soundOn?'🔊 音效：开':'🔇 音效：关';button.setAttribute('aria-pressed',String(soundOn));button.setAttribute('aria-label',soundOn?'关闭所有游戏音效':'开启游戏音效');button.title='音效开关 · 快捷键 M';});}
function setSound(enabled){soundOn=Boolean(enabled);try{if(!previewMode)window.localStorage.setItem(SOUND_KEY,soundOn?'on':'off');}catch{}
 if(masterGain){masterGain.gain.cancelScheduledValues(audio.currentTime);masterGain.gain.setValueAtTime(soundOn?1:0,audio.currentTime);}
 if(!soundOn)for(const voice of [...activeVoices]){try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}activeVoices.delete(voice);}
 syncSoundButtons();if(!previewMode)sendPreviewControl('sync');
}
function toggleSound(){setSound(!soundOn);if(soundOn)tone(500);}
function tone(freq,duration=.08){if(previewMode||!soundOn)return;try{
 audio??=new (window.AudioContext||window.webkitAudioContext)();
 if(!masterGain){masterGain=audio.createGain();masterGain.gain.setValueAtTime(soundOn?1:0,audio.currentTime);masterGain.connect(audio.destination);}
 const resumed=audio.resume();resumed?.catch?.(()=>{});const o=audio.createOscillator(),v=audio.createGain(),voice={osc:o,gain:v};activeVoices.add(voice);
 o.onended=()=>{activeVoices.delete(voice);try{o.disconnect();v.disconnect();}catch{}};o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.035,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(v);v.connect(masterGain);o.start();o.stop(audio.currentTime+duration);
 }catch{}}
for(const button of document.querySelectorAll('[data-sound-toggle]')){button.onclick=toggleSound;button.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});}syncSoundButtons();
function companionCounts(items){
 const counts=new Map();for(const item of items){const type=item.type,entry=counts.get(type.id);if(entry)entry.count++;else counts.set(type.id,{name:type.name,count:1});}
 return [...counts.values()].map(({name,count})=>name+'×'+count).join(' · ')||'暂无';
}
function renderCompanionCounts(){
 $('plant-status').textContent='植物 '+plantSystem.plants.length+'/'+PLANT_SLOTS.length+' · '+companionCounts(plantSystem.plants);
 $('golem-status').textContent='傀儡 '+golems.length+'只 · 名额 '+usedSlots(golems)+' / '+GOLEM_CAP+' · '+companionCounts(golems);
}
function titanCountdown(){
 const panel=$('boss-timer'),active=enemies.some(e=>e.type?.titan),remaining=Math.max(0,Math.ceil(nextTitan-state.elapsed)),paused=state.mode!=='playing';
 $('challenge-boss').disabled=state.mode!=='playing'||active;$('challenge-boss').textContent=active?'泰坦正在场上':'立即挑战下一位泰坦 · B';panel.classList.toggle('hidden',state.mode==='welcome'||state.mode==='over');panel.classList.toggle('soon',!active&&remaining<=30);panel.classList.toggle('imminent',!active&&remaining<=10);
 let label=active?'泰坦仍在场 · 下一位等待本场结束':remaining>0?`下一位泰坦 ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}${remaining<=30?' · 准备好，慢慢来！':''}`:usedSlots(enemies)+TITANS[Number(BigInt(titanIndex)%BigInt(TITANS.length))].slots>ENEMY_CAP?`泰坦等待战场空位 · 需空出${TITANS[Number(BigInt(titanIndex)%BigInt(TITANS.length))].slots}名额`:'泰坦即将到来';
 label=`第${state.round}轮 · 击败${state.bossKills}泰坦 · 刷怪×${state.bossKills<20n?(1.5**Number(state.bossKills)).toFixed(2):'1.5^'+state.bossKills} · `+label;if(paused)label+=' · 计时暂停';if(panel.textContent!==label)panel.textContent=label;
}
function titanHud(){titanCountdown();const boss=enemies.find(e=>e.type?.titan),panel=$('boss-status');panel.classList.toggle('hidden',!boss);if(boss){const label=`第${boss.round}轮泰坦 · ${boss.type.name}  ${enemyHealthText(boss)} / ${enemyHealthText(boss,true)} · 攻击 ${bossAttackText(boss)}`;if(panel.textContent!==label)panel.textContent=label;panel.style.setProperty('--boss-health',`${enemyHealthRatio(boss)*100}%`);}}
function plantUpgradeSummary(p){const s=plantStats(p);return `${p.type.radius?'半径'+s.radius+'（'+Math.round(s.radius/p.type.radius*100)+'%）'+(' · '+s.projectiles+'发/轮'):s.projectiles+'发/轮'} · 减速${Math.round(s.slow*100)}%（升级强度${Math.round(s.slowStrength*100)}%${p.type.slow?"＋初始20%减速":""}）`;}
function hud(){renderLucky();titanHud();renderCompanionCounts();const w=WEAPONS[state.weapon];$('hearts').textContent='● '.repeat(state.health)+'○ '.repeat(VILLAGER_CAP-state.health);$('villager-count').textContent=`${state.health} / ${VILLAGER_CAP} 位村民`;$('hearts').setAttribute('aria-label',`还有 ${state.health} 位村民安全`);villagers.forEach((v,i)=>v.visible=i<state.health);$('score').textContent=String(state.kills).padStart(2,'0');$('solved').innerHTML=`${state.solved} <small>题</small>`;$('wrong').innerHTML=`${state.wrong} <small>题</small>`;$('weapon-name').textContent=w.name+(w.burst?' · 三连发':'');$('weapon-icon').textContent=w.icon;$('ammo').textContent=state.ammo;$('capacity').textContent=` / ${w.ammo}`;$('ammo-fill').style.width=`${state.ammo/w.ammo*100}%`;gun.scale.set(w.radius?1.5:1,w.radius?1.5:1,state.weapon===1?1.7:1);}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2300);}
function disposeTitanLights(mesh){for(const light of mesh.userData.attackRig?.lights||[])light.material.dispose();}
function clearEnemies(){clearSpellWeather();clearTitanShots();plantSystem.clear();pendingPlant=null;for(const g of golems){disposeGolemVisual(g);scene.remove(g.mesh);}golems=[];streak=0;for(const e of enemies){clearEnemySpell(e);disposeTitanLights(e.mesh);scene.remove(e.mesh);}enemies=[];for(const e of effects){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=[];}
function reset(){clearCelebration();supplyRound=null;runActive=true;lastSaveElapsed=0;newGameArmed=false;cancelQuizTransition();clearEnemies();camera.far=120;camera.updateProjectionMatrix();scene.fog.far=85;titanIndex=0n;nextTitan=TITAN_FIRST;seenTypes.clear();spawnIndex=0;Object.assign(state,{mode:'playing',weapon:0,ammo:WEAPONS[0].ammo,health:VILLAGER_CAP,kills:0,solved:0,wrong:0,luckyEarned:0,luckyPending:0,luckyRemaining:0,celebrationPending:false,elapsed:0,round:1n,bossKills:0n,spawn:1,shot:0,burstRemaining:0,burstTimer:0,burstWeapon:0,invincible:0});arrangeVillagers();player.position.set(0,0,7);player.rotation.y=Math.PI;yaw=0;pitch=0;player.visible=false;syncAim();captureLook();keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;for(const id of ['welcome','paused','quiz'])$(id).classList.add('hidden');hud();toast('守住前方黄线，保护身后的 10 位村民！');}
function pause(){clearCelebration();if(state.mode!=='playing')return;cancelBurst();state.mode='paused';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();$('pause-title').textContent='世界暂停了';$('pause-copy').textContent='僵尸也在原地等你。准备好了再出发。';$('resume').classList.remove('hidden');$('paused').classList.remove('hidden');}
function end(){cancelQuizTransition();state.mode='over';releaseLook();fireHeld=false;$('pause-title').textContent='村民已全部撤离';$('pause-copy').textContent=`防线被突破了。你击退了 ${state.kills} 只僵尸，完成了 ${state.solved} 道题。再来一次，你会更熟练！`;$('resume').classList.add('hidden');$('paused').classList.remove('hidden');}
const rewardSpecs=[...WEAPONS.map(w=>({name:w.name,max:w.range,need:1,icon:w.icon,detail:`${w.ammo} 发弹药${w.burst?' · 每次三连发消耗3发':''}`})),{name:'补充村民',max:20,need:2,icon:'♥',detail:'+1 位村民，最多10位'},...GOLEMS.map(g=>({name:g.name,max:g.math,need:3,icon:'◆',detail:`生命${g.hp} · 伤害${g.damage} / ${g.interval}秒 · DPS ${(g.damage/g.interval).toFixed(2)} · ${g.skill} · ${TAUNT_RADIUS}格嘲讽`})),...PLANTS.map(p=>({name:p.name,max:p.math,need:3,icon:'✿',detail:`${p.damage}伤害 / ${p.interval}秒${p.radius?" · 群伤半径"+p.radius:" · 单体"} · 射程${PLANT_RANGE} · 远距离会打偏${p.slow?' · 20%减速2秒':''}`}))];
rewardSpecs.push(...PLANT_UPGRADES.map(u=>({name:PLANTS.find(p=>p.id===u.plantId).name+' · '+u.name,max:u.math,need:2,icon:({multi:'↟',area:'◎',slow:'❄'})[u.kind],detail:(u.kind==='multi'?'每轮+1发，单颗全伤，上限100发':u.kind==='area'?'半径+基础300个百分点，最多3次：400%→700%→900%':'减速升级强度每次+100%，最多3次/300%；普通10%→20%→30%，冰瓜40%→60%→80%，泰坦最多50%')+' · 随机升级同种未封顶的一株；死亡丢失'})));
rewardSpecs.push(...SPECIAL_GOLEM_REWARDS.map(r=>{const g=GOLEMS.find(g=>g.id===r.typeId);return {name:`${r.tier==='super'?'超级':'终极'} · ${g.name} ×${r.count}`,max:g.math,need:r.need,icon:r.tier==='super'?'★':'✦',tier:r.tier,detail:`一次召唤${r.count}只相同傀儡 · 占${r.count*(g.slots??1)}名额 · 每只生命${g.hp} / 伤害${g.damage}`};}));
rewardSpecs.push(...SPELL_REWARDS.map(r=>({...r,max:r.math,tier:r.spellKey,spellLevel:r.tier,icon:({tornado:'🌩','fire-tornado':'🔥','water-tornado':'🌊',blizzard:'❄',meteor:'☄',blackhole:'◉'})[r.spellKey],detail:spellDescription(r.spellKey,r.tier)})));
function rewardFull(i){if(i>=SPELL_REWARD_START)return false;if(i>=SPECIAL_GOLEM_START){const r=SPECIAL_GOLEM_REWARDS[i-SPECIAL_GOLEM_START],g=GOLEMS.find(g=>g.id===r.typeId);return usedSlots(golems)+r.count*(g.slots??1)>GOLEM_CAP;}if(i>=PLANT_UPGRADE_START)return !availablePlantUpgrades(plantSystem.plants).includes(i);return i===3?state.health>=VILLAGER_CAP:i>=PLANT_REWARD_START?Boolean(pendingPlant)||plantSystem.plants.length>=PLANT_SLOTS.length:i>=4?usedSlots(golems)+1>GOLEM_CAP:false;}
function renderCards(){
 renderRerollState();$('question-cards').innerHTML='';$('supply-card-rules').innerHTML='';
 offers.forEach(i=>{const r=rewardSpecs[i],b=document.createElement('button'),badge=r.spellLevel===2||r.tier==='ultimate'?'✦ 终极':r.spellLevel===1||r.tier==='super'?'★ 超级':'';
  b.type='button';b.dataset.reward=String(i);b.disabled=rewardFull(i);b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',`${badge?badge+' · ':''}${r.name}，${r.max}以内，连续答对${r.need}题${b.disabled?'，已满员':''}`);b.classList.toggle('selected',selected===i);
  if(r.tier)b.classList.add('special-golem',r.tier);if(r.spellLevel!==undefined)b.classList.add('spell-level-'+r.spellLevel);
  b.innerHTML=`<span class="supply-badge">${badge||'普通补给'}</span><span class="gun" aria-hidden="true">${r.icon}</span><b>${r.name}</b><strong class="supply-need">${b.disabled?'已满员':`答对 ${r.need} 题`}</strong><small>${r.max}以内${r.need>1?' · 连续答对':''}</small>`;
  b.onclick=()=>selectQuestion(i);$('question-cards').appendChild(b);
  const line=document.createElement('li');line.textContent=r.name+'：'+r.detail;$('supply-card-rules').appendChild(line);
 });
}
function drawSupplyOffers(){return supplyOffers(state.health,usedSlots(golems),Math.random,pendingPlant?PLANT_SLOTS.length:plantSystem.plants.length,availablePlantUpgrades(plantSystem.plants),liveEnemyCount(enemies));}
function renderRerollState(){
 const remaining=supplyRound?.rerollsRemaining??3,locked=Boolean(supplyRound?.locked);
 $('reroll-supplies').textContent='↻ 换一批 · 剩余 '+remaining+' / 3 次';
 $('reroll-supplies').disabled=state.mode!=='quiz'||!supplyRound||locked||remaining<=0;
 $('reroll-hint').textContent=locked?'已经开始答题，本轮不能再换卡。关闭或读档会重出题并重计连续进度，但保留这批卡和剩余次数。':'本轮最多换3次；随机结果可能重复。关闭、重开补给或刷新不会恢复次数。';
}
function saveSupplyState(){const saved=saveProgress(false);if(!saved)$('reroll-hint').textContent+=' 本机存储不可用，刷新后无法保留次数或进度。';return saved;}
function openQuiz(){if(previewMode||state.mode!=='playing')return;clearCelebration();
 $('supply-rules').open=false;
 cancelBurst();cancelQuizTransition();state.mode='quiz';releaseLook();fireHeld=false;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();
 if(!supplyRound)supplyRound={offers:drawSupplyOffers(),rerollsRemaining:3,locked:false,selected:-1};
 offers=[...supplyRound.offers];questions=rewardSpecs.map(r=>question(r.max));selected=supplyRound.locked?supplyRound.selected:-1;answerLocked=true;questionToken++;streak=0;
 $('question-cards').classList.remove('hidden');$('answer-area').classList.add('hidden');$('close-quiz').classList.toggle('hidden',state.ammo===0);renderCards();$('quiz').classList.remove('hidden');
 if(selected>=0&&!rewardFull(selected))showQuestion('从第1题重新开始。');else $('question-cards').children[0]?.focus();
 saveSupplyState();
}
function rerollSupplies(){
 if(previewMode||state.mode!=='quiz'||!supplyRound||supplyRound.locked||selected>=0||supplyRound.rerollsRemaining<=0)return false;
 cancelQuizTransition();supplyRound.rerollsRemaining--;supplyRound.offers=drawSupplyOffers();offers=[...supplyRound.offers];questions=rewardSpecs.map(r=>question(r.max));selected=-1;streak=0;answerLocked=true;
 $('answer-area').classList.add('hidden');renderCards();saveSupplyState();$('question-cards').children[0]?.focus();return true;
}
$('reroll-supplies').onclick=e=>{if((e?.detail||0)>1)return;rerollSupplies();};
let quizTimer=null;
function cancelQuizTransition(){clearTimeout(quizTimer);quizTimer=null;questionToken++;answerLocked=true;}
function afterFeedback(delay,action){
 if(state.mode==='failed'||state.mode==='reward')supplyRound=null;renderRerollState();saveSupplyState();
 const token=questionToken,mode=state.mode;
 const advance=()=>{if(token!==questionToken||state.mode!==mode)return;
  // A background tab must not silently skip the explanation.
  if(document.hidden){quizTimer=setTimeout(advance,delay);return;}
  quizTimer=null;action();
 };
 quizTimer=setTimeout(advance,delay);
}
function renderAnswerProgress(){let el=$('answer-progress');if(!el){el=document.createElement('div');el.id='answer-progress';el.setAttribute('role','status');$('answer-area').prepend(el);}const total=rewardSpecs[selected]?.need??1;el.textContent=`${'● '.repeat(streak)}${'○ '.repeat(Math.max(0,total-streak))} ${streak} / ${total} 题`;}
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
 $('feedback').textContent=message||'点选答案即提交。';
 renderAnswerProgress();$('answer-area').classList.remove('hidden');$('expression').focus({preventScroll:false});
}
function selectQuestion(i){if(state.mode!=='quiz'||!offers.includes(i)||!questions[i]||rewardFull(i))return;if(selected===i)return;streak=0;selected=i;if(supplyRound){supplyRound.locked=true;supplyRound.selected=i;}renderCards();showQuestion('答错，本轮结束。');saveSupplyState();}
function nextQuestion(){if(state.mode!=='quiz'||!answerLocked||selected<0)return;questions[selected]=question(rewardSpecs[selected].max);renderCards();showQuestion();}
function answer(value,token=questionToken){
 if(state.mode!=='quiz'||selected<0||(selected<PLANT_REWARD_START&&rewardFull(selected))||answerLocked||token!==questionToken||!choiceValues.includes(value))return;
 answerLocked=true;const q=questions[selected],r=rewardSpecs[selected];
 for(const b of $('answer-options').children){b.disabled=true;const n=Number(b.textContent);b.classList.toggle('correct',n===q.answer);b.classList.toggle('incorrect',n===value&&n!==q.answer);}
 if(value!==q.answer){state.wrong++;hud();streak=0;state.mode='failed';selected=-1;$('close-quiz').classList.add('hidden');$('feedback').textContent=`${q.a} ${q.op} ${q.b} = ${q.answer}。本轮结束，无奖励。`;tone(240,.1);afterFeedback(1800,()=>{continueGame();toast('本轮补给结束。没弹时再次射击重新抽取，也可以按 R 补给。');});return;}
 state.solved++;streak++;recordLuckyCorrect();hud();tone([261.63,293.66,329.63,349.23,392][Math.min(4,streak-1)],.16);renderAnswerProgress();
 if(streak<r.need){$('feedback').textContent='答对啦！';afterFeedback(900,nextQuestion);return;}
 if(selected>=SPELL_REWARD_START){
  state.mode='reward';castSpell(SPELL_REWARDS[selected-SPELL_REWARD_START].spellKey,SPELL_REWARDS[selected-SPELL_REWARD_START].tier);if(state.ammo===0){state.weapon=0;state.ammo=WEAPONS[0].ammo;}
  hud();$('close-quiz').classList.add('hidden');$('feedback').textContent='法术释放！即将返回战斗。';afterFeedback(900,continueGame);return;
 }
 if(selected>=SPECIAL_GOLEM_START){
  const bundle=SPECIAL_GOLEM_REWARDS[selected-SPECIAL_GOLEM_START],type=GOLEMS.find(g=>g.id===bundle.typeId),fits=usedSlots(golems)+bundle.count*(type.slots??1)<=GOLEM_CAP;
  let summoned=0;if(fits)for(let n=0;n<bundle.count;n++)if(summonGolem(type))summoned++;
  if(summoned===bundle.count&&bundle.tier==='ultimate')state.celebrationPending=true;
  state.mode='reward';if(fits&&state.ammo===0){state.weapon=0;state.ammo=WEAPONS[0].ammo;}
  hud();$('close-quiz').classList.add('hidden');$('feedback').textContent=fits?`答对啦！${bundle.count}只${type.name}一起加入前线！`:'名额已不足，本轮未召唤，不会只发部分傀儡。';afterFeedback(900,continueGame);return;
 }
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
// Positive cumulative progress; never subtract on a wrong answer.
function recordLuckyCorrect(){const earned=Math.floor(state.solved/10);if(earned>state.luckyEarned){state.luckyPending+=earned-state.luckyEarned;state.luckyEarned=earned;}}
function renderLucky(){let badge=$('lucky-status');if(!badge){badge=document.createElement('div');badge.id='lucky-status';const text=document.createElement('span');text.setAttribute('role','status');const meter=document.createElement('progress');meter.max=10;meter.setAttribute('aria-label','算术能量，每累计答对10题获得幸运时刻');badge.append(text,meter);document.querySelector('.answer-counts').parentElement.appendChild(badge);}const count=state.solved%10,seconds=Math.ceil(state.luckyRemaining),signature=[count,seconds,state.luckyPending].join(':');if(badge.dataset.value===signature)return;badge.dataset.value=signature;badge.children[0].textContent=seconds>0?`✦ 幸运 ${seconds}秒 · 植物射速+25% · 能量${count}/10`:state.luckyPending>0?`✦ 已准备${state.luckyPending}次 · 返回战斗生效`:`算术能量 ${count} / 10`;badge.children[1].value=state.luckyPending>0?10:count;}

function activateLucky(){if(state.mode!=='playing'||document.hidden||previewMode)return;if(state.luckyPending>0){state.luckyRemaining+=state.luckyPending*10;state.luckyPending=0;}renderLucky();}
function updateLucky(dt){if(state.mode!=='playing'||document.hidden||previewMode)return 1;const boosted=Math.min(Math.max(0,dt),state.luckyRemaining);state.luckyRemaining=Math.max(0,state.luckyRemaining-dt);renderLucky();return dt>0?1+.25*boosted/dt:1;}
let celebrationTimer=null;
function clearCelebration(){clearTimeout(celebrationTimer);celebrationTimer=null;document.getElementById('summon-confetti')?.remove();}
function celebrateSummon(){
 clearCelebration();if(previewMode||state.mode!=='playing'||document.hidden)return;
 [523.25,659.25,783.99].forEach(f=>tone(f,.22));
 const layer=document.createElement('div');layer.id='summon-confetti';layer.setAttribute('aria-hidden','true');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(reduced){layer.className='reduced';layer.textContent='✦ 终极召唤成功 ✦';}else for(let i=0;i<24;i++){const bit=document.createElement('i');bit.style.setProperty('--x',`${8+(i*37%85)}%`);bit.style.setProperty('--delay',`${(i%4)*.035}s`);bit.style.setProperty('--turn',`${i*47}deg`);bit.style.background=['#ffd866','#73ead4','#bca5ff'][i%3];layer.appendChild(bit);}
 document.getElementById('app').appendChild(layer);celebrationTimer=setTimeout(clearCelebration,950);
}
function continueGame(){if(document.hidden)return;if(state.mode==='quiz'&&state.ammo===0)return;newGameArmed=false;$('restart').textContent='重新开始';cancelBurst();cancelQuizTransition();const rewarded=state.mode==='reward';state.mode='playing';captureLook();if(rewarded)state.invincible=0;state.shot=WEAPONS[state.weapon].interval;keys.clear();touchKeys.clear();movePointers.clear();firePointers.clear();fireHeld=false;$('quiz').classList.add('hidden');$('paused').classList.add('hidden');renderRerollState();activateLucky();const celebrate=state.celebrationPending;state.celebrationPending=false;saveProgress(false);if(celebrate)celebrateSummon();if(rewarded)toast('补给完成！继续守住前方黄线。');}
$('start').onclick=()=>startNewGame('start');$('restart').onclick=()=>startNewGame('restart');$('resume').onclick=continueGame;$('pause').onclick=pause;$('resupply').onclick=openQuiz;$('close-quiz').onclick=continueGame;
$('quiz').addEventListener('keydown',e=>{
 if(e.repeat&&(e.key==='Enter'||e.key===' '||/^[1-4]$/.test(e.key))){e.preventDefault();return;}
 if(state.mode==='quiz'&&/^[1-4]$/.test(e.key)){e.preventDefault();answer(choiceValues[Number(e.key)-1]);}
});

addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'&&!e.repeat){e.preventDefault();toggleSound();return;}if(e.key==='Escape'){if(state.mode==='catalog'){closeCatalog();return;}if(state.mode==='playing')pause();return;}if(state.mode!=='playing')return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)shoot(true);}if(k==='r'&&!e.repeat)openQuiz();if(k==='b'&&!e.repeat)updateTitanSpawn(true);});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
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
let titanIndex=0n,nextTitan=TITAN_FIRST;
function updateTitanSpawn(manual=false){if(previewMode)return false;if(state.mode!=='playing'||enemies.some(e=>e.type.titan)||(!manual&&(state.elapsed<nextTitan||usedSlots(enemies)+TITANS[Number(BigInt(titanIndex)%BigInt(TITANS.length))].slots>ENEMY_CAP)))return false;const type=TITANS[Number(BigInt(titanIndex)%BigInt(TITANS.length))];const count=BigInt(titanIndex)+1n,round=bossRoundForCount(count);state.round=round;addEnemy(type,new THREE.Vector3(0,0,-17+type.bodyRadius),undefined,round);titanIndex=count;nextTitan=state.elapsed+TITAN_INTERVAL;toast(`第${round}轮泰坦来袭：${type.name}！答题时依然安全暂停。`);hud();return true;}
$('challenge-boss').onclick=()=>updateTitanSpawn(true);
function updateNormalSpawns(dt){if(previewMode)return;if(state.mode!=='playing')return;state.spawn-=dt;if(state.spawn>0)return;const interval=bossKillSpawnInterval(state.elapsed,state.bossKills),due=interval>0?Math.floor(-state.spawn/interval)+1:ENEMY_CAP;
 // Never loop over an astronomical backlog. At most the current free slot budget can enter.
 const attempts=Math.min(ENEMY_CAP,Math.max(0,ENEMY_CAP-usedSlots(enemies)),due);for(let n=0;n<attempts;n++){if(usedSlots(enemies)>=ENEMY_CAP)break;spawn();}
 state.spawn=interval>0?interval-((-state.spawn)%interval):0;
}
let spawnIndex=0;const seenTypes=new Set();
// Continuous front-band sampling, independent of enemy selection and spawn clocks.
const spawnFootprints=new Map();
function spawnRadius(type,mesh){
 if(spawnFootprints.has(type.id))return spawnFootprints.get(type.id);
 const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(.4,Math.hypot(size.x,size.z)/2);spawnFootprints.set(type.id,radius);return radius;
}
function normalSpawnPosition(type,mesh,rng=Math.random){
 const radius=spawnRadius(type,mesh),extent=Math.min(13,17-radius-.15);
 const back=Math.max(-15,-17+radius+.15),front=-9;
 let best=null,bestGap=-Infinity;
 // Prefer a clear gap; at extreme density use the least crowded legal candidate
 // rather than reducing the requested spawn rate or removing existing enemies.
 for(let n=0;n<32;n++){
  const p=new THREE.Vector3((rng()*2-1)*extent,0,back+rng()*(front-back));
  if(!clearWalk(p,p,radius+.25))continue;
  let gap=Infinity;
  for(const e of enemies){const r=e.type.titan?e.type.bodyRadius:(spawnFootprints.get(e.type.id)??.9);gap=Math.min(gap,Math.hypot(p.x-e.mesh.position.x,p.z-e.mesh.position.z)-radius-r);}
  if(gap>.35)return p;
  if(gap>bestGap){best=p;bestGap=gap;}
 }
 // Deterministic legal fallback also handles a degenerate/random source.
 if(!best)for(let x=-extent;x<=extent;x+=.5){const p=new THREE.Vector3(x,0,back);if(clearWalk(p,p,radius+.25)){best=p;break;}}
 return best;
}
function spawn(forced){if(usedSlots(enemies)>=ENEMY_CAP)return;const types=eligibleEnemies(state.elapsed,enemies);if(!types.length)return;
 const unseen=types.filter(t=>!seenTypes.has(t.id));const type=forced||unseen[0]||types[(spawnIndex++)%types.length];
 if(usedSlots(enemies)+(type.slots??1)>ENEMY_CAP)return;
 // A charging boss never arrives while another charger is active.
 const mesh=monsterModel(type),position=type.titan?new THREE.Vector3(0,0,-17+type.bodyRadius):normalSpawnPosition(type,mesh);if(!position)return;mesh.position.copy(position);
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
const titanCoreGeometry=new THREE.CylinderGeometry(4.8,4.8,2,24),titanCoreMaterial=new THREE.MeshBasicMaterial({color:0xffb95c,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide});
function addEnemy(type,position,mesh=monsterModel(type),round=state.round){
 mesh.position.copy(position);scene.add(mesh);const enemy={mesh,type,hp:type.hp,maxHP:type.hp,speed:type.speed,cooldown:4,phase:Math.random()*6,angry:true,tell:0,charging:0,detached:false};if(type.titan){installBossHealth(enemy,round);const scale=titanRoundScale(round);mesh.scale.setScalar(scale);enemy.visualScale=scale;
 // Keep navigation playable in the fixed arena. A visible ground-level combat core
 // supplies the stable melee/bullet contact point when the body towers overhead.
 if(scale>4){const core=new THREE.Mesh(titanCoreGeometry,titanCoreMaterial);core.position.y=1/scale;core.scale.setScalar(1/scale);core.castShadow=false;mesh.add(core);mesh.userData.combatCore=core;}
 mesh.userData.bar.scale.setScalar(1/scale);mesh.userData.warn.scale.setScalar(1/scale);
 mesh.userData.bar.position.y=Math.min(5.15*scale,24)/scale;
 camera.far=Math.max(120,scale*12);camera.updateProjectionMatrix();scene.fog.far=Math.max(85,scale*10);
 }enemies.push(enemy);
}
// These six variants share combat values; every difference below is purely cosmetic.
function decorateBasicGolem(mesh,type){
 const style=type.appearance;if(!style)return;
 const front=(w,h,color,x,y,z=.37)=>box(w,h,.045,color,x,y,z,mesh);
 if(style==='dirt'){
  for(const [x,y,w] of [[-.35,1.55,.28],[.22,1.1,.35],[.35,1.8,.2],[-.18,2.35,.16],[.12,2.58,.22]])front(w,.17,0x694b36,x,y,y>2?.34:.37);
  front(.18,.16,0xb39268,-.12,1.3);front(.2,.12,0xb39268,.2,2.18,.34);
 }else if(style==='glass'){
  mesh.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===type.color){o.material=o.material.clone();(mesh.userData.ownedMaterials??=[]).push(o.material);o.material.transparent=true;o.material.opacity=.42;o.material.depthWrite=false;o.material.roughness=.15;}});
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
const GOLEM_SPAWN_SPOTS=Array.from({length:20},(_,row)=>1.3-row*(6.8/19)).flatMap(z=>Array.from({length:20},(_,col)=>new THREE.Vector3(-5.6+col*(11.2/19),0,z))).filter(p=>clearWalk(p,p)).sort((a,b)=>Math.sin(a.x*17+a.z*13)-Math.sin(b.x*17+b.z*13));
function summonGolem(type,position=null){if(usedSlots(golems)+(type.slots??1)>GOLEM_CAP)return false;const mesh=new THREE.Group();const legs=[],arms=[];box(1.2,1.3,.7,type.color,0,1.35,0,mesh);box(.7,.65,.65,type.color,0,2.35,0,mesh);for(const x of [-.24,.24])box(.13,.12,.05,0x8fe5e7,x,2.4,.35,mesh);for(const x of [-.8,.8]){const shoulder=new THREE.Group();shoulder.position.set(x,1.75,0);mesh.add(shoulder);box(.4,1.2,.5,type.color,0,-.6,0,shoulder);arms.push(shoulder);}for(const x of [-.35,.35])legs.push(box(.4,.7,.5,type.color,x,.35,0,mesh));box(.35,.4,.05,type.id==='redstone'?0xff6059:0x7fc8b0,0,1.5,.38,mesh);
 decorateBasicGolem(mesh,type);if(type.slime)box(1.4,1.4,.9,type.color,0,1.4,0,mesh);if(type.scale)mesh.scale.setScalar(type.scale);const bar=new THREE.Group();bar.position.y=3;box(1.2,.14,.06,0x345652,0,0,0,bar);const fill=box(1.1,.1,.08,0x65e2e0,0,0,.04,bar);mesh.add(bar);mesh.userData={...mesh.userData,legs,arms,bar,fill,appearance:type.appearance??type.id};mesh.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});const spots=GOLEM_SPAWN_SPOTS,spot=spots.find(p=>golems.every(g=>g.mesh.position.distanceToSquared(p)>.01))||spots[golems.length%spots.length];const lane=spot.x;mesh.position.copy(position||spot);scene.add(mesh);golems.push({mesh,type,hp:type.hp,cooldown:.5,swing:0,home:lane,patrol:null,patrolTime:0,stuck:0});hud();return true;}
function disposeGolemVisual(g){for(const material of g.mesh.userData.ownedMaterials??[])material.dispose();g.mesh.userData.ownedMaterials=[];}
function damageGolem(g,damage){if(!golems.includes(g))return;if(typeof damage==='bigint')damage=damage>=BigInt(Math.ceil(g.hp))?g.hp:Number(damage);g.hp=Math.max(0,g.hp-damage);burst(g.mesh.position,0x8edede,3);if(g.hp===0){disposeGolemVisual(g);removeTitanShotsFor(g);scene.remove(g.mesh);golems=golems.filter(x=>x!==g);if(g.type.split){for(const pos of splitPositions(g.mesh.position,[-13,13,-6,1.8]))summonGolem(SMALL_SLIME_GOLEM,pos);toast('粘液块傀儡分成了2只小伙伴！');}else toast(`${g.type.name}退场了，可以再次答题召唤。`);}hud();}
function assignDefenseHomes(){
 // Spatial ordering avoids allies repeatedly crossing each other when filling gaps.
 const ordered=[...golems].sort((a,b)=>a.mesh.position.x-b.mesh.position.x);
 for(let i=0;i<ordered.length;i++){const sectors=Math.min(5,ordered.length),sector=Math.min(sectors-1,Math.floor(i*sectors/ordered.length));const home=sectors===1?0:-10+20*sector/(sectors-1);if(ordered[i].home!==home)ordered[i].patrol=null;ordered[i].home=home;}
}
function patrolTarget(g){
 for(let attempt=0;attempt<24;attempt++){
  const point=new THREE.Vector3(clamp((g.home??0)+(Math.random()-.5)*3.6,-13,13),0,-5.5+Math.random()*6.8);
  if(point.distanceTo(g.mesh.position)<1||!clearWalk(point,point))continue;
  if(clearWalk(g.mesh.position,point)||walkingRoute(g.mesh.position,point,[-13,13,-6,1.8]).length){g.patrol=point;g.patrolTime=0;g.stuck=0;return;}
 }
 g.patrol=null;g.patrolTime=0;
}
function golemTarget(g,claims){
 let target=null,best=-Infinity;
 for(const e of enemies){const d=g.mesh.position.distanceTo(e.mesh.position);if(d>18||e.hp<=0)continue;
  const score=e.mesh.position.z*2-d*.7-Math.abs(e.mesh.position.x-(g.home??0))*.9-(claims.get(e)??0)*6+(e.guard===g?8:0)+(g.defenseTarget===e?1:0);
  if(score>best){best=score;target=e;}
 }
 if(target)claims.set(target,(claims.get(target)??0)+1);g.defenseTarget=target;return target;
}
function updateGolems(dt){if(state.mode!=='playing')return;assignDefenseHomes();const claims=new Map();for(const g of [...golems]){g.cooldown=Math.max(0,g.cooldown-dt);g.swing=Math.max(0,g.swing-dt);const armAngle=-1.45*Math.sin((g.swing/.32)*Math.PI/2);g.mesh.userData.arms.forEach(a=>a.rotation.x=armAngle);const target=golemTarget(g,claims);if(target){g.patrol=null;g.patrolTime=0;g.stuck=0;}else{g.patrolTime+=dt;if(!g.patrol||g.mesh.position.distanceTo(g.patrol)<.2||g.patrolTime>12||g.stuck>.6)patrolTarget(g);}let delta=target?target.mesh.position.clone().sub(g.mesh.position):(g.patrol||g.mesh.position).clone().sub(g.mesh.position);delta.y=0;const d=delta.length();g.mesh.userData.bar.rotation.y=yaw-g.mesh.rotation.y;g.mesh.userData.fill.scale.x=Math.max(.01,g.hp/g.type.hp);
 if(d>.05)g.mesh.rotation.y=Math.atan2(delta.x,delta.z);const moving=d>(target?g.type.reach+(target.type.hitRadius??0):.1)||(target&&!clearWalk(g.mesh.position,target.mesh.position));if(moving){const before=g.mesh.position.clone();walkToward(g,target?target.mesh.position:(g.patrol||g.mesh.position),g.type.speed,dt,[-13,13,-6,1.8]);g.mesh.position.x=clamp(g.mesh.position.x,-13,13);g.mesh.position.z=clamp(g.mesh.position.z,-6,1.8);if(!target)g.stuck=g.mesh.position.distanceTo(before)<g.type.speed*dt*.2?g.stuck+dt:0;}g.mesh.userData.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(state.elapsed*7+i*Math.PI)*.3:0);
 if(target&&d<=g.type.reach+(target.type.hitRadius??0)&&g.cooldown<=0){const a=g.mesh.position.clone(),b=target.mesh.position.clone();a.y=b.y=1.3;if(blockedBetween(a,b))continue;g.cooldown=g.type.interval;g.swing=.32;g.mesh.userData.arms.forEach(a=>a.rotation.x=-1.45);const pos=target.mesh.position.clone();for(const e of [...enemies])if(e===target||(g.type.radius&&Math.max(0,e.mesh.position.distanceTo(pos)-(e.type.hitRadius??0))<g.type.radius&&!blockedBetween(b,e.mesh.position.clone().add(new THREE.Vector3(0,1.3,0)))))damageEnemy(e,g.type.damage);burst(pos,g.type.color,6);hud();}
 }}
function loseVillager(){if(state.mode!=='playing')return;state.health=Math.max(0,state.health-1);hud();tone(150,.12);toast(`防线被突破，1 位村民安全撤离！还剩 ${state.health} 位。`);if(state.health===0)end();}
const frostGeometry=new THREE.BoxGeometry(1,1,1),frostEdgesGeometry=new THREE.EdgesGeometry(frostGeometry),windGeometry=new THREE.ConeGeometry(4,16,20,10,true),windRingGeometry=new THREE.TorusGeometry(1,.055,4,32);
const frostMaterial=new THREE.MeshBasicMaterial({color:0xb3edff,transparent:true,opacity:.14,depthWrite:false,side:THREE.FrontSide}),frostEdgeMaterial=new THREE.LineBasicMaterial({color:0xc8f6ff,transparent:true,opacity:.8,depthWrite:false}),windMaterial=new THREE.MeshBasicMaterial({color:0xd2faff,transparent:true,opacity:.45,wireframe:true});
function clearEnemySpell(e){clearBlackholeVisual(e);if(e.spellMarker)scene.remove(e.spellMarker);e.spellMarker=null;e.tornado=null;e.frozenUntil=0;}
function positionSpellMarker(e){
 const marker=e.spellMarker;if(!marker)return;
 e.mesh.updateMatrixWorld(true);marker.position.copy(marker.userData.center).applyMatrix4(e.mesh.matrixWorld);
 e.mesh.getWorldQuaternion(marker.quaternion);e.mesh.getWorldScale(marker.scale);marker.scale.multiply(marker.userData.size);
}
function spellMarker(e,frozen){
 if(e.spellMarker)scene.remove(e.spellMarker);e.spellMarker=null;if(!frozen)return;
 // Fit the actual posed model in root-local space, excluding HUD and warning nodes.
 e.mesh.updateMatrixWorld(true);const inverse=e.mesh.matrixWorld.clone().invert(),bounds=new THREE.Box3(),part=new THREE.Box3();
 e.mesh.traverse(o=>{if(!o.isMesh||!o.geometry)return;let ancestor=o;while(ancestor&&ancestor!==e.mesh){if(ancestor===e.mesh.userData.bar||ancestor===e.mesh.userData.warn||!ancestor.visible)return;ancestor=ancestor.parent;}
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();part.copy(o.geometry.boundingBox).applyMatrix4(inverse.clone().multiply(o.matrixWorld));bounds.union(part);
 });
 if(bounds.isEmpty())bounds.set(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,2,.5));
 const group=new THREE.Group();group.userData.frost=true;group.userData.center=bounds.getCenter(new THREE.Vector3());group.userData.size=bounds.getSize(new THREE.Vector3()).multiplyScalar(1.08).addScalar(.08);
 const shell=new THREE.Mesh(frostGeometry,frostMaterial),edges=new THREE.LineSegments(frostEdgesGeometry,frostEdgeMaterial);shell.renderOrder=2;edges.renderOrder=3;group.add(shell,edges);group.traverse(o=>{o.raycast=()=>{};});scene.add(group);e.spellMarker=group;positionSpellMarker(e);
}
// One center funnel shared by overlapping casts; strongest active flight controls size.
const sharedWindField=new THREE.Group(),windVeilMaterial=new THREE.MeshBasicMaterial({color:0xc9edf5,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});
for(let column=0;column<1;column++){
 const group=new THREE.Group();group.position.set(0,16.8,-11);group.scale.setScalar(2.1);group.userData.rings=[];group.userData.debris=[];
 const funnel=new THREE.Mesh(windGeometry,windVeilMaterial);funnel.rotation.z=Math.PI;group.add(funnel);
 for(let i=0;i<10;i++){const ring=new THREE.Mesh(windRingGeometry,windMaterial),radius=.7+i*.34;ring.position.set(.2*Math.sin(i),-7+i*1.55,.2*Math.cos(i));ring.scale.set(radius,radius,1);ring.rotation.x=Math.PI/2;group.add(ring);group.userData.rings.push(ring);}
 for(let i=0;i<36;i++){const debris=new THREE.Mesh(cube,windMaterial);debris.scale.set(.12,.08,.2);group.add(debris);group.userData.debris.push(debris);}
 group.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});sharedWindField.add(group);
}
const elementalFireMaterial=new THREE.MeshBasicMaterial({color:0xff6b12,transparent:true,opacity:.8,depthWrite:false}),elementalWaterMaterial=new THREE.MeshBasicMaterial({color:0x36bfff,transparent:true,opacity:.65,depthWrite:false}),elementalGroundGeometry=new THREE.CircleGeometry(1,40);
const elementalGround=new THREE.Group();elementalGround.position.set(0,.08,-11);const flood=new THREE.Mesh(elementalGroundGeometry,elementalWaterMaterial);flood.rotation.x=-Math.PI/2;flood.scale.setScalar(9);elementalGround.add(flood);elementalGround.userData.flood=flood;elementalGround.userData.rings=[];
for(let i=0;i<6;i++){const ring=new THREE.Mesh(windRingGeometry,elementalFireMaterial);ring.rotation.x=-Math.PI/2;elementalGround.add(ring);elementalGround.userData.rings.push(ring);}
elementalGround.userData.flames=[];for(let i=0;i<24;i++){const flame=new THREE.Mesh(cube,elementalFireMaterial);elementalGround.add(flame);elementalGround.userData.flames.push(flame);}
const column=sharedWindField.children[0];column.userData.elementParticles=[];
for(let i=0;i<48;i++){const particle=new THREE.Mesh(cube,elementalFireMaterial);column.add(particle);column.userData.elementParticles.push(particle);}
elementalGround.traverse(o=>{o.raycast=()=>{};});column.traverse(o=>{o.raycast=()=>{};});scene.add(elementalGround);elementalGround.visible=false;scene.add(sharedWindField);sharedWindField.visible=false;
function updateSharedWind(){
 sharedWindField.visible=!['welcome','catalog','over'].includes(state.mode)&&enemies.some(e=>e.tornado);
 elementalGround.visible=false;if(!sharedWindField.visible)return;
 const flights=enemies.filter(e=>e.tornado).map(e=>e.tornado),recent=[...spellEffects].reverse().find(effect=>isTornadoSpell(effect.key)&&flights.some(f=>(f.key||'tornado')===effect.key&&(f.tier??null)===(effect.tier??null))),flight=recent?flights.find(f=>(f.key||'tornado')===recent.key&&(f.tier??null)===(recent.tier??null)):flights[flights.length-1],key=flight.key||'tornado',scale=spellSpec(key,flight.tier??null).scale,fire=key==='fire-tornado',water=key==='water-tornado';
 elementalGround.userData.flames.forEach((flame,i)=>{flame.visible=fire;const a=i*2.399+state.elapsed*.2,r=2+(i%7);const height=.5+.65*(1+Math.sin(state.elapsed*8+i));flame.position.set(Math.cos(a)*r,height/2,Math.sin(a)*r);flame.scale.set(.35,height,.35);flame.rotation.z=Math.sin(state.elapsed*4+i)*.2;});
 sharedWindField.userData.element=key;elementalGround.visible=fire||water;elementalGround.scale.setScalar(scale);elementalGround.userData.flood.visible=water;
 windVeilMaterial.color.setHex(fire?0xff6a18:water?0x279ee8:0xc9edf5);windMaterial.color.setHex(fire?0xffd35a:water?0x8eeeff:0xd2faff);
 elementalGround.userData.rings.forEach((ring,i)=>{ring.material=water?elementalWaterMaterial:elementalFireMaterial;const wave=(state.elapsed*(water?.7:1.1)+i/6)%1;ring.scale.setScalar(1+wave*9);ring.position.y=.02+i*.006;});
 sharedWindField.children.forEach((group,column)=>{const t=state.elapsed;group.scale.setScalar(2.1*scale);group.position.y=16.8*scale;group.rotation.y=t*(1.3+column*.15);
  group.userData.elementParticles.forEach((particle,i)=>{particle.visible=fire||water;particle.material=water?elementalWaterMaterial:elementalFireMaterial;const u=(state.elapsed*(water?.3:.6)+i/48)%1,a=i*2.399+state.elapsed*(water?2.1:3),r=.7+u*2.5;particle.position.set(Math.cos(a)*r,-7.7+u*15,Math.sin(a)*r);particle.scale.set(water?.12:.22,water?.32:.8+Math.sin(state.elapsed*9+i)*.25,water?.12:.22);particle.rotation.set(water?.3:0,a,Math.sin(a)*.25);});
  group.userData.rings.forEach((ring,i)=>{ring.rotation.z=t*(1.8+i*.1)+i;ring.position.x=Math.sin(t*1.2+i)*.3;});
  group.userData.debris.forEach((debris,i)=>{const y=((i/36*15+t*2)%15)-7.5,r=.7+(y+7.5)*.22,a=i*2.399+t*(2+i%3);debris.position.set(Math.cos(a)*r,y,Math.sin(a)*r);debris.rotation.set(a,t+i,a*.3);});
 });
}
// Camera-relative layered snow: one draw call, reusable GPU buffers, no combat RNG.
const snowCount=1200,snowPositions=new Float32Array(snowCount*3),snowGeometry=new THREE.BufferGeometry();
for(let i=0;i<snowCount;i++){const layer=i%3,depth=3+layer*6+(i%11)*.35;snowPositions[i*3]=(Math.sin(i*2.399)*.5)*depth*3;snowPositions[i*3+1]=((i*37%101)/100-.5)*depth*2;snowPositions[i*3+2]=-depth;}
snowGeometry.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
const snowPixels=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=(x-7.5)/7.5,dy=(y-7.5)/7.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),edge=Math.abs(Math.sin(a*3));const i=(y*16+x)*4;snowPixels[i]=snowPixels[i+1]=snowPixels[i+2]=255;snowPixels[i+3]=r<.95&&(edge<.17||r<.2)?255:0;}
const snowTexture=new THREE.DataTexture(snowPixels,16,16,THREE.RGBAFormat);snowTexture.needsUpdate=true;
const snowMaterial=new THREE.PointsMaterial({map:snowTexture,alphaTest:.05,color:0xe9f8ff,size:.13,transparent:true,opacity:.9,depthTest:false,depthWrite:false,sizeAttenuation:true});
const spellSnow=new THREE.Points(snowGeometry,snowMaterial);spellSnow.raycast=()=>{};spellSnow.frustumCulled=false;spellSnow.renderOrder=20;spellSnow.visible=false;camera.add(spellSnow);let snowUntil=0;
function clearSpellWeather(){sharedWindField.visible=false;elementalGround.visible=false;snowUntil=0;spellSnow.visible=false;for(const effect of spellEffects)disposeSpellVisual(effect);spellEffects.length=0;nextSpellId=1;spellTint.visible=false;}
function updateSpellWeather(dt){updateSharedWind();updateSpellTint();spellSnow.visible=state.mode==='playing'&&state.elapsed<snowUntil;if(!spellSnow.visible||state.mode!=='playing')return;snowMaterial.size=.13*Math.max(.8,...spellEffects.filter(e=>e.key==='blizzard').map(e=>effectSpec(e).scale));
 for(let i=0;i<snowCount;i++){const j=i*3,depth=-snowPositions[j+2];snowPositions[j+1]-=dt*(1.5+(i%3)*.6);snowPositions[j]+=Math.sin(state.elapsed*2+i)*dt*.4;if(snowPositions[j+1]<-depth)snowPositions[j+1]+=depth*2;if(Math.abs(snowPositions[j])>depth*1.5)snowPositions[j]*=-.98;}
 snowGeometry.attributes.position.needsUpdate=true;
}
function spellLanding(e,index=0,origin=e.mesh.position,observer=player.position){
 const radius=e.type.bodyRadius??.4,limit=e.type.titan?Math.max(0,17-radius):15;
 const reference=origin.clone().setY(0),distance=p=>(p.x-observer.x)**2+(p.z-observer.z)**2,minDistance=distance(reference);
 // Prefer the far-field center, but never advance toward the village or shorten
 // horizontal player distance. This takes priority over a perfect shared cluster.
 const legal=p=>Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit&&p.z<=reference.z+1e-8&&distance(p)+1e-8>=minDistance&&clearWalk(p,p,radius);
 const angle=index*2.399,r=.35+Math.min(2.4,Math.sqrt(index)*.18),preferred=new THREE.Vector3(Math.cos(angle)*r,0,-11+Math.sin(angle)*r);
 if(legal(preferred))return preferred;
 for(let ring=0;ring<=30;ring++)for(let step=0;step<24;step++){const a=angle+step*Math.PI/12,p=new THREE.Vector3(Math.cos(a)*ring*.5,0,-11+Math.sin(a)*ring*.5);if(legal(p))return p;}
 // A legal old position always wins over pushing a cornered enemy forward.
 if(legal(reference))return reference;return e.mesh.position.clone().setY(0);
}
function effectSpec(effect){return spellSpec(effect.key,effect.tier??null);}
function spellDescription(key,tier){const spec=spellSpec(key,tier);return ({tornado:`闪电扣当前生命${spec.percent}% · 龙卷聚拢到敌方远端（不靠近玩家）`,'fire-tornado':`烈焰扣当前生命${spec.percent}% · 火龙卷聚拢到敌方远端（不靠近玩家）`,'water-tornado':`洪流扣当前生命${spec.percent}% · 水龙卷聚拢到敌方远端（不靠近玩家）`,blizzard:`冻结${spec.duration}秒 · 下一次有效伤害击败`,meteor:`随机击败施法时${spec.percent}%敌人（人数四舍五入）`,blackhole:`${spec.duration}秒吸入并清除当前敌人及分裂子体`})[key];}

// Effects have a fixed target snapshot and independent active-battle clocks.
const spellEffects=[];let nextSpellId=1;
const spellTintMaterial=new THREE.MeshBasicMaterial({color:0x55202b,transparent:true,opacity:0,depthTest:false,depthWrite:false});
const spellTint=new THREE.Mesh(new THREE.PlaneGeometry(2,2),spellTintMaterial);spellTint.position.z=-1;spellTint.raycast=()=>{};spellTint.renderOrder=19;spellTint.visible=false;camera.add(spellTint);
function updateSpellTint(){
 const dark=spellEffects.some(e=>e.key==='blackhole'),red=spellEffects.some(e=>e.key==='meteor');
 spellTint.visible=(dark||red)&&state.mode==='playing';
 spellTintMaterial.color.setHex(dark?0x080417:0x9d2210);spellTintMaterial.opacity=dark?.3:red?.18:0;
 const h=Math.tan(camera.fov*Math.PI/360);spellTint.scale.set(h*camera.aspect,h,1);
}
function disposeSpellVisual(effect){scene.remove(effect.mesh);effect.palette?.dispose();}

const spellRockGeometry=new THREE.IcosahedronGeometry(1,1),spellCloudGeometry=new THREE.SphereGeometry(1,8,6),spellDiscGeometry=new THREE.CircleGeometry(1,48);
const spellMats={
 cloud:new THREE.MeshBasicMaterial({color:0x353849,transparent:true,opacity:.8,depthWrite:false}),
 white:new THREE.MeshBasicMaterial({color:0xeaf8ff,transparent:true,opacity:.65,depthWrite:false}),
 ground:new THREE.MeshBasicMaterial({color:0xeaf8ff,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}),
 lightning:new THREE.MeshBasicMaterial({color:0xe5f9ff,transparent:true,opacity:.9,depthWrite:false}),
 meteor:new THREE.MeshStandardMaterial({color:0x9b2714,emissive:0xef4b18,emissiveIntensity:1.4}),
 tail:new THREE.MeshBasicMaterial({color:0xff962f,transparent:true,opacity:.65,depthWrite:false}),
 hole:new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide,toneMapped:false,fog:false}),
 rock:new THREE.MeshStandardMaterial({color:0x292324,roughness:1,metalness:.1}),
 crack:new THREE.MeshBasicMaterial({color:0xffc340}),
 ember:new THREE.MeshBasicMaterial({color:0xff6b21,transparent:true,opacity:.8,depthWrite:false}),
 rim:new THREE.MeshBasicMaterial({color:0x241c3c,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}),
 halo:new THREE.MeshBasicMaterial({color:0x9763ff,transparent:true,opacity:.7,depthWrite:false})
};
function vfxMesh(geometry,mat,parent){const mesh=new THREE.Mesh(geometry,mat);mesh.raycast=()=>{};parent.add(mesh);return mesh;}
function decorateMeteor(rock,detailed=false){
 const count=detailed?54:12;rock.userData.flames=[];rock.userData.embers=[];
 for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*2.399;
  const tile=vfxMesh(cube,spellMats.rock,rock);tile.position.set(Math.cos(a)*r*1.02,y*1.02,Math.sin(a)*r*1.02);tile.scale.set(detailed?.34:.55,detailed?.22:.35,detailed?.3:.45);tile.lookAt(0,0,0);
 }
 if(detailed)for(let i=0;i<18;i++){const a=i*.71,vein=vfxMesh(cube,spellMats.crack,rock);vein.position.set(Math.cos(a)*.9,Math.sin(i*1.7)*.45,Math.sin(a)*.9);vein.scale.set(.035,.35,.04);vein.rotation.set(a,0,a*.7);}
 for(let i=0;i<(detailed?12:4);i++){const flame=vfxMesh(cube,i%3?spellMats.ember:spellMats.crack,rock);const a=i*2.399;flame.userData.base=new THREE.Vector3(Math.cos(a)*.45,1.05+i*.14,Math.sin(a)*.45);flame.position.copy(flame.userData.base);flame.scale.set(.18,.9+i*.04,.18);rock.add(flame);rock.userData.flames.push(flame);}
 if(detailed)for(let i=0;i<20;i++){const ember=vfxMesh(cube,spellMats.ember,rock);ember.scale.setScalar(.045);rock.userData.embers.push(ember);}
}
function animateMeteorSurface(rock,time){
 (rock.userData.flames||[]).forEach((flame,i)=>{flame.position.copy(flame.userData.base);flame.position.x+=Math.sin(time*9+i)*.08;flame.scale.y=.7+(i%4)*.18+.16*Math.sin(time*11+i);});
 (rock.userData.embers||[]).forEach((ember,i)=>{const u=(i/20+time*.6)%1,a=i*2.399;ember.position.set(Math.cos(a)*(.6+u*.6),1+u*3,Math.sin(a)*(.6+u*.6));});
}
function makeSpellVisual(effect){
 const group=new THREE.Group();effect.mesh=group;group.userData.spellEffect=true;effect.clouds=[];effect.bolts=[];effect.rocks=[];
 if(isTornadoSpell(effect.key)||effect.key==='blizzard'){
  for(let i=0;i<14;i++){const cloud=vfxMesh(spellCloudGeometry,effect.key==='blizzard'?spellMats.white:effect.key==='fire-tornado'?elementalFireMaterial:effect.key==='water-tornado'?elementalWaterMaterial:spellMats.cloud,group);cloud.position.set(-15+(i%7)*5,19+(i%3),-13+Math.floor(i/7)*10);cloud.scale.set(4,1.3,2.8);cloud.userData.base=cloud.position.clone();effect.clouds.push(cloud);}
  if(isTornadoSpell(effect.key))for(let i=0;i<12;i++){const bolt=vfxMesh(spellCloudGeometry,effect.key==='fire-tornado'?elementalFireMaterial:effect.key==='water-tornado'?elementalWaterMaterial:spellMats.lightning,group);bolt.position.set(-13+(i%6)*5,10,-12+Math.floor(i/6)*9);bolt.scale.set(.07,9,.07);bolt.rotation.z=(i%2?1:-1)*.12;effect.bolts.push(bolt);}
  if(effect.key==='blizzard'){const ground=vfxMesh(spellDiscGeometry,spellMats.ground,group);ground.rotation.x=-Math.PI/2;ground.position.set(0,.035,-6);ground.scale.set(24,24,1);}
 }else if(effect.key==='meteor'){
  const primary=vfxMesh(spellRockGeometry,spellMats.meteor,group);primary.scale.setScalar(4.5);effect.primary=primary;decorateMeteor(primary,true);
  const trail=vfxMesh(spellCloudGeometry,spellMats.tail,primary);trail.position.y=2.1;trail.scale.set(.5,2,.5);
  const ground=vfxMesh(windRingGeometry,spellMats.tail,group);ground.rotation.x=Math.PI/2;ground.position.set(0,.05,-5);ground.scale.setScalar(8);effect.ground=ground;effect.shockRings=[];for(let i=0;i<3;i++){const wave=vfxMesh(windRingGeometry,i%2?spellMats.ember:spellMats.crack,group);wave.rotation.x=Math.PI/2;wave.position.set(0,.06+i*.03,-5);effect.shockRings.push(wave);}
  effect.selected.forEach((enemy,i)=>{const rock=vfxMesh(spellRockGeometry,spellMats.meteor,group);rock.scale.setScalar(.5+(i%3)*.15);decorateMeteor(rock);const tail=vfxMesh(spellCloudGeometry,spellMats.tail,rock);tail.position.y=1.8;tail.scale.set(.35,2,.35);effect.rocks.push({enemy,mesh:rock});});
 }else{
  effect.palette=spellMats.halo.clone();
  // A single flattened local plane keeps core, disk and lens rings coherent.
  effect.holeFrame=new THREE.Group();effect.holeFrame.position.set(0,6,-5);effect.holeFrame.rotation.set(-.08,.08,.025);effect.holeFrame.scale.set(2,.7,1);group.add(effect.holeFrame);
  const hole=vfxMesh(spellDiscGeometry,spellMats.hole,effect.holeFrame);hole.position.z=.18;hole.scale.set(4,4,1);effect.hole=hole;
  effect.disk=new THREE.Group();effect.holeFrame.add(effect.disk);effect.diskBits=[];
  for(let i=0;i<96;i++){const bit=vfxMesh(cube,i%3?effect.palette:spellMats.crack,effect.disk);bit.userData.r=4.6+(i%8)*.25;bit.userData.a=i*2.399;bit.scale.set(.35,.12,.16);effect.diskBits.push(bit);}
  effect.darkRim=vfxMesh(windRingGeometry,spellMats.rim,effect.holeFrame);effect.darkRim.scale.setScalar(4.15);
  effect.warpRings=[];for(let i=0;i<3;i++){const warp=vfxMesh(windRingGeometry,effect.palette,effect.holeFrame);effect.warpRings.push(warp);}
  effect.halos=[];for(let i=0;i<5;i++){const halo=vfxMesh(windRingGeometry,effect.palette,effect.holeFrame);halo.scale.setScalar(4.3+i*.35);effect.halos.push(halo);}
  const ground=vfxMesh(windRingGeometry,effect.palette,group);ground.rotation.x=Math.PI/2;ground.position.set(0,.06,-5);ground.scale.setScalar(7);effect.ground=ground;
 }
 const scale=effectSpec(effect).scale;group.scale.setScalar(scale);group.position.set(0,(effect.key==='blackhole'?6:0)*(1-scale),-5*(1-scale)-(isTornadoSpell(effect.key)?6:0));scene.add(group);poseSpellVisual(effect);return group;
}
function poseSpellVisual(effect){
 const t=effect.time;
 for(const [i,cloud] of (effect.clouds||[]).entries()){cloud.position.copy(cloud.userData.base);const duration=effectSpec(effect).duration,enter=Math.max(0,1-t/.35),exit=Math.max(0,1-(duration-t)/.4);cloud.position.x+=-38*enter+38*exit+Math.sin(t*.9+i)*1.5;cloud.position.z+=Math.cos(t*.7+i)*.4;}
 for(const [i,bolt] of (effect.bolts||[]).entries())bolt.visible=t>=.45&&t<.75&&((i%3)!==1||t>.58);
 // Rock centers follow world-space targets; tier scale changes size, not impact location.
 let rockInverse;if(effect.rocks?.length){effect.mesh.updateMatrixWorld(true);rockInverse=effect.mesh.matrixWorld.clone().invert();}
 for(const {enemy,mesh} of effect.rocks||[]){mesh.visible=enemies.includes(enemy)&&!effect.applied;const index=effect.targets.indexOf(enemy),end=enemy.mesh.position,origin=effect.origins[index]||end;const u=Math.min(1,t/1.2);mesh.position.set(origin.x+(end.x-origin.x)*u,end.y+24*effectSpec(effect).scale*(1-u),origin.z+(end.z-origin.z)*u).applyMatrix4(rockInverse);mesh.rotation.set(t*2,t*3,0);animateMeteorSurface(mesh,t);}
 if(effect.primary){effect.primary.visible=!effect.applied;const u=Math.min(1,t/1.2);effect.primary.position.set(0,35*(1-u)+3.2,-5);effect.primary.rotation.set(t*.7,t*.9,0);animateMeteorSurface(effect.primary,t);}
 if(effect.key==='meteor'&&effect.ground){effect.ground.visible=t>=1.2;const u=Math.max(0,Math.min(1,(t-1.2)/.4));effect.ground.scale.setScalar(3+u*12);effect.ground.position.x=Math.sin(t*42)*.18*(1-u);effect.ground.position.z=-5+Math.sin(t*37)*.18*(1-u);(effect.shockRings||[]).forEach((wave,i)=>{const progress=Math.max(0,u-i*.12);wave.visible=t>=1.2&&progress>0;wave.scale.setScalar(2+progress*20);});}
 if(effect.key==='blackhole'){effect.palette.color.setHSL((.7+t*.15)%1,.8,.55);const duration=effectSpec(effect).duration,shrink=t>duration*.8?Math.max(.02,(duration-t)/(duration*.2)):1;effect.holeFrame.scale.set(2*shrink,.7*shrink,shrink);
  effect.darkRim.scale.setScalar(4.15);
  effect.diskBits.forEach((bit,i)=>{const a=bit.userData.a+t*(1.8+(i%4)*.25),r=bit.userData.r+.08*Math.sin(t*7+i);bit.position.set(Math.cos(a)*r,Math.sin(a)*r,.09*Math.sin(a*3+t));bit.rotation.z=a;});
  effect.warpRings.forEach((warp,i)=>{const radius=4.5+i*.65;warp.scale.set(radius*(1+.06*Math.sin(t*6+i)),radius*(1-.06*Math.sin(t*6+i)),1);warp.rotation.z=-t*(.5+i*.15);});
  effect.halos.forEach((halo,i)=>{halo.scale.setScalar(4.3+i*.35);halo.rotation.z=t*(.6+i*.15);});if(effect.ground){effect.ground.position.x=Math.sin(t*45)*.12;effect.ground.position.z=-5+Math.cos(t*39)*.12;}}
}
function clearBlackholeVisual(e){
 const visual=e.blackholeVisual;if(!visual)return;e.mesh.scale.copy(visual.scale);
 for(const row of visual.materials){row.mesh.material=row.original;row.clone.dispose();}e.blackholeVisual=null;
}
function poseBlackholeTarget(effect,e,index){
 if(!enemies.includes(e))return;
 if(!e.blackholeVisual){const materials=[];e.mesh.traverse(mesh=>{if(mesh.isMesh&&mesh.material?.color){const original=mesh.material,clone=original.clone();clone.color.lerp(new THREE.Color(0x8a59c8),.75);mesh.material=clone;materials.push({mesh,original,clone});}});e.blackholeVisual={scale:e.mesh.scale.clone(),materials};}
 const t=Math.min(1,effect.time/effectSpec(effect).duration),start=effect.origins[index];e.mesh.position.lerpVectors(start,new THREE.Vector3(0,6,-5),t*t);e.mesh.scale.copy(e.blackholeVisual.scale).multiplyScalar(Math.max(.02,1-t*.98));positionSpellMarker(e);
}
function spellDefeat(e,suppressSplit=false){
 if(!enemies.includes(e))return;
 // Route through normal death bookkeeping without converting enormous BigInt HP.
 if(e.hpUnits!==undefined)e.hpUnits=1000000n;
 damageEnemy(e,e.hpUnits!==undefined?1:e.hp,{suppressSplit,quiet:true});
}
function castSpell(key,tier=0){
 if(!spellSpec(key,tier))return;
 if(tier!==null&&![0,1,2].includes(tier))return;const spec=spellSpec(key,tier);
 const targets=[...enemies],effect={id:nextSpellId++,key,tier,time:0,applied:false,targets,selected:[],origins:targets.map(e=>e.mesh.position.clone()),...(isTornadoSpell(key)?{playerOrigin:player.position.clone()}: {})};
 if(key==='meteor'){const shuffled=[...targets];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}effect.selected=shuffled.slice(0,Math.round(targets.length*spec.percent/100));}
 if(key==='blizzard'){snowUntil=Math.max(snowUntil,state.elapsed+spec.duration);effect.applied=true;for(const e of targets){removeTitanShotsFor(e);e.frozenUntil=Math.max(e.frozenUntil||0,state.elapsed+spec.duration);spellMarker(e,true);}}
 if(key==='blackhole')for(const e of targets){removeTitanShotsFor(e);e.tornado=null;e.tell=0;e.charging=0;}
 spellEffects.push(effect);makeSpellVisual(effect);updateSpellTint();
 toast(spec.name+'：'+spellDescription(key,tier));
}
function updateSpellEffects(dt){
 if(state.mode!=='playing')return;
 for(const effect of [...spellEffects]){
  effect.time+=dt;
  if(isTornadoSpell(effect.key)&&!effect.applied&&effect.time>=.7){
   effect.applied=true;
   for(const e of [...effect.targets])if(enemies.includes(e)){
    const loss=applyTornadoDamage(e,effectSpec(effect).percent);if(loss>0&&state.elapsed<(e.frozenUntil||0)){spellDefeat(e);continue;}
    removeTitanShotsFor(e);e.route=null;e.navTime=0;e.guard=null;e.melee=.6;e.tell=0;e.charging=0;e.tornado={start:e.mesh.position.clone(),end:spellLanding(e,effect.targets.indexOf(e),effect.origins[effect.targets.indexOf(e)],effect.playerOrigin??player.position),time:0,key:effect.key,...(effect.tier==null?{}:{tier:effect.tier})};spellMarker(e,state.elapsed<(e.frozenUntil||0));damageEnemy(e,0,{quiet:true});
   }hud();
  }
  if(effect.key==='blackhole')effect.targets.forEach((e,i)=>poseBlackholeTarget(effect,e,i));
  const impact=effect.key==='meteor'?1.2:effect.key==='blackhole'?effectSpec(effect).duration:Infinity;
  if(!effect.applied&&effect.time>=impact){effect.applied=true;for(const e of [...(effect.key==='meteor'?effect.selected:effect.targets)])spellDefeat(e,effect.key==='blackhole');hud();}
  poseSpellVisual(effect);
  const duration=effectSpec(effect).duration;
  if(effect.time>=duration){disposeSpellVisual(effect);spellEffects.splice(spellEffects.indexOf(effect),1);}
 }
}
function updateEnemySpell(e,dt){
 if(state.mode!=='playing'||!enemies.includes(e))return true;
 const blackhole=spellEffects.find(effect=>effect.key==='blackhole'&&!effect.applied&&effect.targets.includes(e));if(blackhole)return true;
 if(state.elapsed<(e.frozenUntil||0)){positionSpellMarker(e);return true;}
 if(e.frozenUntil){e.frozenUntil=0;if(e.tornado)spellMarker(e,false);else if(e.spellMarker){scene.remove(e.spellMarker);e.spellMarker=null;}}
 if(!e.tornado)return false;const flight=e.tornado;flight.time=Math.min(1.2,flight.time+dt);const t=flight.time/1.2;
 e.mesh.position.lerpVectors(flight.start,flight.end,t);e.mesh.position.y+=Math.sin(t*Math.PI)*12;
 if(e.spellMarker){positionSpellMarker(e);e.spellMarker.rotation.y+=dt*8;}
 if(t>=1){e.mesh.position.copy(flight.end);e.tornado=null;if(e.spellMarker){scene.remove(e.spellMarker);e.spellMarker=null;}hud();}
 return true;
}
function breach(e){if(!enemies.includes(e))return;clearEnemySpell(e);removeTitanShotsFor(e);disposeTitanLights(e.mesh);scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);loseVillager();}
function blockedBetween(a,b){const delta=b.clone().sub(a),length=delta.length();if(length<.01)return false;const ray=new THREE.Raycaster(a,delta.normalize(),.08,length-.08);const excluded=new Set([player,camera,ring,...enemies.map(e=>e.mesh),...effects.map(e=>e.mesh),...golems.map(g=>g.mesh),...plantSystem.plants.map(p=>p.mesh),...plantSystem.shots.map(p=>p.mesh),...plantSystem.markers]);const solids=scene.children.filter(o=>!excluded.has(o));return ray.intersectObjects(solids,true).length>0;}
function updateEnemy(e,dt){if(state.mode!=='playing'||!enemies.includes(e))return;if(updateEnemySpell(e,dt))return;const before=e.mesh.position.clone();plantSystem.contacts(e);updateEnemyMotion(e,dt);plantSystem.contacts(e,before,e.mesh.position);}
// Wither projectiles are real, single-target shots, not delayed instant damage.
const titanShots=[],witherShotGeometry=new THREE.IcosahedronGeometry(.38,1),witherShotMaterial=new THREE.MeshStandardMaterial({color:0x17131d,emissive:0x382247,emissiveIntensity:.65,roughness:.7});
function removeTitanShot(shot){scene.remove(shot.mesh);const index=titanShots.indexOf(shot);if(index>=0)titanShots.splice(index,1);}
function clearTitanShots(){for(const shot of [...titanShots])removeTitanShot(shot);}
function removeTitanShotsFor(entity){for(const shot of [...titanShots])if(shot.source===entity||shot.target===entity)removeTitanShot(shot);}
function fireTitanShot(source,target){
 const mesh=new THREE.Mesh(witherShotGeometry,witherShotMaterial);source.mesh.updateMatrixWorld(true);
 mesh.position.copy(source.mesh.userData.mouth.getWorldPosition(new THREE.Vector3()));mesh.raycast=()=>{};scene.add(mesh);
 titanShots.push({mesh,source,target,life:3,speed:Math.max(18,mesh.position.distanceTo(target.mesh.position.clone().add(new THREE.Vector3(0,1.4,0)))/.75),damage:bossAttackDamage(source)});
}
function updateTitanShots(dt){
 if(state.mode!=='playing')return;scene.updateMatrixWorld(true);
 for(const shot of [...titanShots]){
  if(!enemies.includes(shot.source)||!golems.includes(shot.target)||shot.target.hp<=0){removeTitanShot(shot);continue;}
  shot.life-=dt;if(shot.life<=0){removeTitanShot(shot);continue;}
  const end=shot.target.mesh.position.clone().add(new THREE.Vector3(0,1.4,0)),from=shot.mesh.position.clone(),delta=end.clone().sub(from),distance=delta.length();
  const next=distance<=shot.speed*dt?end:from.clone().addScaledVector(delta,shot.speed*dt/distance);
  if(blockedBetween(from,next)){removeTitanShot(shot);continue;}
  shot.mesh.position.copy(next);shot.mesh.rotation.x+=dt*4;shot.mesh.rotation.y+=dt*3;
  if(next.distanceTo(end)<=.55){removeTitanShot(shot);damageGolem(shot.target,shot.damage);}
 }
}
function poseEnemyTitan(e,inReach=false){
 if(!e.type.titan)return;
 poseTitanAttack(e.mesh,e.type,inReach?Math.max(0,1-(e.melee??.6)/.35):0,(e.swing||0)/.4);
}
function poseTitanAxe(mesh,charge=0,recovery=0){const arm=mesh.userData.axeArm;if(!arm)return;arm.rotation.x=recovery>0?.45*Math.sin(Math.min(1,recovery)*Math.PI/2):charge>0?-1.65*Math.min(1,charge):0;}
function updateEnemyMotion(e,dt){if(state.mode!=='playing'||!enemies.includes(e))return;e.swing=Math.max(0,(e.swing??0)-dt);(e.mesh.userData.arms??[]).forEach(a=>a.rotation.x=-1.25*Math.sin(e.swing/.4*Math.PI/2));if(e.mesh.position.z>=3){breach(e);return;}const slow=state.elapsed<(e.slowUntil||0)?1-Math.min(e.type?.titan ? .5 : .8,e.slowAmount??.2):1;
 // Keep a valid nearby target to avoid oscillating between overlapping taunt circles.
 const near=g=>golems.includes(g)&&g.hp>0&&g.mesh.position.distanceTo(e.mesh.position)<=TAUNT_RADIUS;
 const taunted=near(e.guard)?e.guard:golems.filter(near).sort((a,b)=>a.mesh.position.distanceToSquared(e.mesh.position)-b.mesh.position.distanceToSquared(e.mesh.position))[0];
 const ranged=e.type.id==='witherzilla';const guard=taunted||(ranged?golems.filter(g=>g.hp>0&&g.mesh.position.distanceTo(e.mesh.position)<=12).sort((a,b)=>a.mesh.position.distanceToSquared(e.mesh.position)-b.mesh.position.distanceToSquared(e.mesh.position))[0]:undefined);
 if(guard!==e.guard){e.guard=guard;e.melee=.6;e.route=null;e.navTime=0;}
 if(guard){const delta=guard.mesh.position.clone().sub(e.mesh.position);delta.y=0;const d=delta.length();e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.tell=0;e.charging=0;e.mesh.userData.warn.visible=false;e.mesh.userData.bar.rotation.y=yaw-e.mesh.rotation.y;e.mesh.userData.fill.scale.x=Math.max(.01,enemyHealthRatio(e));
  e.mesh.updateMatrixWorld(true);const inReach=ranged?d<=12&&!blockedBetween(e.mesh.userData.mouth.getWorldPosition(new THREE.Vector3()),guard.mesh.position.clone().add(new THREE.Vector3(0,1.4,0))):d<=ENEMY_MELEE_REACH+(e.type.hitRadius??0)&&clearWalk(e.mesh.position,guard.mesh.position);
  if(inReach){e.melee=(e.melee??.6)-dt;if(e.melee<=0){e.melee=1.2;e.swing=.4;(e.mesh.userData.arms??[]).forEach(a=>a.rotation.x=-1.25);if(ranged){poseTitanAttack(e.mesh,e.type,0,1);fireTitanShot(e,guard);}else damageGolem(guard,e.type.titan?bossAttackDamage(e):e.type.boss?16:e.type.charge?12:8);}}
  else{walkToward(e,guard.mesh.position,e.speed*slow,dt);e.melee=.6;}
  poseEnemyTitan(e,inReach);
  e.mesh.userData.legs.forEach((l,i)=>l.rotation.x=inReach?0:Math.sin(state.elapsed*6+e.phase+i*Math.PI)*.3);return;
 }

 poseEnemyTitan(e);
 const target=new THREE.Vector3(e.mesh.position.x,0,3.3);const delta=target.clone().sub(e.mesh.position),d=delta.length();e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.mesh.userData.bar.rotation.y=-e.mesh.rotation.y+yaw;e.mesh.userData.fill.scale.x=Math.max(.01,enemyHealthRatio(e));
 e.mesh.userData.warn.visible=e.tell>0;e.cooldown-=dt;
 if(e.type.id==='nautilus')e.mesh.position.y=.15+Math.sin(state.elapsed*2)*.1;
 if(!e.angry)return;
 if((e.type.ranged||e.type.charge)&&e.cooldown<=0&&e.tell<=0&&d>3){e.tell=1.2;e.target=target.clone();e.cooldown=6;}
 if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.type.ranged){const pos=e.mesh.position.clone();pos.y=1.4;const target=e.target.clone();target.y=1;const mesh=box(.35,.35,.35,0x8cdded,pos.x,pos.y,pos.z);effects.push({mesh,velocity:target.sub(pos).normalize().multiplyScalar(3),life:8,max:8,projectile:true});}else{e.chargeDir=e.target.clone().sub(e.mesh.position).normalize();e.charging=.85;}}}
 else if(e.charging>0){e.charging-=dt;moveBody(e.mesh.position,e.chargeDir.x*3*slow*dt,e.chargeDir.z*3*slow*dt);}
 else if(d>.05){walkToward(e,target,e.speed*slow,dt);}
 e.mesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(state.elapsed*6+e.phase+i*Math.PI)*.3);if(e.mesh.position.z>=3)breach(e);
}
function burst(pos,color,count=9){for(let i=0;i<count;i++){const mesh=box(.16,.16,.16,color,pos.x,pos.y+.8,pos.z);effects.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4+2,(Math.random()-.5)*5),life:.6,max:.6});}}
function damageEnemy(e,damage,{suppressSplit=false,quiet=false}={}){if(!enemies.includes(e)||e.hp<=0)return;const before=e.hpUnits??e.hp;e.angry=true;applyEnemyDamage(e,damage);if(state.elapsed<(e.frozenUntil||0)&&(e.hpUnits??e.hp)<before){if(e.hpUnits!==undefined)e.hpUnits=0n;else e.hp=0;}
 if(e.type?.mount&&!e.detached&&e.hp<=e.maxHP-e.type.mountHP&&e.hp>0){clearBlackholeVisual(e);e.detached=true;const pos=e.mesh.position.clone(),type=ENEMIES.find(t=>t.id===e.type.mount);scene.remove(e.mesh);e.mesh=monsterModel(type);e.mesh.position.copy(pos);scene.add(e.mesh);e.type=type;e.speed=type.speed;toast("坐骑退场，小骑手继续前进！");}
if(!quiet)burst(e.mesh.position,0xc4db8e,4);if(e.hp<=0){if(e.type.titan){state.bossKills++;state.spawn/=1.5;}clearEnemySpell(e);removeTitanShotsFor(e);disposeTitanLights(e.mesh);if(!quiet)burst(e.mesh.position,0xf2d276,9);scene.remove(e.mesh);enemies=enemies.filter(x=>x!==e);state.kills++;if(e.type.split&&!suppressSplit){const child=e.type.id==='magma-slime'?SMALL_MAGMA_SLIME_ENEMY:SMALL_SLIME_ENEMY;for(const pos of splitPositions(e.mesh.position,[-15,15,-15,2.85])){
 addEnemy(child,pos);const spawned=enemies.at(-1);
 for(const effect of spellEffects)if(effect.key==='blackhole'&&!effect.applied&&effect.targets.includes(e)){effect.targets.push(spawned);effect.origins.push(spawned.mesh.position.clone());}
 }toast(`${e.type.name}分裂成了2只${child.name}！`);}if(!quiet)tone(440,.05);if(e.type.titan)hud();}}
function cancelBurst(){state.burstRemaining=0;state.burstTimer=0;}
function shoot(fresh=false){if(previewMode)return;if(state.mode!=='playing')return;if(state.ammo<=0){if(fresh)openQuiz();return;}if(state.shot>0||state.burstRemaining>0)return;const w=WEAPONS[state.weapon];state.shot=w.interval;state.burstWeapon=state.weapon;state.burstRemaining=Math.min(w.burst||1,state.ammo)-1;state.burstTimer=w.burstInterval||0;fireRound();}
function updateBurst(dt){if(state.mode!=='playing')return;if(state.weapon!==state.burstWeapon){cancelBurst();return;}if(state.burstRemaining<=0)return;state.burstTimer-=dt;while(state.mode==='playing'&&state.burstRemaining>0&&state.burstTimer<=1e-9){state.burstRemaining--;state.burstTimer+=WEAPONS[state.weapon].burstInterval;fireRound();}}
function fireRound(){if(previewMode)return;if(state.mode!=='playing'||state.ammo<=0)return;const w=WEAPONS[state.weapon];state.ammo--;tone(w.radius?95:320,.07);
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
const catalogGroups=[{name:'泰坦 Boss',types:TITANS},{name:'怪物',types:[...ENEMIES,SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY]},{name:'植物',types:PLANTS},{name:'枪械',types:WEAPONS},{name:'法术',types:SPELL_REWARDS}];
let catalogGroup=0,catalogIndex=0,catalogAuto=true,catalogZoom=1,catalogRadius=1,catalogDrag=null,catalogAnimationTime=0;const catalogCache=new Map();
function catalogModel(group,index){if(group===4)return null;const key=group+':'+index;if(catalogCache.has(key))return catalogCache.get(key);const type=catalogGroups[group].types[index];let mesh;
 if(group===2)mesh=plantSystem.model(type);else if(group===3){mesh=gun.clone();mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(type.radius?1.5:1,type.radius?1.5:1,index===1?1.7:1);mesh.visible=true;}else mesh=monsterModel(type);
 // Health/warning indicators belong to battle UI, not the model inspection.
 if(mesh.userData.bar)mesh.remove(mesh.userData.bar);if(mesh.userData.warn)mesh.remove(mesh.userData.warn);
 mesh.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3());mesh.position.sub(center);catalogCache.set(key,mesh);return mesh;
}
function showCatalogModel(){
 destroySpellPreview();$('catalog').classList.toggle('spell-catalog',catalogGroup===4);$('catalog-spell-tools').classList.toggle('hidden',catalogGroup!==4);$('catalog-model-tools').classList.toggle('hidden',catalogGroup===4);$('catalog-model-help').classList.toggle('hidden',catalogGroup===4);
 if(catalogGroup===4){showSpellCatalog();return;}catalogAnimationTime=0;catalogPivot.clear();const mesh=catalogModel(catalogGroup,catalogIndex);if(catalogGroup===2)plantSystem.animateModel(mesh,catalogGroups[2].types[catalogIndex],0,0);if(catalogGroup===0)poseTitanAttack(mesh,catalogGroups[0].types[catalogIndex],0,0);catalogPivot.add(mesh);catalogPivot.rotation.set(0,.35,0);catalogZoom=1;mesh.updateMatrixWorld(true);catalogRadius=new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere()).radius*(catalogGroup===0?1.4:1);
 const type=catalogGroups[catalogGroup].types[catalogIndex];$('catalog-title').textContent=type.name+' · '+(catalogIndex+1)+' / '+catalogGroups[catalogGroup].types.length;
 $('catalog-info').textContent=catalogGroup===3?`单发伤害 ${type.damage} · 弹药 ${type.ammo}${type.burst?" · 三连发 / 每轮"+type.interval+"秒":" · 单发 / 1.1秒"}（与实战一样，共用枪身，以尺寸区分，含持枪手）`:catalogGroup===2?`伤害 ${type.damage} · 攻击间隔 ${type.interval} 秒${type.radius?" · 群伤半径"+type.radius:" · 单体"} · 可升级多重至100发${type.radius?' / 范围 / 减速':' / 减速'} · 自动演示蓄力与回弹（无实弹）`:`生命 ${type.hp} · 移动速度 ${type.speed}${catalogGroup===0?' · 基础攻击16 / 每轮×2 / 体型每轮×1.5（图鉴为首轮） · 自动演示攻击（无伤害）'+(type.id==='witherzilla'?' · 单体黑火球 / 1.2秒 / 射程12':''):''}`;
 $('catalog-select').value=String(catalogIndex);
}
function selectCatalogGroup(index){catalogGroup=index;catalogIndex=0;$('catalog-select').innerHTML='';catalogGroups[index].types.forEach((type,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=type.name;$('catalog-select').appendChild(option);});[...$('catalog-tabs').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));showCatalogModel();}
function openCatalog(){if(previewMode||state.mode!=='welcome')return;state.mode='catalog';$('welcome').classList.add('hidden');$('catalog').classList.remove('hidden');$('app').classList.add('catalog-open');selectCatalogGroup(catalogGroup);$('close-catalog').focus();}
function closeCatalog(){if(state.mode!=='catalog')return;destroySpellPreview();catalogDrag=null;state.mode='welcome';$('catalog').classList.add('hidden');$('app').classList.remove('catalog-open');$('welcome').classList.remove('hidden');$('open-catalog').focus();}
function renderCatalog(dt){if(catalogGroup===4){renderer.setClearColor(0x142a33);renderer.clear();return;}if(catalogGroup===0){catalogAnimationTime+=dt;const phase=catalogAnimationTime%2,charge=phase<.35?phase/.35:0,recovery=phase>=.35&&phase<.75?1-(phase-.35)/.4:0;poseTitanAttack(catalogPivot.children[0],catalogGroups[0].types[catalogIndex],charge,recovery);}if(catalogGroup===2){catalogAnimationTime+=dt;const phase=catalogAnimationTime%2,charge=phase<.24?phase/.24:0,recoil=phase>=.24&&phase<.56?1-(phase-.24)/.32:0;plantSystem.animateModel(catalogPivot.children[0],catalogGroups[2].types[catalogIndex],charge,recoil);}if(catalogAuto&&!catalogDrag)catalogPivot.rotation.y+=dt*.35;const rect=$('catalog-stage').getBoundingClientRect();const aspect=Math.max(.1,rect.width/Math.max(1,rect.height));catalogCamera.aspect=aspect;
 const half=Math.min(THREE.MathUtils.degToRad(catalogCamera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(catalogCamera.fov/2))*aspect));const distance=catalogRadius/Math.sin(half)*1.12/catalogZoom;catalogCamera.position.set(0,0,distance);catalogCamera.near=Math.max(.001,distance-catalogRadius*3);catalogCamera.far=distance+catalogRadius*4;catalogCamera.lookAt(0,0,0);catalogCamera.updateProjectionMatrix();
 renderer.setClearColor(0x142a33);renderer.clear();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.render(catalogScene,catalogCamera);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
catalogGroups.forEach((group,i)=>{const b=document.createElement('button');b.textContent=group.name;b.onclick=()=>selectCatalogGroup(i);$('catalog-tabs').appendChild(b);});
$('open-catalog').onclick=openCatalog;$('close-catalog').onclick=closeCatalog;$('catalog-select').onchange=e=>{catalogIndex=Number(e.target.value);showCatalogModel();};
for(const [id,delta] of [['catalog-prev',-1],['catalog-next',1]])$(id).onclick=()=>{catalogIndex=(catalogIndex+delta+catalogGroups[catalogGroup].types.length)%catalogGroups[catalogGroup].types.length;showCatalogModel();};
$('catalog-turn').onclick=()=>{catalogAuto=!catalogAuto;$('catalog-turn').textContent='自动旋转：'+(catalogAuto?'开':'关');};
$('catalog-zoom-in').onclick=()=>catalogZoom=clamp(catalogZoom*1.2,.6,2);$('catalog-zoom-out').onclick=()=>catalogZoom=clamp(catalogZoom/1.2,.6,2);$('catalog-reset').onclick=()=>{catalogPivot.rotation.set(0,.35,0);catalogZoom=1;};
$('catalog-stage').onpointerdown=e=>{if(catalogGroup===4)return;catalogDrag={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);};
$('catalog-stage').onpointermove=e=>{if(!catalogDrag||catalogDrag.id!==e.pointerId)return;catalogPivot.rotation.y+=(e.clientX-catalogDrag.x)*.01;catalogPivot.rotation.x=clamp(catalogPivot.rotation.x+(e.clientY-catalogDrag.y)*.01,-1.2,1.2);catalogDrag.x=e.clientX;catalogDrag.y=e.clientY;};
$('catalog-stage').onpointerup=$('catalog-stage').onpointercancel=()=>catalogDrag=null;

function spellPreviewDescription(reward){return spellDescription(reward.spellKey,reward.tier)+(reward.spellKey==='blizzard'?'；演示在冻结临近结束时造成1点有效伤害，展示一击击败。':'；演示真实施法与伤害流程。');}

let spellPreviewFrame=null,previewAudioAllowed=false;
function destroySpellPreview(){if(spellPreviewFrame){try{spellPreviewFrame.contentWindow?.disposeSpellPreview?.();}catch{}spellPreviewFrame.remove();spellPreviewFrame=null;}previewAudioAllowed=false;$('catalog-spell-status').textContent='';}
function sendPreviewControl(action='sync'){
 if(!spellPreviewFrame?.contentWindow)return;
 spellPreviewFrame.contentWindow.postMessage({kind:'block-spell-control',action,sound:soundOn,paused:document.hidden||state.mode!=='catalog'},window.location.origin);
}
function showSpellCatalog(autoplay=true){
 if(previewMode)return;
 const type=SPELL_REWARDS[catalogIndex];$('catalog-select').value=String(catalogIndex);$('catalog-title').textContent=type.name+' · '+(catalogIndex+1)+' / '+SPELL_REWARDS.length;$('catalog-info').textContent=spellPreviewDescription(type)+' 示例：10只普通僵尸＋1只首轮监守者。仅图鉴演示，不改变你的进度。';
 $('catalog-spell-status').textContent='正在加载真实场景…';
 const frame=document.createElement('iframe'),url=new window.URL(window.location.href);url.search='';url.hash='';url.searchParams.set('spellPreview',type.typeId);url.searchParams.set('autoplay',autoplay?'1':'0');
 frame.tabIndex=-1;frame.src=url.href;frame.title=type.name+'真实法术演示';frame.setAttribute('aria-label',frame.title);frame.setAttribute('allow','');frame.className='spell-preview-frame';frame.onload=()=>sendPreviewControl('sync');
 spellPreviewFrame=frame;$('catalog-stage').appendChild(frame);
}
$('catalog-replay').onclick=()=>{destroySpellPreview();showSpellCatalog(true);previewAudioAllowed=true;if(soundOn)tone(360,.05);};
$('catalog-stop').onclick=()=>{sendPreviewControl('stop');previewAudioAllowed=false;$('catalog-spell-status').textContent='已停止，示例已复原。点击重播再次演示。';};
$('catalog-explain').onclick=()=>{$('catalog-spell-explanation').classList.toggle('hidden');$('catalog-explain').setAttribute('aria-expanded',String(!$('catalog-spell-explanation').classList.contains('hidden')));};
document.addEventListener('visibilitychange',()=>{if(!previewMode)sendPreviewControl('sync');});
addEventListener('blur',()=>{if(!previewMode&&spellPreviewFrame?.contentWindow)spellPreviewFrame.contentWindow.postMessage({kind:'block-spell-control',action:'sync',sound:soundOn,paused:true},window.location.origin);});
addEventListener('focus',()=>{if(!previewMode)sendPreviewControl('sync');});
addEventListener('message',event=>{
 if(event.origin!==window.location.origin)return;
 if(previewMode){if(event.source!==window.parent||event.data?.kind!=='block-spell-control')return;
  const message=event.data;if(typeof message.sound==='boolean')setSound(message.sound);
  previewExternalPause=Boolean(message.paused);if(message.action==='stop')resetSpellPreview(false);
 }else if(event.source===spellPreviewFrame?.contentWindow&&event.data?.kind==='block-spell-preview'){
  if(event.data.status==='ready'){sendPreviewControl('sync');$('catalog-spell-status').textContent='正在演示真实法术效果';}
  if(event.data.status==='finished')$('catalog-spell-status').textContent='演示结束 · 点击重播再次查看';
  if(event.data.status==='impact'&&previewAudioAllowed&&soundOn)tone(160,.12);
 }
});
let previewRunning=false,previewExternalPause=false,previewClock=0,previewCast=false,previewSnowHit=false,previewFinished=false,previewDisposed=false;
function disposeSpellPreview(){if(!previewMode||previewDisposed)return;previewDisposed=true;previewRunning=false;clearEnemies();renderer.dispose?.();renderer.forceContextLoss?.();}
let previewPagePause=false;
if(previewMode){window.disposeSpellPreview=disposeSpellPreview;addEventListener('pagehide',event=>{if(event.persisted){previewPagePause=previewExternalPause;previewExternalPause=true;}else disposeSpellPreview();});addEventListener('pageshow',event=>{if(event.persisted)previewExternalPause=previewPagePause||document.hidden;});}
function postPreviewStatus(status){if(previewMode&&window.parent!==window)window.parent.postMessage({kind:'block-spell-preview',status},window.location.origin);}
function fitSpellPreviewCamera(){
 camera.fov=48;camera.aspect=Math.max(.1,innerWidth/Math.max(1,innerHeight));const half=Math.min(THREE.MathUtils.degToRad(24),Math.atan(Math.tan(THREE.MathUtils.degToRad(24))*camera.aspect));
 const key=previewReward.spellKey,scale=Math.max(1,spellSpec(key,previewReward.tier).scale),focusY=(key==='meteor'?20:isTornadoSpell(key)?16:13)*scale,radius=(key==='meteor'?42:isTornadoSpell(key)?34:26)*scale;const distance=radius/Math.sin(half)*1.04,focusZ=isTornadoSpell(key)?-11:-7;camera.position.set(0,focusY+distance*.33,focusZ+distance*.944);camera.lookAt(0,focusY,focusZ);camera.near=.06;camera.far=Math.max(200,distance+100);camera.updateProjectionMatrix();scene.fog.far=Math.max(150,distance+90);
}
function resetSpellPreview(autoplay=true){
 if(!previewMode)return false;
 reset();runActive=false;previewRunning=autoplay;previewClock=0;previewCast=false;previewSnowHit=false;previewFinished=false;
 for(let i=0;i<10;i++)addEnemy(ENEMIES[0],new THREE.Vector3(-8+(i%5)*4,0,-2-Math.floor(i/5)*4));
 addEnemy(TITANS[0],new THREE.Vector3(0,0,-11),undefined,1n);state.mode=autoplay?'playing':'paused';gun.visible=false;ring.visible=false;fitSpellPreviewCamera();hud();return true;
}
function stepSpellPreview(dt){
 if(!previewMode||previewDisposed)return false;
 if(previewRunning&&!previewExternalPause&&!document.hidden){
  state.mode='playing';previewClock+=dt;state.elapsed+=dt;
  if(!previewCast&&previewClock>=.25){previewCast=true;castSpell(previewReward.spellKey,previewReward.tier);postPreviewStatus('impact');}
  updateSpellEffects(dt);for(const e of [...enemies]){updateEnemySpell(e,dt);if(e.mesh.userData.fill)e.mesh.userData.fill.scale.x=Math.max(.01,enemyHealthRatio(e));}
  if(previewReward.spellKey==='blizzard'&&previewCast&&!previewSnowHit&&previewClock>=.25+spellSpec('blizzard',previewReward.tier).duration-.3){previewSnowHit=true;for(const e of [...enemies])damageEnemy(e,1);}
  for(const e of effects){e.life-=dt;if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=9*dt;}if(e.mesh.material?.transparent)e.mesh.material.opacity=Math.max(0,e.life/e.max*.4);}
  for(const e of effects.filter(e=>e.life<=0)){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=effects.filter(e=>e.life>0);
  if(previewClock>=Math.max(4.5,.75+spellSpec(previewReward.spellKey,previewReward.tier).duration)){previewRunning=false;previewFinished=true;postPreviewStatus('finished');}
 }else state.mode='paused';
 updateSpellWeather(previewRunning&&!previewExternalPause&&!document.hidden?dt:0);gun.visible=false;ring.visible=false;fitSpellPreviewCamera();renderer.render(scene,camera);return true;
}
let runActive=false,lastSaveElapsed=0,lastSavedText='',savedSnapshot=null,hasStoredSave=false,newGameArmed=false,restoring=false;
function saveNotice(message){document.querySelectorAll('[data-save-status]').forEach(n=>n.textContent=message);}
function captureSave(){
 const numericEnemy=['hp','maxHP','speed','cooldown','phase','tell','charging','melee','swing','slowUntil','slowAmount','frozenUntil'];
 return {version:1,state:{weapon:state.weapon,ammo:state.ammo,health:state.health,kills:state.kills,solved:state.solved,wrong:state.wrong,luckyEarned:state.luckyEarned,luckyPending:state.luckyPending,luckyRemaining:state.luckyRemaining,celebrationPending:state.celebrationPending,elapsed:state.elapsed,round:String(state.round),bossKills:String(state.bossKills),spawn:state.spawn,shot:state.shot},titanIndex:String(titanIndex),nextTitan,spawnIndex,seenTypes:[...seenTypes],player:{position:player.position.toArray(),yaw,pitch},
 plants:plantSystem.plants.map(p=>({typeId:p.type.id,slot:p.slot,upgrades:{...p.upgrades},cooldown:p.cooldown})),
 golems:golems.map(g=>({typeId:g.type.id,position:g.mesh.position.toArray(),hp:g.hp,cooldown:g.cooldown,swing:g.swing})),
 enemies:enemies.map(e=>{const result={typeId:e.type.id,position:e.mesh.position.toArray(),guardIndex:golems.indexOf(e.guard),angry:e.angry,detached:e.detached,target:e.target?.toArray()??null,chargeDir:e.chargeDir?.toArray()??null};for(const key of numericEnemy)result[key]=e[key]??0;if(e.type.titan)Object.assign(result,{round:String(e.round),hpUnits:String(e.hpUnits),maxHPUnits:String(e.maxHPUnits)});if(e.tornado)result.tornado={start:e.tornado.start.toArray(),end:e.tornado.end.toArray(),time:e.tornado.time,...(e.tornado.key?{key:e.tornado.key}:{}),...(e.tornado.tier==null?{}:{tier:e.tornado.tier})};return result;}),pendingPlant:pendingPlant?.id??null,snowUntil,supplyRound:supplyRound?{...supplyRound,offers:[...supplyRound.offers]}:null,
 spellEffects:spellEffects.map(effect=>{const living=effect.targets.map((e,i)=>({e,origin:effect.origins[i]})).filter(({e})=>enemies.includes(e));return {id:effect.id,key:effect.key,...(effect.tier==null?{}:{tier:effect.tier}),time:effect.time,applied:effect.applied,...(effect.playerOrigin?{playerOrigin:effect.playerOrigin.toArray()}:{}),targets:living.map(({e})=>enemies.indexOf(e)),selected:effect.selected.filter(e=>enemies.includes(e)).map(e=>enemies.indexOf(e)),origins:living.map(({origin})=>origin.toArray())};})};
}
function saveProgress(manual=false){if(previewMode)return false;
 if(!runActive||restoring||state.health<=0||['welcome','catalog','over'].includes(state.mode)){if(manual){saveNotice('当前没有可保存的存活进度，保留上次存档');toast('当前没有可保存的存活进度');}return false;}
 lastSaveElapsed=state.elapsed;
 try{const snapshot=captureSave(),text=encodeSave(snapshot);if(text!==lastSavedText){window.localStorage.setItem(SAVE_KEY,text);lastSavedText=text;}savedSnapshot=snapshot;hasStoredSave=true;saveNotice(`已保存：第${state.round}轮 · ${Math.floor(state.elapsed)}秒战斗进度`);if(manual)toast('进度已保存在这台设备的浏览器');return true;}
 catch{saveNotice('保存失败：浏览器存储不可用、已满或状态不兼容，原存档未覆盖');if(manual)toast('保存失败，原存档未覆盖。请保留当前页面。');return false;}
}
function inspectSave(){if(previewMode)return false;try{const text=window.localStorage.getItem(SAVE_KEY);hasStoredSave=Boolean(text);if(text){savedSnapshot=decodeSave(text);lastSavedText=text;saveNotice(`本机存档：第${savedSnapshot.state.round}轮 · ${Math.floor(savedSnapshot.state.elapsed)}秒`);}else saveNotice('每5秒自动保存；也可手动保存。仅保存在当前浏览器。');}catch{savedSnapshot=null;saveNotice('存档损坏/版本不兼容或本机存储不可用，不能继续；新游戏需确认后才替换。');}$('continue-save').classList.toggle('hidden',!savedSnapshot);}
function startNewGame(buttonId){if(previewMode)return false;
 if(hasStoredSave&&!newGameArmed){newGameArmed=true;$(buttonId).textContent='确认新游戏（将替换本机存档）';saveNotice('再点一次确认新游戏；继续存档不会覆盖旧进度。');return;}
 newGameArmed=false;reset();$('start').textContent='开始新游戏 →';$('restart').textContent='重新开始';saveProgress(false);
}
function restoreSave(snapshot=savedSnapshot){if(previewMode)return false;
 if(!snapshot)return false;try{const data=decodeSave(encodeSave(snapshot));restoring=true;reset();state.mode='paused';releaseLook();cancelBurst();
 Object.assign(state,{wrong:0,luckyEarned:Math.floor(data.state.solved/10),luckyPending:0,luckyRemaining:0,celebrationPending:false},data.state,{round:BigInt(data.state.round),bossKills:BigInt(data.state.bossKills),mode:'paused',burstRemaining:0,burstTimer:0,invincible:0});titanIndex=BigInt(data.titanIndex);nextTitan=data.nextTitan;spawnIndex=data.spawnIndex;seenTypes.clear();data.seenTypes.forEach(id=>seenTypes.add(id));
 player.position.fromArray(data.player.position);yaw=data.player.yaw;pitch=data.player.pitch;syncAim();
 for(const item of data.plants){plantSystem.add(PLANTS.find(t=>t.id===item.typeId),item.slot);const p=plantSystem.plants.at(-1);p.upgrades={...item.upgrades};p.cooldown=item.cooldown;}
 for(const item of data.golems){summonGolem([...GOLEMS,SMALL_SLIME_GOLEM].find(t=>t.id===item.typeId),new THREE.Vector3().fromArray(item.position));const g=golems.at(-1);g.hp=item.hp;g.cooldown=item.cooldown;g.swing=item.swing;}
 for(const item of data.enemies){const type=[...ENEMIES,...TITANS,SMALL_SLIME_ENEMY,SMALL_MAGMA_SLIME_ENEMY].find(t=>t.id===item.typeId);addEnemy(type,new THREE.Vector3().fromArray(item.position),undefined,BigInt(item.round??data.state.round));const e=enemies.at(-1);
 for(const key of ['speed','cooldown','phase','angry','tell','charging','detached','melee','swing','slowUntil','slowAmount','frozenUntil'])e[key]=item[key];
 if(type.titan){e.hpUnits=BigInt(item.hpUnits);e.maxHPUnits=BigInt(item.maxHPUnits);}else{e.hp=item.hp;e.maxHP=item.maxHP;}
 e.guard=item.guardIndex>=0?golems[item.guardIndex]:undefined;e.target=item.target?new THREE.Vector3().fromArray(item.target):undefined;e.chargeDir=item.chargeDir?new THREE.Vector3().fromArray(item.chargeDir):undefined;
 if(item.tornado)e.tornado={start:new THREE.Vector3().fromArray(item.tornado.start),end:new THREE.Vector3().fromArray(item.tornado.end),time:item.tornado.time,...(item.tornado.key?{key:item.tornado.key}:{}),...(item.tornado.tier==null?{}:{tier:item.tornado.tier})};if(e.frozenUntil>state.elapsed||e.tornado)spellMarker(e,e.frozenUntil>state.elapsed);
 }
 for(const saved of data.spellEffects||[]){const effect={...saved,...(saved.playerOrigin?{playerOrigin:new THREE.Vector3().fromArray(saved.playerOrigin)}:{}),targets:saved.targets.map(i=>enemies[i]),selected:saved.selected.map(i=>enemies[i]),origins:saved.origins.map(p=>new THREE.Vector3().fromArray(p))};spellEffects.push(effect);nextSpellId=Math.max(nextSpellId,effect.id+1);makeSpellVisual(effect);if(effect.key==='blackhole')effect.targets.forEach((e,i)=>poseBlackholeTarget(effect,e,i));}
 supplyRound=data.supplyRound?{...data.supplyRound,offers:[...data.supplyRound.offers]}:null;pendingPlant=data.pendingPlant?PLANTS.find(t=>t.id===data.pendingPlant):null;snowUntil=data.snowUntil;selected=-1;streak=0;questions=[];offers=[];answerLocked=true;questionToken++;lastSaveElapsed=state.elapsed;runActive=true;restoring=false;newGameArmed=false;
 $('welcome').classList.add('hidden');$('quiz').classList.add('hidden');$('paused').classList.remove('hidden');$('resume').classList.remove('hidden');$('pause-title').textContent='存档已恢复';$('pause-copy').textContent='准备好后继续。按R继续未完成的这批补给：保留卡片与换卡次数，连续答题重新计数；在途弹丸不恢复，已获得奖励保留。';hud();return true;
 }catch{restoring=false;runActive=false;state.mode='welcome';releaseLook();$('welcome').classList.remove('hidden');saveNotice('存档无法恢复，原存档未修改。可以重新开始新游戏。');return false;}
}
$('continue-save').onclick=()=>restoreSave();document.querySelectorAll('[data-save-game]').forEach(b=>{b.onclick=()=>saveProgress(true);b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});});addEventListener('pagehide',()=>saveProgress(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress(false);});inspectSave();
let previous=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(previewMode){if(!previewDisposed)stepSpellPreview(dt);return;}
 if(state.mode==='catalog'){renderCatalog(dt);return;}
 titanCountdown();if(state.mode==='playing'){state.elapsed+=dt;state.shot=Math.max(0,state.shot-dt);updateBurst(dt);if(state.mode!=='playing'){renderer.render(scene,camera);return;}state.invincible=Math.max(0,state.invincible-dt);updateTitanSpawn();titanHud();updateNormalSpawns(dt);
 let dx=0,dz=0;if(keys.has('w')||keys.has('arrowup')||touchKeys.has('forward'))dz--;if(keys.has('s')||keys.has('arrowdown')||touchKeys.has('backward'))dz++;if(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left'))dx--;if(keys.has('d')||keys.has('arrowright')||touchKeys.has('right'))dx++;const mag=Math.hypot(dx,dz)||1;const mx=(dx*Math.cos(yaw)+dz*Math.sin(yaw))/mag,mz=(-dx*Math.sin(yaw)+dz*Math.cos(yaw))/mag;moveBody(player.position,mx*4.2*dt,mz*4.2*dt);player.position.x=clamp(player.position.x,-5,5);player.position.z=clamp(player.position.z,6,8);
 syncAim();player.userData.legs.forEach((leg,i)=>leg.rotation.x=(dx||dz)?Math.sin(state.elapsed*12+i*Math.PI)*.45:0);
 updateSpellEffects(dt);updateGolems(dt);for(const e of [...enemies]){updateEnemy(e,dt);if(state.mode!=='playing')break;}
 updateTitanShots(dt);autoDeployPlant();plantSystem.update(dt,updateLucky(dt));plantSystem.updateShots(dt);if(fireHeld||keys.has(' '))shoot();updateVillagers(dt);for(const e of effects){if(state.mode!=='playing')break;e.life-=dt;if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);if(e.projectile){const p=e.mesh.position.clone();p.y=0;if(p.z>=3)e.life=0;if(blockers.some(([x,z,hx,hz])=>Math.abs(p.x-x)<hx+.2&&Math.abs(p.z-z)<hz+.2))e.life=0;}else e.velocity.y-=9*dt;e.mesh.rotation.x+=dt*5;}if(e.mesh.material.transparent)e.mesh.material.opacity=e.life/e.max*.4;}for(const e of effects.filter(e=>e.life<=0)){scene.remove(e.mesh);if(e.dispose){e.mesh.geometry.dispose();e.mesh.material.dispose();}}effects=effects.filter(e=>e.life>0);
 }
 if(runActive&&state.mode==='playing'&&state.elapsed-lastSaveElapsed>=5)saveProgress(false);updateSpellWeather(dt);ring.position.set(player.position.x,.08,player.position.z);ring.visible=state.mode==='welcome'||state.invincible>0;ring.scale.setScalar(1+Math.sin(now/200)*.05);
 $('direction-hint').textContent=Math.cos(yaw)>0?'▲ 前方防线 · 僵尸来袭方向':'↶ 正在看后院 · 转身回到前方防线';$('crosshair').classList.toggle('hidden',state.mode!=='playing');$('controls-hint').textContent=document.pointerLockElement===canvas?'WASD 阵地移动 · 鼠标自由转头 · 左键射击 · R 补给 · Esc 暂停':'WASD 阵地移动 · 拖动自由转头 · 空格射击 · R 补给';gun.visible=state.mode!=='welcome';
 if(state.mode==='welcome'){const focus=new THREE.Vector3(2,0,0);camera.position.lerp(new THREE.Vector3(2,23,25),.04);camera.lookAt(focus);}else syncAim();renderer.render(scene,camera);
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();hud();if(previewMode){resetSpellPreview(previewParams.get('autoplay')!=='0');postPreviewStatus('ready');}else{player.position.set(6,0,1);player.rotation.y=-.4;}requestAnimationFrame(animate);
// Read-only state inspection plus deterministic QA hooks, enabled only in Vite development.
if(import.meta.env.DEV)window.__game={updateLucky,activateLucky,recordLuckyCorrect,clearCelebration,villagers,updateVillagers,villageFree,elementalGround,assignDefenseHomes,golemTarget,normalSpawnPosition,spawnRadius,clearWalk,walkingRoute,frostGeometry,frostEdgesGeometry,frostMaterial,frostEdgeMaterial,positionSpellMarker,updateSharedWind,get sharedWindField(){return sharedWindField;},rerollSupplies,get supplyRound(){return supplyRound;},previewMode,previewKey,previewReward,effectSpec,spellDescription,spellLanding,previewCamera:camera,stepSpellPreview,resetSpellPreview,get previewRunning(){return previewRunning;},get previewClock(){return previewClock;},get spellPreviewFrame(){return spellPreviewFrame;},destroySpellPreview,updateSpellEffects,get spellEffects(){return spellEffects;},get spellTint(){return spellTint;},captureSave,saveProgress,restoreSave,inspectSave,tone,setSound,get soundOn(){return soundOn;},get activeVoiceCount(){return activeVoices.size;},updateSpellWeather,get spellSnow(){return spellSnow;},castSpell,updateEnemySpell,companionCounts,renderCompanionCounts,poseTitanAttack,updateTitanShots,get titanShots(){return titanShots;},poseTitanAxe,updateNormalSpawns,get titanCount(){return titanIndex;},updateBurst,cancelBurst,fireRound,titanCountdown,plantUpgradeSummary,catalogGroups,catalogModel,openCatalog,closeCatalog,selectCatalogGroup,renderCatalog,catalogCamera,catalogPivot,plantSystem,autoDeployPlant,updateTitanSpawn,state,openQuiz,selectQuestion,answer,nextQuestion,reset,shoot,get questions(){return questions;},get offers(){return [...offers];},get enemies(){return enemies;},spawn,monsterModel,damageEnemy,updateEnemy,summonGolem,damageGolem,updateGolems,get golems(){return golems;},get streak(){return streak;}};


