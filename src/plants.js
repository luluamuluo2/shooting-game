import {PLANTS,PLANT_SLOTS,PLANT_RANGE} from './rules.js';

export function createPlantSystem({THREE,scene,box,material,getEnemies,getMode,getTime,damageEnemy,blockedBetween,toast,onChange}){
 const plants=[],shots=[],markers=[];
 const ballGeometry=new THREE.SphereGeometry(1,8,6);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
 function noRay(mesh){mesh.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});return mesh;}
 for(const slot of PLANT_SLOTS){const marker=noRay(box(1.5,.08,1.5,0x789c65,slot.x,.04,slot.z));markers.push(marker);}
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
 function add(type,slot){if(!PLANTS.includes(type)||!PLANT_SLOTS[slot]||plants.some(p=>p.slot===slot))return false;const mesh=model(type),s=PLANT_SLOTS[slot];mesh.position.set(s.x,0,s.z);scene.add(mesh);plants.push({type,slot,mesh,cooldown:type.interval,armed:null});onChange();return true;}
 function remove(p,notify=true){const i=plants.indexOf(p);if(i<0)return;plants.splice(i,1);scene.remove(p.mesh);markers[p.slot].material=material(0x789c65);if(notify){toast(`${p.type.name}被僵尸碰到了，种植位已空出。`);onChange();}}
 function clear(){for(const p of [...plants])remove(p,false);for(const s of shots){scene.remove(s.mesh);if(s.blast)s.mesh.material.dispose();}shots.length=0;}
 function contacts(enemy,from=enemy.mesh.position,to=enemy.mesh.position){if(getMode()!=='playing')return;for(const p of [...plants])if(segmentDistance(p.mesh.position,from,to)<=1.05)remove(p);}
 function targetFor(p){return getEnemies().filter(e=>e.hp>0&&distance(e.mesh.position,p.mesh.position)<=PLANT_RANGE).sort((a,b)=>b.mesh.position.z-a.mesh.position.z)[0];}
 function impact(type,position,target){
  if(type.radius){const mesh=new THREE.Mesh(ballGeometry,new THREE.MeshBasicMaterial({color:type.color,transparent:true,opacity:.3,wireframe:true}));mesh.position.copy(position);mesh.position.y=.5;mesh.scale.setScalar(type.radius);noRay(mesh);scene.add(mesh);shots.push({mesh,blast:true,age:0,radius:type.radius});}
  const candidates=type.radius?[...getEnemies()].filter(e=>distance(e.mesh.position,position)<=type.radius):getEnemies().includes(target)?[target]:[];
  for(const e of candidates){const a=position.clone(),b=e.mesh.position.clone();a.y=b.y=.65;if(type.radius&&blockedBetween(a,b))continue;damageEnemy(e,type.damage);if(type.slow&&getEnemies().includes(e))e.slowUntil=Math.max(e.slowUntil||0,getTime()+2);}
 }
 function launch(p,target){const from=p.mesh.position.clone();from.y=1;const mesh=new THREE.Mesh(ballGeometry,material(p.type.color));mesh.scale.setScalar(p.type.id==='cannon'?.27:p.type.radius?.22:.13);mesh.position.copy(from);noRay(mesh);scene.add(mesh);shots.push({mesh,type:p.type,target,from,age:0,duration:Math.max(.2,distance(from,target.mesh.position)/10),last:from.clone()});}
 function update(dt){if(getMode()!=='playing')return;
  for(const p of [...plants]){
   if(p.type.oneShot){if(p.armed===null){if(getEnemies().some(e=>distance(e.mesh.position,p.mesh.position)<=p.type.radius)){p.armed=1;markers[p.slot].material=material(0xe0a362);toast('樱桃已点燃：1秒后爆炸！');}}else{p.armed-=dt;p.mesh.scale.setScalar(1+.08*Math.sin((1-p.armed)*30));if(p.armed<=0){impact(p.type,p.mesh.position,null);remove(p,false);onChange();toast('樱桃爆炸！种植位已空出。');}}continue;}
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
    const end=s.target.mesh.position.clone();end.y=.65;const t=Math.min(1,s.age/s.duration);s.mesh.position.copy(s.from).lerp(end,t);if(s.type.lob)s.mesh.position.y+=Math.sin(t*Math.PI)*1.5;
    if(blockedBetween(s.last,s.mesh.position))done=true;
    else if(!s.type.lob){const hit=getEnemies().filter(e=>segmentDistance(e.mesh.position,s.last,s.mesh.position)<.55&&Math.abs(s.mesh.position.y-.65)<1).sort((a,b)=>distance(a.mesh.position,s.last)-distance(b.mesh.position,s.last))[0];if(hit){impact(s.type,hit.mesh.position,hit);done=true;}}
    if(!done&&t>=1){impact(s.type,end,s.target);done=true;}s.last.copy(s.mesh.position);
   }
   if(done){scene.remove(s.mesh);shots.splice(shots.indexOf(s),1);}
  }
 }
 return {plants,shots,markers,add,remove,clear,contacts,targetFor,update,updateShots,impact};
}
