import * as THREE from './vendor/three.module.js';
const jpl='https://maps.jpl.nasa.gov/tmaps/';
export const MOON_MAPS={
  "Moon": {
    "texture": "moon",
    "source": "https://www.solarsystemscope.com/textures/",
    "credit": "Solar System Scope / NASA",
    "mission": "Лунная карта",
    "note": "Обработанная карта из набора Solar System Scope, основанная на данных NASA.",
    "hd": "moon-hd",
    "resolution": "8192×4096",
    "originalResolution": "8192×4096"
  },
  "Io": {
    "texture": "io",
    "source": "https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km",
    "credit": "USGS / NASA / JPL",
    "mission": "Voyager + Galileo",
    "hd": "io-color-hd",
    "resolution": "8192×4096",
    "originalResolution": "11445×5723",
    "mono": false,
    "note": "Подробная научная фотомозаика USGS. Разрешение исходных кадров и качество покрытия различаются по поверхности."
  },
  "Europa": {
    "texture": "europa",
    "source": "https://astrogeology.usgs.gov/search/map/Europa/Voyager-Galileo/Europa_Voyager_GalileoSSI_global_mosaic_500m",
    "credit": "USGS / NASA / JPL",
    "mission": "Voyager + Galileo",
    "hd": "europa-hd",
    "resolution": "8192×4096",
    "originalResolution": "19631×9816",
    "mono": true,
    "note": "Подробная научная фотомозаика USGS. Разрешение исходных кадров и качество покрытия различаются по поверхности.",
    "partial": true
  },
  "Ganymede": {
    "texture": "ganymede",
    "source": "https://svs.gsfc.nasa.gov/11533/",
    "credit": "USGS / Wheaton / ASU / NASA / JPL-Caltech",
    "mission": "Voyager + Galileo",
    "mono": true,
    "hd": "ganymede-hd",
    "resolution": "8192×4096",
    "originalResolution": "11520×5760",
    "note": "Глобальная фотомозаика, опубликованная NASA SVS. Геологическая карта с условной раскраской здесь не используется.",
    "partial": true
  },
  "Callisto": {
    "texture": "callisto",
    "source": "https://astrogeology.usgs.gov/search/map/callisto_galileo_voyager_global_mosaic_1km",
    "credit": "USGS / NASA / JPL",
    "mission": "Voyager + Galileo",
    "mono": true,
    "hd": "callisto-hd",
    "resolution": "8192×4096",
    "originalResolution": "15138×7569",
    "note": "Подробная научная фотомозаика USGS. Разрешение исходных кадров и качество покрытия различаются по поверхности.",
    "partial": true
  },
  "Phobos": {
    "texture": "phobos",
    "source": "https://astrogeology.usgs.gov/search/map/phobos_viking_global_mosaic_5m",
    "credit": "USGS / NASA / JPL",
    "mission": "Viking",
    "mono": true,
    "hd": "phobos-hd",
    "resolution": "8192×4096",
    "originalResolution": "14400×7200",
    "note": "Подробная научная фотомозаика USGS. Разрешение исходных кадров и качество покрытия различаются по поверхности."
  },
  "Deimos": {
    "texture": "deimos",
    "source": "https://maps.jpl.nasa.gov/tmaps/mars.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Viking",
    "mono": true
  },
  "Mimas": {
    "texture": "mimas",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/mimas/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "mimas-hd",
    "resolution": "6356×3178",
    "originalResolution": "6356×3178",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Enceladus": {
    "texture": "enceladus",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/enceladus/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "enceladus-hd",
    "resolution": "8192×4096",
    "originalResolution": "15960×7980",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Tethys": {
    "texture": "tethys",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/tethys/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "tethys-hd",
    "resolution": "8192×4096",
    "originalResolution": "13467×6734",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Dione": {
    "texture": "dione",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/dione/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "dione-hd",
    "resolution": "8192×4096",
    "originalResolution": "14134×7067",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Rhea": {
    "texture": "rhea",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/rhea/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "rhea-hd",
    "resolution": "8192×4096",
    "originalResolution": "12015×6008",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Iapetus": {
    "texture": "iapetus",
    "source": "https://www.lpi.usra.edu/icy_moons/saturn/iapetus/",
    "credit": "Paul Schenk / LPI / NASA / JPL / Cassini ISS",
    "mission": "Cassini ISS",
    "mono": false,
    "hd": "iapetus-hd",
    "resolution": "8192×4096",
    "originalResolution": "11741×5871",
    "note": "Подробная фотомозаика LPI. Контраст и цветовые различия обработаны для различимости рельефа; освещение отдельных исходных кадров может быть заметно."
  },
  "Miranda": {
    "texture": "miranda",
    "source": "https://maps.jpl.nasa.gov/tmaps/uranus.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Voyager 2",
    "mono": true,
    "partial": true
  },
  "Ariel": {
    "texture": "ariel",
    "source": "https://maps.jpl.nasa.gov/tmaps/uranus.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Voyager 2",
    "mono": true,
    "partial": true
  },
  "Umbriel": {
    "texture": "umbriel",
    "source": "https://maps.jpl.nasa.gov/tmaps/uranus.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Voyager 2",
    "mono": true,
    "partial": true
  },
  "Titania": {
    "texture": "titania",
    "source": "https://maps.jpl.nasa.gov/tmaps/uranus.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Voyager 2",
    "mono": true,
    "partial": true
  },
  "Oberon": {
    "texture": "oberon",
    "source": "https://maps.jpl.nasa.gov/tmaps/uranus.html",
    "credit": "NASA/JPL/USGS",
    "mission": "Voyager 2",
    "mono": true,
    "partial": true
  },
  "Triton": {
    "texture": "triton",
    "source": "https://www.lpi.usra.edu/icy_moons/neptune/triton/",
    "credit": "Paul Schenk / LPI / NASA / JPL",
    "mission": "Voyager 2 · мозаика 2014",
    "mono": false,
    "partial": true,
    "hd": "triton-hd",
    "resolution": "8192×4096",
    "originalResolution": "14138×7069",
    "note": "Трёхцветная фотомозаика с приблизительно естественными цветами. Неосвещённая во время пролёта северная область остаётся без данных."
  },
  "Phoebe": {
    "texture": "phoebe",
    "source": "https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=icyMoon",
    "credit": "NASA/JPL/SSI/DLR",
    "mission": "Cassini",
    "mono": true,
    "partial": true,
    "note": "Мозаика NASA Trek / DLR. Данные собраны из тайлов исходного слоя; подписи и координатная сетка не нанесены на поверхность."
  },
  "Titan": {
    "texture": "titan-infrared",
    "source": "https://data.caltech.edu/records/8q9an-yt176",
    "credit": "Caltech-JPL / Univ. Arizona / LPG-Nantes-CNRS",
    "mission": "Cassini VIMS + ISS",
    "infrared": true,
    "note": "Инфракрасная мозаика Seignovert et al. (2019). Условные цвета спектральных отношений VIMS совмещены с картой ISS на 938 нм. Это не естественные цвета видимого света.",
    "resolution": "11520×5760"
  }
};
export const coverageFill={value:1};
export function partialCoverage(material,allowFill=false){
 material.onBeforeCompile=shader=>{
  shader.uniforms.coverageFill=allowFill?coverageFill:{value:0};
  shader.fragmentShader='uniform float coverageFill;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float strength=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
   float nodata=1.-smoothstep(.0004,.004,strength);
   vec3 continuation=vec3(0.);float samples=0.;
   for(int i=0;i<7;i++){
    vec3 measured=texture2D(map,vec2((float(i)+.5)/7.,.12)).rgb;
    float valid=step(.004,max(measured.r,max(measured.g,measured.b)));
    continuation+=measured*valid;samples+=valid;
   }
   continuation=samples>0.?continuation/samples:vec3(.22);
   if(coverageFill>.5){
    float edge=.04;
    for(int j=0;j<32;j++){
     float latitude=.985-float(j)*.03;
     vec3 candidate=texture2D(map,vec2(vMapUv.x,latitude)).rgb;
     if(max(candidate.r,max(candidate.g,candidate.b))>.012){edge=latitude;break;}
    }
    vec3 nearby=vec3(0.);float weights=0.;
    for(int j=0;j<9;j++){
     vec3 candidate=texture2D(map,vec2(fract(vMapUv.x+(float(j)-4.)*.008),max(.015,edge-.04))).rgb;
     float valid=step(.008,max(candidate.r,max(candidate.g,candidate.b)));
     nearby+=candidate*valid;weights+=valid;
    }
    nearby=weights>0.?nearby/weights:continuation;
    float polarFade=smoothstep(edge,1.,vMapUv.y);
    vec3 filled=mix(nearby,continuation,polarFade);
    float borderBlend=smoothstep(edge-.075,edge+.035,vMapUv.y);
    diffuseColor.rgb=mix(diffuseColor.rgb,filled,borderBlend);
    continuation=filled;
   }
   vec3 emptyColor=mix(vec3(.085,.095,.11),continuation,coverageFill);
   diffuseColor.rgb=mix(diffuseColor.rgb,emptyColor,nodata);`);
 };
 material.customProgramCacheKey=()=> 'observed-partial-coverage-v2';
}
export function phoebeMosaic(){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
 const context=canvas.getContext('2d');context.fillStyle='#555';context.fillRect(0,0,2048,1024);
 const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;
 const tasks=[];for(let row=0;row<4;row++)for(let col=0;col<8;col++)tasks.push(new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{context.drawImage(image,col*256,row*256,256,256);resolve();};image.onerror=reject;image.src='./textures/phoebe-tiles/'+row+'-'+col+'.jpg';}));
 Promise.all(tasks).then(()=>{result.needsUpdate=true;}).catch(()=>console.error('Не удалось загрузить исходные тайлы Фебы'));
 return result;
}
