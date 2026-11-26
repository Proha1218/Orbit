import * as THREE from './vendor/three.module.js';

// Full maps are loaded only for the inspected moon. The overview keeps small maps.
export function createMoonDetailLoader(renderer, onStatus) {
 const loader=new THREE.TextureLoader();
 let active=null, request=0;
 const cache=new Map();
 const pilotAssets=new Map();
 function setupPilot(body,version){
  const state=body.material.userData.coveragePilot;
  if(!state)return;
  const id=body.material.userData.coveragePilotId;
  if(!pilotAssets.has(id))pilotAssets.set(id,Promise.all((id==='europa'?['mask','field','display']:['mask','field']).map(async kind=>{
   const map=await loader.loadAsync('./coverage-pilot/'+id+'-'+kind+'.png');
   map.wrapS=THREE.RepeatWrapping;
   map.generateMipmaps=false;
   map.minFilter=map.magFilter=kind==='field'?THREE.LinearFilter:THREE.NearestFilter;
   if(kind==='field')map.colorSpace=THREE.SRGBColorSpace;
   return map;
  })).catch(error=>{pilotAssets.delete(id);throw error;}));
  pilotAssets.get(id).then(([mask,field,display])=>{
   if(version!==request)return;
   const control=document.querySelector('#hd-coverage-pilot');
   if(!control)return;
   state.pilotMask.value=mask;
   state.pilotField.value=field;
   if(state.pilotDisplay)state.pilotDisplay.value=display;
   const update=()=>{if(version===request)state.pilotMode.value=Number(control.value);};
   control.onchange=update;
   control.disabled=false;
   update();
  }).catch(()=>{if(version===request)onStatus('HD · материалы пилота не загрузились');});
 }
 function restore(){if(active){const material=active.body.material;material.map=active.base;if(material.userData.coveragePilot)material.userData.coveragePilot.pilotMode.value=0;active=null;}}
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
   setupPilot(body,version);
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

