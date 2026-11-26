import {getGraphicsLevel,observeModelProfile} from '../graphics.js';

const names={low:'-low',medium:'-medium',high:'-high',ultra:''};

// Bounds of the original IGOAL node in metres. Keep one reference frame at every level.
export const stationMin=[-36.711238861083984,-22.11564064025879,-54.145687103271484];
export const stationMax=[36.711204528808594,8.510379791259766,54.14688491821289];

export function trimStationAttributes(json) {
 for(const mesh of json.meshes)for(const primitive of mesh.primitives){
  const sets=new Set();
  function collectMaps(properties){
   for(const [key,value] of Object.entries(properties)){
    if(!value||typeof value!=='object')continue;
    if(/texture/i.test(key)&&Number.isInteger(value.index))sets.add(value.texCoord??0);
    collectMaps(value);
   }
  }
  collectMaps(json.materials[primitive.material]??{});
  const draco=primitive.extensions?.KHR_draco_mesh_compression;
  for(const name of Object.keys(primitive.attributes)){
   const uv=name.match(/^TEXCOORD_(\d+)$/);
   if((uv&&!sets.has(Number(uv[1])))||/^COLOR_[1-9]/.test(name)){
    delete primitive.attributes[name];
    if(draco)delete draco.attributes[name];
   }
  }
 }
}

export function watchStationModel(original,signal,load,onReady,onError) {
 let pending,requested,loaded;
 function sync(){
  if(signal.aborted)return;
  const level=getGraphicsLevel();
  if(level===requested)return;
  pending?.abort();
  requested=level;
  if(level===loaded)return;
  pending=new AbortController();
  const requestSignal=AbortSignal.any([signal,pending.signal]);
  const started=performance.now();
  const url=new URL('iss-igoal'+names[level]+'.glb',original);
  load(url,level==='ultra',requestSignal,true).then(gltf=>{
   if(!gltf)return;
   onReady(gltf,{level,ms:Math.round(performance.now()-started)});
   loaded=level;
  }).catch(error=>{
   if(requestSignal.aborted)return;
   requested=loaded;
   onError(error,Boolean(loaded));
  });
 }
 observeModelProfile(sync,signal);
 sync();
}
