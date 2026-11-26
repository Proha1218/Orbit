const navigation=document.querySelector('#object-navigation');
const tabs=[...navigation.querySelectorAll('[data-object-tab]')];
const panels=[...navigation.querySelectorAll('[data-object-panel]')];
const storageKey='orbita-object-tab';

function selectTab(id){
 if(!tabs.some(tab=>tab.dataset.objectTab===id))return;
 for(const tab of tabs){
  const active=tab.dataset.objectTab===id;
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
 }
 for(const panel of panels)panel.hidden=panel.dataset.objectPanel!==id;
 try{localStorage.setItem(storageKey,id);}catch{}
}

export function revealObjectTab(button){
 const panel=button?.closest('[data-object-panel]');
 if(panel)selectTab(panel.dataset.objectPanel);
}

let initial='planets';
try{initial=localStorage.getItem(storageKey)||initial;}catch{}
selectTab(tabs.some(tab=>tab.dataset.objectTab===initial)?initial:'planets');
for(const [index,tab] of tabs.entries()){
 tab.addEventListener('click',()=>selectTab(tab.dataset.objectTab));
 tab.addEventListener('keydown',event=>{
  const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:2,ArrowUp:-2};
  let next;
  if(Object.hasOwn(offsets,event.key))next=tabs[(index+offsets[event.key]+tabs.length)%tabs.length];
  else if(event.key==='Home')next=tabs[0];
  else if(event.key==='End')next=tabs.at(-1);
  else return;
  event.preventDefault();
  event.stopPropagation();
  next.focus();
  selectTab(next.dataset.objectTab);
 });
}
