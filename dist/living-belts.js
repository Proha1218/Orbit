import * as THREE from './vendor/three.module.js';

const TAU=2*Math.PI;
const KIRKWOOD=[2.50,2.82,2.95,3.27];

function makeParticleTexture(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const radius=Math.hypot((x+.5)/size-.5,(y+.5)/size-.5)*2;
  const i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;
  data[i+3]=Math.round(255*Math.max(0,1-radius*radius)**2);
 }
 const texture=new THREE.DataTexture(data,size,size);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.needsUpdate=true;
 return texture;
}
let particleTexture;

// Seamless tonal and bump maps for the illustrative close-up models.
const rockMaps=new Map();
export function rockSurface(icy,seed=null){
 if(seed===null&&rockMaps.has(icy))return rockMaps.get(icy);
 const size=512;
 const coarseCells=seed===null?9:7+((seed>>>4)&7);
 const detailCells=seed===null?47:34+((seed>>>11)&31);
 const grainCells=seed===null?115:96+((seed>>>19)&31);
 const color=new Uint8Array(size*size*4),height=new Uint8Array(color.length);
 function noise(u,v,cells){
  const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y);
  const smooth=t=>t*t*(3-2*t);
  const hash=(a,b)=>{
   let h=Math.imul((a+cells)%cells,374761393)^Math.imul((b+cells)%cells,668265263)^cells^(seed??0);
   h=Math.imul(h^(h>>>13),1274126177);
   return ((h^(h>>>16))>>>0)/4294967295;
  };
  const sx=smooth(x-ix),sy=smooth(y-iy);
  const sample=THREE.MathUtils.lerp(
   THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),
   THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
  if(seed===null)return sample;
  // Longitude converges at each pole on a sphere.
  const poleBlend=THREE.MathUtils.smoothstep(Math.min(v,1-v),0,.065);
  return THREE.MathUtils.lerp(hash(0,v<.5?0:cells-1),sample,poleBlend);
 }
 const byte=value=>Math.round(255*THREE.MathUtils.clamp(value,0,1));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=seed===null?y/size:y/(size-1),i=4*(y*size+x);
  const coarse=noise(u,v,coarseCells),grain=noise(u,v,grainCells),detail=noise(u,v,detailCells);
  const fractures=1-Math.min(1,Math.abs(noise(u+coarse*.08,v,24)-.5)*18);
  const relief=.34+.22*coarse+.20*detail+.27*grain-.10*fractures;
  const shade=.45+.26*coarse+.24*detail+.18*grain-.11*fractures;
  const frost=icy?THREE.MathUtils.smoothstep(coarse,.44,.74):0;
  color[i]=byte(shade*(1-.15*frost));
  color[i+1]=byte(shade*(icy?.99+.10*frost:.96));
  color[i+2]=byte(shade*(icy?1+.20*frost:.90));
  color[i+3]=height[i+3]=255;
  height[i]=height[i+1]=height[i+2]=byte(relief);
 }
 function texture(data,colorSpace){
  const map=new THREE.DataTexture(data,size,size);
  map.colorSpace=colorSpace;
  map.wrapS=THREE.RepeatWrapping;
  map.wrapT=seed===null?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
  map.magFilter=THREE.LinearFilter;
  map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;
  map.needsUpdate=true;
  return map;
 }
 const maps={map:texture(color,THREE.SRGBColorSpace),bumpMap:texture(height,THREE.NoColorSpace)};
 if(seed===null)rockMaps.set(icy,maps);
 return maps;
}

function rockGeometry(icy){
 const geometry=new THREE.IcosahedronGeometry(1,3);
 const p=geometry.attributes.position;
 const colors=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const surface=1+.13*Math.sin(4*x+3*y)*Math.cos(5*z-2*y)+.07*Math.sin(9*x+4*z);
  p.setXYZ(i,x*surface*(icy?1.12:1.2),y*surface*.76,z*surface*.91);
  const tone=.57+.17*Math.sin(8*x+5*y)*Math.cos(9*z-3*y)+.09*Math.sin(23*x+18*y+13*z);
  colors.set(icy?[tone*.92,tone,tone*1.04]:[tone,tone*.9,tone*.79],i*3);
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 return geometry;
}

export function livingBelt({inner,outer,count,kind}){
 const icy=kind==='kuiper',width=outer-inner;
 const group=new THREE.Group();
 let seed=icy?9887:2579;
 const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const position=new Float32Array(count*3),color=new Float32Array(count*3),orbits=[];
 const palette=(icy?[0x8ed5e8,0xbddbe9,0x9aa9df,0xc5a19a]:[0xe2bc8b,0xc7946f,0xa89988,0xd3c5a9]).map(c=>new THREE.Color(c));
 for(let i=0;i<count;i++){
  const lowInclination=icy&&random()<.65;
  let au;
  if(icy)au=lowInclination?42+random()*5:34+random()*16;
  else {
   do{au=2.1+random()*1.2;}while(KIRKWOOD.some(gap=>Math.abs(au-gap)<.018)&&random()<.89);
  }
  const rangeStart=icy?30:2.1,rangeWidth=icy?20:1.2;
  const a=inner+(au-rangeStart)/rangeWidth*width;
  const inclination=(lowInclination?4:icy?22:12)*(random()**1.7)*Math.PI/180;
  const node=random()*TAU;
  orbits.push({a,phase:random()*TAU,cosNode:Math.cos(node),sinNode:Math.sin(node),cosInc:Math.cos(inclination),sinInc:Math.sin(inclination),rate:TAU/(365.256*au**1.5)});
  const shade=.38+random()*.62,tint=palette[Math.floor(random()*palette.length)];
  color.set([tint.r*shade,tint.g*shade,tint.b*shade],i*3);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('color',new THREE.BufferAttribute(color,3));
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),outer);
 particleTexture??=makeParticleTexture();
 const points=new THREE.Points(geometry,new THREE.PointsMaterial({
  size:2,sizeAttenuation:false,
  map:particleTexture,vertexColors:true,transparent:true,opacity:.85,depthWrite:false
 }));
 group.add(points);

 const hero=new THREE.Object3D();
 group.add(hero);
 const heroRadius=Math.max(icy?.75:.22,width*.031);
 let sample;
 group.userData.inspectTarget=hero;
 group.userData.inspectRadius=heroRadius;
 group.userData.meanRadius=(inner+outer)/2;
 group.userData.outerRadius=outer;

 let lastParticleDay=NaN;
 group.userData.update=(days,close)=>{
  hero.visible=close;
  if(close&&!sample){
   const material=new THREE.MeshStandardMaterial({
    ...rockSurface(icy),color:icy?0xc5dcdf:0xaaa399,bumpScale:icy?.055:.043,
    roughness:icy?.86:1,vertexColors:true
   });
   sample=new THREE.Mesh(rockGeometry(icy),material);
   sample.scale.setScalar(heroRadius);
   hero.add(sample);
  }
  if(days!==lastParticleDay){
   for(let i=0;i<orbits.length;i++){
    const o=orbits[i],phase=o.phase+days*o.rate;
    const x=o.a*Math.cos(phase),z=o.a*Math.sin(phase);
    position[i*3]=x*o.cosNode-z*o.cosInc*o.sinNode;
    position[i*3+1]=z*o.sinInc;
    position[i*3+2]=x*o.sinNode+z*o.cosInc*o.cosNode;
   }
   hero.position.fromArray(position);
   geometry.attributes.position.needsUpdate=true;
   lastParticleDay=days;
  }
  if(close)sample.rotation.set(days*.03,days*.02,0);
 };
 group.userData.update(0,false);
 return group;
}
