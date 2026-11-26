const navigation=document.querySelector('#object-navigation');
let expanded={planets:true,craft:true,belts:true};
try{expanded={...expanded,...JSON.parse(localStorage.getItem('orbita-tree')||'{}')};}catch{}

function section(key,label){
 const details=document.createElement('details');
 details.className='tree-section';details.open=!!expanded[key];
 const summary=document.createElement('summary');summary.textContent=label;
 details.append(summary);
 details.addEventListener('toggle',()=>{
  expanded[key]=details.open;
  try{localStorage.setItem('orbita-tree',JSON.stringify(expanded));}catch{}
 });
 return details;
}

export function revealObjectTab(button){
 for(let item=button?.parentElement;item&&item!==navigation;item=item.parentElement){
  if(item.tagName==='DETAILS')item.open=true;
 }
}

export function selectTreeMoon(key){
 for(const button of navigation.querySelectorAll('[data-tree-moon]')){
  const selected=key!==null&&button.dataset.treeMoon===key;
  button.classList.toggle('selected',selected);
  if(selected)revealObjectTab(button);
 }
}

function attachMoons(button,key,moons,select){
 if(!moons.length)return;
 const wrapper=document.createElement('div');wrapper.className='tree-object';
 button.before(wrapper);wrapper.append(button);
 const details=section(key,'Спутники');
 details.className='tree-moons';wrapper.append(details);
 const summary=details.querySelector('summary');
 summary.setAttribute('aria-label','Спутники '+button.textContent.trim());
 const list=document.createElement('div');list.className='tree-children';
 for(const moon of moons){
  const entry=document.createElement('button');entry.type='button';entry.className='tree-moon';
  entry.dataset.treeMoon=moon.key;entry.textContent=moon.label;
  entry.onclick=()=>{select(moon);selectTreeMoon(moon.key);};
  list.append(entry);
 }
 details.append(list);
}

export function mountObjectTree(catalog,dwarfs,handlers){
 navigation.querySelector('.object-tabs').remove();
 for(const [id,label] of [['planets','Планеты'],['dwarfs','Карликовые планеты'],['craft','Космические аппараты'],['belts','Пояса и области']]){
  const panel=document.querySelector('#object-panel-'+id);
  const branch=section(id,label);
  panel.before(branch);branch.append(panel);panel.hidden=false;
  panel.removeAttribute('role');panel.removeAttribute('aria-labelledby');
 }
 for(const button of document.querySelectorAll('#planet-nav [data-planet]')){
  const id=button.dataset.planet;
  attachMoons(button,'planet-'+id,(catalog.planets[id]||[]).map(m=>({key:m.name||m.designation,label:m.ru||m.name||m.designation})),moon=>handlers.planetMoon(id,moon.key));
 }
 for(const dwarf of dwarfs){
  const button=document.querySelector('#object-panel-dwarfs [data-dwarf="'+dwarf.id+'"]');
  if(!button)continue;
  attachMoons(button,'dwarf-'+dwarf.id,(dwarf.moons||[]).map((m,index)=>({key:m.key||m.name||m.officialName,label:m.name||m.officialName,index})),moon=>handlers.dwarfMoon(dwarf.id,moon.index));
 }
}
