import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {PLANTS,PLANT_SLOTS,PLANT_RANGE,plantAccuracy,PLANT_REWARD_START,supplyOffers} from '../src/rules.js';import {createPlantSystem} from '../src/plants.js';
function setup(random=()=>0){let mode='playing',time=0,wall=false;const enemies=[],scene=new THREE.Scene();const material=c=>new THREE.MeshBasicMaterial({color:c});const box=(w,h,d,c,x=0,y=0,z=0,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);parent.add(m);return m;};const damageEnemy=(e,n)=>{e.hp-=n;if(e.hp<=0)enemies.splice(enemies.indexOf(e),1);};const system=createPlantSystem({THREE,scene,box,material,getEnemies:()=>enemies,getMode:()=>mode,getTime:()=>time,damageEnemy,blockedBetween:()=>wall,toast(){},onChange(){},random});return {system,enemies,scene,enemy(x,z,hp=100){const e={mesh:new THREE.Group(),hp,speed:1};e.mesh.position.set(x,0,z);enemies.push(e);return e;},setMode(v){mode=v;},setTime(v){time=v;},setWall(v){wall=v;}};}
test('approved plant values, 8 slots and bounded four-category supply',()=>{
 assert.deepEqual(PLANTS.map(p=>[p.damage,p.interval]),[[4,1.5],[7,2.5],[5,2],[6,2.5],[6,3.5],[4,4],[16,7],[6,3.5]]);assert.equal(PLANT_RANGE,21);assert.equal(PLANT_SLOTS.length,8);assert.equal(PLANT_REWARD_START,17);
 let seed=9;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),seen=new Set();
 for(let n=0;n<10000;n++){const cards=supplyOffers(4,0,rng,0);assert.equal(new Set(cards).size,3);cards.forEach(i=>seen.add(i));assert.ok(supplyOffers(5,20,rng,8).every(i=>i<3));}assert.equal(seen.size,25);
});
test('all eight repeating plants wait one interval then deliver exact damage',()=>{
 for(const type of PLANTS){const f=setup(),p=f.system;assert.ok(p.add(type,0));const e=f.enemy(-4,-8);p.update(type.interval-.01);assert.equal(p.shots.length,0,type.id);p.update(.01);assert.equal(p.shots.length,1,type.id);assert.equal(e.hp,100);p.updateShots(3);assert.equal(e.hp,100-type.damage,type.id);assert.equal(p.plants[0].cooldown,type.interval);}
});
test('target closest to village within 21 units; single-target cannon does not splash',()=>{
 const f=setup();f.system.add(PLANTS[6],0);const back=f.enemy(-4,-9),front=f.enemy(-3,-7),out=f.enemy(24,2);assert.equal(f.system.targetFor(f.system.plants[0]),front);f.system.update(7);f.system.updateShots(3);assert.equal(front.hp,84);assert.equal(back.hp,100);assert.equal(out.hp,100);
});
test('melon AoE radius 1.5 and ice refreshes 20 percent for two seconds, not stacks',()=>{
 const f=setup(),[a,b,c]=[f.enemy(-4,-8),f.enemy(-2.6,-8),f.enemy(-2.4,-8)];f.setTime(10);f.system.impact(PLANTS[5],a.mesh.position,a);assert.deepEqual([a.hp,b.hp,c.hp],[96,96,100]);assert.equal(a.slowUntil,12);assert.equal(a.speed,1);f.setTime(11);f.system.impact(PLANTS[5],a.mesh.position,a);assert.equal(a.slowUntil,13);assert.equal(a.speed,1);
});
test('cherry repeatedly throws at range, explodes on impact and never self-destructs',()=>{
 const f=setup(),p=f.system;p.add(PLANTS[7],0);const e=f.enemy(-4.5,-10),near=f.enemy(-3.1,-10),far=f.enemy(-2.9,-10);p.update(3.49);assert.equal(p.shots.length,0);p.update(.01);assert.equal(p.shots.length,1);assert.equal(e.hp,100);for(let n=0;n<50;n++)p.updateShots(.05);assert.deepEqual([e.hp,near.hp,far.hp],[94,94,100]);assert.equal(p.plants.length,1);p.update(3.5);for(let n=0;n<50;n++)p.updateShots(.05);assert.equal(e.hp,88);assert.equal(p.plants.length,1);
});
test('contact destroys cherry without an on-death explosion; swept contact catches charge',()=>{
 const f=setup();f.system.add(PLANTS[7],0);const e=f.enemy(-4.5,-.1);f.system.update(.01);f.system.contacts(e,new THREE.Vector3(-5.2,0,-1),new THREE.Vector3(-5.2,0,4));assert.equal(f.system.plants.length,0);f.system.update(5);assert.equal(e.hp,100);
});
test('pause freezes firing, projectile and cherry; reset clears every shot/plant',()=>{
 const f=setup();f.system.add(PLANTS[0],0);f.system.add(PLANTS[7],3);f.enemy(-4,-8);f.enemy(.7,-.1);f.system.update(1.5);const p=f.system.plants[0],shot=f.system.shots[0],pos=shot.mesh.position.clone(),cd=p.cooldown;f.setMode('quiz');f.system.update(10);f.system.updateShots(10);assert.equal(p.cooldown,cd);assert.ok(shot.mesh.position.equals(pos));assert.equal(f.system.plants[1].cooldown,2);f.system.clear();assert.equal(f.system.shots.length,0);assert.equal(f.system.plants.length,0);
});
test('world geometry stops projectiles; duplicate slot rejected; friendly models ignore rays',()=>{
 const f=setup();f.system.add(PLANTS[0],0);assert.equal(f.system.add(PLANTS[1],0),false);const e=f.enemy(-4,-8);f.system.update(1.5);f.setWall(true);f.system.updateShots(3);assert.equal(e.hp,100);assert.equal(f.system.shots.length,0);const model=f.system.plants[0].mesh;model.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-4,1,-2),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(model,true).length,0);
});

test('single near-village row covers every spawn corner with unchanged cadence and live projectiles',()=>{
 assert.deepEqual(PLANT_SLOTS.map(s=>s.x),[-5.2,-3.9,-2.6,-1.2,1.2,2.6,3.9,5.2]);assert.ok(PLANT_SLOTS.every(s=>s.z===1.7&&s.z<3));
 for(let slot=0;slot<8;slot++)for(const x of [-4.6,-3.4,-.6,.6,3.4,4.6])for(const z of [-16,-14])for(const type of PLANTS){
  const f=setup();f.system.add(type,slot);const e=f.enemy(x,z);assert.equal(f.system.targetFor(f.system.plants[0]),e);f.system.update(type.interval-.001);assert.equal(f.system.shots.length,0);f.system.update(.001);assert.equal(f.system.shots.length,1);assert.ok(f.system.shots[0].duration<=2.1);for(let i=0;i<50;i++)f.system.updateShots(.05);assert.equal(e.hp,100-type.damage,`${slot}/${x}/${z}/${type.id}`);assert.equal(f.system.shots.filter(s=>!s.blast).length,0);
 }
});
test('contact is local, not a lane-wide kill box; cherry also fires at distant spawn',()=>{
 const f=setup();f.system.add(PLANTS[7],0);const e=f.enemy(4.6,-16);f.system.update(100);assert.equal(f.system.shots.length,1);const s=PLANT_SLOTS[0];f.system.contacts(e,new THREE.Vector3(s.x+.86,0,s.z-2),new THREE.Vector3(s.x+.86,0,s.z+2));assert.equal(f.system.plants.length,1);f.system.contacts(e,new THREE.Vector3(s.x+.84,0,s.z-2),new THREE.Vector3(s.x+.84,0,s.z+2));assert.equal(f.system.plants.length,0);
});

test('accuracy inclusive boundaries and seeded sample rates',()=>{
 for(const [d,p] of [[0,1],[5,1],[5.001,.85],[10,.85],[10.001,.65],[15,.65],[15.001,.45],[21,.45],[21.001,0]])assert.equal(plantAccuracy(d),p);
 let seed=765;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const d of [5,10,15,21]){let hit=0;for(let n=0;n<100000;n++)if(rng()<plantAccuracy(d))hit++;assert.ok(Math.abs(hit/100000-plantAccuracy(d))<.006,`${d}: ${hit}`);}
});
test('all eight types use launch distance, visible miss flights, pause, exact cooldown and no distant shot',()=>{
 for(const type of PLANTS){
  const f=setup(()=>.99),p=f.system;p.add(type,0);const slot=PLANT_SLOTS[0],e=f.enemy(slot.x,slot.z-20);p.update(type.interval);assert.equal(p.shots.length,1);const shot=p.shots[0];assert.equal(shot.accurate,false);assert.ok(shot.landing.distanceTo(e.mesh.position)>2);assert.equal(p.plants[0].cooldown,type.interval);p.updateShots(.5);assert.notEqual(shot.mesh.position.x,slot.x);const pos=shot.mesh.position.clone();f.setMode('quiz');p.updateShots(100);assert.ok(shot.mesh.position.equals(pos));f.setMode('playing');for(let n=0;n<60;n++)p.updateShots(.05);assert.equal(e.hp,100,type.id);assert.equal(p.shots.filter(s=>!s.blast).length,0);
  p.clear();p.add(type,0);e.mesh.position.z=slot.z-21.01;p.update(100);assert.equal(p.shots.length,0);
 }
});
test('missed AoE lands off target and damages/slows only actual neighbors, expired targets clear safely',()=>{
 const f=setup(()=>.99),p=f.system;p.add(PLANTS[5],0);const s=PLANT_SLOTS[0],target=f.enemy(s.x,s.z-20);p.update(4);const shot=p.shots[0],landing=shot.landing.clone();const neighbor=f.enemy(landing.x,landing.z),outside=f.enemy(landing.x+1.51,landing.z);f.setTime(10);for(let n=0;n<60;n++)p.updateShots(.05);assert.equal(target.hp,100);assert.equal(target.slowUntil,undefined);assert.equal(neighbor.hp,96);assert.equal(neighbor.slowUntil,12);assert.equal(outside.hp,100);assert.equal(outside.slowUntil,undefined);
 p.clear();p.add(PLANTS[0],0);p.update(1.5);const dead=p.shots[0].target;f.enemies.splice(f.enemies.indexOf(dead),1);p.updateShots(.05);assert.equal(p.shots.length,0);
});
test('cherry uses distance misses and splashes only neighbors of actual landing',()=>{
 let calls=0;const f=setup(()=>{calls++;return .99;}),p=f.system;p.add(PLANTS[7],0);const s=PLANT_SLOTS[0],e=f.enemy(s.x,s.z-20);p.update(3.5);const shot=p.shots[0];assert.equal(shot.accurate,false);assert.ok(calls>0);const neighbor=f.enemy(shot.landing.x,shot.landing.z),outside=f.enemy(shot.landing.x+1.51,shot.landing.z);for(let n=0;n<60;n++)p.updateShots(.05);assert.deepEqual([e.hp,neighbor.hp,outside.hp],[100,94,100]);assert.equal(p.plants.length,1);
});
test('plant pads and bases clear stone paths without coplanar surfaces at every slot',()=>{
 const f=setup();for(let i=0;i<8;i++){
  const pad=f.system.markers[i],bounds=new THREE.Box3().setFromObject(pad);assert.ok(bounds.min.y>.08+.005);assert.ok(bounds.max.y>.16);
  f.system.add(PLANTS[i],i);const plant=f.system.plants[i];plant.mesh.updateMatrixWorld(true);const base=plant.mesh.children[0],baseBounds=new THREE.Box3().setFromObject(base);assert.ok(baseBounds.min.y>bounds.max.y);assert.equal(plant.mesh.position.x,PLANT_SLOTS[i].x);assert.equal(plant.mesh.position.z,PLANT_SLOTS[i].z);
  // Shared geometry is stable across window aspects and FOV projections; it never relies on CSS offsets.
  for(const [w,h] of [[360,800],[844,390],[1440,900],[2048,544]]){const camera=new THREE.PerspectiveCamera(72,w/h,.06,120);camera.position.set(0,1.8,7);camera.lookAt(0,1,0);camera.updateMatrixWorld();const p=pad.position.clone().project(camera);assert.ok([p.x,p.y,p.z].every(Number.isFinite));}
 }
});
test('cactus uses an aligned white spike without changing its damage, cadence or collision',()=>{
 const f=setup(),p=f.system;p.add(PLANTS[1],0);const s=PLANT_SLOTS[0],e=f.enemy(s.x,s.z-4);p.update(2.49);assert.equal(p.shots.length,0);p.update(.01);const shot=p.shots[0];assert.equal(shot.mesh.geometry.type,'ConeGeometry');assert.equal(shot.mesh.material.color.getHex(),0xffffff);assert.equal(shot.mesh.scale.x,1);assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(shot.mesh.quaternion).z<-.9);p.updateShots(.1);const q=shot.mesh.quaternion.clone();f.setMode('paused');p.updateShots(2);assert.ok(shot.mesh.quaternion.equals(q));f.setMode('playing');p.updateShots(1);assert.equal(e.hp,93);assert.equal(p.plants[0].cooldown,2.5);
});
test('eight pads have distinct non-overlapping bases and four per side',()=>{
 assert.equal(PLANT_SLOTS.filter(s=>s.x<0).length,4);assert.equal(PLANT_SLOTS.filter(s=>s.x>0).length,4);for(let i=1;i<8;i++)assert.ok(PLANT_SLOTS[i].x-PLANT_SLOTS[i-1].x>=1.2);assert.ok(PLANT_SLOTS.every(s=>s.z===1.7));
});
test('cabbage layers and striped/frost melons change only projectile visuals',()=>{
 for(const [index,visual,children] of [[3,'layered-cabbage',6],[4,'striped-melon',6],[5,'frost-striped-melon',9]]){
  const f=setup(),p=f.system,type=PLANTS[index];p.add(type,0);const s=PLANT_SLOTS[0],e=f.enemy(s.x,s.z-5);p.update(type.interval);const shot=p.shots[0];assert.equal(shot.mesh.userData.visual,visual);assert.equal(shot.mesh.children.length,children);if(index!==3)assert.equal(shot.mesh.children.filter(m=>m.geometry.type==='TorusGeometry').length,5);assert.equal(shot.type,type);for(let n=0;n<20;n++)p.updateShots(.05);assert.equal(e.hp,100-type.damage);assert.equal(p.plants[0].cooldown,type.interval);
 }
});
