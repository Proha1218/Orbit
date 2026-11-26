import {imageEvents, photos} from './history-data.js';

const assetURL = id => new URL('./photos/'+id+'.jpg',import.meta.url).href;
export function gallery(ids=[]) {
 return ids.length?`<div class="mission-gallery">${ids.map(id=>{
  const p=photos[id];
  return `<button type="button" data-photo="${id}"><img loading="lazy" src="${assetURL(id)}" alt=""><span>${p.title}</span></button>`;
 }).join('')}</div>`:'';
}

export async function toggleFullscreen(element) {
 try {
  if(document.fullscreenElement===element)await document.exitFullscreen();
  else await element.requestFullscreen();
 } catch {
  element.classList.toggle('mission-expanded');
 }
}

export function openPhoto(id, trigger, onHistory) {
 const p=photos[id], event=imageEvents[id];
 if(!p)return;
 const dialog=document.createElement('dialog');
 dialog.className='mission-photo';
 dialog.setAttribute('aria-labelledby','mission-photo-title');
 dialog.innerHTML=`
  <header><h2 id="mission-photo-title">${p.title}</h2><button data-close autofocus>Закрыть</button></header>
  <div class="mission-photo-viewport"><img src="${assetURL(id)}" alt="${p.subject}"></div>
  <div class="spacecraft-actions"><button data-zoom=".8" aria-label="Уменьшить">−</button><button data-zoom="1.25" aria-label="Увеличить">+</button><button data-full>На весь экран</button>${event&&onHistory?'<button data-event>К событию</button>':''}</div>
  <p>${p.kind} · ${p.credit} · ${p.craft}${p.date?' · '+p.date:''}<br>${p.note}</p>
`;
 const img=dialog.querySelector('img');
 let zoom=1, destination;
 for(const button of dialog.querySelectorAll('[data-zoom]'))button.onclick=()=>{
  zoom=Math.max(1,Math.min(4,zoom*Number(button.dataset.zoom)));
  img.style.width=100*zoom+'%';
  img.classList.toggle('zoomed',zoom>1);
 };
 img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('p'),{textContent:'Изображение не загрузилось. Оригинал NASA доступен в разделе «О модели».'}));};
 dialog.querySelector('[data-full]').onclick=()=>void toggleFullscreen(dialog);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 const eventButton=dialog.querySelector('[data-event]');
 if(eventButton)eventButton.onclick=()=>{destination=event;dialog.close();};
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 dialog.addEventListener('close',()=>{dialog.remove();if(destination)onHistory(destination);else trigger?.focus();},{once:true});
 document.body.append(dialog);
 dialog.showModal();
}
