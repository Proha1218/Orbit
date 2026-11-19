import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('../research/elements.html','utf8'),elements={};
for(const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
 const cells=[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim());
 if(cells.length<14)continue;
 const a=Number(cells[7]),period=Number(cells[13]);
 if(a>0&&cells[2])elements[cells[2].replace(/\s+/g,'') ]={a,period};
}
if(!elements.Phobos||!elements.Titan)throw Error('JPL element parsing failed');
writeFileSync('dist/orbit-distances.json',JSON.stringify({source:'https://ssd.jpl.nasa.gov/sats/elem/',elements},null,2));
let s=readFileSync('dist/app.js','utf8');
s=s.replace("let seasonLight,seasonIndex=0,seasonHemisphere='north';","let seasonLight,seasonIndex=0,seasonHemisphere='north';\nlet realScale=true,orbitalData={};\nconst planetKm=[57900000,108200000,149600000,228000000,778500000,1432000000,2867000000,4515000000];\nconst overviewUnitKm=15000000;\nlet focusKmPerUnit=1;");
s=s.replace('applySeason();viewSeasonDay();','applySeason();');
s=s.replace("const response=await fetch('./moons-catalog.json');", "orbitalData=(await (await fetch('./orbit-distances.json')).json()).elements;const response=await fetch('./moons-catalog.json');");
s=s.replace("const body=makePlanet(p,p.radius);", "const body=makePlanet(p,realScale?Number(p.diameter.replaceAll(' ',''))/2/overviewUnitKm:p.radius);");
s=s.replace('addOrbit(p.orbit,overviewGroup);','addOrbit(realScale?planetKm[i]/overviewUnitKm:p.orbit,overviewGroup);');
s=s.replace('new THREE.SphereGeometry(5.3,64,40)','new THREE.SphereGeometry(realScale?695700/overviewUnitKm:5.3,64,40)');
s=s.replace('glow.scale.set(42,42,1)','glow.scale.setScalar(realScale?.5:42)');
s=s.replace('const asteroid=makeBelt(35,40.5,2700','const asteroid=makeBelt(realScale?21:35,realScale?33:40.5,2700');
s=s.replace('kuiper=makeBelt(108,127,5000','kuiper=makeBelt(realScale?300:108,realScale?500:127,5000');
s=s.replace('controls.maxDistance=420','controls.maxDistance=2000');
s=s.replace('camera.aspect;return new THREE.Vector3(0,aspect<.85?210:165,aspect<.85?255:195)', 'camera.aspect;const factor=realScale?3.7:1;return new THREE.Vector3(0,(aspect<.85?210:165)*factor,(aspect<.85?255:195)*factor)');
s=s.replace('const d=body.userData,p=d.planet,a=d.phase+simDays/p.period*Math.PI*2;body.position.set(Math.cos(a)*p.orbit,0,Math.sin(a)*p.orbit);', 'const d=body.userData,p=d.planet,a=d.phase+simDays/p.period*Math.PI*2;const orbit=realScale?planetKm[PLANETS.indexOf(p)]/overviewUnitKm:p.orbit;body.position.set(Math.cos(a)*orbit,0,Math.sin(a)*orbit);');
s=s.replace("selectedPlanet=p;selectedMoon=null;", "selectedPlanet=p;selectedMoon=null;focusKmPerUnit=Number(p.diameter.replaceAll(' ',''))/2/3.3;");
s=s.replace('const moons=sortedMoons(id);moons.forEach', 'const moons=sortedMoons(id);let outerEdge=id===\'saturn\'?8.3:6.2;moons.forEach');
s=s.replace("const radius=info?.radius||(important?.24:.065);const orbit=important?(id==='saturn'?9:6.8)+i*1.55:17+((i*1.618)%11);", "const element=orbitalData[key.replace(/\\s+/g,'')];const diameter=info?.diameter?Number(info.diameter.replace(/[ ≈]/g,'')):null;const radius=realScale?(diameter?diameter/2/focusKmPerUnit:.012):(info?.radius||(important?.24:.065));const safeRadius=radius*1.4;const orbit=realScale?(element?element.a/focusKmPerUnit:null):outerEdge+safeRadius+.5;outerEdge=(orbit||outerEdge)+safeRadius+.5;if(realScale&&!orbit)return;");
s=s.replace("phase:i*2.399,inc:","aKm:element?.a,marker:realScale&&!diameter,phase:i*2.399,inc:");
s=s.replace("speed:(key==='Triton'?-1:1)*(.36/Math.sqrt(orbit))", "speed:realScale&&element?.period?Math.PI*2/Math.abs(element.period)/.12*(key==='Triton'?-1:1):(key==='Triton'?-1:1)*(.36/Math.sqrt(orbit))");
s=s.replace('camera=new THREE.PerspectiveCamera(43,1,.05,2400)','camera=new THREE.PerspectiveCamera(43,1,.0001,100000)');
s=s.replace('controls.minDistance=Math.max(.18,obj.userData.radius*1.5)','controls.minDistance=Math.max(.0005,obj.userData.radius*1.6)');
s=s.replace('Math.max(1.2,obj.userData.radius*5.8)','Math.max(.025,obj.userData.radius*5.8)');
s=s.replace("function bindUI(){",`function bindUI(){
 $('#scale-mode').textContent=realScale?'Масштаб: реальный':'Масштаб: наглядный';
 $('#scale-mode').onclick=()=>{realScale=!realScale;location.hash=realScale?'real':'illustrative';location.reload();};
`);
s=s.replace("async function start(){try{", "async function start(){try{realScale=location.hash!=='#illustrative';");
s=s.replace("function title(eyebrow,heading,subtitle,badge){", "function title(eyebrow,heading,subtitle,badge){document.body.classList.toggle('real-scale',realScale);");
s=s.replace("$('#details').scrollTop=0;syncMoonsVisibility();mountSeasons();applySeason();}","$('#details').scrollTop=0;syncMoonsVisibility();mountSeasons();applySeason();addScaleNote();}");
s=s.replace("mountSeasons();applySeason();$('#moon-card').scrollIntoView", "mountSeasons();applySeason();addScaleNote();$('#moon-card').scrollIntoView");
s=s.replace('function mountSeasons(){',`function addScaleNote(){
 $('#distance-note')?.remove();const p=document.createElement('p');p.id='distance-note';p.className='distance-note';
 const obj=selectedMoon?moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon):null;
 p.textContent=realScale?'Реальный масштаб: размеры планеты и известных спутников согласованы с расстояниями. '+(obj?.userData.aKm?'Средний радиус орбиты: '+fmt(obj.userData.aKm)+' км от центра планеты. ':'')+'Круговые орбиты показывают средние радиусы JPL, а не текущие положения. Спутники без орбитальных данных доступны в каталоге, но не размещены произвольно. Неизвестные размеры обозначены условными точками.':'Наглядный масштаб: тела увеличены, орбиты разведены с запасом, чтобы тела не пересекались.';
 (selectedMoon?$('#moon-card'):$('#details')).prepend(p);
}
function mountSeasons(){`);
s=s.replace("if(!obj)return;selectedMoon=key;", "if(!obj){toast('Для этого спутника нет орбитальных данных в загруженной таблице JPL');return;}selectedMoon=key;");
// Restore truthful notes; the UI has an explicit mode switch.
s=s.replace('Размеры и расстояния условные','');
writeFileSync('dist/app.js',s);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('<div class="view-tools">','<button id="scale-mode" class="scale-mode">Масштаб: реальный</button><div class="view-tools">');
h=h.replace('Размеры и расстояния условные','Средние орбиты · JPL');
h=h.replace('Радиусы тел и расстояния сжаты по разным шкалам.','В реальном режиме радиусы известных тел и средние орбитальные расстояния согласованы в одной шкале внутри каждого вида. В наглядном режиме тела увеличены и орбиты разведены. Для неизвестных размеров используются условные точки.');
writeFileSync('dist/index.html',h);
let css=readFileSync('dist/style.css','utf8');css+='\n.scale-mode{position:absolute;top:145px;left:30px;font-size:10px;background:#132439e8;border:1px solid #8db8df55;color:#b9daf7;border-radius:5px;padding:8px 11px;z-index:2}.distance-note{font-size:10px;line-height:1.75;color:#a6c5e5;border-left:2px solid #539bd1;padding:8px 11px;background:#539bd10a;margin:0 0 18px}.real-scale .object-label:before{content:"";display:inline-block;width:4px;height:4px;background:#a8cce8;border-radius:50%;margin-right:5px}.cinematic .scale-mode{display:none}@media(max-width:600px){.scale-mode{top:110px;left:20px;font-size:9px;padding:6px 9px}}\n';writeFileSync('dist/style.css',css);
console.log('Orbital data entries:',Object.keys(elements).length);
