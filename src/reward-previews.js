// Brief, isolated card illustrations. CPU projection creates no WebGL/audio contexts.
export function createRewardPreviewPainter({THREE,makeModel,animateModel=()=>{},disposeModel=()=>{},requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),setTimer=globalThis.setTimeout?.bind(globalThis),clearTimer=globalThis.clearTimeout?.bind(globalThis),reducedMotion=false,staticMode=false,document:doc=null}={}){
 const MAX_FACES=2400,MAX_MESHES=160,DURATION=1100,REST=2000,light=new THREE.Vector3(-.5,1,1).normalize();let entries=[],frame=null,restTimer=null,generation=0,disposed=false,start=null,last=-Infinity;
 const value=v=>typeof v==='function'?v():v;
 function stop(){generation++;if(frame!==null)cancelFrame?.(frame);frame=null;if(restTimer!==null)clearTimer?.(restTimer);restTimer=null;start=null;}
 function clear(){for(const e of entries){e.dispose?.();if(e.descriptor.kind!=='spell')disposeModel(e.model,e.descriptor);delete e.canvas.dataset?.preview;e.canvas.parentElement?.classList?.remove('preview-ready');}entries=[];}
 function spellModel(d){
  const root=new THREE.Group(),parts=[],geometries=new Set(),materials=new Set(),key=d.spellKey||d.type?.spellKey||d.type?.key||d.typeId||'tornado',tier=d.tier??d.type?.tier??0;
  const mat=color=>{const m=new THREE.MeshBasicMaterial({color});materials.add(m);return m;};
  const add=(geometry,color,x=0,y=0,z=0)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);root.add(m);return m;};
  const cube=new THREE.BoxGeometry(1,1,1),ring=new THREE.TorusGeometry(1,.1,4,16);geometries.add(cube);geometries.add(ring);
  if(key.includes('tornado')){const fire=key==='fire-tornado',water=key==='water-tornado',color=fire?0xff791f:water?0x36bfff:0xb6e8df;
   for(let i=0;i<8;i++){const m=add(ring,color,0,.25+i*.42,0);m.rotation.x=Math.PI/2;m.scale.setScalar(.2+i*.12);parts.push(m);}
   for(let i=0;i<12;i++){const a=i*2.399,m=add(cube,fire?0xffd254:water?0x94edff:0x718d9c,Math.cos(a)*.8,.2+(i%6)*.5,Math.sin(a)*.8);m.scale.set(.13,fire?.45:.2,.13);parts.push(m);}
   if(fire||water){const m=add(new THREE.CylinderGeometry(1.5,1.5,.1,16),fire?0xd85416:0x247fa8);for(let i=0;i<6;i++){const a=i*Math.PI/3,f=add(fire?cube:ring,color,Math.cos(a),.12,Math.sin(a));f.scale.set(.25,fire?.5:.25,.25);if(water)f.rotation.x=Math.PI/2;}}
  }else if(key==='blizzard'){
   for(let i=0;i<4;i++){const cloud=add(cube,0xc5e2ed,(i-1.5)*.55,2.6,0);cloud.scale.set(.8,.45,.6);}
   for(let i=0;i<16;i++){const snow=add(cube,0xf1ffff,Math.sin(i*2.399)*1.2,.3+(i%5)*.4,Math.cos(i*2.399)*.65);snow.scale.setScalar(.13);snow.rotation.z=Math.PI/4;parts.push(snow);}const ice=add(cube,0x78bfd9,0,.35,0);ice.scale.set(1.3,.7,1);
  }else if(key==='meteor'){
   const rock=add(new THREE.IcosahedronGeometry(.75,0),0xc5451d,.2,1.7,0);parts.push(rock);for(let i=0;i<7;i++){const flame=add(cube,i%2?0xffaa28:0xff5a18,.2+i*.11,2+i*.19,0);flame.scale.set(.4-i*.035,.45,.35-i*.03);parts.push(flame);}const ground=add(ring,0xffa63b,0,.1,0);ground.rotation.x=Math.PI/2;ground.scale.setScalar(1.2);
  }else if(key==='blackhole'){
   const core=add(new THREE.SphereGeometry(.72,12,6),0x060511,0,1.4,0);core.scale.set(1.6,.55,.65);for(let i=0;i<4;i++){const disk=add(ring,i%2?0xb79aff:0x8159dd,0,1.4,0);disk.scale.set(1.4+i*.15,.48+i*.06,1);disk.rotation.y=.2;parts.push(disk);}
  }
  const scale=[.8,1.3,1.8][tier]??1;root.scale.setScalar(scale);root.userData.previewSpell=key;root.userData.previewTier=tier;
  const base=parts.map(m=>({m,position:m.position.clone(),rotation:m.rotation.clone()}));
  return {model:root,fitScale:1.8/scale,animate(t){for(const [i,p] of base.entries()){p.m.position.copy(p.position);p.m.rotation.copy(p.rotation);if(key.includes('tornado'))p.m.rotation.z+=t*1.2;else if(key==='blizzard')p.m.position.y-=t*.35;else if(key==='meteor'){p.m.position.y-=Math.sin(t*Math.PI/2)*.3;p.m.rotation.y+=t*.5;}else p.m.rotation.z+=t*.4;}},dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
 }
 function draw(e){
  const {ctx,canvas,model,camera}=e,w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const meshes=[];model.traverseVisible(o=>{if(o.isMesh&&o.geometry?.attributes?.position&&meshes.length<MAX_MESHES)meshes.push(o);});
  const count=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),stride=Math.max(1,Math.ceil(count/MAX_FACES)),faces=[];
  for(const mesh of meshes){const geo=mesh.geometry,pos=geo.attributes.position,idx=geo.index,n=Math.floor((idx?.count??pos.count)/3),mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(let f=0;f<n&&faces.length<MAX_FACES;f+=stride){const offset=f*3,group=geo.groups.find(g=>offset>=g.start&&offset<g.start+g.count),mat=mats[group?.materialIndex??0]||mats[0];if(!mat||mat.visible===false||mat.opacity===0)continue;
    const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,idx?idx.getX(offset+j):offset+j).applyMatrix4(mesh.matrixWorld));const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize(),shade=.5+.5*Math.max(0,normal.dot(light));points.forEach(p=>p.project(camera));if(points.some(p=>!Number.isFinite(p.x)||p.z< -1||p.z>1))continue;
    const color=(mat.color||new THREE.Color(0x999999)).clone().multiplyScalar(shade);faces.push({points,z:points.reduce((n,p)=>n+p.z,0)/3,color:'#'+color.getHexString(),opacity:mat.transparent?mat.opacity:1});
   }
  }
  faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.globalAlpha=f.opacity;ctx.fillStyle=f.color;ctx.beginPath();f.points.forEach((p,i)=>{const x=(p.x+1)*w/2,y=(1-p.y)*h/2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.fill();}ctx.globalAlpha=1;e.faceCount=faces.length;
 }
 function mount(cells=[]){
  stop();clear();if(disposed)return;
  for(const descriptor of cells.slice(0,6)){
   const canvas=descriptor.canvas;let ctx;try{ctx=canvas?.getContext?.('2d');}catch{}if(!ctx)continue;
   let result;try{result=descriptor.kind==='spell'?spellModel(descriptor):makeModel?.(descriptor);}catch{continue;}const model=result?.model||result;if(!model?.isObject3D)continue;
   const width=Math.max(100,Math.min(360,canvas.clientWidth||240)),height=Math.max(80,Math.min(220,canvas.clientHeight||140));canvas.width=width;canvas.height=height;
   model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);
   // Fit the whole brief action, including a cactus spike, without a moving camera.
   if(!value(reducedMotion)&&!value(staticMode)){for(const progress of [0,.25,.5,.75,1]){result.animate?.(progress*1.1);animateModel(model,descriptor,progress,progress*1.1);model.updateMatrixWorld(true);bounds.union(new THREE.Box3().setFromObject(model));}result.animate?.(0);animateModel(model,descriptor,0,0);}
   const center=bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3()),size=bounds.isEmpty()?2:Math.max(.1,bounds.getSize(new THREE.Vector3()).length())*(result.fitScale||1),aspect=width/height,half=size*.55/Math.min(1,aspect);
   const camera=new THREE.OrthographicCamera(-half*aspect,half*aspect,half,-half,.01,Math.max(100,size*20));camera.position.copy(center).add(new THREE.Vector3(size*2,size*1.2,size*3));camera.lookAt(center);camera.updateProjectionMatrix();
   const e={canvas,ctx,model,camera,descriptor,animate:result.animate,dispose:result.dispose};entries.push(e);try{draw(e);if(!e.faceCount)throw new Error('empty preview');if(canvas.dataset)canvas.dataset.preview='ready';canvas.parentElement?.classList?.add('preview-ready');}catch{entries.pop();e.dispose?.();if(descriptor.kind!=='spell')disposeModel(model,descriptor);}
  }
  resume();
 }
 function resume(){
  if(disposed||frame!==null||restTimer!==null||!entries.length||value(reducedMotion)||value(staticMode)||doc?.hidden||!requestFrame)return;
  const token=generation;start=null;last=-Infinity;
  const tick=timestamp=>{
   if(disposed||token!==generation)return;
   if(doc?.hidden||value(reducedMotion)||value(staticMode)){stop();return;}
   if(start===null)start=timestamp;const elapsed=Math.max(0,timestamp-start);
   if(elapsed-last>=50||elapsed>=DURATION){last=elapsed;const progress=Math.min(1,elapsed/DURATION);for(const e of entries){try{e.animate?.(elapsed/1000);animateModel(e.model,e.descriptor,progress,elapsed/1000);draw(e);}catch{}}}
   if(elapsed<DURATION)frame=requestFrame(tick);
   else{frame=null;if(setTimer)restTimer=setTimer(()=>{if(disposed||token!==generation)return;restTimer=null;resume();},REST);}
  };
  frame=requestFrame(tick);
 }

 return {mount,stop,resume,clear(){stop();clear();},dispose(){stop();clear();disposed=true;},get active(){return frame!==null;},get resting(){return restTimer!==null;},get stats(){return entries.map(e=>({faces:e.faceCount,kind:e.descriptor.kind}));}};
}
