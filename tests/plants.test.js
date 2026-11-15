import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {PLANTS,PLANT_SLOTS,PLANT_RANGE,PLANT_REWARD_START,supplyOffers} from '../src/rules.js';import {createPlantSystem} from '../src/plants.js';
function setup(){let mode='playing',time=0,wall=false;const enemies=[],scene=new THREE.Scene();const material=c=>new THREE.MeshBasicMaterial({color:c});const box=(w,h,d,c,x=0,y=0,z=0,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);parent.add(m);return m;};const damageEnemy=(e,n)=>{e.hp-=n;if(e.hp<=0)enemies.splice(enemies.indexOf(e),1);};const system=createPlantSystem({THREE,scene,box,material,getEnemies:()=>enemies,getMode:()=>mode,getTime:()=>time,damageEnemy,blockedBetween:()=>wall,toast(){},onChange(){}});return {system,enemies,scene,enemy(x,z,hp=100){const e={mesh:new THREE.Group(),hp,speed:1};e.mesh.position.set(x,0,z);enemies.push(e);return e;},setMode(v){mode=v;},setTime(v){time=v;},setWall(v){wall=v;}};}
test('approved plant values, 6 slots and bounded four-category supply',()=>{
 assert.deepEqual(PLANTS.map(p=>[p.damage,p.interval]),[[4,1.5],[7,2.5],[5,2],[6,2.5],[6,3.5],[4,4],[16,7],[30,0]]);assert.equal(PLANT_RANGE,6);assert.equal(PLANT_SLOTS.length,6);assert.equal(PLANT_REWARD_START,17);
 let seed=9;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),seen=new Set();
 for(let n=0;n<10000;n++){const cards=supplyOffers(4,0,rng,0);assert.equal(new Set(cards).size,3);cards.forEach(i=>seen.add(i));assert.ok(supplyOffers(5,20,rng,6).every(i=>i<3));}assert.equal(seen.size,25);
});
test('all seven repeating plants wait one interval then deliver exact damage',()=>{
 for(const type of PLANTS.filter(p=>!p.oneShot)){const f=setup(),p=f.system;assert.ok(p.add(type,0));const e=f.enemy(-4,-8);p.update(type.interval-.01);assert.equal(p.shots.length,0,type.id);p.update(.01);assert.equal(p.shots.length,1,type.id);assert.equal(e.hp,100);p.updateShots(1);assert.equal(e.hp,100-type.damage,type.id);assert.equal(p.plants[0].cooldown,type.interval);}
});
test('target closest to village within six units; single-target cannon does not splash',()=>{
 const f=setup();f.system.add(PLANTS[6],0);const back=f.enemy(-4,-9),front=f.enemy(-3,-7),out=f.enemy(4,2);assert.equal(f.system.targetFor(f.system.plants[0]),front);f.system.update(7);f.system.updateShots(1);assert.equal(front.hp,84);assert.equal(back.hp,100);assert.equal(out.hp,100);
});
test('melon AoE radius 1.5 and ice refreshes 20 percent for two seconds, not stacks',()=>{
 const f=setup(),[a,b,c]=[f.enemy(-4,-8),f.enemy(-2.6,-8),f.enemy(-2.4,-8)];f.setTime(10);f.system.impact(PLANTS[5],a.mesh.position,a);assert.deepEqual([a.hp,b.hp,c.hp],[96,96,100]);assert.equal(a.slowUntil,12);assert.equal(a.speed,1);f.setTime(11);f.system.impact(PLANTS[5],a.mesh.position,a);assert.equal(a.slowUntil,13);assert.equal(a.speed,1);
});
test('cherry waits for proximity, counts one second, explodes once and frees slot',()=>{
 const f=setup();f.system.add(PLANTS[7],0);f.system.update(20);assert.equal(f.system.plants[0].armed,null);const e=f.enemy(-4,-6.8);f.system.update(.01);assert.equal(f.system.plants[0].armed,1);f.system.update(.99);assert.equal(e.hp,100);f.system.update(.011);assert.equal(e.hp,70);assert.equal(f.system.plants.length,0);f.system.update(10);assert.equal(e.hp,70);assert.ok(f.system.add(PLANTS[0],0));
});
test('contact destroys armed cherry without exploding; swept contact catches charge',()=>{
 const f=setup();f.system.add(PLANTS[7],0);const e=f.enemy(-4,-6.8);f.system.update(.01);f.system.contacts(e,new THREE.Vector3(-4,0,-8),new THREE.Vector3(-4,0,-3));assert.equal(f.system.plants.length,0);f.system.update(5);assert.equal(e.hp,100);
});
test('pause freezes firing, projectile and cherry; reset clears every shot/plant',()=>{
 const f=setup();f.system.add(PLANTS[0],0);f.system.add(PLANTS[7],3);f.enemy(-4,-8);f.enemy(4,-6.8);f.system.update(1.5);const p=f.system.plants[0],shot=f.system.shots[0],pos=shot.mesh.position.clone(),cd=p.cooldown;f.setMode('quiz');f.system.update(10);f.system.updateShots(10);assert.equal(p.cooldown,cd);assert.ok(shot.mesh.position.equals(pos));assert.equal(f.system.plants[1].armed,1);f.system.clear();assert.equal(f.system.shots.length,0);assert.equal(f.system.plants.length,0);
});
test('world geometry stops projectiles; duplicate slot rejected; friendly models ignore rays',()=>{
 const f=setup();f.system.add(PLANTS[0],0);assert.equal(f.system.add(PLANTS[1],0),false);const e=f.enemy(-4,-8);f.system.update(1.5);f.setWall(true);f.system.updateShots(1);assert.equal(e.hp,100);assert.equal(f.system.shots.length,0);const model=f.system.plants[0].mesh;model.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-4,1,-2),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(model,true).length,0);
});
