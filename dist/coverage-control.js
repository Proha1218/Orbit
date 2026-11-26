import {coverageFill} from './moon-maps.js';
export const fillableMoons=new Set(['Miranda','Ariel','Umbriel','Titania','Oberon','Triton']);
export function mountCoverageControl(host,key){
 if(key==='Europa'){
  const panel=document.createElement('section');
  panel.className='coverage-control';
  panel.innerHTML='<label for="hd-coverage-pilot">Покрытие · пилот HD</label><select id="hd-coverage-pilot" disabled><option value="1">Научный режим</option><option value="2">Иллюстративное заполнение</option><option value="3">Маска подтверждённых пробелов</option><option value="0">Отключить пилот</option></select><p class="fine">Тёмный цвет на маске отмечает подтверждённые пробелы USGS. Пограничные участки и базовая карта сохраняются.</p>';
  host.prepend(panel);
  return;
 }
 if(!fillableMoons.has(key))return;
 const panel=document.createElement('section');panel.className='coverage-control';panel.innerHTML='<label for="coverage-style">Пробелы исходной карты</label><select id="coverage-style" aria-label="Пробелы исходной карты"><option value="1">Плавное заполнение цветом · иллюстрация</option><option value="0">Исходное покрытие · области без данных</option></select><p class="fine">Цвет продолжен из заснятой области. Новые кратеры и рельеф не добавлены. Заполнение не является снимком поверхности.</p><p id="coverage-status"></p>';
 host.prepend(panel);const select=panel.querySelector('select');select.value=String(coverageFill.value);
 function update(){coverageFill.value=Number(select.value);panel.querySelector('#coverage-status').textContent=coverageFill.value?'Включено иллюстративное заполнение':'Серые области: отсутствуют данные наблюдений';}
 select.onchange=update;update();
}
