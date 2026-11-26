export const SURFACE_VIEWS={
 venus:{texture:'venus-radar',title:'Радарная поверхность Венеры',note:'Мозаика Magellan / Venera / Pioneer · JPL/Caltech · 1440×720. Яркость отражает радарные свойства, а не естественный цвет грунта. Пробелы Magellan дополнены данными Venera и Pioneer. Облака скрыты только для осмотра.',source:'https://maps.jpl.nasa.gov/tmaps/venus.html'},
 Titan:{texture:'titan-infrared',title:'Поверхность Титана · инфракрасный диапазон',note:'Cassini VIMS + ISS · Seignovert et al. (2019) · 11520×5760. Условные спектральные цвета, не видимый свет. Атмосферная дымка скрыта для осмотра.',source:'https://data.caltech.edu/records/8q9an-yt176'}
};
export function applySurfaceView(body,id,enabled,loadTexture){
 const config=SURFACE_VIEWS[id];if(!body||!config)return false;
 const mesh=body.userData.mesh||body;
 if(!body.userData.surfaceOriginal)body.userData.surfaceOriginal={map:mesh.material.map,color:mesh.material.color.clone()};
 const base=body.userData.surfaceOriginal;
 body.userData.surfaceVisible=enabled;
 mesh.material.map=enabled?loadTexture(config.texture):base.map;
 mesh.material.color.copy(base.color);if(enabled)mesh.material.color.setHex(0xffffff);
 mesh.material.needsUpdate=true;
 const haze=id==='Titan'?body.getObjectByName('titan-haze'):body.userData.atmosphere;
 if(haze)haze.visible=!enabled;
 if(id==='Titan')body.userData.titanSurface=enabled;
 return true;
}
