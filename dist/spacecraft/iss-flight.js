import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {loadSpacecraftModel,disposeModel} from './viewer.js';
import {makeFlightSky} from './flight-visuals.js';
import {missionAtlas} from './bridge.js';
import {readISSOrbit,sampleOEM,earthAngle,earthPoint} from './iss-orbit.js';

const radiusKm=6378.137;
const polarRatio=6356.752/radiusKm;
const cameraClearance=1.012;

const vector=([x,y,z])=>new T.Vector3(x,z,-y);
const utc=t=>new Date(t*1000).toISOString().replace('T',' ').slice(0,19)+' UTC';
function sunAt(time){
 const d=time/86400-10957.5,rad=Math.PI/180;
 const m=(357.529+.98560028*d)*rad;
 const l=(280.459+.98564736*d)*rad+rad*(1.915*Math.sin(m)+.020*Math.sin(2*m));
 return vector([Math.cos(l),Math.sin(l)*Math.cos(.4091),Math.sin(l)*Math.sin(.4091)]);
}
export async function openISSFlight(item,{follow,signal,onOpen}){
 const atlas=missionAtlas();
 let data=await readISSOrbit(signal);
 if(signal.aborted)return;
 const lifecycle=new AbortController();
 const scene=new T.Scene();
 scene.background=new T.Color(0x080f1d);
 const root=new T.Group(),earthFrame=new T.Group(),craft=new T.Group();
 const camera=new T.PerspectiveCamera(42,1,.000001,100);
 const renderer=atlas.renderer, controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.minDistance=.00002;controls.maxDistance=9;
 const earth=atlas.createEarth(1),{mesh,tilt,clouds,atmosphere}=earth.userData;
 tilt.rotation.z=0;
 earth.scale.y=polarRatio;
 clouds.visible=true;
 const solar=new T.Vector3();
 mesh.material.emissive.setHex(0xffd9a0);
 mesh.material.emissiveIntensity=1.9;
 mesh.material.emissiveMap=atlas.texture('earth_night_2016');
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.orbitSun={value:solar};
  shader.vertexShader='varying vec3 orbitNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\n orbitNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader='uniform vec3 orbitSun; varying vec3 orbitNormal;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',
   '#include <emissivemap_fragment>\n totalEmissiveRadiance*=1.0-smoothstep(-0.30,-0.04,dot(normalize(orbitNormal),orbitSun));');
 };
 earthFrame.add(earth);root.add(earthFrame);scene.add(root,craft);
 const sky=makeFlightSky(renderer.getPixelRatio());scene.add(sky);
 const light=new T.DirectionalLight(0xfff7ee,2.55),fill=new T.AmbientLight(0x9dbbff,.10);
 scene.add(light,fill);
 const orbit=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x80d7ef}));
 root.add(orbit);
 const marker=new T.Sprite(new T.SpriteMaterial({color:0xffc68a,depthTest:true}));
 marker.scale.setScalar(.018);craft.add(marker);
 const menu=document.createElement('div');menu.className='flight-ui';
 menu.innerHTML=`
 <div class="flight-heading"><div><small>КОСМИЧЕСКАЯ ТЕХНИКА · МКС</small><h1>${follow?'Сопровождение':'Траектория'}</h1></div>
 <div class="flight-exits"><button data-exit="history">История</button><button data-exit="atlas">Вернуться к атласу</button></div></div>
 <div class="flight-labels"><button type="button" class="flight-probe" data-station>МКС</button></div>
 <div class="flight-dock iss-flight-dock" role="region" aria-label="Управление полётом МКС">
 <div class="iss-view-tools" aria-label="Быстрые ракурсы"><button data-view="overview">Земля целиком</button><button data-view="free">МКС крупно</button><button data-view="top">Орбита сверху</button><button data-view="observer">Свободная камера</button><label><input data-fill type="checkbox"> Подсветка</label><label class="iss-trajectory-toggle"><input data-trajectory type="checkbox" checked> Траектория</label></div>
 <dl class="iss-metrics" data-metrics></dl>
 <details class="flight-telemetry"><summary>Подробнее</summary><div class="flight-actions">
 <label>Камера <select data-camera><option value="overview">Земля и орбита</option><option value="top">Орбита сверху</option><option value="observer">Свободная камера</option><option value="free">Свободный наблюдатель</option><option value="back">Позади станции</option><option value="forward">Перед станцией</option><option value="side">Сбоку</option><option value="above">Сверху</option><option value="below">Снизу</option><option value="earth">Вид на Землю</option><option value="horizon">Горизонт Земли</option><option value="pair">Станция и Земля</option></select></label>
 <label>Масштаб <select data-scale><option value="2000">Увеличение ×2000</option><option value="1000">Увеличение ×1000</option><option value="1">Физический</option></select></label>
 <label>Дата UTC <input data-date type="datetime-local" step="1"></label>
 <label>Карта поверхности <select data-earth-map><option value="earth_daymap">Дневная карта</option><option value="earth_spring">Апрель · Blue Marble</option><option value="earth_summer">Июль · Blue Marble</option><option value="earth_autumn">Октябрь · Blue Marble</option><option value="earth_winter">Январь · Blue Marble</option></select></label>
 <label class="flight-toggle"><input type="checkbox" data-clouds checked> Облака</label>
 <button data-refresh>Обновить данные NASA</button>
 <button data-cinema>Скрыть панель</button>
 </div><dl data-values></dl><p class="fine">NASA OEM · EME2000. Преобразование в координаты Земли и освещение приближённые. Ориентация модели условная. Покрытие ограничено прогнозом NASA.</p></details>
 <div class="flight-readout"><time data-clock></time><span data-velocity></span></div>
 <div class="flight-clock"><button data-back aria-label="Прокрутка назад">◀</button><button data-play>Пауза</button><button data-forward aria-label="Прокрутка вперёд">▶</button><button data-now title="Текущее время UTC">Сейчас</button>
 <label>Темп <select data-speed aria-label="Скорость времени"></select></label></div>
 <input class="flight-timeline" type="range" step="any" data-time aria-label="Перемотка времени"><p data-message role="status" hidden></p>
 </div>`;
 const $=s=>menu.querySelector(s), dock=$('.flight-dock'), slider=$('[data-time]'), mode=$('[data-camera]'), speed=$('[data-speed]');
 speed.innerHTML=[[1,'1:1'],[10,'10×'],[30,'30×'],[60,'60×'],[300,'300×'],[900,'900×']].map(([rate,label])=>'<option value="'+rate+'">'+label+'</option>').join('');
 const trajectory=$('[data-trajectory]');
 trajectory.checked=!follow;
 speed.value='30';
 let lastTick=performance.now();
 let time,direction=1,model,clock=0,lastRoute=-Infinity,needsFrame=true,closed=false,loading=false,nextFrame=0;
 const materialColors=new Map();
 let previousShadow;
 const cameraFromEarth=new T.Vector3();
 const p=new T.Vector3(),tangent=new T.Vector3(),up=new T.Vector3(),side=new T.Vector3(),temp=new T.Vector3();
 function message(value){const node=$('[data-message]');node.hidden=!value;node.textContent=value;}
 function setTime(value){
  if(!Number.isFinite(value))return;
  time=Math.min(data.max,Math.max(data.min,value));
  message(time===value?'':'Дата вне покрытия NASA. Показана ближайшая граница набора.');
  lastRoute=-Infinity;clock=1;
 }
 function bounds(){slider.min=data.min;slider.max=data.max;}
 function close(reopen){
  if(closed)return;
  closed=true;lifecycle.abort();atlas.unmount(api);controls.dispose();menu.remove();
  earth.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  sky.geometry.dispose();sky.material.dispose();
  orbit.geometry.dispose();orbit.material.dispose();
  marker.material.dispose();if(model)disposeModel(model);
  if(reopen)item.reopen(reopen);
 }
 function rebuild(t,period){
  const points=[];
  for(let i=0;i<=100;i++){
   const epoch=t+period*(i/100-.5),state=sampleOEM(data,epoch);
   if(state)points.push(vector(state.p).divideScalar(radiusKm));
  }
  orbit.geometry.dispose();
  orbit.geometry=new T.BufferGeometry().setFromPoints(points);
 }
 function frame(){
  const view=mode.value,scale=Number($('[data-scale]').value),range=.000055*scale;
  const axis={back:tangent.clone().negate(),forward:tangent,side,above:up,below:up.clone().negate(),earth:up,horizon:side,pair:side,free:side}[view];
  controls.target.set(0,0,0);
  if(view==='top')camera.position.copy(side).multiplyScalar(3.6);
  else if(view==='overview'||view==='observer'){camera.position.copy(up).add(solar).addScaledVector(side,.45).normalize().multiplyScalar(3.6);}
  else if(view==='pair'){controls.target.copy(p).multiplyScalar(-.45);camera.position.copy(controls.target).addScaledVector(side,2.4).addScaledVector(up,.4);}
  else{
   if(view==='earth')controls.target.copy(up).multiplyScalar(-.22);
   if(view==='horizon')controls.target.copy(tangent).addScaledVector(up,-.32);
   camera.position.copy(axis).multiplyScalar(view==='earth'||view==='horizon'?Math.max(range,.00004):Math.max(range,.00004)*1.7);
   if(view!=='above'&&view!=='below')camera.position.addScaledVector(up,range*.23);
  }
  controls.update();
 }
 const api={close,draw(dt){
  const now=performance.now(),elapsed=(now-lastTick)/1000;lastTick=now;
  if(!atlas.paused){const next=time+elapsed*Number(speed.value)*direction;time=Math.min(data.max,Math.max(data.min,next));if(time!==next)atlas.pause(true);}
  const state=sampleOEM(data,time);
  p.copy(vector(state.p)).divideScalar(radiusKm);up.copy(p).normalize();
  tangent.copy(vector(state.velocity)).normalize();side.crossVectors(tangent,up).normalize();
  const sun=solar.copy(sunAt(time)),shadow=p.dot(sun)<0&&temp.copy(p).cross(sun).length()<1;
  const closeView=!['overview','top','observer'].includes(mode.value);
  root.position.copy(closeView?p.clone().negate():temp.set(0,0,0));
  craft.position.copy(closeView?temp.set(0,0,0):p);
  earthFrame.rotation.y=earthAngle(time);
  light.position.copy(sun);
  atmosphere.material.uniforms.sunDirection.value.copy(sun);
  fill.intensity=$('[data-fill]').checked?.78:.10;
  if(model){
   model.visible=true;
   const dim=shadow?($("[data-fill]").checked?.42:.10):1;
   if(previousShadow!==dim){
    for(const [material,color] of materialColors)material.color.copy(color).multiplyScalar(dim);
    previousShadow=dim;
   }
  }
  marker.visible=!model||(!closeView&&$("[data-scale]").value==="1");
  if(needsFrame){frame();needsFrame=false;}
  controls.update(dt);
  // Camera distances scale with the model. Keep the viewpoint outside the planet and cloud layer even at exaggerated scale.
  cameraFromEarth.copy(camera.position).sub(root.position);
  const ellipsoidDistance=Math.hypot(cameraFromEarth.x,cameraFromEarth.y/polarRatio,cameraFromEarth.z);
  if(ellipsoidDistance<cameraClearance){
   if(ellipsoidDistance>1e-9)cameraFromEarth.multiplyScalar(cameraClearance/ellipsoidDistance);
   else cameraFromEarth.copy(up).multiplyScalar(cameraClearance);
   camera.position.copy(root.position).add(cameraFromEarth);
   camera.lookAt(controls.target);
  }
  const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight;
  if(!(width&&height))return;
  camera.aspect=width/height;
  camera.near=Math.max(.0000001,camera.position.distanceTo(controls.target)*.0003);camera.updateProjectionMatrix();
  orbit.visible=trajectory.checked;
  if(performance.now()>=nextFrame){renderer.render(scene,camera);nextFrame=performance.now()+33;}
  const label=$('[data-station]'),projected=temp.copy(craft.position).project(camera);
  const origin=camera.position.clone().sub(root.position);
  const ray=craft.position.clone().sub(camera.position);
  origin.y/=polarRatio;ray.y/=polarRatio;
  const nearest=T.MathUtils.clamp(-origin.dot(ray)/ray.lengthSq(),0,1);
  const occluded=origin.addScaledVector(ray,nearest).lengthSq()<1;
  label.hidden=closeView||occluded||Math.abs(projected.z)>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;
  if(!closeView)marker.visible=marker.visible&&!occluded;
  label.style.left=((projected.x+1)*width/2+10)+'px';label.style.top=((1-projected.y)*height/2)+'px';
  const speedKm=Math.hypot(...state.velocity),r=Math.hypot(...state.p),a=1/(2/r-speedKm**2/398600.4418),period=2*Math.PI*Math.sqrt(a**3/398600.4418);
  if(Math.abs(time-lastRoute)>12){rebuild(time,period);lastRoute=time;}
  clock+=dt;
  if(clock<.18)return;
  clock=0;slider.value=time;$('[data-clock]').textContent=utc(time);
  $('[data-velocity]').textContent='МКС · '+($('[data-scale]').value==='1'?'физический масштаб':'×'+$('[data-scale]').value);
  $('[data-play]').textContent=atlas.paused?'Продолжить':'Пауза';
  if(document.activeElement!==$('[data-date]'))$('[data-date]').value=new Date(time*1000).toISOString().slice(0,19);
  {
   const g=earthPoint(state.p,time);
   const normal=temp.crossVectors(p,vector(state.velocity)).normalize();
   const rows=[['Скорость',speedKm.toFixed(2)+' км/с'],['Высота',g.height.toFixed(1)+' км'],['Период (оценка)',(period/60).toFixed(2)+' мин'],['Наклонение',(Math.acos(normal.y)*180/Math.PI).toFixed(2)+'°'],['Широта',g.lat.toFixed(3)+'°'],['Долгота',g.lon.toFixed(3)+'°'],['Освещение',shadow?'В земной тени':'На солнечной стороне'],['Набор NASA',data.created+' UTC'],['Покрытие',utc(data.min)+' — '+utc(data.max)]];
   for(const [selector,values] of [['[data-metrics]',rows.slice(0,6)],['[data-values]',rows.slice(6)]])$(selector).innerHTML=values.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('');
  }
 }};
 onOpen();atlas.stage.append(menu);atlas.mount(api);
 bounds();setTime(Date.now()/1000);mode.value=follow?'free':'overview';
 atlas.pause(true);
 const listen={signal:lifecycle.signal};
 function changeMode(value){mode.value=value;needsFrame=true;if(value!=='overview')loadModel();}
 mode.onchange=()=>changeMode(mode.value);
 for(const button of menu.querySelectorAll('[data-view]'))button.onclick=()=>changeMode(button.dataset.view);
 $('[data-station]').onclick=()=>changeMode('free');
 $('[data-earth-map]').onchange=e=>{mesh.material.map=atlas.texture(e.target.value);};
 $('[data-clouds]').onchange=e=>{clouds.visible=e.target.checked;};
 $('[data-scale]').onchange=()=>{if(model)model.scale.setScalar(Number($('[data-scale]').value)*.109/model.userData.size/radiusKm);needsFrame=true;};
 $('[data-play]').onclick=()=>atlas.pause(!atlas.paused);
 $('[data-back]').onclick=()=>{direction=-1;atlas.pause(false);};
 $('[data-forward]').onclick=()=>{direction=1;atlas.pause(false);};
 $('[data-now]').onclick=()=>setTime(Date.now()/1000);
 slider.oninput=()=>{atlas.pause(true);setTime(Number(slider.value));};
 $('[data-date]').onchange=e=>{atlas.pause(true);setTime(Date.parse(e.target.value+'Z')/1000);};
 $('[data-refresh]').onclick=async e=>{
  e.target.disabled=true;
  try{data=await readISSOrbit(lifecycle.signal,true);bounds();setTime(time);}
  catch{if(!closed)message('NASA недоступна. Используется сохранённый набор.');}
  finally{e.target.disabled=false;}
 };
 $('[data-cinema]').onclick=()=>{dock.hidden=true;};
 menu.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();},listen);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();
  if(dock.hidden)dock.hidden=false;else close();
 },{...listen,capture:true});
 for(const nav of ['#object-navigation','.topbar'])document.querySelector(nav).addEventListener('click',e=>{if(e.target.closest('button:not([data-object-tab])'))close();},{...listen,capture:true});
 $('[data-exit=atlas]').onclick=()=>close();
 $('[data-exit=history]').onclick=()=>close('history');
 function loadModel(){
  if(model||loading||closed)return;
  loading=true;
  loadSpacecraftModel(item.model,item.draco,lifecycle.signal).then(gltf=>{
  if(!gltf)return;
  if(closed){disposeModel(gltf.scene);return;}
  model=gltf.scene;
  const box=new T.Box3().setFromObject(model),edge=box.getSize(new T.Vector3());
  const size=Math.max(edge.x,edge.y,edge.z);
  model.traverse(node=>{
   for(const material of [node.material].flat())if(material?.color&&!materialColors.has(material))materialColors.set(material,material.color.clone());
  });
  const stage=new T.Group();
  model.position.sub(box.getCenter(new T.Vector3()));
  stage.add(model);craft.add(stage);model=stage;model.userData.size=size;
  $('[data-scale]').onchange();
  }).catch(error=>{if(!closed)message('3D-модель недоступна: '+error.message);}).finally(()=>{loading=false;});
 }
 loadModel();
}
