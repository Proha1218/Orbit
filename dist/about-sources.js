import {stationSources} from './spacecraft/iss-data.js';
import {BELTS, PLANETS} from './data.js';
import {DWARF_ROTATION} from './body-profile.js';
import {PLANET_STORY_PATHS} from './body-stories.js';
import {DWARF_MAPS, DWARF_OBSERVATIONS} from './dwarf-maps.js';
import {MARS_MOON_SHAPE_SOURCE, CASSINI_MOON_SHAPE_SOURCE} from './mars-moon-shapes.js';
import {MISSION_PHOTOS} from './mission-photos.js';
import {MOON_MAPS} from './moon-maps.js';
import {RING_NOTES} from './planet-rings.js';
import {SURFACE_VIEWS} from './surface-view.js';
import {spacecraft} from './spacecraft/catalog.js';
import {events, photos, sources} from './spacecraft/history-data.js';
import {parts} from './spacecraft/parts.js';

const nasa = 'https://science.nasa.gov/';
const jpl = 'https://ssd.jpl.nasa.gov/';
const dwarfNames = {ceres:'Церера', pluto:'Плутон', haumea:'Хаумеа', makemake:'Макемаке', eris:'Эрида'};
const names = {...dwarfNames, ...Object.fromEntries(PLANETS.map(planet => [planet.id, planet.name]))};

export const sourcesByTopic = [
 ['Планеты, Солнце и пояса', [
  ['Характеристики Солнечной системы · NASA', nasa + 'solar-system/solar-system-facts/'],
  ['Солнце · NASA', nasa + 'sun/facts/'],
  ['Карта Солнца SOHO/MDI · NASA SVS', 'https://svs.gsfc.nasa.gov/3505/'],
  ...PLANETS.map(({id,name}) => [name + ' · обзор NASA', nasa + id + '/']),
  ...Object.entries(PLANET_STORY_PATHS).map(([id,path]) => [names[id] + ' · данные NASA', nasa + path]),
  ...Object.entries(RING_NOTES).map(([id,[,url]]) => [names[id] + ' · данные о кольцах', url]),
  ['Уран · сезонные наблюдения Hubble', nasa + 'asset/hubble/uranus-and-neptune/'],
  ['Уран · мозаики Hubble OPAL', 'https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33'],
  ['Уран · снимок Webb NIRCam', nasa + 'asset/webb/uranus-close-up-nircam-image/'],
  ['Нептун · источник карты облаков CelestiaContent', 'https://github.com/CelestiaProject/CelestiaContent/blob/master/README'],
  ['Венера · радарная карта', SURFACE_VIEWS.venus.source],
  ...Object.values(BELTS).map(belt => [belt.name + ' · NASA', belt.source]),
  ['Главный пояс · распределение орбит JPL', jpl + 'diagrams/mb_hist.html'],
  ['Церера и Веста · миссия Dawn', nasa + 'mission/dawn/'],
  ['Пояс Койпера · подробный обзор NASA', nasa + 'resource/kuiper-belt-in-depth/'],
  ['Пояс Койпера · исследование орбит', 'https://doi.org/10.1088/0004-6256/142/4/131']
 ]],
 ['Карликовые планеты и спутники', [
  ...Object.entries(DWARF_MAPS).map(([id,map]) => [names[id] + ' · карта поверхности', map.source]),
  ...Object.entries(DWARF_OBSERVATIONS).map(([id,observation]) => [names[id] + ' · снимок Hubble', observation.source]),
  ['Хаумеа · открытие кольца', DWARF_OBSERVATIONS.haumea.ring.source],
  ...Object.entries(DWARF_ROTATION).map(([id,[,url]]) => [names[id] + ' · исследование вращения', url]),
  ['Харон · карта USGS', 'https://astrogeology.usgs.gov/search/map/charon_new_horizons_lorri_mvic_global_mosaic_300m'],
  ['Спутники Плутона · NASA', nasa + 'dwarf-planets/pluto/moons/'],
  ['Луна · NASA', nasa + 'moon/facts/'],
  ['Спутники Солнечной системы · NASA', nasa + 'solar-system/moons/'],
  ['Физические параметры спутников · JPL', jpl + 'sats/phys_par/'],
  ['Элементы орбит спутников · JPL', jpl + 'sats/elem/'],
  ['Каталог спутников малых тел · JPL', jpl + 'sb/sats.html'],
  ['Фобос и Деймос · измерения формы', MARS_MOON_SHAPE_SOURCE],
  ['Спутники Сатурна · модели формы Cassini', CASSINI_MOON_SHAPE_SOURCE],
  ['Титан · атмосфера и сезоны', nasa + 'mission/cassini/science/titan/'],
  ['Титан · геологическая карта JPL', 'https://www.jpl.nasa.gov/images/pia23174-first-global-geologic-map-of-titan/'],
  ...Object.entries(MOON_MAPS).map(([name,map]) => [name + ' · фотокарта · ' + map.mission, map.source])
 ]],
 ['Снимки спутников', Object.entries(MISSION_PHOTOS).flatMap(([name,photo]) => [
  [name + ' · оригинал снимка · ' + photo.credit, photo.source],
  [name + ' · снимок из атласа', './photos/' + photo.file]
 ])],
 ['Voyager 2', [
  ['3D-модель Voyager · ' + spacecraft.voyager2.modelCredit, spacecraft.voyager2.modelPage],
  ...spacecraft.voyager2.sources,
  ['Большой тур · история NASA', sources.planetary],
  ['Таблица сближений · NASA', sources.periapse],
  ['Архив научных измерений · NASA PDS', sources.pds],
  ['Архив колец и изображений · NASA PDS', sources.archive],
  ['Статус научных приборов · NASA', sources.status],
  ...events.map(event => [event.title + ' · источник', event.source]),
  ...parts.map(part => [part.name + ' · данные NASA', part.source])
 ]],
 ['Фотографии и схемы Voyager 2', Object.values(photos).map(photo => [
  photo.title + ' · ' + photo.kind + ' · ' + photo.credit, photo.page
 ])],
 ['Международная космическая станция', [...spacecraft.iss.sources,...stationSources]]
];

function sourceGroup(title, note) {
 const section = document.createElement('details');
 section.className = 'about-source-group';
 const summary = document.createElement('summary');
 summary.textContent = title;
 section.append(summary);
 if (note) {
  const paragraph = document.createElement('p');
  paragraph.textContent = note;
  section.append(paragraph);
 }
 const list = document.createElement('div');
 list.className = 'source-links';
 section.append(list);
 return {section,list};
}

function appendLinks(list, entries) {
 const labelsByUrl = new Map();
 for (const [label,url] of entries) {
  if (!url || !/^(https?:\/\/|\.\/)/i.test(url)) continue;
  if (!labelsByUrl.has(url)) labelsByUrl.set(url,new Set());
  labelsByUrl.get(url).add(label);
 }
 const links = document.createDocumentFragment();
 for (const [url,labels] of labelsByUrl) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = [...labels].join(' / ') + ' ↗';
  links.append(link);
 }
 list.replaceChildren(links);
}

async function read(path) {
 const response = await fetch(new URL(path,import.meta.url));
 if (!response.ok) throw new Error('HTTP ' + response.status);
 return response.json();
}

async function catalogLinks() {
 const [dwarfs, sizes, moons, supplemental, orbits] = await Promise.all([
  read('./dwarfs.json'), read('./moon-sizes.json'), read('./moons-catalog.json'),
  read('./supplemental-moons.json'), read('./orbit-distances.json')
 ]);
 const sizesBySource = new Set(Object.values(sizes.byName).map(value => value.source));
 return [
  ['Каталог спутников планет · JPL', moons.source],
  ['Луна · характеристики NASA', moons.earthSource],
  ['Орбитальные элементы · JPL', orbits.source],
  ['Машиночитаемый каталог спутников малых тел · JPL', supplemental.source],
  ...[...sizesBySource].map(url => ['Измерения размеров · ' + (url ? new URL(url).hostname : ''), url]),
  ...dwarfs.flatMap(dwarf => [
   [dwarf.name + ' · каталог JPL', dwarf.source],
   ...dwarf.moons.flatMap(moon => [
    [moon.name + ' · измерения размера', moon.sizeSource],
    [moon.name + ' · данные орбиты', moon.orbitSource]
   ])
  ]),
  ...supplemental.objects.flatMap(moon => [
   [moon.displayName + ' · запись JPL', moon.sourceObject],
   [moon.displayName + ' · наблюдения', moon.reference]
  ])
 ];
}

export function mountAboutSources(host) {
 for (const [title,entries] of sourcesByTopic) {
  const note = title === 'Voyager 2'
    ? 'NASA выпустила эту 3D-модель для обоих аппаратов Voyager. Она показывает их общую конструкцию.'
    : '';
  const {section,list} = sourceGroup(title,note);
  appendLinks(list,entries);
  host.append(section);
 }
 const route = sourceGroup('Эфемериды и отображение полёта Voyager 2',
  'Координаты рассчитаны по данным NAIF/JPL. За пределами окон пролёта для внешних планет показаны барицентры их систем. Ориентация аппарата, поворот планет и колец и звёздный фон условны.');
 host.append(route.section);
 const catalog = sourceGroup('Каталоги и записи малых спутников');
 host.append(catalog.section);
 loadGroup(route, async () => {
  const meta = await read('./spacecraft/data/voyager-states.json');
  return [['Файлы NAIF SPICE',meta.source],['Эфемериды JPL Horizons',meta.horizons]];
 });
 const filter = document.createElement('input');
 filter.type = 'search';
 filter.placeholder = 'Название или обозначение спутника';
 filter.setAttribute('aria-label', filter.placeholder);
 filter.hidden = true;
 catalog.section.insertBefore(filter,catalog.list);
 filter.addEventListener('input', () => {
  const query = filter.value.trim().toLocaleLowerCase('ru');
  for (const link of catalog.list.children) {
   link.hidden = !link.textContent.toLocaleLowerCase('ru').includes(query);
  }
 });
 loadGroup(catalog, async () => {
  const entries = await catalogLinks();
  filter.hidden = false;
  return entries;
 });
}

function loadGroup({section,list}, entries) {
 let loaded = false;
 section.addEventListener('toggle',async () => {
  if (!section.open || loaded) return;
  loaded = true;
  list.textContent = 'Загружаем источники…';
  try {
   appendLinks(list,await entries());
  } catch {
   list.textContent = 'Источники не загрузились. Сверните и откройте этот раздел снова.';
   loaded = false;
  }
 });
}

if (typeof document !== 'undefined') mountAboutSources(document.querySelector('#about-source-groups'));
