import {refreshModelProfile} from '../graphics.js';
import {renderDepthRange} from '../camera-depth.js';
import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {planetRings,RING_NOTES} from '../planet-rings.js';
import {MOON_MAPS,partialCoverage} from '../moon-maps.js';
import {disposeModel,loadSpacecraftModel} from './viewer.js';
import {missionAtlas} from './bridge.js';
import {AU,C,fromEcliptic,loadEphemeris,utcText} from './ephemeris.js';
import {eventById,events} from './history-data.js';
import {UNIT_KM as UNIT, localRoutePoint, fitShipDistance, makeFlightRoute, makeFlightSky} from './flight-visuals.js';
const ids = [
 ['mercury',199,199,2439.4],['venus',299,299,6051.8],['earth',399,399,6371],
 ['mars',499,4,3389.5],['jupiter',599,5,69911],['saturn',699,6,58232],
 ['uranus',799,7,25362],['neptune',899,8,24622]
];
const vector = position => new T.Vector3(...fromEcliptic(position)).multiplyScalar(1/UNIT);
const length = a => Math.hypot(...a);
const number = (n,d=1) => n.toLocaleString('ru-RU',{maximumFractionDigits:d});
const date = t => new Date(t*1000).toISOString().slice(0,19);
let active, preparing;

export async function openFlight(item, {id='neptune',follow=false,play=false,time,onOpen,signal}={}) {
 if(active || preparing)return;
 const atlas = missionAtlas();
 const abort = new AbortController();
 const loadingSignal=signal?AbortSignal.any([abort.signal,signal]):abort.signal;
 preparing=abort;
 const loading=document.createElement('div');
 loading.className='flight-loading';
 loading.innerHTML='<p role="status">Загружаем исторические эфемериды…</p><button type="button">Отмена</button>';
 loading.querySelector('button').onclick=()=>abort.abort();
 atlas.stage.append(loading);
 try {
  const eph=await loadEphemeris(loadingSignal);
  if (loadingSignal.aborted) return;
  active=createFlight(atlas,item,eph,{id,follow,play,time},()=>{active=null;});
  try{onOpen?.();}catch(error){active.close();throw error;}
 } finally {
  loading.remove();
  preparing=null;
 }
}

function createFlight(atlas,item,eph,options,onClose) {
 const {meta}=eph, scene=new T.Scene(), root=new T.Group();
 scene.add(root);
 const controller = new AbortController(), signal=controller.signal;
 const renderer=atlas.renderer, canvas=renderer.domElement;
 const camera=new T.PerspectiveCamera(43);
 const controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;
 controls.enablePan=false;
 controls.minDistance=4e-9;
 controls.maxDistance=160000;
 const initialClock={paused:atlas.paused,speed:atlas.speedIndex};
 const craft = new T.Group(), star = new T.Mesh(
  new T.SphereGeometry(.6957,40,24),new T.MeshBasicMaterial({color:0xffe7ad}));
 root.add(star);
 scene.add(craft);
 const light=new T.DirectionalLight(0xfff2dc,2.7);
 scene.add(light,new T.HemisphereLight(0xbdd7ff,0x303641,.62));
 const menu = document.createElement('div');
 menu.className='flight-ui';
 menu.innerHTML=`
 <div class="flight-heading"><div><small>КОСМИЧЕСКАЯ ТЕХНИКА · VOYAGER 2</small><h1></h1></div>
 <div class="flight-exits"><button data-exit="history">История</button><button data-exit="atlas">Вернуться к атласу</button></div></div>
 <div class="flight-labels"></div>
 <div class="flight-dock" role="region" aria-label="Управление полётом">
 <details class="flight-telemetry">
  <summary>Подробнее</summary>
  <div class="flight-actions">
   <label>Событие <select data-event></select></label>
   <label>Камера <select data-camera>
    <option value="focus">У аппарата</option>
    <option value="pair">Аппарат и цель</option>
   </select></label>
   <label>Аппарат <select data-scale><option value="visual">Увеличение ×4000</option><option value="real">Физический масштаб</option></select></label>
   <label>Перейти к дате UTC <input type="datetime-local" step="1" data-date></label>
   <button type="button" data-replay>Воспроизвести пролёт</button>
   <button type="button" data-all-time hidden>Шкала всей миссии</button>
   <label class="flight-toggle"><input type="checkbox" checked data-line> Траектория</label>
  </div>
  <dl data-values></dl>
 </details>
  <div class="flight-readout">
   <time data-flight-time></time><span data-velocity title="Скорость аппарата относительно Солнца"></span>
  </div>
  <div class="flight-clock">
   <button type="button" data-back aria-label="Прокрутка назад" title="Прокрутка назад">◀</button>
   <button type="button" data-play>Пауза</button>
   <button type="button" data-forward aria-label="Прокрутка вперёд" title="Прокрутка вперёд">▶</button>
   <label>Темп <select data-speed aria-label="Скорость времени"></select></label>
  </div>
  <input class="flight-timeline" type="range" step="any" data-time aria-label="Перемотка времени">
  <p data-message role="status" hidden></p>
 </div>`;
 atlas.stage.append(menu);
 const get=s=>menu.querySelector(s);
 const labels=get('.flight-labels');
 const bodies = ids.map(([id,center,bary,radius])=>({id,center,bary,radius}));
 for(const moon of meta.moons??[]){
  bodies.push({id:moon.name,center:moon.id,radius:moon.radiusKm,parent:moon.parent,name:moon.label});
 }
 const up=new T.Vector3(0,1,0), pole=new T.Vector3(), sunDirection=new T.Vector3();
 const startRotation=new T.Quaternion(), endRotation=new T.Quaternion();
 const planets = bodies.map(({id,center,bary,radius,parent,name}) => {
  const data=atlas.planets.find(p=>p.id===id);
  const body=new T.Group();
  const map=MOON_MAPS[id], texture=data?.texture??(id==='Titan'?null:map?.texture);
  const color=id==='Titan'?0xd2a667:texture?0xffffff:0x90969d;
  const material=new T.MeshStandardMaterial({color,map:texture&&!parent?atlas.texture(texture):null,roughness:1});
  if(map?.partial&&texture)partialCoverage(material);
  const surface=new T.Mesh(new T.SphereGeometry(radius/UNIT,parent?32:64,parent?20:40),material);
  const axes=meta.planetAxesKm?.[center];
  if(axes)surface.scale.fromArray(axes.map(axis=>axis/radius));
  body.add(surface);
  const ringLights=[];
  let rings;
  const tilt=T.MathUtils.degToRad(data?.tilt??0);
  if(Object.hasOwn(RING_NOTES,id)){
   rings=planetRings(id,radius/UNIT,new T.Vector3(1,0,0),1/UNIT);
   rings.rotation.z=tilt;
   rings.traverse(object=>{
    const sun=object.material?.uniforms?.sunDirection?.value;
    if(sun)ringLights.push(sun);
   });
   body.add(rings);
  }
  root.add(body);
  const label=document.createElement('span');
  label.textContent=data?.name??name;
  labels.append(label);
  return {id,center,bary,body,surface,label,radius,ringLights,rings,tilt,parent,color,texture};
 });
 const bodiesByCenter=new Map(planets.map(body=>[body.center,body]));
 function orient(body,time){
  const rows=meta.orientations?.[body.center];
  if(!rows)return;
  if(time<rows[0][0]||time>rows.at(-1)[0]){
   body.surface.quaternion.identity();
   body.rings.rotation.set(0,0,body.tilt);
   return;
  }
  let index=Math.min(rows.length-2,Math.floor((time-rows[0][0])/600));
  if(time<rows[index][0])index--;
  if(index<rows.length-2&&time>=rows[index+1][0])index++;
  const a=rows[index], b=rows[index+1];
  startRotation.set(a[1],a[2],a[3],a[4]);
  endRotation.set(b[1],b[2],b[3],b[4]);
  body.surface.quaternion.slerpQuaternions(startRotation,endRotation,(time-a[0])/(b[0]-a[0]));
  pole.copy(up).applyQuaternion(body.surface.quaternion);
  body.rings.quaternion.setFromUnitVectors(up,pole);
 }
 const marker=document.createElement('button');
 marker.type='button';marker.className='flight-probe';marker.textContent='◆ Voyager 2';
 labels.append(marker);
 const distantRoute=new T.Group();
 scene.add(distantRoute);
 const route=makeFlightRoute(eph,distantRoute,scene);
 const sky=makeFlightSky(renderer.getPixelRatio());
 scene.add(sky);
 const eventEntries=events.filter(e=>meta.events[e.id]||e.utc||e.id==='last');
 const moonEvents=Object.entries(meta.events).filter(([id])=>id.startsWith('moon-'))
  .sort(([,a],[,b])=>a.time-b.time)
  .map(([id,event])=>({id,title:'Сближение · '+bodiesByCenter.get(event.center).label.textContent}));
 const eventOption=e=>`<option value="${e.id}">${e.title}</option>`;
 get('[data-event]').innerHTML=eventEntries.map(eventOption).join('')+
  (moonEvents.length?`<optgroup label="Спутники · расчётные сближения">${moonEvents.map(eventOption).join('')}</optgroup>`:'');
 const eventMarkers=eventEntries.filter(e=>meta.events[e.id]||e.id==='heliopause').map(e=>{
  const point=meta.events[e.id]?.time??Date.parse(e.utc)/1000;
  const state=eph.sample(eph.segmentAt(point),point);
  const label=document.createElement('button');
  label.type='button';label.className='flight-event';label.title=e.title;
  label.setAttribute('aria-label',e.title);label.textContent='●';
  label.onclick=()=>go(e.id);
  labels.append(label);
  return {label,position:vector(state.p),id:e.id};
 });
 const speed=get('[data-speed]');
 const telemetryPanel=get('.flight-telemetry');
 const clock=get('[data-flight-time]');
 const velocityReadout=get('[data-velocity]');
 const notice=get('[data-message]');
 const clockFormat=new Intl.DateTimeFormat('ru-RU',{
  timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'
 });
 function showRates(){
  speed.innerHTML=atlas.speeds.map((s,i)=>`<option value="${i}">${flyby?number(s*1440*replayFactor,2)+' мин/с':number(s,2)+' сут/с'}</option>`).join('');
  speed.value=atlas.speedIndex;
 }
 const scrub=get('[data-time]');
 const dateInput=get('[data-date]');
 const choices=get('[data-camera]');
 let selected=options.id, time=meta.events.neptune.time, direction=1, mode='focus';
 let flyby=null, model, lastUI=0, lastWidth=0,lastHeight=0, lastTarget=null;
 let message='', track=null, flightState, segment, velocity=null, nearBody=null, width=1,height=1;
 const shipAxis=new T.Vector3(0,0,1), shipRotation=new T.Quaternion();
 const shipCenter=new T.Vector3(0,3.5,4.25);
 let shipRadius=10.8, cameraAdjusted=false;
 const closeView=()=>mode==='focus';
 controls.addEventListener('start',()=>{cameraAdjusted=true;});
 let countdown=0;
 const replayFactor=.017;
 function setRange(start=meta.begin,end=meta.end) {
  scrub.min=start; scrub.max=end;
 }
 dateInput.min=date(meta.begin);dateInput.max=date(meta.end);
 setRange();
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

 function showLabel(element,position,enabled=true) {
  if(!enabled){element.hidden=true;return;}
  const p=position.clone().project(camera);
  element.hidden=Math.abs(p.x)>1 || Math.abs(p.y)>1 || Math.abs(p.z)>1;
  if(!element.hidden){element.style.left=(.5+p.x/2)*width+'px';element.style.top=(.5-p.y/2)*height+'px';}
 }
 function setTime(value) {
  if(!Number.isFinite(value)){message='Укажите дату и время UTC.';return;}
  if(value<meta.begin||value>meta.end)message='Вне покрытия эфемерид. Показана ближайшая доступная граница.';
  time=clamp(value,meta.begin,meta.end);
 }
 function loadModel() {
  loadSpacecraftModel(item.model,false,signal).then(gltf=>{
   if(!gltf)return;
   if(signal.aborted){disposeModel(gltf.scene);return;}
   model=gltf.scene;
   const bounds=new T.Box3().setFromObject(model,true);
   bounds.getCenter(shipCenter);
   shipRadius=bounds.getSize(new T.Vector3()).length()*.5;
   craft.add(model);
   updateScale();
   if(closeView()&&!cameraAdjusted)placeCamera();
  }).catch(error=>{
   if(!signal.aborted)message='Модель не загрузилась. Доступен маркер Voyager 2.';
  });
 }
 function updateScale(){
  const physical=get('[data-scale]').value==='real';
  craft.scale.setScalar((physical?1:4000)/(1000*UNIT));
 }
 let lastPositionTime=NaN;
 function updatePositions() {
  if(time===lastPositionTime)return !!flightState;
  lastPositionTime=time;
  segment=eph.segmentAt(time);
  flightState=eph.sample(segment,time);
  if(!flightState)return false;
  track=vector(flightState.p);
  velocity=vector(flightState.velocity).normalize();
  shipRotation.setFromUnitVectors(shipAxis,velocity);
  for(const p of planets){
   const s=eph.bodyAt(p.center,p.bary,time);
   p.position=s&&vector(s.p);
   p.relative=s&&new T.Vector3(...localRoutePoint(s.p,flightState.p));
   p.body.visible=!!s;
   if(s){
    if(p.parent&&p.texture&&!p.surface.material.map){
     p.surface.material.map=atlas.texture(p.texture);
     p.surface.material.needsUpdate=true;
    }
    p.body.position.copy(p.relative);
    orient(p,time);
    for(const light of p.ringLights)light.copy(p.position).negate().normalize();
   }
  }
  for(const moon of planets){
   if(!moon.parent||!moon.position)continue;
   const parent=bodiesByCenter.get(moon.parent);
   sunDirection.copy(parent.position).negate().normalize();
   const dx=moon.relative.x-parent.relative.x, dy=moon.relative.y-parent.relative.y, dz=moon.relative.z-parent.relative.z;
   const along=dx*sunDirection.x+dy*sunDirection.y+dz*sunDirection.z;
   const shadowDistance=Math.hypot(dx-along*sunDirection.x,dy-along*sunDirection.y,dz-along*sunDirection.z);
   const shadow=T.MathUtils.smoothstep(shadowDistance,(parent.radius-moon.radius)/UNIT,(parent.radius+moon.radius)/UNIT);
   moon.surface.material.color.setHex(moon.color).multiplyScalar(along<0?.12+.88*shadow:1);
  }
  nearBody=planets.filter(p=>p.position).sort((a,b)=>a.relative.lengthSq()-b.relative.lengthSq())[0];
  return true;
 }
 function focusBody(){return planets.find(p=>p.center===meta.events[selected]?.center&&p.position)||nearBody;}
 function rightFor(axis){
  const result=new T.Vector3().crossVectors(axis,new T.Vector3(0,1,0));
  return result.lengthSq()>1e-8?result.normalize():new T.Vector3(1,0,0);
 }
 function routeCenter() {
  const body=focusBody();
  if(mode==='pair'&&body)return body.relative.clone().multiplyScalar(.5);
  if(!closeView())return new T.Vector3();
  return shipCenter.clone().applyQuaternion(shipRotation).multiplyScalar(craft.scale.x);
 }
 function placeCamera() {
  if(!updatePositions())return;
  updateScale();
  const center=routeCenter(), body=focusBody(), separation=body?.relative.length()??1;
  const zoom=fitShipDistance(shipRadius,craft.scale.x,camera.aspect,camera.fov);
  controls.minDistance=closeView()?shipRadius*craft.scale.x*1.13:1e-6;
  const normal=new T.Vector3(1,.55,1.3).normalize();
  let offset=normal.clone().multiplyScalar(zoom);
  if(mode==='pair'&&body){
   const axis=body.relative.clone().normalize();
   offset=rightFor(axis).add(new T.Vector3(0,.5,0)).normalize().multiplyScalar(
    Math.max(separation*1.85,body.radius/UNIT*4.1)*Math.max(1,.95/camera.aspect));
  }
  lastTarget=center.clone();
  controls.enableDamping=false;
  controls.update(0);
  controls.target.copy(center);
  camera.position.copy(center).add(offset);
  controls.update(0);
  controls.enableDamping=true;
 }
 function resize(){
  width=canvas.clientWidth;height=canvas.clientHeight;
  if(width===lastWidth&&height===lastHeight)return;
  lastHeight=height;lastWidth=width;
  camera.aspect=width/Math.max(1,height);
  camera.updateProjectionMatrix();
  if(!cameraAdjusted)placeCamera();
 }
 function setMode(next){
  mode=next;choices.value=next;cameraAdjusted=false;
  get('h1').textContent=options.follow?'Сопровождение':'Траектория';
  placeCamera();
 }
 function go(id,play=false) {
  selected=id;
  get('[data-event]').value=id;
  const event=meta.events[id], record=eventById[id];
  flyby=null;
  setRange();
  atlas.pause(!play);
  if(event){
   flyby=event;
   setRange(event.first,event.last);
   if(play) {
    const radius=id==='jupiter'?3*3600:85*60;
    const first=Math.max(event.first,event.time-radius), last=Math.min(event.last,event.time+radius);
    flyby={...event,first,last};
    setRange(first,last);direction=1;
    setTime(first);
   }else setTime(event.time);
   setMode('pair');
  } else {
   const target=id==='last'?meta.end:Date.parse(record?.utc)/1000;
   if(target<meta.begin)message='Событие до начала покрытия. Показана первая навигационная точка после запуска.';
   setTime(Number.isFinite(target)?Math.max(meta.begin,target):meta.begin);
   setMode('focus');
  }
  showRates();lastUI=0;
 }
 function releaseWindow(){
  flyby=null;
  setRange();showRates();
  lastUI=0;
 }
 function display() {
  get('[data-play]').textContent=atlas.paused?'Продолжить':'Пауза';
  get('[data-back]').setAttribute('aria-pressed',String(!atlas.paused&&direction<0));
  get('[data-forward]').setAttribute('aria-pressed',String(!atlas.paused&&direction>0));
  speed.value=atlas.speedIndex;
  get('[data-replay]').disabled=!meta.events[selected];
  get('[data-all-time]').hidden=!flyby;
  if(document.activeElement!==dateInput)dateInput.value=date(time);
  scrub.value=time;
  const timestamp=new Date(time*1000);
  clock.dateTime=timestamp.toISOString();
  clock.textContent=clockFormat.format(timestamp)+' UTC';
  scrub.setAttribute('aria-valuetext',clock.textContent);
  const state=eph.sample(eph.segmentAt(time),time);
  velocityReadout.textContent=state?'Voyager 2 · '+number(length(state.velocity),2)+' км/с':'Voyager 2 · — км/с';
  const warning=message||(!state?'Стык навигационных решений. Данных на эту долю секунды нет.':'');
  notice.hidden=!warning;
  notice.textContent=warning;
  if(!state||!telemetryPanel.open)return;
  const earth=eph.bodyAt(399,399,time);
  const earthRange=earth?length(state.p.map((x,i)=>x-earth.p[i])):NaN;
  const milestones=eventEntries.filter(e=>e.id!=='last').map(e=>({...e,t:meta.events[e.id]?.time??Date.parse(e.utc)/1000}));
  const nearest=milestones.reduce((a,b)=>Math.abs(b.t-time)<Math.abs(a.t-time)?b:a);
  const stage=[...milestones].reverse().find(e=>e.t<=time)?.title??'Начало миссии';
  const target=meta.events[selected], targetBody=target&&planets.find(p=>p.center===target.center&&p.position);
  const duration=earthRange/C/3600;
  const activeLabel=time>meta.trackingEnd?'Прогноз JPL':state.source.includes('merged')?'Архивная навигация':'Реконструкция NAIF';
  const rows=[
   ['Этап',stage],['От Солнца',number(length(state.p)/AU,3)+' а. е.'],
   ['От Земли',number(earthRange/AU,3)+' а. е.'],
   ['Световой сигнал до Земли',number(duration,3)+' ч · расчёт по расстоянию'],
   ['Ближайшее событие',nearest.title+' · '+(nearest.t>time?'через ':'прошло ')+number(Math.abs(nearest.t-time)/3600,2)+' ч'],
   ['Источник состояния',activeLabel+' · '+state.source+(state.interpolated?' · интерполяция':' · отсчёт')],
   ['Модель',get('[data-scale]').value==='real'?'Физический масштаб':'Увеличена в 4000 раз']
  ];
  const moons=planets.filter(p=>p.parent&&p.position);
  if(moons.length){
   rows.push(['Окружение',moons.length+' спутников · NASA NAIF / JPL Horizons']);
   rows.push(['Ориентация гиганта','Ось и вращение · IAU / NAIF PCK. Привязка текстур и тени спутников приближённые.']);
  }
  if(targetBody)rows.push(['До центра цели',number(targetBody.relative.length()*UNIT,1)+' км']);
  if(target){
   rows.push(['Расчётный минимум',number(target.distanceKm,1)+' км до центра · '+utcText(target.time)]);
   if(target.targetSource)rows.push(['Эфемерида цели',target.targetSource]);
   rows.push(['Скорость относительно цели в минимуме',number(target.relativeSpeedKmS,2)+' км/с']);
  }
  get('[data-values]').innerHTML=rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
 }
 function close(where) {
  controller.abort();
  controls.dispose();
  atlas.unmount(api);
  atlas.setSpeed(initialClock.speed);
  atlas.pause(initialClock.paused);
  menu.remove();
  for(const group of [root,distantRoute])group.traverse(o=>{
   o.geometry?.dispose();
   o.material?.dispose();
  });
  route.dispose();
  sky.geometry.dispose();
  sky.material.dispose();
  if(model){craft.remove(model);disposeModel(model);model=null;}
  scene.clear();
  renderer.renderLists.dispose();
  onClose();
  if(where==='history')item.reopen('history',selected,time);
 }
 const api={
  label:'Voyager 2 · '+(options.follow?'Сопровождение':'Траектория'),
  draw(dt) {
   if(!atlas.paused) {
    const rate=atlas.speed*86400*(flyby?replayFactor:1);
    const from=flyby?.first??meta.begin,to=flyby?.last??meta.end;
    time=clamp(time+direction*dt*rate,from,to);
    if(time===from||time===to)atlas.pause(true);
   }
   resize();
   if(!updatePositions()){display();return;}
   const center=routeCenter();
   if(lastTarget){
    const shift=center.clone().sub(lastTarget);
    camera.position.add(shift);
    controls.target.add(shift);
   }
   lastTarget=center;
   star.position.copy(track).negate();
   craft.position.set(0,0,0);
   craft.quaternion.copy(shipRotation);
   light.position.copy(track).negate().normalize();

   controls.update(dt);
   const cameraDistance=camera.position.distanceTo(controls.target);
   const near=Math.max(1e-12,cameraDistance*.00045);
   let far=cameraDistance*100;
   for(const p of planets){
    if(!p.body.visible)continue;
    const extent=p.radius/UNIT*(p.ringLights.length?9:1);
    far=Math.max(far,camera.position.distanceTo(p.body.position)+extent);
   }
   far=Math.max(far,camera.position.distanceTo(star.position)+.6957)*1.02;
   const lines=get('[data-line]').checked;
   const wide=cameraDistance>=AU/UNIT;
   distantRoute.position.copy(track).negate();
   route.update({segment,state:flightState,time,overview:wide,visible:lines,cameraDistance:Math.max(cameraDistance,camera.position.length())});
   refreshModelProfile(model);
   renderer.info.reset();
   renderDepthRange(renderer,scene,camera,near,far,{background:sky});

   const shipVisible=!!model&&closeView();
   showLabel(marker,craft.position,!shipVisible);
   for(const p of planets){
    const moonInFrame=p.parent&&!wide&&p.relative&&
     p.radius/UNIT>camera.position.distanceTo(p.relative)*.003;
    const visible=p.position&&((wide&&!p.parent)||moonInFrame||(!closeView()&&p===focusBody()));
    showLabel(p.label,visible?p.relative:craft.position,!!visible);
   }
   for(const e of eventMarkers)showLabel(e.label,e.position.clone().sub(track),lines&&wide&&e.id!==selected);
   countdown+=dt;
   if(lastUI===0||countdown>=.16){
    display();lastUI=1;countdown=0;
   }
   return true;
  },
  close
 };
 marker.onclick=()=>setMode('focus');
 get('[data-exit=atlas]').onclick=()=>close();
 get('[data-exit=history]').onclick=()=>close('history');
 get('[data-event]').onchange=e=>{message='';go(e.target.value);};
 get('[data-replay]').onclick=()=>{message='';go(selected,true);};
 choices.onchange=e=>setMode(e.target.value);
 get('[data-scale]').onchange=()=>{updateScale();placeCamera();lastUI=0;};
 get('[data-play]').onclick=()=>{atlas.pause(!atlas.paused);lastUI=0;};
 get('[data-back]').onclick=()=>{direction=-1;atlas.pause(false);lastUI=0;};
 get('[data-forward]').onclick=()=>{direction=1;atlas.pause(false);lastUI=0;};
 speed.onchange=e=>atlas.setSpeed(Number(e.target.value));
 scrub.oninput=e=>{message='';atlas.pause(true);setTime(Number(e.target.value));lastUI=0;};
 get('[data-all-time]').onclick=()=>{releaseWindow();atlas.pause(true);};
 dateInput.onchange=()=>{message='';atlas.pause(true);releaseWindow();setTime(Date.parse(dateInput.value+'Z')/1000);};
 get('[data-line]').onchange=()=>{lastUI=0;};
 telemetryPanel.addEventListener('toggle',()=>{lastUI=0;},{signal});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.stopImmediatePropagation();close();}
 },{signal,capture:true});
 menu.addEventListener('keydown',e=>e.stopPropagation(),{signal});
 document.querySelector('#object-navigation').addEventListener('click',e=>{
  if(e.target.closest('button:not([data-object-tab])'))close();
 },{signal,capture:true});
 document.querySelector('.topbar').addEventListener('click',e=>{
  if(e.target.closest('button:not(#graphics-open)'))close();
 },{signal,capture:true});
 atlas.mount(api);
 resize();
 go(selected,options.play);
 if(Number.isFinite(options.time)){releaseWindow();setTime(options.time);placeCamera();}
 if(options.follow)setMode('focus');
 if(options.play)atlas.setSpeed(4);
 loadModel();
 return api;
}
