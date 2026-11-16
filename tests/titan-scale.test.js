import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {TITANS} from '../src/rules.js';
import {createTitanModel} from '../src/titans.js';
function model(type){const material=c=>new THREE.MeshBasicMaterial({color:c}),box=(w,h,d,c,x,y,z,parent)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);parent.add(m);return m;};return createTitanModel(type,{THREE,box,material});}
test('all nine titan bodies have exactly doubled linear dimensions and bounded footprint',()=>{
 for(const type of TITANS){const normal=model({...type,modelScale:1}),giant=model(type);for(const m of [normal,giant]){m.remove(m.userData.bar,m.userData.warn);m.updateMatrixWorld(true);}const before=new THREE.Box3().setFromObject(normal).getSize(new THREE.Vector3()),after=new THREE.Box3().setFromObject(giant).getSize(new THREE.Vector3());for(const axis of ['x','y','z'])assert.ok(Math.abs(after[axis]-before[axis]*2)<1e-9,`${type.id}/${axis}`);assert.ok(after.y>7.5);
  giant.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(Math.hypot(v.x,v.z)<=type.bodyRadius,`${type.id} fits navigation radius`);}});
 }
});
test('toast, timer and boss health share a responsive non-overlay flow stack',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(html,/<div id="battle-notices"[^>]*><div id="boss-timer"[^>]*><\/div><div id="boss-status"[^>]*><\/div><div id="toast"[^>]*><\/div><\/div>/);
 assert.match(css,/#battle-notices\{[^}]*display:flex;flex-direction:column;gap:8px/);
 assert.match(css,/#battle-notices #toast\{position:relative;inset:auto/);
 assert.match(css,/#battle-notices #toast.visible\{display:block\}/);
 assert.match(css,/@media\(max-width:760px\)\{#battle-notices/);assert.match(css,/@media\(max-height:500px\)\{#battle-notices/);
});
