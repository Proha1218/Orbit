import {SphereGeometry} from './vendor/three.module.js';
import {rockSurface} from './living-belts.js';

function seedFor(key) {
 let seed=2166136261;
 for(const character of String(key))seed=Math.imul(seed^character.charCodeAt(0),16777619);
 seed=Math.imul(seed^(seed>>>16),2246822507);
 seed=Math.imul(seed^(seed>>>13),3266489909);
 return (seed^(seed>>>16))>>>0;
}

function illustrativeGeometry(key,radius,irregular){
 const columns=96,rows=64;
 const geometry=new SphereGeometry(radius,columns,rows);
 if(!irregular)return geometry;
 const seed=seedFor(key),phase=seed/4294967296*Math.PI*2;
 const elongation=1.05+(seed&255)/255*.24;
 const flattening=.69+((seed>>>8)&255)/255*.24;
 const depth=1+((seed>>>16)&255)/255*.16;
 const volumeScale=Math.cbrt(elongation*flattening*depth);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)/radius,y=p.getY(i)/radius,z=p.getZ(i)/radius;
  // Low-frequency variation changes the silhouette without adding specific landforms.
  const profile=1+.095*Math.sin(4*x+3*y+phase)*Math.cos(5*z-2*y)
   +.055*Math.sin(8*x-4*z+2*y-phase)+.018*Math.sin(15*z+7*x+phase);
  const localRadius=profile*radius/volumeScale;
  p.setXYZ(i,x*localRadius*elongation,y*localRadius*flattening,z*localRadius*depth);
 }
 geometry.computeVertexNormals();
 const normals=geometry.attributes.normal;
 for(let row=1;row<rows;row++){
  const a=row*(columns+1),b=a+columns;
  const x=normals.getX(a)+normals.getX(b),y=normals.getY(a)+normals.getY(b),z=normals.getZ(a)+normals.getZ(b);
  const length=Math.hypot(x,y,z);
  normals.setXYZ(a,x/length,y/length,z/length);
  normals.setXYZ(b,x/length,y/length,z/length);
 }
 // The pole positions are duplicated in the UV layout, so match their normals.
 for(const start of [0,rows*(columns+1)]){
  let x=0,y=0,z=0;
  for(let i=start;i<=start+columns;i++){x+=normals.getX(i);y+=normals.getY(i);z+=normals.getZ(i);}
  const length=Math.hypot(x,y,z);
  for(let i=start;i<=start+columns;i++)normals.setXYZ(i,x/length,y/length,z/length);
 }
 return geometry;
}

export function applyMoonIllustration(mesh,{key,radius,radiusKm,illustrative,measuredShape=false}){
 if(!mesh.isMesh||mesh.material.map||!radius)return;
 const irregular=illustrative&&!measuredShape&&radiusKm>0&&radiusKm<=50;
 mesh.geometry.dispose();
 mesh.geometry=illustrativeGeometry(key,radius,irregular);
 const seed=seedFor(key),surface=rockSurface(false,seed);
 const material=mesh.material;
 const original={color:material.color.clone(),roughness:material.roughness,bumpScale:material.bumpScale};
 material.map=surface.map;
 material.bumpMap=surface.bumpMap;
 material.bumpScale=radius*.025;
 material.color.setRGB(.64+(seed&255)/255*.13,.61+((seed>>>8)&255)/255*.12,.57+((seed>>>16)&255)/255*.11);
 const dispose=()=>{surface.map.dispose();surface.bumpMap.dispose();material.removeEventListener("dispose",dispose);};
 material.addEventListener("dispose",dispose);
 material.roughness=.96;
 material.needsUpdate=true;
 mesh.userData.illustrativeSurface={irregular,measuredShape,dispose,radius,original};
}

export function moonIllustrationCaption(mesh){
 const appearance=mesh?.userData.illustrativeSurface;
 if(!appearance)return '';
 const shape=appearance.irregular?'Неровный силуэт показан условно. Точная форма не установлена.':
  appearance.measuredShape?'Пропорции соответствуют измеренным осям.':'Шар служит условной формой для осмотра.';
 return '<div class="map-provenance missing"><strong>Иллюстрация поверхности</strong><p>Шероховатость и оттенки сгенерированы для осмотра. '+shape+'</p></div>';
}


export function releaseMoonIllustration(mesh){
 const appearance=mesh?.userData.illustrativeSurface;
 if(!appearance)return;
 appearance.dispose();
 mesh.material.map=null;
 mesh.material.bumpMap=null;
 mesh.material.color.copy(appearance.original.color);
 mesh.material.roughness=appearance.original.roughness;
 mesh.material.bumpScale=appearance.original.bumpScale;
 mesh.material.needsUpdate=true;
 mesh.geometry.dispose();
 mesh.geometry=new SphereGeometry(appearance.radius,16,12);
 delete mesh.userData.illustrativeSurface;
}
