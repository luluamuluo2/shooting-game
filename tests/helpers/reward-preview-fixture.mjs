import * as savegame from '../../src/savegame.js';
import {createTitanModel,poseTitanAttack} from '../../src/titans.js';
import {createPlantSystem} from '../../src/plants.js';
import {createRewardPreviewPainter} from '../../src/reward-previews.js';
import * as rules from '../../src/rules.js';
import * as THREE from 'three';
import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import vm from 'node:vm';
export function recordingContext(){let path=[];const shapes=[];return {shapes,globalAlpha:1,fillStyle:'#000',clearRect(){shapes.length=0;},beginPath(){path=[];},moveTo(x,y){path.push(`M${x.toFixed(2)},${y.toFixed(2)}`);},lineTo(x,y){path.push(`L${x.toFixed(2)},${y.toFixed(2)}`);},closePath(){path.push('Z');},fill(){shapes.push(`<path d="${path.join(' ')}" fill="${this.fillStyle}" opacity="${this.globalAlpha}"/>`);}};}
export function setupCards({staticMode=false,reduced=false,noCanvas=false}={}){
 const dom=new JSDOM(fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8'),{url:'http://localhost/',pretendToBeVisual:true}),{window}=dom,document=window.document;
 window.matchMedia=q=>({matches:q.includes('reduced-motion')?reduced:staticMode});document.exitPointerLock=()=>{};const contexts=new Map(),frames=new Map(),timers=new Map();let next=0;
 window.HTMLCanvasElement.prototype.getContext=function(){if(noCanvas)return null;if(!contexts.has(this))contexts.set(this,recordingContext());return contexts.get(this);};
 window.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);
 class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}setClearColor(){}clear(){}setViewport(){}setScissor(){}setScissorTest(){}render(){}}
 const ctx={...savegame,...rules,createTitanModel,poseTitanAttack,createPlantSystem,createRewardPreviewPainter,THREE:{...THREE,WebGLRenderer:Renderer},window,document,HTMLInputElement:window.HTMLInputElement,devicePixelRatio:1,innerWidth:1080,innerHeight:611,performance:{now:()=>0},requestAnimationFrame:()=>0,addEventListener:window.addEventListener.bind(window),setTimeout(fn){const id=++next;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),console};
 vm.createContext(ctx);const source=fs.readFileSync(new URL('../../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.env.DEV','true');vm.runInContext(source,ctx);
 const g=window.__game;
 return {g,dom,document,contexts,frames,run:code=>vm.runInContext(code,ctx),setCards(ids){vm.runInContext(`offers=${JSON.stringify(ids)};selected=-1;state.mode='quiz';renderCards()`,ctx);},step(ms){const jobs=[...frames.values()];frames.clear();jobs.forEach(f=>f(ms));},flush(){const jobs=[...timers.values()];timers.clear();jobs.forEach(f=>f());}};
}
