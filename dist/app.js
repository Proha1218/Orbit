import {revealObjectTab} from './object-navigation.js';
import {ATLAS_DEPTH_RATIO, ATLAS_FAR, inspectionNear, renderDepthRange} from './camera-depth.js';
import {connectMissionAtlas} from './spacecraft/bridge.js';
import {applyMoonIllustration,moonIllustrationCaption,releaseMoonIllustration} from './moon-illustration.js';
import { MARS_MOON_AXES_KM, hasCassiniMoonShape, hasMoonShape, loadMoonShapes, moonShapeGeometry } from './mars-moon-shapes.js';
import {installCoveragePilot} from './coverage-pilot.js';
import {bodyStory} from './body-stories.js';
import {characteristics, planetCharacteristics, profileStories, satelliteProfile, sunProfile} from './body-profile.js';
import {SURFACE_VIEWS,applySurfaceView} from './surface-view.js';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PLANETS, MOON_DETAILS, BELTS } from './data.js';
import {atmosphere} from './visuals.js';
import {planetRings,RING_NOTES} from './planet-rings.js';
import {SEASONS,SEASON_NOTES,addMarsSeason,addUranusSeason} from './seasons.js';
import {resolveSeason,SEASON_NAMES} from './season-state.js';
import {MOON_MAPS,partialCoverage,phoebeMosaic} from './moon-maps.js';
import {installInspectionLight} from './inspection-light.js';
import {sunMaterial} from './sun-material.js';
import {mountSunAppearance} from './sun-appearance.js';
import {fillableMoons,mountCoverageControl} from './coverage-control.js';
import {createDwarfSystem} from './dwarf-system.js';
import {livingBelt} from './living-belts.js';
let catalogViewRadius=2.8;
let dwarfSystem,moonSizes={byName:{},byId:{}};
const primaryMeanKm={mercury:2439.4,venus:6051.8,earth:6371,mars:3389.5,jupiter:69911,saturn:58232,uranus:25362,neptune:24622};
function moonMeasure(name,id){return moonSizes.byName[String(name||'').replace(/\s+/g,'').replace(/([A-Z])0+(\d+)$/,'$1$2')]||moonSizes.byId[id]||null;}

import {mountFullCatalog} from './full-catalog.js';
import {MISSION_PHOTOS} from './mission-photos.js';
import {createMoonDetailLoader} from './moon-detail.js';
let moonDetail;
const inspectionLight={value:0};
let seasonClouds=true;
let seasonLight,seasonIndex=0,seasonHemisphere='north';
let realScale=true,orbitalData={};
const planetKm=[57900000,108200000,149600000,228000000,778500000,1432000000,2867000000,4515000000];
const overviewUnitKm=15000000;
let focusKmPerUnit=1;
const lightDirection=new THREE.Vector3(-30,22,40);
let cinematic=false,autoOrbit=false,viewingSun=false;
let beltAnchors=[];

const $ = s => document.querySelector(s);
const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textureURL = name => {const [file,query]=name.split('?');return './textures/'+file+'.jpg'+(query?'?'+query:'');};
const fmt = n => n.toLocaleString('ru-RU');
let missionScene;
let catalog, scene, renderer, camera, controls, overviewGroup, focusGroup, moonGroup, focusPlanet;
let mode = 'overview', selectedPlanet = null, selectedMoon = null, paused = false, speed = .01, simDays = 0;
let labels = [], pickables = [], orbitLines = [], moonObjects = [], planetObjects = [], transition = null;
let follow = null, previousFollow = new THREE.Vector3(), frame = 0, previousTime = performance.now();
const temp = new THREE.Vector3(), clockSpeeds = [.01,.03,.1,.3,1,3,10,30,100,300,1000], textures = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {orbits:true, labels:true, moons:true};
const majorOrder = {
 earth:['Moon'],mars:['Phobos','Deimos'],jupiter:['Io','Europa','Ganymede','Callisto','Amalthea'],
 saturn:['Titan','Enceladus','Mimas','Tethys','Dione','Rhea','Iapetus','Hyperion','Phoebe'],
 uranus:['Miranda','Ariel','Umbriel','Titania','Oberon'],neptune:['Triton','Nereid','Proteus']
};
function sortedMoons(id){const order=majorOrder[id]||[];return [...(catalog.planets[id]||[])].sort((a,b)=>{const ai=order.indexOf(a.name),bi=order.indexOf(b.name);return (ai<0?999:ai)-(bi<0?999:bi);});}
function moonName(m){return m.ru||m.name||m.designation;}
function moonKey(m){return m.name||m.designation;}
function texture(name){if(name==='phoebe'){if(!textures.has(name))textures.set(name,phoebeMosaic());return textures.get(name);}if(!textures.has(name)){const t=new THREE.TextureLoader().load(textureURL(name));t.wrapS=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.set(name,t);}return textures.get(name);}
function mini(name){return `style="background-image:url('${textureURL(name)}')"`;}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);}
function addLabel(object,text,onClick,kind=''){const el=document.createElement('button');el.className=`object-label ${kind}`;el.textContent=text;el.onclick=onClick;$('#labels').append(el);labels.push({object,el,kind});return el;}
function clearLabels(){labels.forEach(l=>l.el.remove());labels=[];}
function addOrbit(radius,parent,color=0x6d819c,opacity=.2,inclination=0){
 const pts=[];
 for(let i=0;i<=360;i++){const a=i/360*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));}
 const selected=color===0xefb284;
 const material=new THREE.LineDashedMaterial({color:selected?0x91f0ff:0x539bd1,transparent:true,opacity:selected?.8:.42,dashSize:radius*.027,gapSize:radius*.021,depthWrite:false});
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),material);
 line.computeLineDistances();line.rotation.x=-inclination;line.visible=state.orbits;
 parent.add(line);orbitLines.push(line);return line;
}
function makePlanet(p,radius){const group=new THREE.Group();const tilt=new THREE.Group();tilt.rotation.z=THREE.MathUtils.degToRad(p.tilt||0);group.add(tilt);const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),new THREE.MeshStandardMaterial({map:texture(p.texture),roughness:1,metalness:0}));mesh.castShadow=true;mesh.receiveShadow=true;tilt.add(mesh);group.userData={mesh,tilt,radius,planet:p};if(p.id==='mars')group.userData.seasonCaps=addMarsSeason(mesh.material);
 if(p.id==='earth'){
  const cloudMask=texture('earth_clouds');
  // This texture encodes opacity. Keep its samples linear and tint the clouds separately.
  cloudMask.colorSpace=THREE.NoColorSpace;
  const cloudMaterial=new THREE.MeshStandardMaterial({
   color:0xf8fafc,alphaMap:cloudMask,transparent:true,opacity:.92,depthWrite:false,roughness:1,
   // Separate nearly coplanar depth values with the atlas camera's wide range.
   polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2
  });
  cloudMaterial.onBeforeCompile=shader=>{
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n diffuseColor.a = smoothstep(0.025, 0.78, diffuseColor.a);');
  };
  // Denser cloud geometry keeps its facets above the ground as the layers rotate independently.
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.008,160,96),cloudMaterial);
  clouds.visible=seasonClouds;
  tilt.add(clouds);
  group.userData.clouds=clouds;
 }
 const airColors={earth:0x418dff,venus:0xefbf80,mars:0xbb795a,uranus:0x83cbd5,neptune:0x81b6c5};
 if(p.id==='uranus')group.userData.seasonHaze=addUranusSeason(mesh.material);
 if(airColors[p.id]){const air=atmosphere(radius,airColors[p.id],lightDirection);group.add(air);group.userData.atmosphere=air;}
 if(Object.hasOwn(RING_NOTES,p.id))tilt.add(planetRings(p.id,radius,lightDirection));
 return group;}
function starfield(){let seed=731;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const positions=[],colors=[];for(let i=0;i<2300;i++){const theta=rnd()*Math.PI*2,u=rnd()*2-1,r=600+rnd()*500,s=Math.sqrt(1-u*u);positions.push(r*s*Math.cos(theta),r*u,r*s*Math.sin(theta));const c=.35+rnd()*.5;colors.push(c*.8,c*.88,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:1.15,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.8,depthWrite:false})));}
function oldMakeBelt(inner,outer,count,color){let seed=Math.floor(inner*123);const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const pos=[],cols=[];const base=new THREE.Color(color);for(let i=0;i<count;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(inner*inner+rnd()*(outer*outer-inner*inner));pos.push(Math.cos(a)*r,(rnd()-.5)*(outer-inner)*.17,Math.sin(a)*r);const c=base.clone().multiplyScalar(.4+rnd()*.6);cols.push(c.r,c.g,c.b);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));return new THREE.Points(geo,new THREE.PointsMaterial({size:.36,vertexColors:true,transparent:true,opacity:.75,sizeAttenuation:true,depthWrite:false}));}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,'rgba(255,204,126,.8)');g.addColorStop(.2,'rgba(255,166,66,.32)');g.addColorStop(.5,'rgba(255,130,38,.08)');g.addColorStop(1,'rgba(255,100,20,0)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);}
function initScene(){renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x090e18,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;moonDetail=createMoonDetailLoader(renderer,text=>{const badge=$('#map-quality');if(badge)badge.textContent=text;});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#canvas-host').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D-модель. Выбор объектов также доступен в меню планет и каталоге спутников.');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,1,.0001,100000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.minDistance=.6;controls.maxDistance=2000;controls.maxPolarAngle=Math.PI*.92;controls.addEventListener('start',()=>{transition=null;});scene.add(new THREE.AmbientLight(0x9eafc8,.24));const key=seasonLight=new THREE.DirectionalLight(0xffefdd,3.4);key.position.copy(lightDirection);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-35;key.shadow.camera.right=35;key.shadow.camera.top=35;key.shadow.camera.bottom=-35;key.shadow.camera.near=1;key.shadow.camera.far=150;key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key);starfield();overviewGroup=new THREE.Group();scene.add(overviewGroup);focusGroup=new THREE.Group();scene.add(focusGroup);focusGroup.visible=false;
 const sun=new THREE.Mesh(new THREE.SphereGeometry(realScale?695700/overviewUnitKm:5.3,64,40),sunMaterial(texture('sun-soho')));overviewGroup.add(sun);sun.userData.action=showSun;const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.setScalar(realScale?.22:23);glow.material.opacity=.32;overviewGroup.add(glow);overviewGroup.userData.sun=sun;overviewGroup.userData.sunGlow=glow;const sunLight=new THREE.PointLight(0xffdfb0,75,250,1);overviewGroup.add(sunLight);
 PLANETS.forEach((p,i)=>{const body=makePlanet(p,realScale?Number(p.diameter.replaceAll(' ',''))/2/overviewUnitKm:p.radius);body.userData.phase=[2.8,4.35,.6,2.05,5.35,3.65,1.12,5.8][i];body.userData.action=()=>showPlanet(p.id);overviewGroup.add(body);addOrbit(realScale?planetKm[i]/overviewUnitKm:p.orbit,overviewGroup);planetObjects.push(body);});
 const asteroid=livingBelt({inner:realScale?21:35,outer:realScale?33:40.5,count:3300,kind:"asteroid"}),kuiper=livingBelt({inner:realScale?300:108,outer:realScale?500:127,count:5000,kind:"kuiper"});overviewGroup.add(asteroid,kuiper);overviewGroup.userData.belts={asteroid,kuiper};
 new ResizeObserver(resize).observe($('#stage'));resize();renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement._down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',pick);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Графическая сцена приостановлена. Обновите страницу.');});
}
function resize(){if(!renderer)return;const {width,height}=$('#stage').getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}
function pick(e){if(missionScene)return;const down=renderer.domElement._down;if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObjects(pickables,true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.action)obj=obj.parent;if(obj?.userData.action){obj.userData.action();return;}}}
function fly(position,target=new THREE.Vector3(),instant=false){follow=null;if(instant||reducedMotion){camera.position.copy(position);controls.target.copy(target);controls.update();transition=null;return;}transition={start:performance.now(),from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone()};}
function setSelected(id){revealObjectTab([...$('#object-navigation').querySelectorAll('[data-planet],[data-dwarf],[data-belt]')].find(button=>(button.dataset.planet||button.dataset.dwarf||button.dataset.belt)===id));document.querySelectorAll('.planet-button').forEach(b=>b.classList.toggle('selected',b.dataset.planet===id));$('#overview').classList.toggle('selected',id==='overview');document.querySelectorAll('.belt-button').forEach(b=>b.classList.toggle('selected',(b.dataset.belt||b.dataset.dwarf)===id));}
function title(eyebrow,heading,subtitle,badge){$('#belt-scale-note')?.remove();$('#scale-mode').hidden=mode==='catalog';$('#illuminate').hidden=!['planet','catalog','dwarf'].includes(mode);document.body.classList.toggle('real-scale',realScale);$('#eyebrow').textContent=eyebrow;$('#scene-title').innerHTML=escape(heading)+'<span>.</span>';$('#scene-subtitle').textContent=subtitle;$('#scene-badge').textContent=badge;}
function addOverviewLabels(){clearLabels();addLabel(overviewGroup.userData.sun,'Солнце',showSun,'major');planetObjects.forEach(body=>addLabel(body,body.userData.planet.name,body.userData.action));beltAnchors.forEach(a=>overviewGroup.remove(a));beltAnchors=[];const a=new THREE.Object3D();a.position.set(-26,0,27);overviewGroup.add(a);const k=new THREE.Object3D();k.position.set(realScale?380:75,0,realScale?-180:-89);overviewGroup.add(k);beltAnchors.push(a,k);addLabel(a,'ПОЯС АСТЕРОИДОВ',()=>showBelt('asteroid'),'major');addLabel(k,'ПОЯС КОЙПЕРА',()=>showBelt('kuiper'),'major');}
function overviewPosition(){const aspect=camera.aspect;const factor=realScale?3.7:1;return new THREE.Vector3(0,(aspect<.85?210:165)*factor,(aspect<.85?255:195)*factor);}
function showOverview(instant=false){dwarfSystem?.hide();viewingSun=false;planetObjects.forEach(o=>o.visible=true);overviewGroup.userData.belts.asteroid.visible=true;overviewGroup.userData.belts.kuiper.visible=true;moonDetail?.release();mode='overview';if(seasonLight){seasonLight.position.copy(lightDirection);scene.traverse(o=>{if(o.material?.uniforms?.sunDirection)o.material.uniforms.sunDirection.value.copy(lightDirection).normalize();});}controls.minDistance=10;controls.maxDistance=2000;selectedPlanet=null;selectedMoon=null;overviewGroup.visible=true;focusGroup.visible=false;pickables=[...planetObjects,overviewGroup.userData.sun];orbitLines.forEach(o=>o.visible=state.orbits);addOverviewLabels();setSelected('overview');title('НАШ КОСМИЧЕСКИЙ АДРЕС','Солнечная система','Восемь миров. Одна звезда. Ваше путешествие.','ОБЗОР СИСТЕМЫ');fly(overviewPosition(),new THREE.Vector3(),instant===true);$('#details').innerHTML=`<div class="details-kicker"><span>НАЧАЛО ПУТЕШЕСТВИЯ</span><span>☉</span></div><div class="detail-hero sun"><span class="planet-mini" ${mini('sun-soho')}></span></div><div class="latin">The Solar System</div><h2>Всё начинается<br>со звезды.</h2><p class="description">Солнце объединяет восемь планет, сотни спутников и бесчисленные малые тела в одну систему. Выберите мир, чтобы рассмотреть его ближе.</p><div class="fact-grid"><div><small>ПЛАНЕТ</small><strong>8</strong></div><div><small>СПУТНИКОВ 8 ПЛАНЕТ</small><strong>${Object.values(catalog.planets).flat().length}</strong></div><div><small>ВОЗРАСТ СИСТЕМЫ</small><strong>4,6<em>млрд лет</em></strong></div><div><small>ПОЯСА МАЛЫХ ТЕЛ</small><strong>2</strong></div></div><div class="did-you-know"><h3>НАЧНИТЕ С ДОМА</h3><p>Посмотрите на Землю со стороны, найдите Луну, а затем отправляйтесь к кольцам Сатурна.</p></div><button class="cta" id="start-earth">Отправиться к Земле <span>↗</span></button>`;$('#start-earth').onclick=()=>showPlanet('earth');const sunButton=document.createElement('button');sunButton.className='cta secondary-cta';sunButton.textContent='Рассмотреть Солнце ↗';sunButton.onclick=showSun;$('#start-earth').after(sunButton);mountSunAppearance($('#details'),overviewGroup.userData.sun.material,overviewGroup.userData.sunGlow);$('#details').scrollTop=0;}
function showSun(){
 if(mode!=='overview')showOverview(true);
 viewingSun=true;
 const {sun,sunGlow,belts}=overviewGroup.userData;
 planetObjects.forEach(object=>object.visible=false);
 belts.asteroid.visible=false;belts.kuiper.visible=false;
 orbitLines.forEach(line=>line.visible=false);
 pickables=[sun];
 title('НАША ЗВЕЗДА','Солнце','Выберите облик для осмотра поверхности.','СОЛНЦЕ');
 const details=$('#details');
 details.innerHTML=sunProfile()+'<button class="cta secondary-cta" id="back-from-sun">Вся Солнечная система</button>';
 details.querySelector('#back-from-sun').onclick=()=>showOverview();
 mountSunAppearance(details,sun.material,sunGlow);
 details.querySelector('.profile-characteristics').after(details.querySelector('.sun-appearance'));
 details.scrollTop=0;
 const radius=sun.geometry.parameters.radius;
 controls.minDistance=radius*1.2;
 fly(new THREE.Vector3(0,radius*.8,radius*4.4));
}
function disposeFocus(){moonDetail.release();clearLabels();focusGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});focusGroup.clear();moonObjects=[];orbitLines=orbitLines.filter(l=>l.parent===overviewGroup);}
let moonMarkerMap;
function moonMarkerMaterial(){
 if(!moonMarkerMap){
  const pixels=new Uint8Array(16*16*4);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const i=(y*16+x)*4,distance=Math.hypot(x-7.5,y-7.5);
   pixels.set([255,255,255,Math.round(255*THREE.MathUtils.clamp((7.6-distance)/2,0,1))],i);
  }
  moonMarkerMap=new THREE.DataTexture(pixels,16,16);
  moonMarkerMap.needsUpdate=true;
 }
 return new THREE.PointsMaterial({map:moonMarkerMap,color:0x9ab8d3,size:3.4,sizeAttenuation:false,transparent:true,opacity:.68,alphaTest:.05,depthWrite:false});
}
function planetViewPosition(id){
 return id==="uranus"?new THREE.Vector3(-9,4.5,16.5):new THREE.Vector3(0,6.5,18);
}
function showPlanet(id){dwarfSystem?.hide();const p=PLANETS.find(p=>p.id===id);if(!p)return;mode='planet';controls.minDistance=4;selectedPlanet=p;selectedMoon=null;focusKmPerUnit=primaryMeanKm[p.id]/3.3;overviewGroup.visible=false;focusGroup.visible=true;disposeFocus();focusPlanet=makePlanet(p,3.3);focusGroup.add(focusPlanet);focusPlanet.userData.action=()=>resetCamera();pickables=[focusPlanet];moonGroup=new THREE.Group();moonGroup.visible=state.moons;focusGroup.add(moonGroup);const moons=sortedMoons(id);let outerEdge=id==='saturn'?8.3:6.2;moons.forEach((m,i)=>{const key=moonKey(m),info=MOON_DETAILS[key],mapMeta=MOON_MAPS[key],important=i<(majorOrder[id]||[]).length;const element=orbitalData[key.replace(/\s+/g,'')];const measured=moonMeasure(key,key);const diameter=measured?.radiusKm?measured.radiusKm*2:null;const radius=diameter?diameter/2/focusKmPerUnit:.00003;const safeRadius=radius*1.4;const orbit=realScale?(element?element.a/focusKmPerUnit:null):outerEdge+safeRadius+.5;outerEdge=(orbit||outerEdge)+safeRadius+.5;if(realScale&&!orbit)return;const shape=diameter?moonShapeGeometry(key,1/focusKmPerUnit):null;let body=new THREE.Mesh(shape??new THREE.SphereGeometry(radius,mapMeta?96:16,mapMeta?64:12),new THREE.MeshStandardMaterial({map:mapMeta?texture(mapMeta.texture):null,bumpMap:null,color:mapMeta?0xffffff:0x888d95,roughness:1}));if(mapMeta?.partial)partialCoverage(body.material,fillableMoons.has(key));if(key==='Europa')installCoveragePilot(body.material,key.toLowerCase());if(key==='Titan'){body.material.map=null;body.material.bumpMap=null;body.material.color.setHex(0xd2a667);const haze=atmosphere(radius,0xdcae6d,lightDirection);haze.name='titan-haze';body.add(haze);haze.scale.setScalar(1.02);}if(!diameter){body.geometry.dispose();body.material.dispose();body=new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]),moonMarkerMaterial());}body.castShadow=important;body.receiveShadow=important;const axes=MARS_MOON_AXES_KM[key]??measured?.semiaxesKm;if(diameter&&axes&&!shape){body.scale.set(...axes.map(axis=>axis/measured.radiusKm));}body.userData={moon:m,radius,orbit,aKm:element?.a,marker:!diameter,phase:i*2.399,inc:important?.03:Math.sin(i*15)*.7,speed:realScale&&element?.period?Math.PI*2/Math.abs(element.period)/.12*(key==='Triton'?-1:1):(key==='Triton'?-1:1)*(.36/Math.sqrt(orbit)),action:()=>selectMoon(key),important};moonGroup.add(body);moonObjects.push(body);pickables.push(body);if(important){addOrbit(orbit,moonGroup,0x7a91ae,.16,body.userData.inc);addLabel(body,moonName(m),body.userData.action);} });
 addLabel(focusPlanet,p.name,()=>resetCamera(),'major');updateMoons();setSelected(id);title(`0${PLANETS.indexOf(p)+1} / ПЛАНЕТЫ СОЛНЕЧНОЙ СИСТЕМЫ`,p.name,moons.length?'Мир и его спутники. Выберите объект, чтобы узнать больше.':'Рассмотрите планету с любой стороны.','В СИСТЕМЕ ПЛАНЕТЫ');renderPlanetDetails(p,moons);if(p.id==='uranus')mountUranusObservations();mountSurfacePanel(p.id);fly(planetViewPosition(p.id));$('#details').scrollTop=0;syncMoonsVisibility();addPoleLabels();mountSeasons();applySeason();addScaleNote();}
function ringNotes(id){
 const entry=RING_NOTES[id];
 if(!entry)return "";
 const [description]=entry;
 return `<details class="source-details"><summary>О кольцах</summary><p>${description} Яркость и ширина самых тонких колец усилены для осмотра.</p></details>`;
}
function mountUranusObservations(){
 const panel=document.createElement("section");
 panel.className="uranus-observations";
 panel.innerHTML=`<label for="uranus-map">Облик атмосферы Урана</label><select id="uranus-map"><option value="uranus-opal-visible-soft">Видимый свет · Hubble</option><option value="uranus-opal-f845m-soft">Ближний ИК · усиленный контраст</option></select>
 <p class="fine">Hubble OPAL, октябрь 2025 · NASA, ESA, A. A. Simon, M. H. Wong · CC BY 4.0. Карты обработаны для 3D: южное полушарие в этой серии не показано и заполнено нейтральным цветом с плавным переходом.</p>

 <details class="source-details"><summary>Снимок Webb крупным планом</summary><figure class="dwarf-observation"><img src="./photos/uranus-webb.png" loading="lazy" alt="Полярная шапка Урана и кольца на снимке Webb"><figcaption>Webb NIRCam · 4 сентября 2023. Инфракрасный снимок в условных цветах. NASA, ESA, CSA, STScI.</figcaption></figure></details>`;
 panel.querySelector("select").onchange=event=>{
  if(mode!=="planet"||selectedPlanet?.id!=="uranus")return;
  focusPlanet.userData.mesh.material.map=texture(event.target.value);
  focusPlanet.userData.mesh.material.needsUpdate=true;
 };
 $("#details .body-story").after(panel);
}
function renderPlanetDetails(p,moons){$('#details').innerHTML=`<div class="details-kicker"><span>ДОСЬЕ ПЛАНЕТЫ</span><span>0${PLANETS.indexOf(p)+1} / 08</span></div><div class="latin">${p.latin}</div><h2>${p.name}</h2><span class="object-type">${p.type}</span>${bodyStory(p.id)}${planetCharacteristics(p,moons.length)}<p class="description">${p.description}</p>${p.id==='neptune'?`<p class="fine">Карта облаков 4096 × 2048 · CelestiaContent. Облачные детали по снимкам Voyager 2, обработка Björn Jónsson и Askaniy. </p>`:''}${ringNotes(p.id)}${p.id==='earth'?'<button type="button" class="secondary-cta" data-spacecraft="iss" aria-haspopup="dialog">МКС <small>Орбитальная станция</small></button>':''}<div class="fact-grid"><div><small>ЭКВАТОРИАЛЬНЫЙ ДИАМЕТР</small><strong>${p.diameter}<em>км</em></strong></div><div><small>ОТ СОЛНЦА · СРЕДНЕЕ</small><strong>${p.distance}<em>млн км</em></strong></div><div><small>ПЕРИОД ОБРАЩЕНИЯ</small><strong>${p.year}</strong></div><div><small>ВРАЩЕНИЕ ВОКРУГ ОСИ</small><strong>${p.day}</strong></div></div><div class="did-you-know"><h3>БЛИЖЕ К ОТКРЫТИЮ</h3><p>${p.fact}</p></div><div class="moon-title"><h3>Спутники</h3><span class="count">${moons.length} в каталоге</span></div>${moons.length?'<input class="moon-search" id="moon-search" type="search" placeholder="Найти спутник…" aria-label="Найти спутник"><label class="maps-filter"><input id="observed-only" type="checkbox">С картами миссий</label><div id="moon-list" class="moon-list"></div><div id="moon-card"></div><p class="fine">Снимок JPL · 16.11.2026<br>Точки в сцене обозначают спутники без данных о размере. Отключить их вместе со спутниками можно переключателем «Спутники».</p>':'<p class="empty">У этой планеты нет известных естественных спутников.</p>'}`;if(moons.length){renderMoonList(moons);$('#observed-only').onchange=()=>$('#moon-search').dispatchEvent(new Event('input'));$('#moon-search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();renderMoonList(moons.filter(m=>(!$('#observed-only').checked||MOON_MAPS[moonKey(m)])&&[m.ru,m.name,m.designation].some(v=>v?.toLowerCase().includes(q))));});}}
function renderMoonList(moons){$('#moon-list').innerHTML=moons.length?moons.map(m=>`<button class="moon-row ${selectedMoon===moonKey(m)?'selected':''}" data-moon="${escape(moonKey(m))}"><span class="moon-dot"></span><span>${escape(moonName(m))}${m.ru&&m.name?`<small>${escape(m.name)}</small>`:''}</span><span class="map-badge ${MOON_MAPS[moonKey(m)]?'available':'missing'}" title="${MOON_MAPS[moonKey(m)]?'Есть карта по данным миссии':'Карта не подключена'}">${MOON_MAPS[moonKey(m)]?.hd?'HD':MOON_MAPS[moonKey(m)]?'Карта':'—'}</span><span class="go">↗</span></button>`).join(''):'<p class="empty">Спутник не найден. Попробуйте другое имя или обозначение.</p>';document.querySelectorAll('.moon-row').forEach(b=>b.onclick=()=>selectMoon(b.dataset.moon));}
function selectMoon(key){const obj=moonObjects.find(o=>moonKey(o.userData.moon)===key);if(!obj){const m=(catalog.planets[selectedPlanet.id]||[]).find(m=>moonKey(m)===key);showCatalogBody({...m,key,officialName:m?.name||key,name:moonName(m||{name:key}),parent:selectedPlanet.name,confirmed:true,sourceObject:catalog.source});return;}if(selectedMoon!==key)releaseMoonIllustration(moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon));selectedMoon=key;controls.minDistance=Math.max(.0005,obj.userData.radius*1.6);if(!state.moons){state.moons=true;$('#show-moons').checked=true;syncMoonsVisibility();}const m=obj.userData.moon,info=MOON_DETAILS[key];title('СПУТНИК · '+selectedPlanet.name.toUpperCase(),moonName(m),info?'Рассмотрите спутник и узнайте, чем он удивителен.':'Один из известных спутников в каталоге JPL.','СЛЕДОВАНИЕ ЗА СПУТНИКОМ');const target=obj.position.clone();const d=Math.max(obj.userData.marker?.025:.0004,obj.userData.radius*4.4);if(!MOON_MAPS[key]&&!obj.userData.marker&&!hasMoonShape(key)){const measure=moonMeasure(key,key);applyMoonIllustration(obj,{key,radius:obj.userData.radius,radiusKm:measure?.radiusKm,illustrative:!realScale,measuredShape:!!measure?.semiaxesKm});if(obj.userData.illustrativeSurface)$('#scene-subtitle').textContent='Иллюстрация поверхности · фотокарта не подключена';}fly(target.clone().add((['Miranda','Ariel','Umbriel','Titania','Oberon','Triton'].includes(key)?new THREE.Vector3(d*.35,-d*1.2,d*.35):new THREE.Vector3(d*.7,d*.5,d))),target);follow=obj;previousFollow.copy(obj.position);$('#moon-card').innerHTML=`<div class="moon-card"><div class="latin">СПУТНИК ПЛАНЕТЫ ${selectedPlanet.name.toUpperCase()}</div><h3>${escape(moonName(m))}</h3>${satelliteProfile({...m,key,parent:selectedPlanet.name},{measure:moonMeasure(key,key),orbit:orbitalData[key.replace(/\s+/g,'')],description:info?.text})}${mapCaption(key)}<button id="back-planet">← Вернуться к планете</button></div>`;$('#back-planet').onclick=resetCamera;document.querySelectorAll('.moon-row').forEach(b=>b.classList.toggle('selected',b.dataset.moon===key));const existing=labels.find(l=>l.object===obj);if(!existing)addLabel(obj,moonName(m),()=>selectMoon(key));if(state.orbits&&!obj.userData.important){const old=moonGroup.getObjectByName('selected-orbit');if(old){moonGroup.remove(old);old.geometry.dispose();old.material.dispose();orbitLines=orbitLines.filter(o=>o!==old);}const line=addOrbit(obj.userData.orbit,moonGroup,0xefb284,.3,obj.userData.inc);line.name='selected-orbit';}mountSurfacePanel(key);mountSeasons();applySeason();addScaleNote();moonDetail.inspect(obj,key,MOON_MAPS[key]);mountCoverageControl($('#moon-card'),key);$('#moon-card').scrollIntoView({block:'nearest',behavior:reducedMotion?'instant':'smooth'});}
function setBeltView(id,view){
 const belt=overviewGroup.userData.belts[id];
 const {inspectTarget,inspectRadius,meanRadius}=belt.userData;
 const buttons=$('#belt-views');
 buttons?.querySelectorAll('[data-belt-view]').forEach(button=>
  button.setAttribute('aria-pressed',String(button.dataset.beltView===view)));
 $('#belt-scale-note')?.remove();
 if(view==='close'){
  const note=document.createElement('p');
  note.id='belt-scale-note';
  note.textContent='Демонстрационное тело увеличено';
  $('.scene-heading').append(note);
  belt.userData.update(simDays,true);
  const target=inspectTarget.position;
  const offset=new THREE.Vector3(.35,1.35,4.6).multiplyScalar(inspectRadius);
  controls.minDistance=inspectRadius*1.55;
  fly(target.clone().add(offset),target.clone());
  follow=inspectTarget;
  previousFollow.copy(target);
 }else{
  belt.userData.update(simDays,false);
  controls.minDistance=10;
  if(view==='top'){
   const halfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect);
   const height=belt.userData.outerRadius*1.12/halfFov;
   controls.maxDistance=Math.max(2000,height*1.1);
   fly(new THREE.Vector3(0,height,.01));
  }else{
   const target=inspectTarget.position.clone().multiplyScalar(.87);
   const radial=target.clone().setY(0).normalize();
   const tangent=new THREE.Vector3(-radial.z,0,radial.x);
   const position=target.clone().addScaledVector(radial,meanRadius*.8).addScaledVector(tangent,meanRadius*.5);
   position.y+=meanRadius*.62;
   fly(position,target);
  }
 }
}
function beltProfile(id){
 const main=id==='asteroid';
 return characteristics([
  ['Положение', main?'Между орбитами Марса и Юпитера':'За орбитой Нептуна'],
  ['Вещество', main?'Каменистые, углеродистые и металлические тела':'Водяной лёд, камень и замёрзшие летучие вещества']
 ])+profileStories([
  ['Как его открыли',main?'Джузеппе Пиацци обнаружил Цереру в 1801 году. Последующие открытия Паллады, Юноны и Весты показали, что в этой области обращается много тел.':'В 1992 году Дэвид Джуитт и Джейн Лу обнаружили объект 1992 QB₁, ныне Альбион. Его открытие подтвердило существование популяции небольших тел за Нептуном.'],
  ['Устройство и особенности',main?'Орбиты астероидов распределены неравномерно. В некоторых диапазонах больших полуосей из-за резонансов с Юпитером долгоживущих орбит меньше.':'Наклонения и формы орбит различаются. Часть объектов, включая Плутон, обращается в резонансе с Нептуном.'],
  ['Интересная деталь',main?'Космический аппарат Dawn исследовал с орбиты и Весту, и Цереру.':'В 2019 году New Horizons пролетел рядом с Аррокотом. Снимки показали две соединённые доли.']
 ]);
}
function showBelt(id){showOverview();mode=id;setSelected(id);for(const [key,belt] of Object.entries(overviewGroup.userData.belts))belt.visible=key===id;const b=BELTS[id];title('МАЛЫЕ ТЕЛА · '+(id==='asteroid'?'ВНУТРЕННЯЯ СИСТЕМА':'ВНЕШНЯЯ СИСТЕМА'),b.name,id==='asteroid'?'Каменные следы рождения планет.':'Ледяная окраина нашего космического дома.','ОБЛАСТЬ МАЛЫХ ТЕЛ');$('#details').innerHTML=`<div class="details-kicker"><span>ОБЛАСТЬ СИСТЕМЫ</span><span>⠿</span></div><div class="latin">${b.latin}</div><h2>${b.name}</h2><span class="object-type">${b.type}</span><p class="description">${b.description}</p><div class="fact-grid"><div><small>ОТ СОЛНЦА · ПРИМЕРНО</small><strong>${b.range}<em>а.е.</em></strong></div><div><small>1 АСТРОНОМИЧЕСКАЯ ЕД.</small><strong>149,6<em>млн км</em></strong></div></div><div class="did-you-know"><h3>БЛИЖЕ К ОТКРЫТИЮ</h3><p>${b.fact}</p></div><div class="moon-title"><h3>Известные объекты</h3></div><p class="description">${b.objects}</p>${beltProfile(id)}<div id="belt-views" class="belt-views" role="group" aria-label="Ракурс пояса"><button type="button" data-belt-view="wide">Обзор</button><button type="button" data-belt-view="top">Вид сверху</button><button type="button" data-belt-view="close">Крупный план</button></div><p class="fine">${id==='asteroid'?'Разрежения Кирквуда показаны в учебной модели с круговыми орбитами. В действительности они видны в распределении больших полуосей, а не как пустые кольца в пространстве.':'Плотнее всего показано ядро классического пояса. Более наклонённые орбиты образуют широкий слой вокруг него.'} Частицы условные. На крупном плане показано увеличенное демонстрационное тело.</p><button class="cta" id="back-overview">Вся Солнечная система <span>↗</span></button>`;$('#back-overview').onclick=()=>showOverview();
 $('#belt-views').onclick=event=>{
  const button=event.target.closest('[data-belt-view]');
  if(button)setBeltView(id,button.dataset.beltView);
 };
 setBeltView(id,'wide');
 const list=document.createElement('div');for(const d of [{"id":"ceres","name":"Церера"},{"id":"pluto","name":"Плутон"},{"id":"haumea","name":"Хаумеа"},{"id":"makemake","name":"Макемаке"},{"id":"eris","name":"Эрида"}]){if((id==='asteroid')===(d.id==='ceres')){const b=document.createElement('button');b.className='moon-row';b.textContent=d.name+' · открыть систему ↗';b.onclick=()=>dwarfSystem.show(d.id);list.append(b);}}$('#details').append(list);}
function resetCamera(){if(mode==='overview'&&viewingSun){showSun();return;}if(mode==='asteroid'||mode==='kuiper'){setBeltView(mode,'wide');return;}if(mode==='dwarf'){dwarfSystem.reset();return;}moonDetail.release();if(mode==='catalog'){fly(new THREE.Vector3(0,catalogViewRadius*1.4,catalogViewRadius*4.8));return;}if(mode==='planet'){releaseMoonIllustration(moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon));controls.minDistance=4;selectedMoon=null;if($('#moon-card'))$('#moon-card').innerHTML='';title(`0${PLANETS.indexOf(selectedPlanet)+1} / ПЛАНЕТЫ СОЛНЕЧНОЙ СИСТЕМЫ`,selectedPlanet.name,'Мир и его спутники. Выберите объект, чтобы узнать больше.','В СИСТЕМЕ ПЛАНЕТЫ');fly(planetViewPosition(selectedPlanet.id));document.querySelectorAll('.moon-row').forEach(b=>b.classList.remove('selected'));mountSeasons();applySeason();}else{fly(mode==='asteroid'?new THREE.Vector3(0,75,95):overviewPosition());}}

function showCatalogBody(entry){dwarfSystem?.hide();
 mode='catalog';selectedPlanet=null;selectedMoon=null;overviewGroup.visible=false;disposeFocus();focusGroup.visible=true;follow=null;controls.minDistance=3.5;seasonLight.position.copy(lightDirection);
 const entryName=entry.officialName||entry.key||entry.name;
 const measure=moonMeasure(entryName,entry.key);const physicalRadius=measure?.radiusKm>0?measure.radiusKm/1000:2.8;catalogViewRadius=physicalRadius;const mapped=entry.officialName==='Charon';const mapMeta=MOON_MAPS[entryName];const shape=moonShapeGeometry(entryName,1/1000);const body=new THREE.Mesh(shape??new THREE.SphereGeometry(physicalRadius,96,64),new THREE.MeshStandardMaterial({map:mapped?texture('charon-hd'):mapMeta?texture(mapMeta.texture):null,color:mapped?0xffffff:0x8e939a,roughness:1}));if(mapped)partialCoverage(body.material);else if(mapMeta?.partial)partialCoverage(body.material);if(!shape&&measure?.semiaxesKm)body.scale.set(...measure.semiaxesKm.map(axis=>axis/measure.radiusKm));if(entry.confirmed!==false&&!mapped&&!mapMeta&&!shape)applyMoonIllustration(body,{key:entry.key||entryName,radius:physicalRadius,radiusKm:measure?.radiusKm,illustrative:!realScale,measuredShape:!!measure?.semiaxesKm});focusGroup.add(body);installInspectionLight(focusGroup,inspectionLight);pickables=[];
 title('СПУТНИК · '+entry.parent,entry.name,body.userData.illustrativeSurface?'Иллюстрация поверхности · фотокарта не подключена':(mapped||mapMeta?'Данные о поверхности · карта миссии':'Каталожная модель'),'КАТАЛОГ · '+(entry.confirmed?'ПОДТВЕРЖДЁН':'КАНДИДАТ'));
 $('#details').innerHTML='<div class="latin">КАТАЛОЖНАЯ ЗАПИСЬ</div><h2>'+escape(entry.name)+'</h2>'+satelliteProfile(entry,{measure,orbit:orbitalData[String(entryName).replace(/\s+/g,'')],description:MOON_DETAILS[entryName]?.text})+(moonIllustrationCaption(body)||(mapped?'<div class="map-provenance"></div>':baseMapCaption(entryName)))+'<p class="fine">Реальное фото поверхности в этой записи пока не подключено.</p>';
 if(mapped){$('#details').querySelector('.map-provenance').outerHTML='<div class="map-provenance"><strong>Харон · карта New Horizons / USGS · 8192×4096</strong><p>Реальная монохромная мозаика. Пустые области не заполнены выдуманным рельефом. Видимый размер в отдельном просмотре условный.</p></div>';$('#scene-subtitle').textContent='Карта New Horizons · неполное покрытие';}const photo=missionPhoto(entry.officialName||entry.key||entry.name);if(photo){$('#details').querySelector('p.fine:last-child')?.remove();$('#details').insertAdjacentHTML('beforeend',photo);}$('#details').insertAdjacentHTML('beforeend','<p class="measured-size">'+(measure?.radiusKm?'Радиус: '+fmt(measure.radiusKm)+' км. Камера приближена для осмотра; масштаб модели 1000 км/единицу.':'Размер неизвестен; нейтральная схема не является моделью измеренного размера.')+'</p>');$('#details').scrollTop=0;controls.minDistance=Math.max(.00001,physicalRadius*1.6);fly(new THREE.Vector3(0,physicalRadius*1.4,physicalRadius*4.8));
}

function updateMoons(){moonObjects.forEach(obj=>{const d=obj.userData,a=d.phase+simDays*d.speed*.12;obj.position.set(Math.cos(a)*d.orbit,Math.sin(a)*d.orbit*Math.sin(d.inc),Math.sin(a)*d.orbit*Math.cos(d.inc));});}
function syncMoonsVisibility(){if(mode==='dwarf'){dwarfSystem.setMoonsVisible(state.moons);return;}if(moonGroup)moonGroup.visible=state.moons;pickables=mode==='planet'?[focusPlanet,...(state.moons?moonObjects:[])]:[...planetObjects,overviewGroup.userData.sun];if(!state.moons&&selectedMoon)resetCamera();}
function setPaused(value){paused=value;$('#pause').textContent=value?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',value?'Продолжить движение':'Приостановить движение');$('#pause').title=value?'Продолжить · Пробел':'Пауза · Пробел';}
function render(now){requestAnimationFrame(render);const delta=Math.min((now-previousTime)/1000,.05);previousTime=now;if(missionScene){missionScene.draw(delta);return;}if(!paused){simDays+=delta*speed;const visualDelta=delta*Math.sqrt(speed);planetObjects.forEach(body=>{body.userData.mesh.rotation.y+=visualDelta*.09;});if(focusPlanet&&mode==='planet'){focusPlanet.userData.mesh.rotation.y+=visualDelta*.045*(selectedPlanet.id==='venus'||selectedPlanet.id==='uranus'?-1:1);if(focusPlanet.userData.clouds)focusPlanet.userData.clouds.rotation.y+=visualDelta*.052;}overviewGroup.userData.sun.rotation.y+=visualDelta*.02;}
 planetObjects.forEach(body=>{const d=body.userData,p=d.planet,a=d.phase+simDays/p.period*Math.PI*2;const orbit=realScale?planetKm[PLANETS.indexOf(p)]/overviewUnitKm:p.orbit;body.position.set(Math.cos(a)*orbit,0,Math.sin(a)*orbit);});if(mode==='planet')updateMoons();if(mode==='dwarf')dwarfSystem.update(simDays);if(overviewGroup.visible&&frame%3===0){const {asteroid,kuiper}=overviewGroup.userData.belts;for(const [id,belt] of Object.entries({asteroid,kuiper}))if(belt.visible)belt.userData.update(simDays,mode===id&&follow===belt.userData.inspectTarget);}
 if(transition){if(follow){const move=follow.position.clone().sub(previousFollow);transition.to.add(move);transition.targetTo.add(move);}const t=Math.min((now-transition.start)/1100,1),e=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);if(t===1)transition=null;}else if(follow){const move=follow.position.clone().sub(previousFollow);camera.position.add(move);controls.target.add(move);}if(follow)previousFollow.copy(follow.position);controls.autoRotate=autoOrbit&&!transition;controls.autoRotateSpeed=.35;controls.update();const near=inspectionNear(camera.position.distanceTo(controls.target));renderDepthRange(renderer,scene,camera,near,ATLAS_FAR,{ratioLimit:ATLAS_DEPTH_RATIO});
 if(frame++%2===0){const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight;labels.forEach(({object,el})=>{let visible=state.labels&&!cinematic;if(mode==='overview'&&viewingSun&&object!==overviewGroup.userData.sun)visible=false;if(mode==='planet'&&object!==focusPlanet&&!state.moons)visible=false;object.getWorldPosition(temp);if(mode==='planet'&&object!==focusPlanet){const toward=temp.clone().sub(camera.position);const t=-camera.position.dot(toward)/toward.lengthSq();if(t>0&&t<1&&camera.position.clone().addScaledVector(toward,t).length()<3.3)visible=false;}const dist=temp.distanceTo(camera.position);temp.project(camera);if(temp.z>1||temp.z< -1||Math.abs(temp.x)>1.1||Math.abs(temp.y)>1.1)visible=false;if(follow&&object!==follow&&dist<2)visible=false;el.style.display=visible?'block':'none';if(visible){el.style.left=(temp.x*.5+.5)*w+'px';el.style.top=(-temp.y*.5+.5)*h+Math.max(18,object.userData.radius?object.userData.radius/dist*h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))+12:18)+'px';}});}
}
function bindUI(){
 $('#illuminate').onclick=()=>{inspectionLight.value=inspectionLight.value?0:1;$('#illuminate').setAttribute('aria-pressed',String(!!inspectionLight.value));$('#illuminate').textContent=inspectionLight.value?'◐ Обычный свет':'☀ Осветить';toast(inspectionLight.value?'Равномерная подсветка для осмотра':'Восстановлено сезонное освещение');syncSeasonLightNotice();};

 $('#scale-mode').textContent=realScale?'Масштаб: реальный':'Масштаб: наглядный';
 $('#scale-mode').onclick=()=>{realScale=!realScale;location.hash=realScale?'real':'illustrative';location.reload();};

 $('#cinema').onclick=()=>{cinematic=!cinematic;document.body.classList.toggle('cinematic',cinematic);$('#cinema').setAttribute('aria-pressed',String(cinematic));};
 $('#auto-orbit').onclick=()=>{autoOrbit=!autoOrbit;$('#auto-orbit').setAttribute('aria-pressed',String(autoOrbit));};
 $('#zoom-in').onclick=()=>zoomCamera(.78);$('#zoom-out').onclick=()=>zoomCamera(1.28);
 $('#previous-planet').onclick=()=>stepPlanet(-1);$('#next-planet').onclick=()=>stepPlanet(1);
$('#planet-nav').innerHTML=PLANETS.map((p,i)=>`<button class="planet-button" data-planet="${p.id}"><span class="planet-thumbnail" aria-hidden="true"><span class="planet-mini" ${mini(p.texture)}></span></span><span>${p.name}</span><span class="planet-number">0${i+1}</span></button>`).join('');document.querySelectorAll('.planet-button').forEach(b=>b.onclick=()=>showPlanet(b.dataset.planet));document.querySelectorAll('.belt-button[data-belt]').forEach(b=>b.onclick=()=>showBelt(b.dataset.belt));$('#brand').onclick=()=>showOverview();$('#overview').onclick=()=>showOverview();$('#explore').onclick=()=>showOverview();$('#reset-camera').onclick=resetCamera;$('#top-view').onclick=()=>{if(mode==='asteroid'||mode==='kuiper'){setBeltView(mode,'top');return;}if(mode==='dwarf'){dwarfSystem.top();return;}const target=follow?follow.position.clone():new THREE.Vector3();const d=['planet','dwarf'].includes(mode)?(selectedMoon?Math.max(1.2,follow.userData.radius*7):32):mode==='asteroid'?112:(realScale?1100:290);fly(target.clone().add(new THREE.Vector3(0,d,.01)),target);};$('#pause').onclick=()=>setPaused(!paused);const speedSlider=$('#speed');
 speedSlider.max=String(clockSpeeds.length-1);
 speedSlider.oninput=()=>{
  speed=clockSpeeds[Number(speedSlider.value)];
  const label=fmt(speed)+'×';
  $('#speed-label').textContent=label;
  speedSlider.setAttribute('aria-valuetext',label);
 };
 speedSlider.oninput();$('#show-orbits').onchange=e=>{state.orbits=e.target.checked;document.body.classList.toggle('orbits-hidden',!state.orbits);orbitLines.forEach(l=>l.visible=state.orbits);dwarfSystem.setOrbitsVisible(state.orbits);};$('#show-labels').onchange=e=>{state.labels=e.target.checked;};$('#show-moons').onchange=e=>{state.moons=e.target.checked;syncMoonsVisibility();if(!['planet','dwarf'].includes(mode))toast('Спутники видны при выборе планеты');};const dialog=$('#about-dialog');$('#about').onclick=()=>dialog.showModal();$('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Полный экран недоступен в этом окне');}};document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||dialog.open)return;if(missionScene){if(e.code==='Space'&&!e.target.matches('button,select')){e.preventDefault();setPaused(!paused);}return;}if(e.code==='Space'){e.preventDefault();setPaused(!paused);}if(e.key==='Escape'){if(cinematic){cinematic=false;document.body.classList.remove('cinematic');$('#cinema').setAttribute('aria-pressed','false');}else showOverview();}if(e.key==='ArrowRight')stepPlanet(1);if(e.key==='ArrowLeft')stepPlanet(-1);});}
function zoomCamera(factor){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);}
function stepPlanet(direction){const i=selectedPlanet?PLANETS.indexOf(selectedPlanet):(direction>0?-1:0);showPlanet(PLANETS[(i+direction+8)%8].id);}

function addScaleNote(){installInspectionLight(focusGroup,inspectionLight);
 $('#distance-note')?.remove();const p=document.createElement('p');p.id='distance-note';p.className='distance-note';
 const obj=selectedMoon?moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon):null;
 p.textContent=realScale?'Реальный масштаб: размеры планеты и известных спутников согласованы с расстояниями. '+(obj?.userData.aKm?'Средний радиус орбиты: '+fmt(obj.userData.aKm)+' км от центра планеты. ':'')+'Круговые орбиты показывают средние радиусы JPL, а не текущие положения; ориентация орбит схематична. Спутники без орбитальных данных доступны в каталоге, но не размещены произвольно. Неизвестные размеры обозначены условными точками.':'Наглядные расстояния: орбиты раздвинуты. Известные размеры спутников сохранены относительно среднего радиуса планеты; неизвестные размеры обозначены точками.';
 const info=document.createElement('details');info.id='distance-note';p.removeAttribute('id');info.className='source-details';const summary=document.createElement('summary');summary.textContent='О масштабе и орбитах';info.append(summary,p);(selectedMoon?$('#moon-card'):$('#details')).append(info);
}

function missionPhoto(key){const photo=MISSION_PHOTOS[key];return photo?'<figure class="mission-photo"><img src="./photos/'+photo.file+'" alt="Реальный снимок '+escape(key)+'" loading="lazy"><figcaption>'+escape(photo.note)+' · '+escape(photo.credit)+'</figcaption></figure>':'';}
function mapCaption(key){const shape=hasCassiniMoonShape(key)?`<p class="fine">Объёмная форма по снимкам Cassini ISS · Thomas et al. (2018). </p>`:Object.hasOwn(MARS_MOON_AXES_KM,key)?`<p class="fine">${hasMoonShape(key)?'Объёмная форма по снимкам космических аппаратов · Ernst et al. (2023).':'Форма приближена трёхосным эллипсоидом по измерениям.'} </p>`:'';return shape+'<details class="source-details"><summary>О фотокарте</summary>'+baseMapCaption(key)+'</details>'+missionPhoto(key);}
function baseMapCaption(key){
 const meta=MOON_MAPS[key];
 const inspected=moonObjects.find(o=>moonKey(o.userData.moon)===key);
 const illustration=moonIllustrationCaption(inspected);
 if(illustration)return illustration;
 if(!meta)return '<div class="map-provenance missing"><strong>Реальная карта не подключена</strong><p>В проверенных коллекциях подходящая фотомозаика не найдена или не получена. Показана нейтральная модель без выдуманных кратеров. Это не доказательство отсутствия любых снимков спутника.</p></div>';
 const obj=moonObjects.find(o=>moonKey(o.userData.moon)===key);
 return '<div class="map-provenance">'+(meta.resolution?'<div class="map-quality" id="map-quality">'+(meta.infrared?'Инфракрасная карта · ':'Подробная карта · ')+meta.resolution+' px</div>':'<div class="map-quality limited">Ограниченная детализация исходной карты</div>')+'<strong>'+ (meta.infrared?'Доступна инфракрасная карта':'Карта по данным космической миссии')+'</strong><p>'+escape(meta.mission)+' · '+escape(meta.credit)+'. '+(meta.mono?'Монохромная мозаика. ':'')+(meta.note||'Обработанная фотомозаика; разрешение неодинаково, освещение и цвета в 3D приблизительные.')+(meta.partial?' Незаснятые области не содержат наблюдений. Если включено заполнение цветом, оно является только иллюстрацией. Для спутников Урана и Тритона начальный ракурс направлен на заснятое южное полушарие. Пустые области не являются деталями поверхности.':'')+'</p>'+'</div>';
}

function addPoleLabels(){
 const r=focusPlanet.userData.radius;
 focusPlanet.userData.poleLabels=[1,-1].map((sign,i)=>{const point=new THREE.Object3D();point.position.set(0,sign*r*1.14,0);focusPlanet.userData.tilt.add(point);return addLabel(point,i?'Ю':'С',()=>{},'pole-label');});
}
function syncSeasonLightNotice(){const warning=$('#season-light-notice');if(warning)warning.hidden=!inspectionLight.value;}
function mountSeasons(){
 $('#season-panel')?.remove();
 if(mode!=='planet'||!selectedPlanet)return;
 const panel=document.createElement('section');panel.id='season-panel';panel.className='season-panel';panel.setAttribute('aria-label','Сезонные облики');
 panel.innerHTML='<details class="season-explanation"><summary>О сезонных изменениях</summary><div class="season-status" id="season-status"></div><div class="season-hemispheres" id="season-hemispheres"></div><div id="season-light-notice" class="season-light-notice" hidden><p>«Осветить» скрывает смену солнечного освещения.</p><button id="restore-season-light">Вернуть солнечное освещение</button></div><p id="season-note" class="season-note"></p></details>';
 const host=selectedMoon?$('#moon-card'):$('#details');
 if(selectedMoon)host.append(panel);else{const anchor=$('#details .description');host.insertBefore(panel,anchor);}
 syncSeasonLightNotice();$('#restore-season-light').onclick=()=>{if(inspectionLight.value)$('#illuminate').click();};$('#season-hemisphere').value=seasonHemisphere;$('#season-day').onclick=viewSeasonDay;

 $('#season-hemisphere').onchange=e=>{seasonHemisphere=e.target.value;applySeason();};
}
function viewSeasonDay(){
 if(mode!=='planet')return;
 const body=selectedMoon?moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon):null;
 const target=body?body.position.clone():new THREE.Vector3();
 const distance=body?Math.max(.025,body.userData.radius*4.4):18;
 const offset=seasonLight.position.clone().normalize().multiplyScalar(distance);offset.y+=distance*.32;
 fly(target.clone().add(offset),target);
 if(body){follow=body;previousFollow.copy(body.position);}
}
function applySeason(){
 if(mode!=='planet'||!selectedPlanet)return;
 const p=selectedPlanet,selection=resolveSeason(seasonIndex,seasonHemisphere),physicalIndex=selection.north;
 const solarLongitude=[0,90,180,270][physicalIndex];
 const angle=[Math.PI/2,0,-Math.PI/2,Math.PI][physicalIndex];
 // Light stays in the orbital plane; the planet's spin axis remains fixed.
 seasonLight.position.set(-Math.cos(angle)*55,0,Math.sin(angle)*55);
 scene.traverse(o=>{if(o.material?.uniforms?.sunDirection)o.material.uniforms.sunDirection.value.copy(seasonLight.position).normalize();});
 if(p.id==='earth'){
  const map=texture('earth_'+SEASONS[physicalIndex].id+'?v=midseason');
  focusPlanet.userData.mesh.material.map=map;
  focusPlanet.userData.mesh.material.needsUpdate=true;if(focusPlanet.userData.clouds)focusPlanet.userData.clouds.visible=seasonClouds;
 }
 if(p.id==='uranus'){const haze=focusPlanet.userData.seasonHaze;const contrast=Math.sin(physicalIndex*Math.PI/2);haze.north.value=.18+.17*contrast;haze.south.value=.18-.17*contrast;}
 if(p.id==='mars'){
  const cap=focusPlanet.userData.seasonCaps,summer=Math.sin(THREE.MathUtils.degToRad(solarLongitude));
  cap.north.value=.9+summer*.055;cap.south.value=.9-summer*.055;
 }
 const panel=$('#season-panel');if(!panel)return;
 panel.querySelectorAll('[data-season]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.season===seasonIndex)));
 let note=SEASON_NOTES[p.id],status=SEASONS[seasonIndex].event+' · '+(seasonHemisphere==='north'?'север':'юг');
 if(p.id==='mercury')status='Положение в году · наклон оси почти нулевой';
 if(p.id==='venus')status='Положение в году · заметных сезонов нет';
 if(p.id==='earth'){status=selection.month+' 2004 · месячная мозаика';;}
 if(selectedMoon){
  if(selectedMoon==='Titan'){
   note='Титан разделяет сезонный цикл Сатурна. Один сезон длится около 7,5 земных лет. Здесь показаны четыре положения в году Сатурна и модель освещения; четыре достоверные сезонные карты дымки не используются.';
  }else if(selectedMoon==='Moon'){
   note='У Луны наклон оси относительно плоскости орбиты вокруг Солнца мал: земной смены снежных и зелёных сезонов здесь нет. Переключатель обозначает сезон Земли и меняет направление солнечного света в сцене. Геометрия лунных сезонов и лунных фаз не рассчитана.';
  }else{
   note='Для этого спутника нет набора четырёх сезонных карт в атласе. Показан выбранный сезон родительской планеты и условное освещение спутника. Его собственные наклон оси, прецессия, затмения и сезонный климат не реконструируются; поверхность сохраняется.';
  }
  status='Год планеты '+p.name+' · '+SEASONS[seasonIndex].name.toLowerCase();
 }
 $('#season-status').textContent=status;$('#season-hemispheres').textContent='Север: '+SEASON_NAMES[selection.north].toLowerCase()+' · Юг: '+SEASON_NAMES[selection.south].toLowerCase();if(focusPlanet.userData.poleLabels){focusPlanet.userData.poleLabels[0].textContent='С · '+SEASON_NAMES[selection.north].toLowerCase();focusPlanet.userData.poleLabels[1].textContent='Ю · '+SEASON_NAMES[selection.south].toLowerCase();}
 if(!selectedMoon&&['mercury','venus'].includes(p.id))$('#season-hemispheres').textContent='Условные подписи четырёх положений в году';
 $('#season-note').textContent=note;
}

async function start(){try{const shapesReady=loadMoonShapes();realScale=location.hash!=='#illustrative';moonSizes=await fetch('./moon-sizes.json').then(r=>r.json());orbitalData=(await (await fetch('./orbit-distances.json')).json()).elements;const response=await fetch('./moons-catalog.json');if(!response.ok)throw new Error('Не удалось загрузить каталог спутников');catalog=await response.json();await shapesReady;initScene();dwarfSystem=createDwarfSystem({scene,camera,controls,details:$('#details'),fly,title,texture,photo:missionPhoto,catalog:showCatalogBody,measure:moonMeasure,installLight:root=>installInspectionLight(root,inspectionLight),enter:id=>{mode='dwarf';setSelected(id);pickables=[];seasonLight.position.copy(lightDirection);selectedPlanet=null;selectedMoon=null;overviewGroup.visible=false;focusGroup.visible=false;disposeFocus();follow=null;}});await dwarfSystem.mount();bindUI();mountQuickTools();connectMissionAtlas({
 renderer,stage:$('#stage'),texture,planets:PLANETS,
 createEarth:radius=>makePlanet(PLANETS.find(planet=>planet.id==='earth'),radius),
 pause(value){setPaused(value);},get paused(){return paused;},
 get speed(){return speed;},get speedIndex(){return Number($('#speed').value);},speeds:clockSpeeds,
 setSpeed(index){const slider=$('#speed');slider.value=index;slider.dispatchEvent(new Event('input'));},
 mount(view){controls.enabled=false;missionScene=view;document.body.classList.add('voyager-flight');},
 unmount(view){if(missionScene!==view)return;missionScene=null;controls.enabled=true;document.body.classList.remove('voyager-flight');}
 });mountFullCatalog(entry=>{if(entry.planet){showPlanet(entry.planet);selectMoon(entry.key);}else showCatalogBody(entry);});showOverview(true);if(reducedMotion)setPaused(true);$('#catalog-total').textContent=Object.values(catalog.planets).flat().length;$('#loading').hidden=true;requestAnimationFrame(render);}catch(error){console.error(error);$('#loading').innerHTML=`<p>Не удалось открыть 3D-модель.</p><p class="fine">${escape(error.message)}</p><button class="cta" onclick="location.reload()">Попробовать снова</button>`;}}
start();

function mountQuickTools(){
 const dock=document.createElement('div');dock.className='quick-tools';dock.setAttribute('aria-label','Управление осмотром');
 const seasons=document.createElement('select');seasons.id='quick-season';seasons.setAttribute('aria-label','Время года');
 seasons.innerHTML=SEASONS.map((s,i)=>'<option value="'+i+'">'+s.icon+' '+s.name+'</option>').join('');
 seasons.onchange=()=>{seasonIndex=+seasons.value;applySeason();};
 const extra=document.createElement('div');extra.className='season-tools';extra.innerHTML='<select id="season-hemisphere" aria-label="Полушарие сезона"><option value="north">Северное полушарие</option><option value="south">Южное полушарие</option></select><button class="season-day" id="season-day" title="Повернуть камеру к дневной стороне">☀ Дневная сторона</button><label class="clouds-option"><input type="checkbox" id="season-clouds" checked>Облака</label>';extra.querySelector('#season-hemisphere').onchange=e=>{seasonHemisphere=e.target.value;applySeason();};extra.querySelector('#season-day').onclick=viewSeasonDay;extra.querySelector('#season-clouds').onchange=e=>{seasonClouds=e.target.checked;const earth=planetObjects.find(body=>body.userData.planet.id==='earth');if(earth?.userData.clouds)earth.userData.clouds.visible=seasonClouds;applySeason();};
 const surface=document.createElement('button');surface.id='show-surface';surface.className='surface-button';surface.hidden=true;surface.onclick=toggleCurrentSurface;dock.append($('#scale-mode'),$('#illuminate'),surface,seasons,extra,$('.view-tools'),$('.time-controls'),$('.toggles'));$('#stage').append(dock);
 const observer=new MutationObserver(()=>{seasons.hidden=mode!=='planet';extra.hidden=mode!=='planet';extra.querySelector('.clouds-option').hidden=selectedPlanet?.id!=='earth'||!!selectedMoon;seasons.value=String(seasonIndex);updateSurfaceToolbar();});
 observer.observe($('#scene-title'),{childList:true,subtree:true});observer.observe($('#details'),{childList:true,subtree:true});seasons.hidden=mode!=='planet';extra.hidden=mode!=='planet';
}

function currentSurface(){if(mode!=='planet')return null;const id=selectedMoon||selectedPlanet?.id;if(!SURFACE_VIEWS[id])return null;const body=selectedMoon?moonObjects.find(o=>moonKey(o.userData.moon)===id):focusPlanet;return body?{id,body}:null;}
function updateSurfaceToolbar(){const button=$('#show-surface');if(!button)return;const current=currentSurface();button.hidden=!current;button.setAttribute('aria-pressed',String(!!current?.body.userData.surfaceVisible));button.textContent=current?.body.userData.surfaceVisible?'☁ Вернуть атмосферу':'◉ Показать поверхность';}
function toggleCurrentSurface(){const current=currentSurface();if(!current)return;applySurfaceView(current.body,current.id,!current.body.userData.surfaceVisible,texture);updateSurfaceToolbar();const card=$('#surface-card-button');if(card){card.textContent=current.body.userData.surfaceVisible?'Вернуть атмосферу':'Показать поверхность';card.setAttribute('aria-pressed',String(current.body.userData.surfaceVisible));}toast(current.body.userData.surfaceVisible?SURFACE_VIEWS[current.id].title:'Атмосферный облик восстановлен');}
function mountSurfacePanel(id){const config=SURFACE_VIEWS[id];if(!config)return;const host=selectedMoon?$('#moon-card'):$('#details');const panel=document.createElement('details');panel.className='source-details';panel.innerHTML='<summary>О карте поверхности</summary><p class="fine">'+config.note+'</p>'+(id==='Titan'?'':'');host.append(panel);updateSurfaceToolbar();}
