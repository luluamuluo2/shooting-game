import {PLANTS,PLANT_SLOTS,PLANT_RANGE,plantAccuracy} from './rules.js';

export function createPlantSystem({THREE,scene,box,material,getEnemies,getMode,getTime,damageEnemy,blockedBetween,toast,onChange,random=Math.random}){
 const plants=[],shots=[],markers=[];
 // Stone paths top out at y=.08. Keep pad bottom .01 above them, never coplanar.
 const padCenterY=.13,padHeight=.08,plantBaseY=.18;
 const spikeGeometry=new THREE.ConeGeometry(.065,.6,4);
 const stripeGeometry=new THREE.TorusGeometry(.221,.014,4,20);
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
  return noRay(g);
 }
 function add(type,slot){if(!PLANTS.includes(type)||!PLANT_SLOTS[slot]||plants.some(p=>p.slot===slot))return false;const mesh=model(type),s=PLANT_SLOTS[slot];mesh.position.set(s.x,plantBaseY,s.z);scene.add(mesh);plants.push({type,slot,mesh,cooldown:type.interval});onChange();return true;}
 function remove(p,notify=true){const i=plants.indexOf(p);if(i<0)return;plants.splice(i,1);scene.remove(p.mesh);markers[p.slot].material=material(0x789c65);if(notify){toast(`${p.type.name}被僵尸碰到了，种植位已空出。`);onChange();}}
 function clear(){for(const p of [...plants])remove(p,false);for(const s of shots){scene.remove(s.mesh);if(s.blast)s.mesh.material.dispose();}shots.length=0;}
 function contacts(enemy,from=enemy.mesh.position,to=enemy.mesh.position){if(getMode()!=='playing')return;for(const p of [...plants])if(segmentDistance(p.mesh.position,from,to)<=(enemy.type?.titan?enemy.type.bodyRadius+.45:.85))remove(p);}
 function targetFor(p){return getEnemies().filter(e=>e.hp>0&&distance(e.mesh.position,p.mesh.position)<=PLANT_RANGE).sort((a,b)=>b.mesh.position.z-a.mesh.position.z)[0];}
 function impact(type,position,target){
  if(type.radius){const mesh=new THREE.Mesh(ballGeometry,new THREE.MeshBasicMaterial({color:type.color,transparent:true,opacity:.3,wireframe:true}));mesh.position.copy(position);mesh.position.y=.5;mesh.scale.setScalar(type.radius);noRay(mesh);scene.add(mesh);shots.push({mesh,blast:true,age:0,radius:type.radius});}
  const candidates=type.radius?[...getEnemies()].filter(e=>Math.max(0,distance(e.mesh.position,position)-(e.type?.hitRadius??0))<=type.radius):getEnemies().includes(target)?[target]:[];
  for(const e of candidates){const a=position.clone(),b=e.mesh.position.clone();a.y=b.y=.65;if(type.radius&&blockedBetween(a,b))continue;const before=e.hp;damageEnemy(e,type.damage);if(type.slow&&e.hp<before&&getEnemies().includes(e))e.slowUntil=Math.max(e.slowUntil||0,getTime()+2);}
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
 function launch(p,target){
  const from=p.mesh.position.clone();from.y+=1;const d=distance(from,target.mesh.position);if(d>PLANT_RANGE)return;
  const accurate=random()<plantAccuracy(d),landing=target.mesh.position.clone();landing.y=.65;
  // A visible lateral miss, not an invisible damage coin flip. Area shots still hit at landing.
  if(!accurate){const side=random()<.5?-1:1,offset=side*(2.2+random()*1.3),dx=landing.x-from.x,dz=landing.z-from.z;landing.x+=dz/(d||1)*offset;landing.z-=dx/(d||1)*offset;}
  const spike=p.type.id==='cactus',mesh=projectileMesh(p.type);mesh.position.copy(from);if(spike)mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),landing.clone().sub(from).normalize());noRay(mesh);scene.add(mesh);shots.push({mesh,type:p.type,target,accurate,landing,from,age:0,duration:Math.max(.2,distance(from,landing)/10),last:from.clone()});
 }
 function update(dt){if(getMode()!=='playing')return;
  for(const p of [...plants]){
   p.cooldown=Math.max(0,p.cooldown-dt);if(p.cooldown>1e-8)continue;const target=targetFor(p);if(!target)continue;
   p.mesh.rotation.y=Math.atan2(target.mesh.position.x-p.mesh.position.x,target.mesh.position.z-p.mesh.position.z);launch(p,target);p.cooldown=p.type.interval;
  }
 }
 function updateShots(dt){if(getMode()!=='playing')return;
  for(const s of [...shots]){
   let done=false;s.age+=dt;
   if(s.blast){s.mesh.material.opacity=.3*Math.max(0,1-s.age/.35);if(s.age>=.35){scene.remove(s.mesh);s.mesh.material.dispose();shots.splice(shots.indexOf(s),1);}continue;}
   if(!getEnemies().includes(s.target)||s.target.hp<=0)done=true;
   else{
    const end=s.accurate?s.target.mesh.position.clone():s.landing.clone();end.y=.65;const t=Math.min(1,s.age/s.duration);s.mesh.position.copy(s.from).lerp(end,t);if(s.type.lob)s.mesh.position.y+=Math.sin(t*Math.PI)*1.5;if(s.type.id==='cactus'){const direction=s.mesh.position.clone().sub(s.last);if(direction.lengthSq()>0)s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
    if(blockedBetween(s.last,s.mesh.position))done=true;
    else if(!s.type.lob){const hit=getEnemies().filter(e=>segmentDistance(e.mesh.position,s.last,s.mesh.position)<(e.type?.hitRadius??.55)&&Math.abs(s.mesh.position.y-.65)<1).sort((a,b)=>distance(a.mesh.position,s.last)-distance(b.mesh.position,s.last))[0];if(hit){impact(s.type,hit.mesh.position,hit);done=true;}}
    if(!done&&t>=1){const hit=s.accurate?s.target:getEnemies().find(e=>distance(e.mesh.position,end)<(e.type?.hitRadius??.55));impact(s.type,end,hit);done=true;}s.last.copy(s.mesh.position);
   }
   if(done){scene.remove(s.mesh);shots.splice(shots.indexOf(s),1);}
  }
 }
 return {model,plants,shots,markers,add,remove,clear,contacts,targetFor,update,updateShots,impact};
}


