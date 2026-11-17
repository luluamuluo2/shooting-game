import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {SPELL_REWARD_START,PLANTS,PLANT_SLOTS,PLANT_RANGE,plantAccuracy,plantStats,canUpgradePlant,availablePlantUpgrades,PLANT_UPGRADES,PLANT_REWARD_START,supplyOffers} from '../src/rules.js';import {createPlantSystem} from '../src/plants.js';
function setup(random=()=>0){let mode='playing',time=0,wall=false;const enemies=[],scene=new THREE.Scene();const material=c=>new THREE.MeshBasicMaterial({color:c});const box=(w,h,d,c,x=0,y=0,z=0,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);parent.add(m);return m;};const damageEnemy=(e,n)=>{e.hp-=n;if(e.hp<=0)enemies.splice(enemies.indexOf(e),1);};const system=createPlantSystem({THREE,scene,box,material,getEnemies:()=>enemies,getMode:()=>mode,getTime:()=>time,damageEnemy,blockedBetween:()=>wall,toast(){},onChange(){},random});return {system,enemies,scene,enemy(x,z,hp=100){const e={mesh:new THREE.Group(),hp,speed:1};e.mesh.position.set(x,0,z);enemies.push(e);return e;},setMode(v){mode=v;},setTime(v){time=v;},setWall(v){wall=v;}};}
test('plants distribute lethal in-flight damage, but preserve urgent targets and single-enemy fire',()=>{
 const f=setup();f.system.add(PLANTS[0],0);f.system.add(PLANTS[0],1);const a=f.enemy(-4,-5,4),b=f.enemy(-4,-6,4);f.system.update(1.5);assert.deepEqual(f.system.shots.map(s=>s.target),[a,b]);
 assert.equal(f.system.targetFor(f.system.plants[0]),a); // all covered: still shoot, no deadlock
 f.enemies.splice(f.enemies.indexOf(b),1);f.system.update(1.5);assert.equal(f.system.shots.at(-1).target,a);
});
test('misses do not reserve damage, distance and threat matter, boss flag gives no priority',()=>{
 const f=setup(()=>.99);f.system.add(PLANTS[0],0);const a=f.enemy(-4,-5,4),b=f.enemy(-4,-6,4);b.type={titan:true};f.system.update(1.5);assert.equal(f.system.shots[0].accurate,false);assert.equal(f.system.targetFor(f.system.plants[0]),a);
 const g=setup();g.system.add(PLANTS[0],0);const near=g.enemy(-4,-4),far=g.enemy(10,-4);assert.equal(g.system.targetFor(g.system.plants[0]),near);far.type={titan:true};assert.equal(g.system.targetFor(g.system.plants[0]),near);
});
test('100-shot upgrades cycle distinct live enemies, retain damage and independent RNG',()=>{
 let calls=0;const f=setup(()=>{calls++;return 0;});f.system.add(PLANTS[0],0);f.system.plants[0].upgrades.multi=99;for(let i=0;i<5;i++)f.enemy(-4+i*.2,-5,20);f.system.update(1.5);assert.equal(f.system.shots.length,100);assert.equal(calls,100);for(let i=0;i<100;i+=5)assert.equal(new Set(f.system.shots.slice(i,i+5).map(s=>s.target)).size,5);assert.ok(f.system.shots.every(s=>s.type.damage===4));
});
test('AOE conservative reservations update after deaths and clear',()=>{
 const f=setup();f.system.add(PLANTS[7],0);const a=f.enemy(-4,-5,6),b=f.enemy(-4,-6,6);f.system.update(3.5);assert.equal(f.system.shots[0].target,a);assert.equal(f.system.targetFor(f.system.plants[0]),b);f.enemies.splice(f.enemies.indexOf(b),1);assert.equal(f.system.targetFor(f.system.plants[0]),a);f.system.clear();assert.equal(f.system.shots.length,0);
});

test('AOE repeats a dense center while rewarding uncovered separated clusters, without boss priority',()=>{
 const f=setup();f.system.add(PLANTS[7],0);const p=f.system.plants[0];p.upgrades.multi=5;
 const boss=f.enemy(-4,-3,10000);boss.type={titan:true};const cluster=[];for(let i=0;i<6;i++)cluster.push(f.enemy(3+i*.08,-5,100));
 f.system.update(p.type.interval);assert.ok(f.system.shots.every(s=>cluster.includes(s.target)));assert.ok(new Set(f.system.shots.map(s=>s.target)).size<6,'not forced round robin');
 const g=setup();g.system.add(PLANTS[7],0);g.system.plants[0].upgrades.multi=9;const a=[],b=[];for(let i=0;i<4;i++){a.push(g.enemy(-4+i*.05,-5,6));b.push(g.enemy(4+i*.05,-5,6));}g.system.update(3.5);assert.ok(g.system.shots.some(s=>a.includes(s.target)));assert.ok(g.system.shots.some(s=>b.includes(s.target)));
});
test('AOE crowded 400 enemy / ten 100-shot plant workload remains finite',()=>{
 const f=setup();for(let i=0;i<10;i++){f.system.add(PLANTS[7],i);f.system.plants[i].upgrades.multi=99;}for(let i=0;i<400;i++)f.enemy(-8+(i%20)*.8,-12+Math.floor(i/20)*.5,100);
 f.system.update(3.5);assert.equal(f.system.shots.length,1000);f.system.update(.01);assert.equal(f.system.shots.length,1000);assert.ok(f.system.shots.every(s=>Number.isFinite(s.duration)));
});
