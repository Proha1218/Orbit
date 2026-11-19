import {readFileSync,writeFileSync} from 'node:fs';
let s=readFileSync('dist/app.js','utf8');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing: '+a.slice(0,80));s=s.replace(a,b);};
replace("import { PLANETS, MOON_DETAILS, BELTS } from './data.js';","import { PLANETS, MOON_DETAILS, BELTS } from './data.js';\nimport {atmosphere,saturnRings,moonRelief} from './visuals.js';\nconst lightDirection=new THREE.Vector3(-30,22,40);\nlet cinematic=false,autoOrbit=false;\nlet beltAnchors=[];");
replace('line.rotation.z=inclination','line.rotation.x=-inclination');
replace('new THREE.SphereGeometry(radius,64,40)','new THREE.SphereGeometry(radius,96,64)');
replace('tilt.add(mesh);group.userData','mesh.castShadow=true;mesh.receiveShadow=true;tilt.add(mesh);group.userData');
const earthStart=s.indexOf(" if(p.id==='earth')");const ringStart=s.indexOf(" if(['jupiter'",earthStart);
s=s.slice(0,earthStart)+` if(p.id==='earth'){const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.009,64,40),new THREE.MeshStandardMaterial({map:texture('earth_clouds'),alphaMap:texture('earth_clouds'),transparent:true,opacity:.58,depthWrite:false}));tilt.add(clouds);group.userData.clouds=clouds;}
 const airColors={earth:0x418dff,venus:0xefbf80,mars:0xbb795a,uranus:0x83cbd5,neptune:0x457cdb};
 if(airColors[p.id])group.add(atmosphere(radius,airColors[p.id],lightDirection));
 if(p.id==='saturn')tilt.add(saturnRings(radius));
`+s.slice(ringStart);
replace("if(['jupiter','saturn','uranus','neptune'].includes(p.id))","if(['jupiter','uranus','neptune'].includes(p.id))");
replace('size:1.2,sizeAttenuation:true','size:1.15,sizeAttenuation:false');
replace('renderer.toneMappingExposure=1.5','renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap');
replace('scene.add(new THREE.AmbientLight(0xb0c4e6,1.25))','scene.add(new THREE.AmbientLight(0x9eafc8,.24))');
replace('new THREE.DirectionalLight(0xffefdd,2.5)','new THREE.DirectionalLight(0xffefdd,3.4)');
replace('key.position.set(-30,40,50);scene.add(key)','key.position.copy(lightDirection);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-35;key.shadow.camera.right=35;key.shadow.camera.top=35;key.shadow.camera.bottom=-35;key.shadow.camera.near=1;key.shadow.camera.far=150;key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key)');
replace('new THREE.PointLight(0xffc98b,100,200,1)','new THREE.PointLight(0xffdfb0,75,250,1)');
replace("const a=new THREE.Object3D();a.position", "beltAnchors.forEach(a=>overviewGroup.remove(a));beltAnchors=[];const a=new THREE.Object3D();a.position");
replace("overviewGroup.add(k);addLabel", "overviewGroup.add(k);beltAnchors.push(a,k);addLabel");
replace("const radius=info?.radius||(important?.24:.065);const orbit=important?6.8+i*1.55", "const radius=info?.radius||(important?.24:.065);const orbit=important?(id==='saturn'?9:6.8)+i*1.55");
replace("map:info?.texture?texture(info.texture):null,color:info?.color||0xa5a5a4,roughness:1", "map:info?.texture?texture(info.texture):moonRelief(key,['Enceladus','Europa','Tethys','Rhea'].includes(key)),bumpMap:info?.texture?texture(info.texture):moonRelief(key),bumpScale:radius*.045,color:info?.color||0xc8c5be,roughness:1");
replace('body.userData={moon:m','body.castShadow=true;body.receiveShadow=true;if([\'Phobos\',\'Deimos\',\'Proteus\',\'Amalthea\'].includes(key))body.scale.set(1.3,.82,.95);body.userData={moon:m');
replace('important?24:10,important?16:8','important?48:16,important?32:12');
s=s.replaceAll('new THREE.Vector3(0,13,25)','new THREE.Vector3(0,6.5,18)');
replace("controls.minDistance=4;selectedMoon=null;title", "controls.minDistance=4;selectedMoon=null;if($('#moon-card'))$('#moon-card').innerHTML='';title");
replace('if(focusPlanet)focusPlanet.userData.mesh.rotation.y+=delta*.06;',"if(focusPlanet&&mode==='planet'){focusPlanet.userData.mesh.rotation.y+=delta*.045*(selectedPlanet.id==='venus'||selectedPlanet.id==='uranus'?-1:1);if(focusPlanet.userData.clouds)focusPlanet.userData.clouds.rotation.y+=delta*.052;}");
replace('controls.update();renderer.render(scene,camera);','controls.autoRotate=autoOrbit&&!transition;controls.autoRotateSpeed=.35;controls.update();renderer.render(scene,camera);');
replace('let visible=state.labels;','let visible=state.labels&&!cinematic;');
replace("el.style.left=(temp.x*.5+.5)*w+'px';el.style.top=(-temp.y*.5+.5)*h+19+'px';", "el.style.left=(temp.x*.5+.5)*w+'px';el.style.top=(-temp.y*.5+.5)*h+Math.max(18,object.userData.radius?object.userData.radius/dist*h*.65:18)+'px';");
replace("function bindUI(){",`function bindUI(){
 $('#cinema').onclick=()=>{cinematic=!cinematic;document.body.classList.toggle('cinematic',cinematic);$('#cinema').setAttribute('aria-pressed',String(cinematic));};
 $('#auto-orbit').onclick=()=>{autoOrbit=!autoOrbit;$('#auto-orbit').setAttribute('aria-pressed',String(autoOrbit));};
 $('#zoom-in').onclick=()=>zoomCamera(.78);$('#zoom-out').onclick=()=>zoomCamera(1.28);
 $('#previous-planet').onclick=()=>stepPlanet(-1);$('#next-planet').onclick=()=>stepPlanet(1);
`);
replace("if(e.key==='Escape')showOverview();", "if(e.key==='Escape'){if(cinematic){cinematic=false;document.body.classList.remove('cinematic');$('#cinema').setAttribute('aria-pressed','false');}else showOverview();}if(e.key==='ArrowRight')stepPlanet(1);if(e.key==='ArrowLeft')stepPlanet(-1);");
replace('async function start(){',`function zoomCamera(factor){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);}
function stepPlanet(direction){const i=selectedPlanet?PLANETS.indexOf(selectedPlanet):(direction>0?-1:0);showPlanet(PLANETS[(i+direction+8)%8].id);}
async function start(){`);
writeFileSync('dist/app.js',s);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('<div class="view-tools">','<div class="view-tools"><button id="zoom-in" title="Приблизить" aria-label="Приблизить">+</button><button id="zoom-out" title="Отдалить" aria-label="Отдалить">−</button><button id="auto-orbit" title="Плавный облёт" aria-label="Плавный облёт" aria-pressed="false">↻</button><button id="cinema" title="Кинорежим · Escape для выхода" aria-label="Кинорежим" aria-pressed="false">▣</button>');
h=h.replace('<div class="scene-badge">','<div class="planet-stepper"><button id="previous-planet" aria-label="Предыдущая планета">←</button><span>ИССЛЕДОВАТЬ МИРЫ</span><button id="next-planet" aria-label="Следующая планета">→</button></div><div class="scene-badge">');
h=h.replace('Текстуры спутников, кроме Луны, иллюстративные.','Текстуры спутников, кроме Луны, созданы процедурно и иллюстративны. Кинорежим скрывает панели; Escape возвращает интерфейс. Стрелки влево и вправо переключают планеты.');
writeFileSync('dist/index.html',h);
