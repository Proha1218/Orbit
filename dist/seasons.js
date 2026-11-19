import * as THREE from './vendor/three.module.js';
export const SEASONS=[{id:'spring',name:'Весна',icon:'❀',event:'Равноденствие'},{id:'summer',name:'Лето',icon:'☀',event:'Солнцестояние'},{id:'autumn',name:'Осень',icon:'◒',event:'Равноденствие'},{id:'winter',name:'Зима',icon:'❄',event:'Солнцестояние'}];
export const SEASON_NOTES={
 mercury:'Наклон оси почти нулевой. Привычной смены четырёх сезонов нет: переключатель показывает четыре условных положения в году. Поверхность не перекрашивается.',
 venus:'Ось почти перпендикулярна плоскости орбиты, если учитывать обратное вращение. Сезонный контраст слабый; плотные облака не получают выдуманную зимнюю окраску.',
 earth:'Четыре реальные месячные мозаики NASA Blue Marble за 2004 год показывают изменения снега и растительности. Это составные изображения без облаков, а не снимки в дни равноденствий и солнцестояний. Используются апрель, июль, октябрь и январь. Облака по умолчанию скрыты, чтобы их не путали со снегом. В полярных и горных областях они остаются и летом.',
 mars:'Меняются освещение и условный размер полярных шапок: зимой шапка выбранного полушария расширяется, летом сокращается. Шапки — учебная модель; сезонных фотокарт здесь нет. Пыльные бури не предсказываются.',
 jupiter:'Из-за малого наклона оси сезонные различия слабые. Меняется направление света, но атмосферные полосы не перекрашиваются произвольно. Четыре сезонные фотокарты отсутствуют.',
 saturn:'Наклон оси меняет освещение полушарий и колец. В равноденствие свет падает почти вдоль плоскости колец, в солнцестояние — под большим углом. Карта облаков остаётся базовой.',
 uranus:'Большой наклон оси вызывает крайние сезоны: в солнцестояние одно полушарие получает свет почти со стороны полюса. Здесь моделируется освещение; сезонные изменения облаков не реконструированы.',
 neptune:'Наклон оси создаёт сезоны, продолжающиеся десятки земных лет. Здесь меняется освещение, а не создаются неподтверждённые карты облаков для каждого сезона.'
};
export function addMarsSeason(material){
 const uniforms={north:{value:.91},south:{value:.91}};
 material.onBeforeCompile=shader=>{
  shader.uniforms.capNorth=uniforms.north;shader.uniforms.capSouth=uniforms.south;
  shader.vertexShader='varying float seasonLatitude;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nseasonLatitude=normalize(position).y;');
  shader.fragmentShader='varying float seasonLatitude; uniform float capNorth; uniform float capSouth;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float polar=max(smoothstep(capNorth,capNorth+.035,seasonLatitude),smoothstep(capSouth,capSouth+.035,-seasonLatitude));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.81,.82),polar*.92);`);
 };
 material.customProgramCacheKey=()=> 'mars-season-caps';return uniforms;
}
