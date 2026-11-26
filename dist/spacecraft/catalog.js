const nasa = 'https://science.nasa.gov/mission/voyager';
const voyager2 = {
 title: 'Voyager 2',
 mission: true,
 presentation: {z: -70 * Math.PI / 180, roll: Math.PI / 2},
 model: new URL('./voyager.glb', import.meta.url),
 modelCredit: 'NASA Visualization Technology Applications and Development (VTAD)',
 modelPage: 'https://science.nasa.gov/resource/voyager-3d-model/',
 introduction: 'Автоматический зонд NASA для изучения планет гигантов. Пролетел у Юпитера, Сатурна, Урана и Нептуна. После планетного этапа миссия продолжилась исследованием межзвёздной среды.',
 facts: [
  ['Запуск', '20 августа 1977 года'],
  ['Масса аппарата', 'Около 825 кг после отделения разгонной ступени'],
  ['Диаметр антенны', '3,7 м'],
  ['Штанга магнитометров', '13 м']
 ],
 sections: [
  ['Научные приборы', 'Две камеры, ультрафиолетовый спектрометр, инфракрасный спектрометр и радиометр, фотополяриметр, магнитометры, приборы для изучения плазмы, плазменных волн, космических лучей и заряженных частиц низких энергий, а также прибор для регистрации планетного радиоизлучения. Радиосвязь также использовали для научных измерений.'],
  ['Связь', 'Параболическая антенна высокого усиления связывает зонд со станциями сети Deep Space Network. Для передачи на Землю предусмотрены X- и S-диапазоны.'],
  ['Электропитание', 'Три радиоизотопных термоэлектрических генератора преобразуют тепло распада плутония-238 в электричество.']
 ],
 sources: [
  ['Миссия Voyager 2 · NASA', nasa + '/voyager-2/'],
  ['Конструкция и связь · NASA', nasa + '/spacecraft/'],
  ['Научные приборы · NASA', nasa + '/instruments/'],
  ['Масса аппарата · NASA PDS', 'https://pds.nasa.gov/data/pds4/1300/dph_example_archive_VG2PLS/document/MISSION/MISSION.HTM'],
  ['Габариты · NASA', nasa + '/frequently-asked-questions/'],
  ['Правила использования материалов NASA', 'https://www.nasa.gov/nasa-brand-center/images-and-media/']
 ]
};
const iss = {
 title: 'Международная космическая станция',
 model: new URL('./iss-igoal.glb', import.meta.url),
 enablePan: true,
 draco: true,
 introduction: 'МКС — лаборатория микрогравитации на низкой околоземной орбите. Станцию построили совместно NASA, Роскосмос, ESA, JAXA и Канадское космическое агентство.',
 facts: [
  ['Первый модуль', '«Заря» · 20 ноября 1998 года'],
  ['Первая экспедиция', '2 ноября 2000 года'],
  ['Размах', 'Около 109 м'],
  ['Масса', 'Около 420 т']
 ],
 sections: [
  ['О внешнем облике', 'Внешний облик по модели NASA IGOAL. Конфигурация модели имеет фиксированный состав.'],
  ['Исследования', 'Экипажи изучают влияние микрогравитации на человека, поведение жидкостей и материалов, выращивают растения и испытывают оборудование для длительных полётов.'],
  ['Устройство', 'Герметичные модули соединены переходами и стыковочными узлами. Внешняя ферма несёт солнечные батареи и радиаторы. Манипулятор Canadarm2 помогает при сборке, обслуживании и захвате грузовых кораблей.'],
  ['Орбита', 'Станция совершает оборот вокруг Земли примерно за 90 минут. Высота орбиты меняется и периодически корректируется.']
 ],
 sources: [
  ['Оригинальная модель МКС · NASA IGOAL', 'https://science.nasa.gov/3d-resources/international-space-station-iss-d-igoal/'],
  ['Станция на снимке Crew Dragon · NASA', 'https://www.nasa.gov/image-article/station-pictured-from-spacex-crew-dragon-5/'],
  ['Характеристики МКС · NASA', 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/'],
  ['Конструкция и сборка станции · NASA', 'https://www.nasa.gov/reference/international-space-station/'],
  ['Первая экспедиция · NASA', 'https://www.nasa.gov/missions/station/iss-research/expedition-1-kicks-off-science-aboard-international-space-station/'],
  ['Наука и устройство МКС · NASA', 'https://science.nasa.gov/resource/international-space-station/']
 ]
};

export const spacecraft = {voyager2, iss};
