const notes=[
 'Белый свет · по умолчанию. Яркость уменьшена для осмотра деталей.',
 'Золотистый облик · художественная окраска, не естественный цвет из космоса.',
 'Условные цвета интенсивности SOHO/MDI: тёмные значения — синие, светлые — жёлтые. Это не температура и не ультрафиолет.',
 'Классическое оранжевое Солнце · художественная 3D-иллюстрация плазмы, а не фотография в естественном свете.'
];
export function mountSunAppearance(host,material,glow){
 const panel=document.createElement('section');panel.className='sun-appearance';
 panel.innerHTML='<label for="sun-appearance">Облик Солнца</label><select id="sun-appearance" aria-label="Облик Солнца"><option value="0">Естественный белый</option><option value="1">Золотистый</option><option value="2">Карта интенсивности · условные цвета</option><option value="3">Классическое оранжевое</option></select><p id="sun-appearance-note"></p><p class="fine">Историческая составная карта SOHO/MDI, цикл 23. Пробелы и полюса дополнены предыдущими картами. Это не текущее состояние Солнца.</p>';
 host.append(panel);const select=panel.querySelector('select');select.value=String(material.uniforms.appearance.value);
 const update=()=>{const value=Number(select.value);material.uniforms.appearance.value=value;panel.querySelector('#sun-appearance-note').textContent=notes[value];panel.querySelector('.fine').hidden=value===3;if(glow){glow.material.opacity=value===3?.9:.32;glow.material.color.setHex(value===3?0xff5500:0xffffff);}};
 select.onchange=update;update();
}
