import {revealObjectTab} from '../object-navigation.js';
import {stationParts,stationHistory,stationPhotos,stationInteriors} from './iss-data.js';
import {spacecraft} from './catalog.js';
import {openGraphics} from '../graphics.js';
import {createViewer} from './viewer.js';
import {parts,partById,statusAt} from './parts.js';
import {events,eventById,photos} from './history-data.js';
import {gallery,openPhoto,toggleFullscreen} from './gallery.js';

let current;
const tabs=[
 ['inspect','Осмотр'],['parts','Устройство'],['trajectory','Траектория'],
 ['follow','Сопровождение'],['history','История миссии']
];
function stationPhoto(file,caption){
 const figure=document.createElement('figure');
 figure.className='iss-history-photo';
 const image=document.createElement('img');
 image.src=new URL('./photos/'+file+'.jpg',import.meta.url).href;
 image.loading='lazy';
 image.decoding='async';
 image.alt=caption;
 const label=document.createElement('figcaption');
 label.textContent=caption;
 figure.append(image,label);
 return figure;
}
const flybys = new Set(['jupiter','saturn','uranus','neptune','triton']);

function inspectCard(item) {
 return `<p>${item.introduction}</p>
 <dl class="spacecraft-facts">${item.facts.map(([key,value])=>`<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>
 ${item.sections.map(([title,value])=>`<section><h3>${title}</h3><p>${value}</p></section>`).join('')}`;
}
function partCard(p,historicalTime) {
 const status=statusAt(p,historicalTime);
 return `<h3>${p.name} <span class="part-code">${p.id===p.id.toUpperCase()?p.id:''}</span></h3>
  <p class="spacecraft-credit" lang="en">${p.en}</p><p>${p.description}</p>
  <dl class="spacecraft-facts"><div><dt>Расположение</dt><dd>${p.location}</dd></div>
  <div><dt>Представление</dt><dd>${p.mesh?'Геометрия с выбором':p.anchor?'Метка по схеме':p.focus?'Показан узел целиком':'Карточка и схема'}</dd></div></dl>
  ${p.history?`<p><strong>История работы</strong> · ${p.history.filter((v,i)=>v&&i<2).join(' и ')} — отключение. ${p.history[2]??''}</p>`:''}
  ${p.specs?`<dl class="spacecraft-facts">${p.specs.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`:''}
  ${status?`<p class="mission-date-status"><strong>${new Date(historicalTime*1000).toISOString().slice(0,10)} UTC</strong> · ${status}</p>`:''}
  <div class="spacecraft-actions">${(p.events??[]).map(id=>`<button data-history="${id}">${eventById[id].title}</button>`).join('')}
  <button data-photo="diagram">Схема NASA</button></div>
  ${gallery(p.photos)}`;
}
function historyCard(event) {
 const hasPosition=flybys.has(event.id)||['heliopause','last'].includes(event.id);
 return `<p class="eyebrow">${event.date}</p><h3>${event.title}</h3><div class="mission-narrative">${event.text.map(paragraph=>`<p>${paragraph}</p>`).join('')}</div>
  <div class="spacecraft-actions">${hasPosition?`<button data-flight="${event.id}">Показать в 3D</button>`:''}
  ${flybys.has(event.id)?`<button data-flight="${event.id}" data-play>Воспроизвести событие</button>`:''}</div>
  ${gallery(event.photos)}
  <div class="spacecraft-actions">${(event.instruments??[]).map(id=>`<button data-part="${id}">${id==='record'?'Золотая пластинка':id}</button>`).join('')}</div>`;
}

export function openSpacecraft(id, trigger, initial={}) {
 const item=spacecraft[id];
 if(!item||current)return;
 revealObjectTab([...document.querySelectorAll('#object-navigation [data-spacecraft]')].find(button=>button.dataset.spacecraft===id));
 const station=id==='iss';
 const dialog=document.createElement('dialog');
 dialog.className='spacecraft-dialog';
 dialog.setAttribute('aria-labelledby','spacecraft-title');
 dialog.innerHTML=`
  <header class="spacecraft-header">
   <div><div class="eyebrow">КОСМИЧЕСКАЯ ТЕХНИКА</div><h2 id="spacecraft-title">${item.title}</h2></div>
   <div class="spacecraft-header-actions"><button type="button" data-graphics>Графика</button><button data-full aria-label="Полноэкранный просмотр">⛶</button><button data-close autofocus>Закрыть</button></div>
  </header>
  <div data-viewer-stats></div>
  <nav class="spacecraft-tabs" aria-label="Режим миссии" >${tabs.map(([id,name])=>`<button data-tab="${id}">${name}</button>`).join('')}</nav>
  <p class="mission-notice" role="status" hidden></p>
  <div class="spacecraft-grid" data-viewer>
   <section aria-label="Осмотр аппарата">
    <div class="spacecraft-view">
     <div class="spacecraft-message"><span role="status">${item.model?'Загружаем 3D-модель…':'3D-модель обновляется'}</span><button data-retry hidden>Повторить</button></div>
    </div>
    <div class="spacecraft-actions" aria-label="Управление камерой">
     <button data-action="in" aria-label="Приблизить" disabled>+</button>
     <button data-action="out" aria-label="Отдалить" disabled>−</button>
     <button data-action="body" ${item.mission?'':'hidden'} disabled>К корпусу</button>
     <button data-action="full" disabled>${item.mission?'Аппарат целиком':'Станция целиком'}</button>
     <button data-action="rotate" aria-pressed="false" disabled>Автовращение</button>
     <button data-action="labels" aria-pressed="true" hidden disabled>Подписи</button>
    </div>
    ${station?'<div class="spacecraft-actions"><label>Освещение <input data-station-light type="range" min=".35" max="1.4" step=".05" value="1" disabled></label><label>Ракурс <select data-station-angle disabled><option value="">Станция целиком</option><option value="0,1,.01">Верх модели</option><option value="0,-1,.01">Низ модели</option><option value="0,.1,1">Вдоль оси +Z</option><option value="0,.1,-1">Вдоль оси −Z</option></select></label></div>':''}
    <p class="spacecraft-help" ${item.model?'':'hidden'}>Проведите по модели для вращения. Для масштаба используйте колесо или два пальца.${item.enablePan?' Для смещения перетаскивайте правой кнопкой или двумя пальцами.':''}</p>
   </section>
   <section class="spacecraft-info" aria-label="Характеристики и описание"></section>
  </div>
  <div class="mission-history" hidden>
   <label>Событие <select data-events>${events.map(e=>`<option value="${e.id}">${e.title}</option>`).join('')}</select></label>
   <article data-history-card></article>
   <details class="mission-archive"><summary>Архив изображений и схем</summary><div></div></details>
  </div>`;
 document.body.append(dialog);
 current=dialog;

 const get=s=>dialog.querySelector(s), host=get('.spacecraft-view');
 const message=get('.spacecraft-message'), status=message.querySelector('[role=status]');
 const retry=get('[data-retry]'), actions=[...dialog.querySelectorAll('[data-action]')];
 const rotation=get('[data-action=rotate]'), labels=get('[data-action=labels]');
 const notice=get('.mission-notice'), info=get('.spacecraft-info'), eventsControl=get('[data-events]');
 let tab, part='ISS', event=initial.event??'neptune', viewer, ready=false, jumping=false;
 let labelsOn=true, enteringFlight=false;
 const lifecycle=new AbortController();

 function release() {
  viewer?.dispose();
  viewer=null;ready=false;
 }
 function fail(error) {
  console.error('Ошибка просмотра модели '+item.title,error);
  release();
  for(const button of actions)button.disabled=true;
  message.hidden=false;
  status.textContent='Не удалось открыть модель. Проверьте доступность файла и WebGL.';
  retry.hidden=false;
 }
 function start(){
  message.hidden=false;retry.hidden=true;status.textContent='Загружаем 3D-модель…';
  rotation.setAttribute('aria-pressed','false');
  for(const button of actions)button.disabled=true;
  try{
   viewer=createViewer(host,item.model,{
    statsSlot:get('[data-viewer-stats]'),label:()=>item.title+' · '+(tab==='parts'?'Устройство':'Осмотр'),
    parts:item.mission?parts:[],
    presentation:item.presentation,
    enablePan:item.enablePan,
    draco:item.draco,
    select:selectPart,
    ready(){
     ready=true;
     status.textContent='Модель загружена';message.hidden=true;
     for(const button of actions)button.disabled=false;
     if(station){get('[data-station-light]').disabled=false;get('[data-station-angle]').disabled=false;viewer.lighting(Number(get('[data-station-light]').value));}
     syncSelection();
    },
    error:fail
   });
  }catch(error){fail(error);}
 }
 function syncSelection(){
  if(!ready)return;
  viewer.parts(!station&&tab==='parts',labelsOn);
  if(!station&&tab==='parts'){
   const p=partById[part];
   viewer.inspectPart(partById[p.focus]??p);
  }else viewer.clearHighlight();
 }
 function selectPart(id) {
  part=id;
  if(tab!=='parts')return selectTab('parts');
  get('[data-parts]').value=id;
  get('[data-part-card]').innerHTML=partCard(partById[id],initial.time);
  syncSelection();
 }
 function selectHistory(id) {
  event=id;
  if(tab!=='history')return selectTab('history');
  eventsControl.value=id;
  get('[data-history-card]').innerHTML=historyCard(eventById[id]);
 }
 function selectTab(next) {
  tab=next;
  for(const b of dialog.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed',String(b.dataset.tab===tab));
  const history=tab==='history';
  get('[data-viewer]').hidden=history;
  get('.mission-history').hidden=!history;
  labels.hidden=station||tab!=='parts';
  if(history){
   release();
   if(station)showStationHistory();
   else selectHistory(event);
  }else{
   if(station&&tab==='parts'){
    info.innerHTML=' <label class="part-select">Компонент <select data-station-part>'+Object.entries(stationParts).map(([name,rows])=>'<optgroup label="'+name+'">'+rows.map(([name])=>'<option>'+name+'</option>').join('')+'</optgroup>').join('')+'</select></label><article data-part-card></article><p class="fine">В модели IGOAL конструкция объединена. Пространственные маркеры пока доступны только после проверки привязки.</p>';
    const choice=get('[data-station-part]');
    const update=()=>{
     const [name,description]=Object.values(stationParts).flat().find(([n])=>n===choice.value);
     const card=get('[data-part-card]');
     card.innerHTML='<h3>'+name+'</h3><p>'+description+'</p>';
     const photo=stationInteriors[name];
     if(photo)card.append(stationPhoto(photo.file,photo.caption));
    };
    choice.onchange=update;update();
   }else if(tab==='parts'){
    info.innerHTML=`<label class="part-select">Система аппарата <select data-parts>${parts.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></label><article data-part-card></article>`;
    selectPart(part);
   }else {
    info.innerHTML=inspectCard(item);
    if(ready)viewer.full();
   }
   if(item.model&&!viewer)start();
   syncSelection();
  }
 }
 function showStationHistory(){
  const panel=get('.mission-history');
  panel.innerHTML='<label>Категория <select data-category><option>Все события</option>'+[...new Set(stationHistory.map(row=>row[1]))].map(name=>'<option>'+name+'</option>').join('')+'</select></label><label>Событие <select data-station-event></select></label><div class="spacecraft-actions"><button data-step="-1">Назад</button><button data-step="1">Дальше</button></div><input data-station-timeline type="range" min="0" value="0" aria-label="Шкала истории МКС"><article></article>';
  const category=panel.querySelector('[data-category]'),choice=panel.querySelector('[data-station-event]'),timeline=panel.querySelector('[data-station-timeline]');
  let filtered;
  function update(){
   const [date,category,title,description]=filtered[Number(choice.value)];
   panel.querySelector('article').innerHTML='<p>'+date+' · '+category+'</p><h3>'+title+'</h3><p>'+description+'</p>';
   const photo=stationPhotos[date];
   if(photo)panel.querySelector('article').append(stationPhoto(...photo));
   timeline.value=choice.value;
   panel.querySelector('[data-step="-1"]').disabled=choice.selectedIndex===0;
   panel.querySelector('[data-step="1"]').disabled=choice.selectedIndex===filtered.length-1;
  }
  category.onchange=()=>{
   filtered=stationHistory.filter(row=>category.selectedIndex===0||row[1]===category.value);
   choice.innerHTML=filtered.map(([date,,title],i)=>'<option value="'+i+'">'+date+' · '+title+'</option>').join('');
   timeline.max=filtered.length-1;update();
  };
  choice.onchange=update;
  timeline.oninput=()=>{choice.value=timeline.value;update();};
  for(const button of panel.querySelectorAll('[data-step]'))button.onclick=()=>{choice.selectedIndex+=Number(button.dataset.step);update();};
  category.onchange();
 }
 async function fly({flyId=event,follow=false,play=false}={}) {
  if(jumping)return;
  jumping=true;notice.hidden=false;notice.textContent=station?'Загружаем эфемериды NASA…':'Загружаем исторические эфемериды…';
  try{
   if(station){
    const {openISSFlight}=await import('./iss-flight.js');
    if(!dialog.open)return;
    await openISSFlight({...item,reopen:tab=>openSpacecraft(id,trigger,{tab})},{follow,signal:lifecycle.signal,onOpen:()=>{enteringFlight=true;release();dialog.close();}});
    return;
   }
   const {openFlight}=await import('./flight.js');
   if(!dialog.open)return;
   await openFlight({...item,reopen:(tab,event,time)=>openSpacecraft(id,trigger,{tab,event,time})},{
    id:flybys.has(flyId)||eventById[flyId]?.utc||flyId==='last'?flyId:'neptune',follow,play,signal:lifecycle.signal,onOpen:()=>{
     if(!dialog.open)throw Error('Просмотр закрыт.');
     enteringFlight=true;release();dialog.close();
    }
   });
   notice.hidden=true;
  }catch(error){
   notice.textContent='Не удалось открыть траекторию: '+error.message;
  }finally{jumping=false;}
 }
 const commands={
  in:()=>viewer.zoom(.8),out:()=>viewer.zoom(1.25),body:()=>viewer.body(),full:()=>viewer.full(),
  rotate:()=>{
   const enabled=rotation.getAttribute('aria-pressed')!=='true';
   rotation.setAttribute('aria-pressed',String(enabled));
   viewer.setRotation(enabled);
  },
  labels:()=>{
   labelsOn=!labelsOn;
   labels.setAttribute('aria-pressed',String(labelsOn));
   viewer.parts(tab==='parts',labelsOn);
  }
 };
 dialog.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b||b.disabled)return;
  if(b.dataset.action)commands[b.dataset.action]();
  if(b.dataset.part)selectPart(b.dataset.part);
  if(b.dataset.history)selectHistory(b.dataset.history);
  if(b.dataset.photo)openPhoto(b.dataset.photo,b,selectHistory);
  if(b.dataset.flight)void fly({flyId:b.dataset.flight,play:b.hasAttribute('data-play')});
  const next=b.dataset.tab;
  if(next==='trajectory'||next==='follow')void fly({follow:next==='follow'});
  else if(next)selectTab(next);
 });
 dialog.addEventListener('change',e=>{
  if(e.target.matches('[data-parts]'))selectPart(e.target.value);
  if(e.target===eventsControl)selectHistory(e.target.value);
 });
 get('.mission-archive').addEventListener('toggle',e=>{
  if(e.target.open&&!e.target.querySelector('.mission-gallery'))e.target.lastElementChild.innerHTML=gallery(Object.keys(photos));
 });
 if(station){
  get('[data-station-light]').oninput=e=>viewer?.lighting(Number(e.target.value));
  get('[data-station-angle]').onchange=e=>{if(!ready)return;if(e.target.value)viewer.angle(...e.target.value.split(',').map(Number));else viewer.full();};
 }
 retry.onclick=start;
 get('[data-graphics]').onclick=openGraphics;
 get('[data-full]').onclick=()=>void toggleFullscreen(dialog);
 get('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 dialog.addEventListener('close',()=>{
  lifecycle.abort();release();dialog.remove();current=null;
  if(!enteringFlight)(trigger.getClientRects().length?trigger:document.querySelector('[data-mobile-panel=catalog]'))?.focus();
 },{once:true});
 dialog.showModal();
 selectTab(initial.tab??'inspect');
}
