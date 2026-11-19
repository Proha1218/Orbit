import * as THREE from './vendor/three.module.js';

// Full maps are loaded only for the inspected moon. The overview keeps small maps.
export function createMoonDetailLoader(renderer, onStatus) {
 const loader=new THREE.TextureLoader();
 let active=null, request=0;
 const cache=new Map();
 function restore(){if(active){active.body.material.map=active.base;active=null;}}
 function release(){request++;restore();}
 function inspect(body,key,meta){
  release();
  if(!meta?.hd)return;
  const version=request;
  active={body,base:body.material.map};
  const ready=map=>{
   if(version!==request)return;
   body.material.map=map;
   onStatus('Подробная карта · '+meta.resolution+' px');
  };
  if(cache.has(key)){const map=cache.get(key);cache.delete(key);cache.set(key,map);ready(map);return;}
  onStatus('Загружается подробная карта…');
  loader.load('./textures/'+meta.hd+'.jpg',map=>{
   map.colorSpace=THREE.SRGBColorSpace;
   map.anisotropy=renderer.capabilities.getMaxAnisotropy();
   map.wrapS=THREE.RepeatWrapping;
   map.minFilter=THREE.LinearMipmapLinearFilter;
   map.magFilter=THREE.LinearFilter;
   // A stale download never replaces a newly selected moon or its material.
   if(version!==request){map.dispose();return;}
   cache.set(key,map);ready(map);
   while(cache.size>1){const [oldKey,oldMap]=cache.entries().next().value;cache.delete(oldKey);oldMap.dispose();}
  },undefined,()=>{if(version===request)onStatus('Базовая карта · подробная версия не загрузилась');});
 }
 return {inspect,release};
}

