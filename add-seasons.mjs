import {readFileSync,writeFileSync} from 'node:fs';
let s=readFileSync('dist/app.js','utf8');
s=s.replace("import {atmosphere,saturnRings,moonRelief} from './visuals.js';","import {atmosphere,saturnRings,moonRelief} from './visuals.js';\nimport {SEASONS,SEASON_NOTES,addMarsSeason} from './seasons.js';\nlet seasonLight,seasonIndex=0,seasonHemisphere='north';");
s=s.replace('group.userData={mesh,tilt,radius,planet:p};','group.userData={mesh,tilt,radius,planet:p};if(p.id===\'mars\')group.userData.seasonCaps=addMarsSeason(mesh.material);');
s=s.replace('const key=new THREE.DirectionalLight','const key=seasonLight=new THREE.DirectionalLight');
s=s.replace("mode='overview';controls.minDistance", "mode='overview';if(seasonLight)seasonLight.position.copy(lightDirection);controls.minDistance");
s=s.replace("$('#details').scrollTop=0;syncMoonsVisibility();}","$('#details').scrollTop=0;syncMoonsVisibility();mountSeasons();applySeason();}");
s=s.replace("$('#moon-card').scrollIntoView({block:'nearest',behavior:reducedMotion?'instant':'smooth'});}","mountSeasons();applySeason();$('#moon-card').scrollIntoView({block:'nearest',behavior:reducedMotion?'instant':'smooth'});}");
s=s.replace("document.querySelectorAll('.moon-row').forEach(b=>b.classList.remove('selected'));}else", "document.querySelectorAll('.moon-row').forEach(b=>b.classList.remove('selected'));mountSeasons();applySeason();}else");
const extra=`
function mountSeasons(){
 $('#season-panel')?.remove();
 if(mode!=='planet'||!selectedPlanet)return;
 const panel=document.createElement('section');panel.id='season-panel';panel.className='season-panel';panel.setAttribute('aria-label','Сезонные облики');
 panel.innerHTML='<div class="season-heading"><h3>Времена года</h3><select id="season-hemisphere" aria-label="Полушарие сезона"><option value="north">Северное полушарие</option><option value="south">Южное полушарие</option></select></div><div class="season-tabs" role="group" aria-label="Выбор времени года">'+SEASONS.map((s,i)=>'<button data-season="'+i+'" aria-pressed="'+(i===seasonIndex)+'"><span>'+s.icon+'</span>'+s.name+'</button>').join('')+'</div><div class="season-status" id="season-status"></div><p id="season-note" class="season-note"></p><a class="source" id="season-source" target="_blank" rel="noreferrer">О сезонных изменениях ↗</a>';
 const host=selectedMoon?$('#moon-card'):$('#details');
 if(selectedMoon)host.prepend(panel);else{const anchor=$('#details .description');host.insertBefore(panel,anchor);}
 $('#season-hemisphere').value=seasonHemisphere;
 panel.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>{seasonIndex=+b.dataset.season;applySeason();});
 $('#season-hemisphere').onchange=e=>{seasonHemisphere=e.target.value;applySeason();};
}
function applySeason(){
 if(mode!=='planet'||!selectedPlanet)return;
 const p=selectedPlanet,physicalIndex=(seasonIndex+(seasonHemisphere==='south'?2:0))%4;
 const solarLongitude=[0,90,180,270][physicalIndex];
 const angle=[Math.PI/2,0,-Math.PI/2,Math.PI][physicalIndex];
 // Light stays in the orbital plane; the planet's spin axis remains fixed.
 seasonLight.position.set(-Math.cos(angle)*55,0,Math.sin(angle)*55);
 scene.traverse(o=>{if(o.material?.uniforms?.sunDirection)o.material.uniforms.sunDirection.value.copy(seasonLight.position).normalize();});
 if(p.id==='earth'){
  const map=texture('earth_'+SEASONS[physicalIndex].id);
  focusPlanet.userData.mesh.material.map=map;
  focusPlanet.userData.mesh.material.needsUpdate=true;
 }
 if(p.id==='mars'){
  const cap=focusPlanet.userData.seasonCaps,summer=Math.sin(THREE.MathUtils.degToRad(solarLongitude));
  cap.north.value=.9+summer*.055;cap.south.value=.9-summer*.055;
 }
 const panel=$('#season-panel');if(!panel)return;
 panel.querySelectorAll('[data-season]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.season===seasonIndex)));
 let note=SEASON_NOTES[p.id],status=SEASONS[seasonIndex].event+' · '+(seasonHemisphere==='north'?'север':'юг');
 let source='https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/';
 if(p.id==='earth'){status+=' · '+['март','июнь','сентябрь','декабрь'][physicalIndex]+' 2004';source='https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/';}
 if(selectedMoon){
  if(selectedMoon==='Titan'){
   note='Титан разделяет сезонный цикл Сатурна. Один сезон длится около 7,5 земных лет. Здесь показаны четыре положения в году Сатурна и модель освещения; четыре достоверные сезонные карты дымки не используются.';
   source='https://science.nasa.gov/mission/cassini/science/titan/';
  }else if(selectedMoon==='Moon'){
   note='У Луны наклон оси относительно плоскости орбиты вокруг Солнца мал: земной смены снежных и зелёных сезонов здесь нет. Переключатель обозначает сезон Земли и меняет направление солнечного света в сцене. Геометрия лунных сезонов и лунных фаз не рассчитана.';
   source='https://science.nasa.gov/moon/facts/';
  }else{
   note='Для этого спутника нет набора четырёх сезонных карт в атласе. Показан выбранный сезон родительской планеты и условное освещение спутника. Его собственные наклон оси, прецессия, затмения и сезонный климат не реконструируются; поверхность сохраняется.';
  }
  status='Год планеты '+p.name+' · '+SEASONS[seasonIndex].name.toLowerCase();
 }
 $('#season-status').textContent=status;
 $('#season-note').textContent=note;
 $('#season-source').href=source;
}
`;
s=s.replace('async function start(){',extra+'\nasync function start(){');
writeFileSync('dist/app.js',s);
let css=readFileSync('dist/style.css','utf8');
css+='\n.season-panel{margin:20px 0;padding:14px 0;border-top:1px solid #ffffff13;border-bottom:1px solid #ffffff13}.season-heading{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}.season-heading h3{font-size:12px;font-weight:500;margin:0}.season-heading select{font:inherit;font-size:8px;background:#111e2f;color:#a9bed7;border:1px solid #ffffff15;padding:5px;border-radius:4px;max-width:150px}.season-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:12px 0}.season-tabs button{font-size:9px;border:1px solid #ffffff12;border-radius:5px;padding:8px 2px;color:#9dacc1}.season-tabs button span{display:block;font-size:17px;margin-bottom:5px;color:#b9c9dc}.season-tabs button[aria-pressed=true]{background:#efb28418;border-color:#efb28466;color:#f0c39f}.season-tabs button[aria-pressed=true] span{color:#efb284}.season-tabs button:hover{background:#ffffff09}.season-status{font-size:9px;color:#e5bd9c;line-height:1.7}.season-note{font-size:10px;line-height:1.8;color:#93a8c1;margin:9px 0 0}.season-panel .source{font-size:8px;margin-top:9px}#moon-card>.season-panel{border-radius:6px;background:#9bbce808;padding:12px;border:1px solid #9bbce81c}@media(max-width:600px){.season-tabs button{font-size:11px;padding:10px 2px}.season-note{font-size:11px}.season-heading select{font-size:10px}.season-heading h3{font-size:14px}}\n';
writeFileSync('dist/style.css',css);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('<h3>Данные и изображения</h3>','<h3>Сезонные облики</h3><p>Весна и осень показаны у равноденствий, лето и зима — у солнцестояний выбранного полушария. Для Земли используются реальные месячные мозаики NASA Blue Marble за март, июнь, сентябрь и декабрь 2004 года. Для Марса полярные шапки изменяются по учебной модели. Для остальных планет показано сезонное направление света. Сезон выбран вручную и не связан с текущей датой или скоростью анимации. Для спутников без достоверной сезонной геометрии переключатель обозначает четыре этапа года родительской планеты; это не реконструкция их климата.</p><h3>Данные и изображения</h3>');
h=h.replace('<div class="source-links">','<div class="source-links"><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noreferrer">Месячные карты Земли · NASA Blue Marble, 2004 ↗</a><a href="https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/" target="_blank" rel="noreferrer">Сезоны на планетах · NASA ↗</a>');
writeFileSync('dist/index.html',h);
