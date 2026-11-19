import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {MOON_MAPS} from './dist/moon-maps.js';
const audit=JSON.parse(readFileSync('dist/moon-texture-audit.json','utf8'));
const evidence=JSON.parse(readFileSync('../research/additional-maps.json','utf8'));
for(const entry of audit.objects){const candidate=evidence.candidates.find(c=>c.body===entry.name);if(candidate&&!MOON_MAPS[entry.name]){entry.searchEvidence=candidate;}}
assert.equal(audit.objects.length,456);assert.equal(Object.keys(MOON_MAPS).length,21);
for(const [key,map]of Object.entries(MOON_MAPS)){
 assert(audit.objects.some(m=>m.name===key),key+' absent from catalog');
 if(key==='Phoebe'){for(let row=0;row<4;row++)for(let col=0;col<8;col++)assert(existsSync('dist/textures/phoebe-tiles/'+row+'-'+col+'.jpg'));}
 else{const b=readFileSync('dist/textures/'+map.texture+'.jpg');assert(b[0]===255&&b[1]===216,key+' invalid JPEG');}
}
for(const path of ['dist/moon-texture-audit.json','../../outputs/moon-texture-audit.json'])writeFileSync(path,JSON.stringify(audit,null,2));
const report=['# Реальные карты спутников — результат поиска','',
 'Проверка: 17.11.2026. Каталог приложения: 456 спутников восьми планет. Плутон и спутники малых тел в этот каталог не входят.','',
 'Подключено 21 картографическое изображение на основе наблюдений. Это не 21 полная цветная карта: часть мозаик монохромная или имеет большие пробелы. У Титана поверхность доступна отдельно в инфракрасных условных цветах.','',
 '## Подключённые карты','',...Object.entries(MOON_MAPS).map(([key,m])=>'- '+key+' — '+m.mission+'; '+m.credit+'. [Источник]('+m.source+').'+(m.partial?' Покрытие неполное.':'')+(m.infrared?' Инфракрасная карта, условные цвета.':'')),
 '', '## Остальные объекты','',
 '435 спутников пока без подключённой реальной карты. Для них убраны процедурные кратеры и показана нейтральная модель. Поиск выполнен по коллекциям JPL/USGS, NASA Trek, PDS и архиву Caltech; результат не доказывает отсутствие любых карт в других источниках. Статус каждого объекта записан в moon-texture-audit.json.','',
 'Для Эпиметея подтверждена фотомозаика epimos.jpg в PDS, но сервер не отдал файл (HTTP 403). Карты Амальтеи и Гипериона из проверенного набора Stooke описаны как рисунки светотеневого рельефа, поэтому не выданы за фототекстуры.','',
 'Незаснятые чёрные области некоторых исходных карт в сцене обозначены штриховкой. Цвет, ориентация и освещение в 3D приблизительные; карты не предназначены для научных измерений.'];
writeFileSync('../../outputs/moon-texture-search.md',report.join('\n'));
console.log('Validated: 456 statuses, 21 map entries, all map assets, 32 Phoebe tiles.');
