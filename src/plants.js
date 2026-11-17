import {PLANTS,PLANT_SLOTS,PLANT_RANGE,plantAccuracy,plantStats,canUpgradePlant,normalizePlant} from './rules.js';

export function createPlantSystem({THREE,scene,box,material,getEnemies,getMode,getTime,damageEnemy,blockedBetween,toast,onChange,random=Math.random}){
 const plants=[],shots=[],markers=[];
 // Stone paths top out at y=.08. Keep pad bottom .01 above them, never coplanar.
 const padCenterY=.13,padHeight=.08,plantBaseY=.18;
 const spikeGeometry=new THREE.ConeGeometry(.065,.6,4);
 const stripeGeometry=new THREE.TorusGeometry(.221,.014,4,20);
 const cubeFlash=new THREE.BoxGeometry(.055,.055,.08),flashRingGeometry=new THREE.RingGeometry(.08,.13,12);
 const ballGeometry=new THREE.SphereGeometry(1,8,6);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
 function noRay(mesh){mesh.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});return mesh;}
 for(const slot of PLANT_SLOTS){const marker=noRay(box(1.1,padHeight,1.1,0x789c65,slot.x,padCenterY,slot.z));markers.push(marker);}
 function model(type){
  const g=new THREE.Group();box(1.2,.18,1.2,0x86694d,0,.1,0,g);box(.25,.65,.25,0x528f4a,0,.5,0,g);
  for(const x of [-.35,.35]){const leaf=box(.65,.12,.35,0x69a357,x,.25,0,g);leaf.rotation.z=x>0?.3:-.3;}
  if(type.id==='cherry'){for(const x of [-.28,.28])box(.52,.52,.52,type.color,x,.7,0,g);box(.1,.45,.1,0x4d8647,0,1,0,g);}
  else if(type.id==='cactus'){box(.55,1.25,.5,type.color,0,.8,0,g);for(const x of [-.4,.4]){box(.45,.18,.25,type.color,x,.8,0,g);box(.18,.4,.25,type.color,x*1.4,.95,0,g);}for(const x of [-.2,0,.2])box(.04,.85,.05,0xb9d48a,x,.85,.28,g);}
  else if(type.id==='pea'){box(.7,.65,.65,type.color,0,.95,0,g);box(.38,.35,.45,0x6ca951,0,.95,.4,g);box(.23,.22,.03,0x2d5b3c,0,.95,.64,g);}
  else if(type.id==='corn'){box(.45,.95,.45,type.color,0,1,0,g);for(const x of [-.14,.14])for(const y of [.7,.95,1.2])box(.13,.14,.08,0xffe381,x,y,.25,g);for(const x of [-.28,.28]){const leaf=box(.18,.7,.3,0x639a49,x,.75,0,g);leaf.rotation.z=x;}}
  else if(type.id==='cannon'){box(.85,.35,1.2,0x6c8546,0,.45,0,g);for(const x of [-.48,.48])for(const z of [-.4,.4])box(.22,.3,.3,0x536a3d,x,.3,z,g);box(.65,.5,1.35,type.color,0,.95,.15,g);box(.48,.34,.05,0x6e6434,0,.95,.85,g);for(const z of [-.3,0,.3])box(.7,.07,.07,0xffdc64,0,1.23,z,g);}
  else if(type.id==='cabbage'){for(let i=0;i<5;i++){const leaf=box(.75,.22,.7,i%2?0xb3d68c:type.color,0,.7+i*.1,0,g);leaf.rotation.y=i*.7;leaf.rotation.z=(i%2?1:-1)*.12;}}
  else{box(.85,.6,.8,type.color,0,.85,0,g);for(const x of [-.3,0,.3])box(.1,.62,.84,type.id==='ice-melon'?0xd4f7ff:0x458d46,x,.85,0,g);}
  for(const x of [-.17,.17])box(.09,.1,.04,0x243d32,x,1.04,.43,g);
  // Reparent existing upper meshes without changing their resting world transforms.
  // Soil, base and collision anchor remain fixed; only the visual crown moves.
  const crown=new THREE.Group();crown.position.y=.5;g.add(crown);
  for(const part of [...g.children])if(part!==crown&&part.position.y>=.6){g.remove(part);part.position.y-=.5;crown.add(part);}
  let throwArm=null,payload=null;
  if(type.lob){
   // A living leaf catapult: curved rear stalk and a high open fruit basket.
   throwArm=new THREE.Group();throwArm.position.set(0,.35,-.35);g.add(throwArm);
   for(const [y,z,h] of [[.25,0,.55],[.7,-.18,.5],[1.05,-.4,.35]]){const stem=box(.16,h,.18,0x4b8640,0,y,z,throwArm);stem.rotation.x=-.35;}
   const basket=new THREE.Group();basket.position.set(0,1.15,-.45);throwArm.add(basket);
   box(.78,.12,.68,0x7d9b42,0,0,0,basket);
   for(const x of [-.39,.39])box(.1,.24,.72,0xc2a555,x,.1,0,basket);
   for(const z of [-.34,.34])box(.75,.24,.1,0xd6bb69,0,.1,z,basket);
   payload=new THREE.Group();payload.position.y=.22;basket.add(payload);
   if(type.id==='corn'||type.id==='cannon'){box(.3,.58,.3,0xf0ce58,0,.17,0,payload);for(const x of [-.1,.1])for(const y of [0,.18,.36])box(.11,.12,.06,0xffe991,x,y,.17,payload);}
   else if(type.id==='cherry'){for(const x of [-.17,.17]){const fruit=new THREE.Mesh(ballGeometry,material(type.color));fruit.scale.setScalar(.22);fruit.position.set(x,.15,0);payload.add(fruit);}box(.07,.3,.07,0x4a8a3c,0,.45,0,payload);}
   else{const fruit=projectileMesh(type);fruit.scale.multiplyScalar(type.id==='cabbage'?2:1.7);fruit.position.y=.16;payload.add(fruit);}
   g.userData.catapult={throwArm,basket,payload};
  }
  const flash=new THREE.Group();flash.position.set(0,1,.85);g.add(flash);
  const flashMaterial=new THREE.MeshBasicMaterial({color:type.id==='cactus'?0xffffff:type.id==='ice-melon'?0xdffaff:type.color,transparent:true,opacity:0,depthWrite:false});
  const puff=new THREE.Mesh(flashRingGeometry,flashMaterial);flash.add(puff);
  for(let i=0;i<4;i++){const speck=new THREE.Mesh(cubeFlash,flashMaterial);speck.position.set(Math.cos(i*Math.PI/2)*.18,Math.sin(i*Math.PI/2)*.18,0);flash.add(speck);}
  flash.visible=false;g.userData.plantRig={crown,flash,flashMaterial,typeId:type.id,throwArm,payload};
  return noRay(g);
 }
 function add(type,slot){if(!PLANTS.includes(type)||!PLANT_SLOTS[slot]||plants.some(p=>p.slot===slot))return false;const mesh=model(type),s=PLANT_SLOTS[slot];mesh.position.set(s.x,plantBaseY,s.z);scene.add(mesh);plants.push({type,slot,mesh,upgrades:{multi:0,area:0,slow:0},cooldown:type.interval,recoil:0});onChange();return true;}
 function remove(p,notify=true){const i=plants.indexOf(p);if(i<0)return;plants.splice(i,1);scene.remove(p.mesh);p.mesh.userData.plantRig?.flashMaterial.dispose();markers[p.slot].material=material(0x789c65);if(notify){toast(`${p.type.name}被僵尸碰到了，种植位已空出。`);onChange();}}
 function clear(){for(const p of [...plants])remove(p,false);for(const s of shots){scene.remove(s.mesh);if(s.blast)s.mesh.material.dispose();}shots.length=0;}
 function contacts(enemy,from=enemy.mesh.position,to=enemy.mesh.position){if(getMode()!=='playing')return;for(const p of [...plants])if(segmentDistance(p.mesh.position,from,to)<=(enemy.type?.titan?enemy.type.bodyRadius+.45:.85))remove(p);}
 // Aggregate equal (target, radius) reservations first, never scan enemies per shot.
 // Splash promises are discounted by 50%: movement/walls may invalidate collateral.
 function targetingContext(candidates,expandSplash=true){
  const ledger=new Map(),neighbors=new Map(),live=new Set(candidates);
  const around=(target,radius)=>{let byTarget=neighbors.get(radius);if(!byTarget){byTarget=new Map();neighbors.set(radius,byTarget);}if(!byTarget.has(target))byTarget.set(target,candidates.filter(e=>Math.max(0,distance(e.mesh.position,target.mesh.position)-(e.type?.hitRadius??0))<=radius));return byTarget.get(target);};
  const reserve=(target,radius,damage)=>{ledger.set(target,(ledger.get(target)||0)+damage);if(radius&&expandSplash)for(const e of around(target,radius))if(e!==target)ledger.set(e,(ledger.get(e)||0)+damage*.5);};
  const grouped=new Map();for(const shot of shots)if(!shot.blast&&shot.accurate&&live.has(shot.target)){const radius=shot.type.radius||0;let group=grouped.get(radius);if(!group){group=new Map();grouped.set(radius,group);}group.set(shot.target,(group.get(shot.target)||0)+shot.type.damage);}
  for(const [radius,group] of grouped)for(const [target,damage] of group)reserve(target,radius,damage);
  return {ledger,around,reserve};
 }
 function incomingDamage(){return targetingContext(getEnemies().filter(e=>e.hp>0)).ledger;}
 function areaOptions(p,targets,stats,context){
  const weight=e=>Math.max(.2,1+(e.mesh.position.z+17)/10)/(1+distance(e.mesh.position,p.mesh.position)*.025);
  const rows=targets.map(target=>({target,members:context.around(target,stats.radius).map(e=>({e,w:weight(e)}))}));
  // Keep strongest 16 centers plus one center per 4-unit spatial cell (max 36).
  // This covers separated fronts without rescoring 400 centers for every pellet.
  rows.forEach(row=>row.value=row.members.reduce((sum,m)=>sum+m.w,0));rows.sort((a,b)=>b.value-a.value);
  const selected=rows.slice(0,16),cells=new Set();for(const row of rows){const at=row.target.mesh.position,key=Math.floor(at.x/4)+':'+Math.floor(at.z/4);if(cells.has(key))continue;cells.add(key);if(!selected.includes(row))selected.push(row);if(cells.size>=36)break;}return selected;
 }
 function areaTarget(rows,stats,ledger){let best,score=-Infinity;for(const row of rows){let value=0;for(const {e,w} of row.members){const remaining=Math.max(0,e.hp-(ledger.get(e)||0));value+=w*Math.min(1,remaining/stats.damage);}if(value>score){score=value;best=row.target;}}return best;}
 function targetFor(p,ledger=incomingDamage(),candidates=getEnemies(),excluded=null){
  let best,bestScore=-Infinity;
  for(const e of candidates){if(e.hp<=0||excluded?.has(e))continue;const d=distance(e.mesh.position,p.mesh.position);if(d>PLANT_RANGE)continue;
   const incoming=ledger.get(e)||0,coverage=incoming/Math.max(Number.MIN_VALUE,e.hp);
   // Forward progress is danger to villagers; shorter travel distances matter too.
   // Prefer an uncovered enemy before wasting a complete lethal volley on another.
   const score=e.mesh.position.z*2-d*.35-Math.min(coverage,2)*12-(incoming>=e.hp?1000:0);
   if(score>bestScore){best=e;bestScore=score;}
  }return best;
 }
 function impact(type,position,target){
  if(type.radius){const mesh=new THREE.Mesh(ballGeometry,new THREE.MeshBasicMaterial({color:type.color,transparent:true,opacity:.3,wireframe:true}));mesh.position.copy(position);mesh.position.y=.5;mesh.scale.setScalar(type.radius);noRay(mesh);scene.add(mesh);shots.push({mesh,blast:true,age:0,radius:type.radius});}
  const candidates=type.radius?[...getEnemies()].filter(e=>Math.max(0,distance(e.mesh.position,position)-(e.type?.hitRadius??0))<=type.radius):getEnemies().includes(target)?[target]:[];
  for(const e of candidates){const a=position.clone(),b=e.mesh.position.clone();a.y=b.y=.65;if(type.radius&&blockedBetween(a,b))continue;const before=e.hpUnits??e.hp;damageEnemy(e,type.damage);if(type.slow&&(e.hpUnits??e.hp)<before&&getEnemies().includes(e)){const active=getTime()<(e.slowUntil||0)?(e.slowAmount??.2):0;e.slowAmount=Math.max(active,Math.min(e.type?.titan ? .5 : .8,type.slow));e.slowUntil=getTime()+2;}}
 }
 function projectileMesh(type){
  if(type.id==='cabbage'){
   const g=new THREE.Group();g.userData.visual='layered-cabbage';
   for(let i=0;i<6;i++){const leaf=new THREE.Mesh(ballGeometry,material(i%2?0x9fca72:0x638f4e));leaf.scale.set(.19-i*.017,.12,.19-i*.017);leaf.position.y=-.055+i*.025;leaf.rotation.set(.15*(i%2),i*1.1,.14*(i%2?1:-1));g.add(leaf);}return g;
  }
  if(type.id==='melon'||type.id==='ice-melon'){
   const ice=type.id==='ice-melon',g=new THREE.Group();g.userData.visual=ice?'frost-striped-melon':'striped-melon';const skin=new THREE.Mesh(ballGeometry,material(ice?0x8bd9e8:0x81bd57));skin.scale.setScalar(.22);g.add(skin);
   for(let i=0;i<5;i++){const stripe=new THREE.Mesh(stripeGeometry,material(ice?0x367f9f:0x276a37));stripe.rotation.y=i*Math.PI/5;g.add(stripe);}
   if(ice)for(const [x,y,z] of [[.1,.19,0],[-.12,.14,.09],[0,-.16,.13]]){const frost=box(.075,.1,.075,0xe9ffff,x,y,z,g);frost.rotation.z=.5;}return g;
  }
  const spike=type.id==='cactus',mesh=new THREE.Mesh(spike?spikeGeometry:ballGeometry,material(spike?0xffffff:type.color));mesh.scale.setScalar(spike?1:type.id==='cannon'?.27:type.radius?.22:.13);return mesh;
 }
 function launch(p,target,type=plantStats(p)){
  const from=p.mesh.position.clone();from.y+=1;const d=distance(from,target.mesh.position);if(d>PLANT_RANGE)return;
  const accurate=random()<plantAccuracy(d),landing=target.mesh.position.clone();landing.y=.65;
  // A visible lateral miss, not an invisible damage coin flip. Area shots still hit at landing.
  if(!accurate){const side=random()<.5?-1:1,offset=side*(2.2+random()*1.3),dx=landing.x-from.x,dz=landing.z-from.z;landing.x+=dz/(d||1)*offset;landing.z-=dx/(d||1)*offset;}
  const spike=type.id==='cactus',mesh=projectileMesh(type);mesh.position.copy(from);if(spike)mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),landing.clone().sub(from).normalize());noRay(mesh);scene.add(mesh);shots.push({mesh,type,target,accurate,landing,from,age:0,duration:Math.max(.2,distance(from,landing)/10),last:from.clone()});return shots[shots.length-1];
 }
 // Pure procedural poses: no random calls, targeting, clocks or damage in this function.
 function animateModel(mesh,type,charge=0,recoil=0){const rig=mesh.userData.plantRig;if(!rig)return;const {crown,flash,flashMaterial}=rig,c=Math.max(0,Math.min(1,charge)),r=Math.max(0,Math.min(1,recoil)),kick=Math.sin(r*Math.PI/2);
  crown.position.set(0,.5,0);crown.rotation.set(0,0,0);crown.scale.set(1,1,1);
  if(type.id==='pea'){crown.scale.set(1+.1*c-.06*kick,1+.08*c,1+.08*c-.15*kick);crown.position.z=.04*c-.16*kick;crown.rotation.x=-.04*c+.09*kick;}
  else if(type.id==='cactus'){crown.rotation.z=.06*c-.11*kick;crown.scale.x=1+.08*c;crown.position.z=-.09*kick;}
  else if(type.id==='cannon'){crown.rotation.x=-.12*c+.15*kick;crown.position.z=-.26*kick;crown.position.y=.5-.04*c+.03*kick;}
  else if(type.id==='cherry'){crown.scale.set(1+.12*c,1-.13*c,1+.12*c);crown.position.y=.5-.07*c+.12*kick;crown.rotation.x=-.15*c+.25*kick;}
  else{const weight=type.id==='corn'?.24:type.id==='cabbage'?.2:type.id==='melon'?.3:.27;crown.rotation.x=-weight*c+weight*1.4*kick;crown.position.y=.5+.035*c+.04*kick;crown.position.z=-.06*c+.06*kick;if(type.id==='cabbage')crown.rotation.y=.08*c-.12*kick;if(type.id==='ice-melon')crown.scale.setScalar(1+.03*c);}
  if(rig.throwArm){rig.throwArm.rotation.x=-.5*c+.8*kick;rig.payload.visible=r===0;}
  // One light puff per volley, even when an upgrade fires 100 projectiles.
  const pulse=Math.max(0,(r-.55)/.45);flash.visible=pulse>0;flash.scale.setScalar(1+(1-pulse)*1.8);flashMaterial.opacity=pulse*.7;flash.position.z=.85+(1-pulse)*.2;
 }
 function update(dt){if(getMode()!=='playing')return;const candidates=getEnemies().filter(e=>e.hp>0),context=targetingContext(candidates,plants.some(p=>p.cooldown<=dt+1e-8)),ledger=context.ledger;
  for(const p of [...plants]){
   normalizePlant(p);
   if(p.type.lob&&!p.mesh.userData.catapult){const old=p.mesh,replacement=model(p.type);replacement.position.copy(old.position);replacement.rotation.copy(old.rotation);scene.remove(old);old.userData.plantRig?.flashMaterial.dispose();scene.add(replacement);p.mesh=replacement;}
   p.cooldown=Math.max(0,p.cooldown-dt);p.recoil=Math.max(0,(p.recoil||0)-dt);const target=targetFor(p,ledger,candidates),charge=target&&p.cooldown>0?Math.max(0,1-p.cooldown/.24):0;animateModel(p.mesh,p.type,charge,p.recoil/.32);if(p.cooldown>1e-8||!target)continue;
   p.mesh.rotation.y=Math.atan2(target.mesh.position.x-p.mesh.position.x,target.mesh.position.z-p.mesh.position.z);const targets=candidates.filter(e=>distance(e.mesh.position,p.mesh.position)<=PLANT_RANGE),stats=plantStats(p),visited=new Set(),area=stats.radius?areaOptions(p,targets,stats,context):null;for(let n=0;n<stats.projectiles;n++){
    if(visited.size>=targets.length)visited.clear();const aim=area?areaTarget(area,stats,ledger):targetFor(p,ledger,targets,visited);if(!aim)break;visited.add(aim);const shot=launch(p,aim,stats);if(shot?.accurate)context.reserve(aim,stats.radius||0,stats.damage);
   }p.cooldown=p.type.interval;p.recoil=.32;animateModel(p.mesh,p.type,0,1);
  }
 }
 function updateShots(dt){if(getMode()!=='playing')return;
  // Capture all live aim points before any pellet kills a target this frame.
  for(const s of shots)if(!s.blast&&s.accurate&&getEnemies().includes(s.target)&&s.target.hp>0)s.landing.copy(s.target.mesh.position);
  for(const s of [...shots]){
   let done=false;s.age+=dt;
   if(s.blast){s.mesh.material.opacity=.3*Math.max(0,1-s.age/.35);if(s.age>=.35){scene.remove(s.mesh);s.mesh.material.dispose();shots.splice(shots.indexOf(s),1);}continue;}
   if((!getEnemies().includes(s.target)||s.target.hp<=0)&&!s.type.lob)done=true;
   else{
    const end=s.landing.clone();end.y=.65;const t=Math.min(1,s.age/s.duration);s.mesh.position.copy(s.from).lerp(end,t);if(s.type.lob)s.mesh.position.y+=Math.sin(t*Math.PI)*1.5;if(s.type.id==='cactus'){const direction=s.mesh.position.clone().sub(s.last);if(direction.lengthSq()>0)s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
    if(blockedBetween(s.last,s.mesh.position))done=true;
    else if(!s.type.lob){const hit=getEnemies().filter(e=>segmentDistance(e.mesh.position,s.last,s.mesh.position)<(e.type?.hitRadius??.55)&&Math.abs(s.mesh.position.y-.65)<1).sort((a,b)=>distance(a.mesh.position,s.last)-distance(b.mesh.position,s.last))[0];if(hit){impact(s.type,hit.mesh.position,hit);done=true;}}
    if(!done&&t>=1){const hit=s.accurate?s.target:getEnemies().find(e=>distance(e.mesh.position,end)<(e.type?.hitRadius??.55));impact(s.type,end,hit);done=true;}s.last.copy(s.mesh.position);
   }
   if(done){scene.remove(s.mesh);shots.splice(shots.indexOf(s),1);}
  }
 }
 function upgrade(plantId,kind){const candidates=plants.filter(p=>p.type.id===plantId&&canUpgradePlant(p,kind));if(!candidates.length)return null;const p=candidates[Math.floor(random()*candidates.length)];p.upgrades??={multi:0,area:0,slow:0};p.upgrades[kind]=(p.upgrades[kind]||0)+1;onChange();return p;}
 return {animateModel,upgrade,model,plants,shots,markers,add,remove,clear,contacts,targetFor,update,updateShots,impact};
}


