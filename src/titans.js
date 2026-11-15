// Original voxel silhouettes, no imported assets. All feet remain on the ground.
// Physical silhouette stays within a 1.4-unit horizontal radius for navigation.
export function createTitanModel(type,{THREE,box,material}){
 const g=new THREE.Group();g.userData.legs=[];g.userData.wings=[];
 const part=(w,h,d,c,x,y,z,parent=g)=>box(w,h,d,c,x,y,z,parent);
 const leg=(x,z,color)=>{const pivot=new THREE.Group();pivot.position.set(x,.85,z);g.add(pivot);part(.42,.85,.48,color,0,-.42,0,pivot);part(.48,.19,.65,color,0,-.76,.07,pivot);g.userData.legs.push(pivot);return pivot;};
 if(type.id==='star-reaper'){
  const bone=0x71bee4,dark=0x284d80,light=0xc3f4ff;
  leg(-.37,0,dark);leg(.37,0,dark);
  part(.34,1.35,.36,bone,0,1.65,0); // spine
  for(const y of [1.4,1.72,2.04,2.36]){part(1.15,.14,.56,bone,0,y,0);part(.14,.28,.52,bone,-.5,y-.08,0);part(.14,.28,.52,bone,.5,y-.08,0);}
  part(.94,.2,.58,dark,0,2.6,0);part(.28,.45,.3,bone,0,2.87,0);
  part(1.05,1.05,.8,bone,0,3.55,0);part(.83,.23,.75,light,0,3.02,.03);
  for(const x of [-.26,.26]){part(.28,.25,.05,dark,x,3.64,.425);part(.12,.1,.06,0xbcefff,x,3.65,.46);}
  part(.13,.22,.06,dark,0,3.37,.43);for(const x of [-.28,-.09,.09,.28])part(.08,.14,.04,dark,x,3.07,.43);
  // Character's right arm is negative X when viewed from the front.
  part(.22,1.15,.25,bone,-.77,2.1,.03);part(.27,.24,.3,light,-.82,1.48,.05);
  part(.22,1.15,.25,bone,.77,2.1,.03);part(.27,.24,.3,light,.77,1.48,.05);
  // Right-hand block scythe with a tall staff and hooked, icy blade.
  part(.13,3.8,.13,dark,-1.02,2.15,.05);part(.3,.18,.22,light,-1.02,4.03,.05);
  part(1.55,.22,.18,light,-.4,4.24,.05);part(.45,.25,.18,light,.56,4.08,.05);part(.18,.58,.18,light,.82,3.88,.05);
  part(.18,.28,.18,0xf2fbff,-1.02,4.42,.05);
 }else if(type.id==='warden'){
  const body=0x153f48,edge=0x236571,glow=0x8fdccb;
  leg(-.43,0,body);leg(.43,0,body);part(1.35,1.75,.9,body,0,1.92,0);
  part(1.65,.45,1,edge,0,2.73,0);part(.38,1.65,.55,body,-.99,2,.05);part(.38,1.65,.55,body,.99,2,.05);
  part(.48,.36,.65,edge,-.99,1.17,.1);part(.48,.36,.65,edge,.99,1.17,.1);
  part(1.15,1,.82,body,0,3.45,0);part(.75,.18,.06,0x081e29,0,3.37,.44);
  for(const side of [-1,1]){
   part(.19,.7,.24,edge,side*.74,3.93,0);part(.38,.18,.25,glow,side*.86,4.44,0);part(.16,.6,.22,glow,side*1.02,4.23,0);
   for(const y of [1.45,1.8,2.15]){const rib=part(.47,.12,.08,glow,side*.31,y,.49);rib.rotation.z=side*.17;}
  }
  part(.22,.9,.09,0xb0e8ca,0,1.9,.5);part(.34,.35,.11,0xd3f2be,0,2.36,.53);
 }else if(type.id==='ender-dragon'){
  const body=0x30293f,edge=0x54426d,wing=0x715689,glow=0xc8a0f4;
  for(const x of [-.48,.48])for(const z of [-.55,.55])leg(x,z,body);
  part(1.05,1.1,1.65,body,0,1.2,0);part(.7,1.35,.65,body,0,2.2,.35);part(.6,1.15,.6,edge,0,3.12,.55);
  part(.95,.75,.8,body,0,3.9,.57);part(.7,.4,.55,edge,0,3.69,.98);
  for(const x of [-.31,.31]){part(.16,.16,.05,glow,x,4,.995);part(.16,.52,.18,edge,x,4.47,.35);part(.1,.13,.12,0xe9deff,x,3.5,1.18);}
  // Vertical folded wings visibly project above the back, not a flight pose.
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*.5,1.55,-.18);g.add(pivot);
   part(.17,2.55,.22,edge,side*.3,1.05,-.1,pivot);
   const membrane=part(.62,2.1,.12,wing,side*.46,1.03,-.17,pivot);membrane.rotation.z=side*.12;
   part(.65,.15,.2,edge,side*.48,2.12,-.16,pivot);part(.66,.12,.2,edge,side*.48,.54,-.16,pivot);
   part(.16,.55,.2,edge,side*.8,1.8,-.16,pivot);g.userData.wings.push(pivot);
  }
  part(.48,.46,.45,body,0,1.12,-1.04);part(.3,.3,.25,edge,0,1.1,-1.25);
  for(const y of [1.8,2.3,2.8])part(.2,.25,.3,glow,0,y,.02);
 }else throw new Error(`Unknown titan model: ${type.id}`);
 const bar=new THREE.Group();bar.position.y=5.15;
 part(2.1,.18,.08,0x263846,0,0,0,bar);const fill=part(2,.12,.1,0xf5ad67,0,0,.02,bar);g.add(bar);
 bar.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});g.userData.bar=bar;g.userData.fill=fill;
 const warn=part(.28,.48,.28,0xffca62,0,5.55,0);warn.visible=false;warn.raycast=()=>{};g.userData.warn=warn;
 return g;
}
