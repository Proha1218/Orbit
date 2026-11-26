export const stationInteriors={
 "Destiny": {
  "file": "iss-interior-destiny",
  "caption": "Вид из Unity в лабораторию Destiny · экспедиция 40 · NASA",
  "source": "https://www.nasa.gov/image-article/inside-international-space-stations-destiny-laboratory/"
 },
 "Kibo": {
  "file": "iss-interior-kibo",
  "caption": "Соити Ногути в шлюзе Kibo · 10 марта 2021 · NASA",
  "source": "https://www.nasa.gov/image-article/jaxa-astronaut-soichi-noguchi-inside-kibos-airlock/"
 },
 "Cupola": {
  "file": "iss-interior-cupola",
  "caption": "Иллюминаторы наблюдательного модуля Cupola · NASA",
  "source": "https://www.nasa.gov/image-article/interior-view-from-international-space-station-cupola/"
 },
 "Columbus": {
  "file": "iss-interior-columbus",
  "caption": "Джош Кассада в лаборатории Columbus · 18 октября 2022 · NASA / Фрэнк Рубио",
  "source": "https://www.nasa.gov/image-article/astronaut-josh-cassada-works-inside-columbus-laboratory-module/"
 },
 "Quest": {
  "file": "iss-interior-quest",
  "caption": "Скафандры для выхода в открытый космос в шлюзе Quest · 20 мая 2023 · NASA",
  "source": "https://www.nasa.gov/image-article/spacesuits-pictured-inside-the-quest-airlock/"
 }
};

const assembly='https://www.nasa.gov/international-space-station/international-space-station-assembly-elements/';
export const stationSources=[
 ...Object.entries(stationInteriors).map(([name,photo])=>[name+' · интерьер · NASA',photo.source]),
 ['Сборочные элементы МКС · NASA',assembly],
 ['Начало сборки · NASA','https://www.nasa.gov/history/25-years-ago-nasa-partners-begin-space-station-assembly/'],
 ['Архив фотографий начала сборки · NASA','https://www.nasa.gov/history/20-years-ago-space-station-construction-begins/'],
 ['Истоки МКС · NASA','https://www.nasa.gov/history/space-station-20th-historical-origins-of-iss/'],
 ['Операции и выходы в космос · NASA','https://www.nasa.gov/reference/international-space-station/'],
 ['Ночные огни Земли · Black Marble 2016 · NASA','https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/'],
 ['Эфемериды NASA OEM','https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt']
];
export const stationParts={
 'Российский сегмент':[['Заря','Первый модуль. Обеспечивал питание, связь и управление на раннем этапе.'],['Звезда','Служебный модуль с системами жизнеобеспечения.'],['Поиск','Малый исследовательский модуль и шлюз.'],['Рассвет','Исследовательский и стыковочный модуль.'],['Наука','Многоцелевой лабораторный модуль.'],['Причал','Узловой модуль российского сегмента.']],
 'Американский и международный сегменты':[['Unity','Соединительный узел, с которого началась сборка американского сегмента.'],['Destiny','Основная американская лаборатория.'],['Quest','Шлюз для выходов в открытый космос.'],['Harmony','Узел, к которому присоединены международные лаборатории.'],['Tranquility','Модуль с системами жизнеобеспечения.'],['Cupola','Наблюдательный модуль с семью окнами.'],['Columbus','Орбитальная лаборатория ESA.'],['Kibo','Японский лабораторный комплекс JAXA.'],['Leonardo','Герметичный модуль хранения.'],['BEAM','Экспериментальный надувной модуль.'],['Bishop Airlock','Коммерческий шлюз для вывода оборудования наружу.']],
 'Внешнее оборудование':[['Центральная ферма','Несущая конструкция для батарей, радиаторов и оборудования.'],['Основные солнечные батареи','Преобразуют энергию Солнца в электричество.'],['iROSA','Дополнительные разворачиваемые солнечные батареи.'],['Радиаторы','Отдают тепло систем станции в космос.'],['Canadarm2','Манипулятор для сборки, обслуживания и перемещения грузов.'],['Dextre','Робот для точных работ с внешним оборудованием.'],['European Robotic Arm','Манипулятор российского сегмента.'],['Mobile Base System','Мобильная платформа робототехнического комплекса.'],['AMS-02','Магнитный спектрометр для исследования космических лучей.'],['NICER','Рентгеновский телескоп для наблюдения нейтронных звёзд.'],['Bartolomeo','Внешняя платформа экспериментов.'],['Антенны','Обеспечивают передачу данных и связь.'],['Стыковочные узлы','Обеспечивают присоединение кораблей.']],
 'Исторические компоненты':[['Пирс','Шлюз и стыковочный отсек российского сегмента. Прибыл в 2001 году.']]
};
export const stationHistory=[
 ['1998-11-20','Строительство','Запуск «Зари»','Ракета «Протон» вывела с Байконура функционально-грузовой блок «Заря». Первый модуль обеспечивал раннюю станцию электричеством и средствами управления.'],
 ['1998-12-06','Сборка','Соединение Unity и «Зари»','Во время STS-88 экипаж Endeavour захватил «Зарю» манипулятором и соединил с Unity. В сборке участвовали Боб Кабана, Рик Стеркоу, Нэнси Карри, Джерри Росс, Джеймс Ньюман и Сергей Крикалёв.'],
 ['1998-12-07','Выходы в космос','Первый выход в космос при сборке МКС','Джерри Росс и Джеймс Ньюман соединяли электрические кабели и линии данных между Unity и «Зарёй».'],
 ['2000-11-02','Экспедиции','Прибытие первой экспедиции','Уильям Шеперд, Юрий Гидзенко и Сергей Крикалёв прибыли на корабле «Союз». С этого этапа началось постоянное пребывание экипажей на станции.'],
 ['2001-09-17','Сборка','Прибытие отсека «Пирс»','Новый отсек дал российскому сегменту собственный шлюз для выхода в открытый космос и дополнительный стыковочный порт.'],
 ['2021-07-29','Модернизация','Стыковка модуля «Наука»','К российскому сегменту присоединился многоцелевой лабораторный модуль. Вместе с ним на станцию доставили European Robotic Arm.']
];

export const stationPhotos={
 '1998-11-20':['iss_zarya_launch','Запуск «Зари» с Байконура · 20 ноября 1998 · NASA'],
 '1998-12-06':['zarya_from_sts88','«Заря» на снимке экипажа STS-88 · декабрь 1998 · NASA'],
 '2000-11-02':['iss_crew','Уильям Шеперд, Юрий Гидзенко и Сергей Крикалёв · архив NASA']
};
