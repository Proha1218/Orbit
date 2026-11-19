import {readFileSync,writeFileSync} from 'node:fs';
let s=readFileSync('dist/app.js','utf8');
s=s.replace("import {SEASONS,SEASON_NOTES,addMarsSeason} from './seasons.js';", "import {SEASONS,SEASON_NOTES,addMarsSeason} from './seasons.js';\nimport {resolveSeason,SEASON_NAMES} from './season-state.js';\nlet seasonClouds=false;");
s=s.replaceAll('applySeason();viewSeasonDay();','applySeason();');
s=s.replace("syncMoonsVisibility();mountSeasons();applySeason();addScaleNote();}", "syncMoonsVisibility();addPoleLabels();mountSeasons();applySeason();addScaleNote();}");
s=s.replace('const p=selectedPlanet,physicalIndex=(seasonIndex+(seasonHemisphere===\'south\'?2:0))%4;',"const p=selectedPlanet,selection=resolveSeason(seasonIndex,seasonHemisphere),physicalIndex=selection.north;");
s=s.replace("const map=texture('earth_'+SEASONS[physicalIndex].id);", "const map=texture('earth_'+SEASONS[physicalIndex].id+'?v=midseason');");
// Texture path takes a URL query only for cache invalidation, after the extension.
s=s.replace('const textureURL = name => `./textures/${name}.jpg`;', "const textureURL = name => {const [file,query]=name.split('?');return './textures/'+file+'.jpg'+(query?'?'+query:'');};");
s=s.replace("focusPlanet.userData.mesh.material.needsUpdate=true;", "focusPlanet.userData.mesh.material.needsUpdate=true;if(focusPlanet.userData.clouds)focusPlanet.userData.clouds.visible=seasonClouds;");
s=s.replace("if(p.id==='earth'){status+=' · '+['март','июнь','сентябрь','декабрь'][physicalIndex]+' 2004';", "if(p.id==='earth'){status=selection.month+' 2004 · месячная мозаика';");
s=s.replace("$('#season-status').textContent=status;", "$('#season-status').textContent=status;$('#season-hemispheres').textContent='Север: '+SEASON_NAMES[selection.north].toLowerCase()+' · Юг: '+SEASON_NAMES[selection.south].toLowerCase();if(focusPlanet.userData.poleLabels){focusPlanet.userData.poleLabels[0].textContent='С · '+SEASON_NAMES[selection.north].toLowerCase();focusPlanet.userData.poleLabels[1].textContent='Ю · '+SEASON_NAMES[selection.south].toLowerCase();}");
s=s.replace('<div class="season-status" id="season-status"></div>', '<div class="season-status" id="season-status"></div><div class="season-hemispheres" id="season-hemispheres"></div>');
s=s.replace("$('#season-hemisphere').value=seasonHemisphere;$('#season-day').onclick=viewSeasonDay;", `$('#season-hemisphere').value=seasonHemisphere;$('#season-day').onclick=viewSeasonDay;
 if(selectedPlanet.id==='earth'&&!selectedMoon){const label=document.createElement('label');label.className='clouds-option';label.innerHTML='<input type="checkbox" id="season-clouds" '+(seasonClouds?'checked':'')+'>Показать облака';panel.querySelector('.season-tabs').after(label);$('#season-clouds').onchange=e=>{seasonClouds=e.target.checked;applySeason();};}
`);
s=s.replace('function mountSeasons(){',`function addPoleLabels(){
 const r=focusPlanet.userData.radius;
 focusPlanet.userData.poleLabels=[1,-1].map((sign,i)=>{const point=new THREE.Object3D();point.position.set(0,sign*r*1.14,0);focusPlanet.userData.tilt.add(point);return addLabel(point,i?'Ю':'С',()=>{},'pole-label');});
}
function mountSeasons(){`);
writeFileSync('dist/app.js',s);
let notes=readFileSync('dist/seasons.js','utf8');
notes=notes.replace('Облака поверх них иллюстративные.','Используются апрель, июль, октябрь и январь. Облака по умолчанию скрыты: белый покров на карте — снег и лёд. В полярных и горных областях они остаются и летом.');
writeFileSync('dist/seasons.js',notes);
let h=readFileSync('dist/index.html','utf8');h=h.replaceAll('март, июнь, сентябрь и декабрь','апрель, июль, октябрь и январь').replaceAll('за март, июнь, сентябрь и декабрь','за апрель, июль, октябрь и январь');
writeFileSync('dist/index.html',h);
let css=readFileSync('dist/style.css','utf8');css+='\n.season-hemispheres{margin-top:7px;color:#bcd5ef;font-size:10px;line-height:1.7}.clouds-option{display:flex;align-items:center;gap:7px;color:#98adc7;font-size:10px;margin:0 0 12px}.clouds-option input{accent-color:#efb284}.pole-label{color:#acd9ff!important;background:#0d1e30ba!important;border-color:#90c9ff36!important;font-size:9px;pointer-events:none}.real-scale .pole-label:before{display:none}\n';writeFileSync('dist/style.css',css);
