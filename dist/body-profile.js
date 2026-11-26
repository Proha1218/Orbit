import {moonDiscovery, moonPhysics} from './moon-profile-data.js';

const EARTH_MASS = 5.9722e24;
const G_KM = 6.67430e-20;
const number = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 3});
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
 '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[character]);
const fmt = value => number.format(value);
const quantity = (value, unit) => Number.isFinite(value) && value > 0 ? fmt(value) + ' ' + unit : null;
const positive = value => Number(value) > 0 ? Number(value) : null;
const keyFor = name => String(name ?? '').replace(/\s+/g, '').replace(/([A-Z])0+(\d+)$/, '$1$2').toLowerCase();
const mass = value => {
 if (!value) return null;
 const exponent = Math.floor(Math.log10(value));
 const power = String(exponent).replace(/./g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]);
 return fmt(Number((value / 10 ** exponent).toPrecision(3))) + ' × 10' + power + ' кг';
};

const PLANET_FACTS = {
 mercury: [3.301e23, 3.7, 5.43, 'От −180 до +430 °C', 'Разреженная экзосфера: кислород, натрий, водород, гелий и калий'],
 venus: [4.867e24, 8.87, 5.24, '+464 °C в среднем', 'Углекислый газ, азот. Облака серной кислоты'],
 earth: [5.9722e24, 9.8, 5.51, '+15 °C в среднем', 'Азот и кислород'],
 mars: [6.417e23, 3.71, 3.93, '−65 °C в среднем', 'Преимущественно углекислый газ'],
 jupiter: [1.898e27, 24.79, 1.33, 'Около −110 °C при давлении 1 бар', 'Водород и гелий'],
 saturn: [5.683e26, 10.44, 0.69, 'Около −140 °C при давлении 1 бар', 'Водород и гелий'],
 uranus: [8.681e25, 8.87, 1.27, 'Около −195 °C при давлении 1 бар', 'Водород, гелий и метан'],
 neptune: [1.024e26, 11.15, 1.64, 'Около −200 °C при давлении 1 бар', 'Водород, гелий и метан']
};

export const DWARF_ROTATION = {
 ceres:['Около 9 ч'], pluto:['Около 6,39 сут.'], haumea:['Около 3,9 ч'],
 makemake:['Оценка: 22,83 ч','https://doi.org/10.1051/0004-6361/201935274'],
 eris:['Около 15,8 сут.','https://doi.org/10.3847/PSJ/acdd5f']
};
const DWARF_MOONS = {
 Charon:[1978, 'На снимках Джеймса Кристи обнаружилось выпячивание диска Плутона. Оно повторялось через равные промежутки времени и оказалось спутником.', 'New Horizons снял огромные каньоны и тёмную красноватую полярную область.'],
 Nix:[2005, 'Спутник обнаружили на снимках телескопа Hubble.', 'На снимках New Horizons виден яркий ледяной спутник неправильной формы.'],
 Hydra:[2005, 'Спутник обнаружили на снимках телескопа Hubble.', 'Гидра — самый далёкий из пяти известных спутников Плутона.'],
 Kerberos:[2011, 'Спутник обнаружили на снимках телескопа Hubble.', 'Изображения New Horizons показали две соединённые доли.'],
 Styx:[2012, 'Спутник обнаружили на снимках телескопа Hubble.', 'Стикс обращается между орбитами Харона и Никты.'],
 "Hi'iaka":[2005, '', 'Хииака — более крупный и более далёкий из двух известных спутников Хаумеа.'],
 Namaka:[2005, '', 'Намака обращается ближе к Хаумеа, чем её второй спутник Хииака.'],
 'S/2015 (136472) 1':[2015, 'На снимках телескопа Hubble видна слабая точка рядом с Макемаке.', 'Команда первооткрывателей использовала неофициальное сокращение MK 2.'],
 Dysnomia:[2005, '', 'Измерения орбиты Дисномии позволили оценить массу Эриды.']
};
const MOON_FEATURES = {
 Moon:'В 1969 году экипаж «Аполлона-11» совершил первую пилотируемую посадку на Луну.',
 Phobos:'Его крупнейший кратер Стикни назван в честь Анджелины Стикни Холл.',
 Deimos:'С поверхности Марса он выглядит как очень яркая звезда и движется по небу медленнее Фобоса.',
 Io:'Аппарат Voyager 1 в 1979 году снял вулканический шлейф над краем диска Ио.',
 Europa:'Аппарат Galileo измерил возмущения магнитного поля у Европы. Они согласуются с наличием солёного океана подо льдом.',
 Ganymede:'Магнитное поле формирует полярные сияния, которые наблюдал телескоп Hubble.',
 Callisto:'Ударная структура Вальхалла окружена многочисленными концентрическими кольцами.',
 Titan:'В январе 2005 года зонд Huygens спустился сквозь атмосферу и передал снимки с поверхности.',
 Enceladus:'Cassini пролетал через выбросы Энцелада и исследовал их состав без посадки на спутник.',
 Mimas:'Название кратера увековечивает Уильяма Гершеля, открывшего Мимас.',
 Tethys:'Кратер Одиссей занимает значительную часть диска спутника.',
 Dione:'Cassini показал, что светлые полосы образованы склонами разломов.',
 Rhea:'При пролётах Cassini у Реи обнаружили крайне разреженную экзосферу с кислородом и углекислым газом.',
 Iapetus:'За один оборот вокруг Сатурна Япет совершает ровно один оборот вокруг своей оси.',
 Phoebe:'Феба обращается в сторону, обратную вращению Сатурна.',
 Miranda:'Короноподобные области Миранды выделяются узором параллельных уступов и борозд на снимках Voyager 2.',
 Ariel:'У Ариэля самая светлая поверхность среди пяти крупных спутников Урана.',
 Umbriel:'На снимках Voyager 2 выделяется яркое кольцо на дне кратера Вунда.',
 Titania:'Её назвали в честь королевы фей из пьесы Шекспира «Сон в летнюю ночь».',
 Oberon:'Его назвали в честь короля фей из пьесы Шекспира «Сон в летнюю ночь».',
 Triton:'Во время пролёта в 1989 году Voyager 2 снял струи частиц над поверхностью Тритона.',
 Nereid:'Из-за вытянутой орбиты расстояние Нереиды от Нептуна меняется почти в семь раз.',
 Proteus:'Voyager 2 обнаружил Протей только в 1989 году. Раньше его было трудно увидеть рядом с ярким Нептуном.'
};

export function factGrid(rows) {
 const known = rows.filter(([, value]) => value != null && value !== '');
 return known.length ? '<dl class="fact-grid profile-grid">' + known.map(([label, value]) =>
  '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>'
 ).join('') + '</dl>' : '';
}

export function characteristics(rows) {
 const known = rows.filter(([, value]) => value != null && value !== '');
 const body = known.length ? '<dl class="profile-properties">' + known.map(([label, value]) =>
  '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>'
 ).join('') + '</dl>' : '<p>В карточке JPL пока нет измеренных характеристик для этого объекта.</p>';
 return '<details class="profile-characteristics" open><summary>Характеристики</summary>' + body + '</details>';
}

export function profileStories(sections) {
 return '<section class="body-story" aria-label="История и особенности">' + sections.filter(([, text]) => text).map(([title, text]) =>
  '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>'
 ).join('') + '</section>';
}

export function planetCharacteristics(planet, count) {
 const [kg, gravity, density, temperature, atmosphere] = PLANET_FACTS[planet.id];
 const giant = !['mercury','venus','earth','mars'].includes(planet.id);
 return characteristics([
  ['Масса', mass(kg) + ' (' + fmt(Number((kg / EARTH_MASS).toPrecision(3))) + ' массы Земли)'],
  [giant ? 'Гравитация у уровня облаков (1 бар)' : 'Гравитация', fmt(gravity) + ' м/с²'],
  ['Средняя плотность', fmt(density) + ' г/см³'],
  ['Температура', temperature],
  ['Атмосфера', atmosphere],
  ['Наклон оси', fmt(planet.tilt) + '°'],
  ['Возраст', 'Около 4,5 млрд лет'],
  ['Спутники в каталоге', count]
 ]);
}

export function dwarfCharacteristics(dwarf) {
 const orbit = dwarf.solarOrbit;
 const [rotation] = DWARF_ROTATION[dwarf.id];
 return characteristics([
  ['Средний радиус', quantity(dwarf.radiusKm, 'км')],
  ['Размеры по трём осям', dwarf.axesKm ? dwarf.axesKm.map(fmt).join(' × ') + ' км' : null],
  ['Спутники в каталоге', dwarf.moons.length],
  ['Номер малого тела', dwarf.designation]
 ]) + factGrid([
  ['Средний диаметр', quantity(dwarf.diameterKm, 'км')],
  ['Большая полуось орбиты', quantity(orbit?.aAu, 'а. е.')],
  ['Период обращения', quantity(orbit && Number((orbit.periodDays / 365.25).toFixed(2)), 'года')],
  ['Вращение вокруг оси', rotation]
 ]);
}

export function satelliteProfile(entry, {measure, orbit, description} = {}) {
 const name = entry.officialName || entry.key || entry.name;
 const key = keyFor(name);
 const discovery = moonDiscovery[key];
 const physics = moonPhysics[key];
 const dwarf = DWARF_MOONS[name];
 const radius = positive(measure?.radiusKm ?? entry.radiusKm);
 const diameter = positive(measure?.diameterKm ?? entry.diameterKm) || (radius && 2 * radius) || positive(entry.availablePhysicalParameters?.diameter?.value);
 const a = positive(orbit?.a ?? entry.aKm ?? entry.availableOrbit?.a);
 const period = positive(Math.abs(orbit?.period ?? entry.periodDays ?? Number(entry.availableOrbit?.per) / 24));
 const year = entry.discoveryYear || entry.year || dwarf?.[0] || discovery?.[0];
 const designation = entry.satelliteDesignation || entry.designation || discovery?.[2];
 const confirmed = entry.confirmed !== false;
 const discoverer = discovery?.[1];
 const factual = description || dwarf?.[2];
 const estimated = measure?.quality?.includes('estimate') || !measure && Boolean(entry.availablePhysicalParameters?.diameter);
 const orbitPrint = period && period < 1 ? quantity(period * 24, 'ч') : quantity(period, 'сут.');
 const status = confirmed ? 'Подтверждённый спутник' : 'Кандидат в спутники';
 const context = entry.parent ? 'Родительское тело — ' + entry.parent + '.' : '';
 const history = dwarf?.[1] || (name === 'Moon' ? 'Луна известна с древности. Её смену фаз люди наблюдали задолго до появления телескопов.' :
  year ? (confirmed ? 'Год открытия по каталогу — ' : 'Год наблюдения по каталогу — ') + year + '.' + (discoverer ? ' Открыватель или команда по JPL — ' + discoverer + '.' : '') : null);
 const feature = MOON_FEATURES[name];
 return (context ? '<p class="description">' + esc(context) + '</p>' : '') +
  characteristics([
   ['Статус', status],
   ['Обозначение', designation],
   ['Средний радиус', quantity(radius, 'км')],
   ['Размеры по трём осям', measure?.semiaxesKm ? measure.semiaxesKm.map(n => fmt(n * 2)).join(' × ') + ' км' : null],
   ['Масса', mass(physics?.[0] && physics[0] / G_KM)],
   ['Средняя плотность', quantity(physics?.[1], 'г/см³')],
   ['Вращение вокруг оси', quantity(positive(entry.availablePhysicalParameters?.rot_per?.value), 'ч')],
   ['Первоисточник наблюдений', entry.reference && entry.reference !== designation && !/^https?:/i.test(entry.reference) ? entry.reference : null]
  ]) + factGrid([
   [estimated ? 'Оценка диаметра' : 'Средний диаметр', quantity(diameter, 'км')],
   ['Большая полуось орбиты', quantity(a, 'км')],
   ['Период обращения', orbitPrint],
   ['Год ' + (confirmed ? 'открытия' : 'наблюдения'), year]
  ]) + profileStories([
   ['Как его открыли', history],
   ['Устройство и особенности', factual || 'Для этой записи в атласе нет подтверждённого описания поверхности и внутреннего строения.'],
   ['Интересная деталь', feature]
  ]);
}

export function sunProfile() {
 return '<p class="latin">ЗВЕЗДА</p><h2>Солнце</h2><span class="object-type">Звезда главной последовательности · G2 V</span><p class="description">Солнце — ближайшая к Земле звезда и центр нашей планетной системы. Его свет и тепло выделяются при превращении водорода в гелий в ядре.</p>' +
  characteristics([['Масса','1,99 × 10³⁰ кг'],['Средняя плотность','1,41 г/см³'],['Температура ядра','Около 15 млн °C'],['Состав','Преимущественно водород и гелий'],['Вращение у полюсов','Около 36 суток']]) + factGrid([['Диаметр','Около 1,39 млн км'],['Возраст','Около 4,6 млрд лет'],['Фотосфера','Около 5 500 °C'],['Оборот на экваторе','Около 25 суток']]) +
  profileStories([
   ['Как его изучали','Солнце наблюдают с древности. Исследования спектра позволили определить его состав, а снимки из космоса показали, как меняется корона.'],
   ['Устройство и особенности','Вокруг ядра находятся зона лучистого переноса и конвективная зона. Видимый диск соответствует фотосфере, выше которой лежат хромосфера и разреженная корона.'],
   ['Интересная деталь','Внешняя корона нагревается до миллионов градусов, хотя видимая поверхность гораздо холоднее.']
  ]);
}
