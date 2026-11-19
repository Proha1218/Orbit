import {readFileSync,writeFileSync} from 'node:fs';
import {MOON_MAPS} from './dist/moon-maps.js';
let s=readFileSync('dist/app.js','utf8');
s=s.replace("import {resolveSeason,SEASON_NAMES} from './season-state.js';","import {resolveSeason,SEASON_NAMES} from './season-state.js';\nimport {MOON_MAPS,partialCoverage,phoebeMosaic} from './moon-maps.js';");
s=s.replace('function texture(name){','function texture(name){if(name===\'phoebe\'){if(!textures.has(name))textures.set(name,phoebeMosaic());return textures.get(name);}');
s=s.replace('info=MOON_DETAILS[key],important=', 'info=MOON_DETAILS[key],mapMeta=MOON_MAPS[key],important=');
s=s.replace("map:info?.texture?texture(info.texture):moonRelief(info?key:'minor',['Enceladus','Europa','Tethys','Rhea'].includes(key)),bumpMap:info?.observed?null:info?.texture?texture(info.texture):moonRelief(info?key:'minor'),bumpScale:radius*.045,color:info?.observed?(key==='Io'?0xffffff:0xcac5b9):info?.color||0xc8c5be", "map:mapMeta?texture(mapMeta.texture):null,bumpMap:null,color:mapMeta?0xffffff:0x888d95");
s=s.replace("if(key==='Titan'){body.material", "if(mapMeta?.partial)partialCoverage(body.material);if(key==='Titan'){body.material");
s=s.replace('body.add(haze);haze.scale', "haze.name='titan-haze';body.add(haze);haze.scale");
const provenanceStart=s.indexOf('${info?.observed?');
const provenanceEnd=s.indexOf('${info?.diameter?',provenanceStart);
if(provenanceStart<0||provenanceEnd<0)throw Error('Provenance block not found');
s=s.slice(0,provenanceStart)+'${mapCaption(key)}'+s.slice(provenanceEnd);
s=s.replace("mountSeasons();applySeason();addScaleNote();$('#moon-card').scrollIntoView", "if($('#titan-surface'))$('#titan-surface').onchange=e=>setTitanSurface(e.target.checked);mountSeasons();applySeason();addScaleNote();$('#moon-card').scrollIntoView");
s=s.replace('<div id="moon-list" class="moon-list"></div>', '<label class="maps-filter"><input id="observed-only" type="checkbox">С картами миссий</label><div id="moon-list" class="moon-list"></div>');
s=s.replace("moons.filter(m=>[m.ru,m.name,m.designation].some", "moons.filter(m=>(!$('#observed-only').checked||MOON_MAPS[moonKey(m)])&&[m.ru,m.name,m.designation].some");
s=s.replace("renderMoonList(moons);$('#moon-search').addEventListener", "renderMoonList(moons);$('#observed-only').onchange=()=>$('#moon-search').dispatchEvent(new Event('input'));$('#moon-search').addEventListener");
s=s.replace('</span><span class="go">↗</span></button>', '</span><span class="map-badge ${MOON_MAPS[moonKey(m)]?\'available\':\'missing\'}" title="${MOON_MAPS[moonKey(m)]?\'Есть карта по данным миссии\':\'Карта не подключена\'}">${MOON_MAPS[moonKey(m)]?\'Карта\':\'—\'}</span><span class="go">↗</span></button>');
const extra=`
function mapCaption(key){
 const meta=MOON_MAPS[key];
 if(!meta)return '<div class="map-provenance missing"><strong>Реальная карта не подключена</strong><p>В проверенных коллекциях подходящая фотомозаика не найдена или не получена. Показана нейтральная модель без выдуманных кратеров. Это не доказательство отсутствия любых снимков спутника.</p><a class="source" href="./moon-texture-audit.json" target="_blank">Результат поиска по всему каталогу ↗</a></div>';
 const obj=moonObjects.find(o=>moonKey(o.userData.moon)===key);
 return '<div class="map-provenance"><strong>'+ (meta.infrared?'Доступна инфракрасная карта':'Карта по данным космической миссии')+'</strong><p>'+escape(meta.mission)+' · '+escape(meta.credit)+'. '+(meta.mono?'Монохромная мозаика. ':'')+(meta.note||'Обработанная фотомозаика; разрешение неодинаково, освещение и цвета в 3D приблизительные.')+(meta.partial?' Чёрные пробелы исходной карты обозначены штриховкой: это отсутствие данных, а не тёмный грунт.':'')+'</p><a class="source" href="'+meta.source+'" target="_blank" rel="noreferrer">Источник карты ↗</a>'+(meta.infrared?'<label class="maps-filter"><input id="titan-surface" type="checkbox" '+(obj?.userData.titanSurface?'checked':'')+'>Поверхность под дымкой · ИК</label><p class="fine">Без переключателя — модель видимой атмосферной дымки. В ИК-режиме — реальные данные с условными цветами, без атмосферы.</p>':'')+'</div>';
}
function setTitanSurface(enabled){
 const body=moonObjects.find(o=>moonKey(o.userData.moon)==='Titan');if(!body)return;
 body.userData.titanSurface=enabled;
 body.material.map=enabled?texture('titan-infrared'):null;
 body.material.color.setHex(enabled?0xffffff:0xd2a667);body.material.needsUpdate=true;
 const haze=body.getObjectByName('titan-haze');if(haze)haze.visible=!enabled;
 toast(enabled?'Титан: инфракрасная мозаика · условные цвета':'Титан: видимая атмосферная дымка');
}
`;
s=s.replace('function addPoleLabels(){',extra+'\nfunction addPoleLabels(){');
writeFileSync('dist/app.js',s);
let d=readFileSync('dist/data.js','utf8');
for(const key of ['Phobos','Deimos','Miranda','Ariel','Umbriel','Titania','Oberon','Triton'])d=d.replace(key+':{',key+':{texture:\''+MOON_MAPS[key].texture+'\',observed:true,');
d=d.replace('export const MOON_DETAILS = {',"export const MOON_DETAILS = {\n Phoebe:{texture:'phoebe',observed:true,diameter:'≈213',radius:.3,text:'Феба — далёкий нерегулярный спутник Сатурна. В 2004 году аппарат Cassini сфотографировал её покрытую кратерами поверхность.'},");
writeFileSync('dist/data.js',d);
const catalog=JSON.parse(readFileSync('dist/moons-catalog.json','utf8'));
const audit={scope:'456 спутников из каталога приложения. Поиск по общим коллекциям JPL, USGS, PDS и NASA Trek; не индивидуальное доказательство отсутствия данных для каждого объекта.',retrievedDate:'2026-11-17',sources:['https://maps.jpl.nasa.gov/tmaps/','https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=icyMoon','https://data.caltech.edu/records/8q9an-yt176','https://sbnarchive.psi.edu/pds3/multi/MULTI-SA-MULTI-6-STOOKEMAPS-V3.0/'],mappedCount:Object.keys(MOON_MAPS).length,objects:[]};
for(const [planet,moons]of Object.entries(catalog.planets))for(const m of moons){const key=m.name||m.designation,meta=MOON_MAPS[key];audit.objects.push({planet,name:key,ru:m.ru||null,status:meta?'connected_observation_map':key==='Epimetheus'?'photomosaic_identified_download_blocked':['Amalthea','Hyperion'].includes(key)?'located_map_is_drawing_excluded':'no_suitable_map_obtained_in_reviewed_collections',...(meta?{source:meta.source,mission:meta.mission,note:meta.note||'Мозаика с неравномерным покрытием и обработкой; не научный аналитический продукт.'}:{})});}
if(audit.objects.length!==456)throw Error('Unexpected catalog length');
writeFileSync('dist/moon-texture-audit.json',JSON.stringify(audit,null,2));
writeFileSync('../../outputs/moon-texture-audit.json',JSON.stringify(audit,null,2));
let css=readFileSync('dist/style.css','utf8');
css+='\n.map-provenance{padding:12px;border:1px solid #87b8e52b;background:#87b8e508;border-radius:6px;margin:12px 0}.map-provenance strong{font-size:10px;color:#adcfec;font-weight:500}.map-provenance p{font-size:10px;line-height:1.8;margin:8px 0;color:#94a9c1}.map-provenance.missing{border-color:#ffffff14;background:#ffffff03}.map-provenance.missing strong{color:#a4afbd}.maps-filter{display:flex;gap:7px;align-items:center;font-size:10px;color:#a9bfd7;margin:10px 0}.maps-filter input{accent-color:#efb284}.map-badge{font-size:7px;border-radius:3px;padding:3px 5px;margin-left:auto}.map-badge.available{color:#b0d3ee;background:#8abbe515;border:1px solid #8abbe52b}.map-badge.missing{color:#68778a}.moon-row .go{margin-left:0}\n';
writeFileSync('dist/style.css',css);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('Для десяти крупных спутников используются обработанные мозаики Voyager/Galileo из архива NASA/JPL/USGS. Для остальных происхождение поверхности указано в карточке; процедурные детали иллюстративны.','Для 21 спутника подключены карты на основе данных космических миссий. Неполное покрытие помечено штриховкой. Для спутников без полученной фотокарты используется нейтральная модель без процедурных кратеров. Происхождение и ограничения приведены в карточках.');
h=h.replace('Титан показан сквозь модель атмосферной дымки.','Титан показан сквозь модель атмосферной дымки; отдельно включается инфракрасная карта поверхности с условными цветами.');
h=h.replace('<div class="source-links">','<div class="source-links"><a href="./moon-texture-audit.json" target="_blank">Реестр поиска текстур · все 456 спутников ↗</a><a href="https://maps.jpl.nasa.gov/tmaps/uranus.html" target="_blank" rel="noreferrer">Карты спутников Урана · Voyager 2 ↗</a><a href="https://maps.jpl.nasa.gov/tmaps/neptune.html" target="_blank" rel="noreferrer">Карта Тритона · Voyager 2 ↗</a><a href="https://maps.jpl.nasa.gov/tmaps/mars.html" target="_blank" rel="noreferrer">Фобос и Деймос · Viking ↗</a><a href="https://data.caltech.edu/records/8q9an-yt176" target="_blank" rel="noreferrer">Титан · Cassini VIMS / ISS ↗</a>');
writeFileSync('dist/index.html',h);
console.log('Catalog:',audit.objects.length,'Connected observation maps:',audit.mappedCount);
