import * as THREE from './vendor/three.module.js';

// Rim scattering is deliberately subtle; the solid sphere still occludes its far side.
export function atmosphere(radius, color, lightDirection) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 64, 40), new THREE.ShaderMaterial({
    uniforms: { tint: {value: new THREE.Color(color)}, sunDirection: {value: lightDirection.clone().normalize()} },
    vertexShader: `varying vec3 vNormal; varying vec3 vWorld;
      void main(){vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `uniform vec3 tint; uniform vec3 sunDirection; varying vec3 vNormal; varying vec3 vWorld;
      void main(){vec3 n=normalize(vNormal);float rim=pow(1.-max(dot(n,normalize(cameraPosition-vWorld)),0.),3.5);
      float day=smoothstep(-.3,.7,dot(n,sunDirection));gl_FragColor=vec4(tint,rim*(.12+.46*day));}`,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.FrontSide
  }));
}

export function saturnRings(radius) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1;
  const ctx=canvas.getContext('2d');
  for(let x=0;x<1024;x++){
    const t=x/1023;const radial=1.24+t*(2.27-1.24);
    const gap=(radial>1.95&&radial<2.03)||(radial>2.214&&radial<2.219);
    const density=radial<1.527?.16:radial<1.95?.82:.48;
    const grain=.73+.18*Math.sin(x*1.7)+.09*Math.sin(x*.29);
    ctx.fillStyle=`rgba(${190+Math.round(25*Math.sin(t*6))},${177+Math.round(20*Math.sin(t*6))},${151+Math.round(18*Math.sin(t*6))},${gap?.015:density*grain})`;
    ctx.fillRect(x,0,1,1);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const inner=radius*1.24,outer=radius*2.27;
  const geo=new THREE.RingGeometry(inner,outer,256,1),pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,(Math.hypot(pos.getX(i),pos.getY(i))-inner)/(outer-inner),.5);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xe5dece,emissiveIntensity:.65,transparent:true,side:THREE.DoubleSide,roughness:1,depthWrite:false,alphaTest:.01}));
  mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=true;return mesh;
}

// An illustrative relief map, never presented as a spacecraft image.
const reliefCache=new Map();
export function moonRelief(key,icy=false){
  if(reliefCache.has(key))return reliefCache.get(key);
  let seed=Array.from(key).reduce((s,c)=>s+c.charCodeAt(0),317);
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle=icy?'#aeb5b8':'#8d8880';ctx.fillRect(0,0,1024,512);
  for(let i=0;i<8000;i++){const x=random()*1024,y=random()*512,r=.4+random()*3;ctx.fillStyle=`rgba(${random()>.5?'255,255,255':'0,0,0'},${random()*.065})`;ctx.fillRect(x,y,r,r);}
  for(let i=0;i<(key==='Titan'?0:260);i++){
    const x=random()*1024,y=random()*512,r=1+random()**3*28;
    const g=ctx.createRadialGradient(x-r*.15,y-r*.2,r*.1,x,y,r);
    g.addColorStop(0,'#35383c65');g.addColorStop(.68,'#373a3e45');g.addColorStop(.82,'#dedbd159');g.addColorStop(1,'#aaa69f00');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  if(['Europa','Enceladus'].includes(key)){
    ctx.strokeStyle=key==='Europa'?'#775e4e70':'#718d9750';ctx.lineWidth=1.1;
    for(let i=0;i<35;i++){let x=random()*1024,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<8;j++){x+=(random()-.35)*50;y+=(random()-.5)*34;ctx.lineTo(x,y);}ctx.stroke();}
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  reliefCache.set(key,map);return map;
}
