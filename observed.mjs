import {readFileSync,writeFileSync} from 'node:fs';
let d=readFileSync('dist/data.js','utf8');
for(const name of ['Io','Europa','Ganymede','Callisto','Mimas','Enceladus','Tethys','Dione','Rhea','Iapetus'])d=d.replace(`${name}:{`,`${name}:{texture:'${name.toLowerCase()}',observed:true,`);
writeFileSync('dist/data.js',d);
let s=readFileSync('dist/app.js','utf8');
s=s.replace('if(airColors[p.id])',`if(p.id==='neptune'||p.id==='uranus'){
 mesh.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',\`#include <map_fragment>
 float value=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=vec3(\${p.id==='neptune'?'.46,.69,.72':'.51,.72,.73'})*(.82+.18*value);\`);};
 }
 if(airColors[p.id])`);
s=s.replace('neptune:0x457cdb','neptune:0x81b6c5');
s=s.replace('bumpMap:info?.texture?texture(info.texture):', 'bumpMap:info?.observed?null:info?.texture?texture(info.texture):');
s=s.replace('color:info?.color||0xc8c5be','color:info?.observed?(key===\'Io\'?0xffffff:0xcac5b9):info?.color||0xc8c5be');
s=s.replace('body.castShadow=important;',"if(key==='Titan'){body.material.map=null;body.material.bumpMap=null;body.material.color.setHex(0xd2a667);const haze=atmosphere(radius,0xdcae6d,lightDirection);body.add(haze);haze.scale.setScalar(1.02);}body.castShadow=important;");
s=s.replace('const inner=radius*1.24','const inner=radius*1.24');
s=s.replace("${p.description}</p>","${p.description}</p>${['neptune','uranus'].includes(p.id)?'<p class=\"fine\">Цвет приближён к реконструкции Irwin et al. (2024). Это визуальная интерпретация, а не фотометрически калиброванный снимок.</p>':''}");
s=s.replace('Орбиты, размеры и поверхности спутников схематичны.','Орбиты и размеры условные. Поверхности: карты миссий или иллюстрация — см. карточку спутника.');
s=s.replace('${info?.text||', '${info?.text||');
s=s.replace("${info?.diameter?`<p>Диаметр:","${info?.observed?'<p class=\"fine\">Карта по снимкам Voyager'+(key==='Io'?' и Galileo':'')+' · NASA/JPL/USGS. Мозаика обработана; возможны пробелы и различия в разрешении. Цвет и освещение в 3D приблизительные.</p><a class=\"source\" href=\"https://maps.jpl.nasa.gov/tmaps/'+(['Io','Europa','Ganymede','Callisto'].includes(key)?'jupiter':'saturn')+'.html\" target=\"_blank\" rel=\"noreferrer\">Источник карты ↗</a>':key==='Titan'?'<p class=\"fine\">Дымка в видимом свете — по снимкам Cassini. Цвет и рассеяние смоделированы; поверхность под дымкой не показана.</p>':'<p class=\"fine\">'+(key==='Moon'?'Карта Луны · Solar System Scope / NASA.':'Иллюстративная поверхность: реальная карта здесь не используется.')+'</p>'}${info?.diameter?`<p>Диаметр:");
writeFileSync('dist/app.js',s);
let v=readFileSync('dist/visuals.js','utf8');
v=v.replace('const t=x/1023;', 'const t=x/1023;const radial=1.24+t*(2.27-1.24);');
v=v.replace('const gap=(t>.58&&t<.625)||(t>.89&&t<.9);','const gap=(radial>1.95&&radial<2.03)||(radial>2.214&&radial<2.219);');
v=v.replace('const density=t<.16?.18:t<.58?.78:.42;','const density=radial<1.527?.16:radial<1.95?.82:.48;');
v=v.replace('outer=radius*2.32','outer=radius*2.27');
writeFileSync('dist/visuals.js',v);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('Текстуры спутников, кроме Луны, созданы процедурно и иллюстративны.','Для десяти крупных спутников используются обработанные мозаики Voyager/Galileo из архива NASA/JPL/USGS. Для остальных происхождение поверхности указано в карточке; процедурные детали иллюстративны. Титан показан сквозь модель атмосферной дымки.');
h=h.replace('<div class="source-links">',`<div class="source-links"><a href="https://maps.jpl.nasa.gov/tmaps/jupiter.html" target="_blank" rel="noreferrer">Карты спутников Юпитера · JPL / USGS ↗</a><a href="https://maps.jpl.nasa.gov/tmaps/saturn.html" target="_blank" rel="noreferrer">Карты спутников Сатурна · JPL / USGS ↗</a><a href="https://science.nasa.gov/photojournal/cassinis-three-views-of-titan/" target="_blank" rel="noreferrer">Титан в естественных цветах · Cassini ↗</a><a href="https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0" target="_blank" rel="noreferrer">Цвета Урана и Нептуна · Irwin et al., 2024 ↗</a><a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html" target="_blank" rel="noreferrer">Пропорции колец Сатурна · NASA ↗</a>`);
writeFileSync('dist/index.html',h);
