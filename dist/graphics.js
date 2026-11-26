import {DoubleSide} from './vendor/three.module.js';

const profiles = {
 low: {label:'Низкие',dpr:.75,pixelBudget:1000000,particles:.35},
 medium: {label:'Средние',dpr:1,pixelBudget:2300000,particles:.65},
 high: {label:'Высокие',dpr:1.5,pixelBudget:5000000,particles:1},
 ultra: {label:'Ультра',dpr:2,pixelBudget:Infinity,particles:1}
};
const levels=Object.keys(profiles);
const key='orbita-graphics';
let activeLevel='high', activeGraphics, viewer;
export const getGraphicsLevel=()=>activeLevel;
export function modelLoadLabel(info){return info?' · '+profiles[info.level].label+' / '+info.ms+' мс загрузки модели':'';}
const modelProfileListeners=new Set();
export function observeModelProfile(listener,signal){
 modelProfileListeners.add(listener);
 signal.addEventListener('abort',()=>modelProfileListeners.delete(listener),{once:true});
}
const originalPasses=new WeakMap();
export function refreshModelProfile(model){
 if(!model||model.userData.graphicsLevel===activeLevel)return;
 model.userData.graphicsLevel=activeLevel;
 const singlePass=activeLevel==='low'||activeLevel==='medium';
 model.traverse(object=>{
  for(const material of [object.material].flat()){
   if(!material?.transparent||material.side!==DoubleSide)continue;
   if(!originalPasses.has(material))originalPasses.set(material,material.forceSinglePass);
   material.forceSinglePass=singlePass||originalPasses.get(material);
  }
 });
}
export function viewerActive(){return Boolean(viewer);}
export function registerGraphicsViewer(renderer,slot,label,resize){
 const entry={renderer,label,resize};
 viewer=entry;
 const stats=document.querySelector('#graphics-stats');
 slot.append(stats);
 activeGraphics?.clear();
 return {
  frame(now){activeGraphics?.record(renderer,now,label());},
  dispose(){
   if(viewer!==entry)return;
   viewer=null;
   document.body.append(stats);
   activeGraphics?.clear();
  }
 };
}
export function openGraphics(){document.querySelector('#graphics-dialog').showModal();}
export function viewerRatio(width,height,maxSize) {
 return graphicsRatio(activeLevel,width,height,devicePixelRatio,maxSize);
}
export function graphicsRatio(level,width,height,deviceRatio=1,maxSize=Infinity) {
 const {dpr,pixelBudget}=profiles[level];
 return Math.min(deviceRatio,dpr,Math.sqrt(pixelBudget/Math.max(1,width*height)),
  maxSize/Math.max(1,width,height));
}

export function mountGraphics(renderer, getState, onChange) {
 const dialog=document.querySelector('#graphics-dialog');
 const select=dialog.querySelector('select');
 const toggle=dialog.querySelector('input');
 const stats=document.querySelector('#graphics-stats');
 let choice='auto';
 try{
  const saved=localStorage.getItem(key);
  if(levels.includes(saved))choice=saved;
 }catch{}
 let level=choice==='auto'?initialLevel():choice;
 let sampleTime=0,frames=0,slow=0,fast=0,latestStats=0;
 let average=0,worst=0,lastFrame,lastRenderer,lastScene;
 renderer.info.autoReset=false;

 function initialLevel() {
  return Math.max(innerWidth,innerHeight)<=1024?'medium':'high';
 }
 function reset() {
  sampleTime=frames=slow=fast=average=worst=0;
  lastFrame=undefined;
  latestStats=-Infinity;
 }
 function update() {
  activeLevel=level;
  stats.hidden=!toggle.checked;
  onChange(profiles[level].particles);
  viewer?.resize();
 }
 activeLevel=level;
 select.value=choice;
 select.onchange=()=>{
  choice=select.value;
  level=choice==='auto'?initialLevel():choice;
  try{localStorage.setItem(key,choice);}catch{}
  reset();
  update();
  for(const listener of modelProfileListeners)listener();
 };
 toggle.onchange=update;
 document.querySelector('#graphics-open').onclick=openGraphics;
 dialog.querySelector('button').onclick=()=>dialog.close();
 document.addEventListener('visibilitychange',reset);

 const api={
  clear(){reset();stats.textContent='Замеряем кадры…';},
  ratio(width,height) {
   return graphicsRatio(level,width,height,devicePixelRatio,renderer.capabilities.maxTextureSize);
  },
  particles() {return profiles[level].particles;},
  begin() {renderer.info.reset();},
  record(source,now,state=getState(),adaptive=true){
   if(lastRenderer!==source||lastScene!==state){
    api.clear();
    lastRenderer=source;
    lastScene=state;
   }
   const delta=lastFrame===undefined?0:now-lastFrame;
   api.sample(delta,now,source,state,adaptive);
   lastFrame=now;
  },
  sample(delta,now,source=renderer,state=getState(),adaptive=true) {
   if(delta>0) {
    sampleTime+=delta;
    frames++;
    worst=Math.max(worst,delta);
   }
   if(sampleTime>=1000) {
    average=sampleTime/frames;
    frames=sampleTime=0;
    if(choice==='auto'&&adaptive) {
     slow=average>38?slow+1:0;
     fast=average<18?fast+1:0;
     const index=levels.indexOf(level);
     const next=slow>=3&&index>0?levels[index-1]:fast>=12&&index<levels.length-1?levels[index+1]:level;
     if(next!==level){level=next;reset();update();}
    }
   }
   if(!toggle.checked||now-latestStats<700)return;
   latestStats=now;
   const {render,memory}=source.info;
   const canvas=source.domElement;
   const heap=performance.memory?.usedJSHeapSize;
   stats.textContent=[
    state+' · '+(choice==='auto'?'Авто / ':'')+profiles[level].label,
    (average?Math.round(1000/average)+' FPS · '+average.toFixed(1)+' мс/кадр':'Замеряем FPS…')+
     (worst?' · пик '+worst.toFixed(1)+' мс':''),
    render.calls+' команд отрисовки · '+render.triangles.toLocaleString('ru-RU')+' треугольников',
    memory.geometries+' геометрий · '+memory.textures+' текстур',
    canvas.width+' × '+canvas.height+' px'+(heap?' · JS heap страницы ≈ '+Math.round(heap/1048576)+' МиБ':''),
    performance.getEntriesByType('resource').length+' завершённых загрузок ресурсов'
   ].join('\n');
   worst=0;
  }
 };
 activeGraphics=api;
 return api;
}
