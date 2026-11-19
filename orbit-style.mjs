import {readFileSync,writeFileSync} from 'node:fs';
let s=readFileSync('dist/app.js','utf8');
const start=s.indexOf('function addOrbit('),end=s.indexOf('\nfunction makePlanet',start);
if(start<0||end<0)throw Error('Orbit function not found');
s=s.slice(0,start)+`function addOrbit(radius,parent,color=0x6d819c,opacity=.2,inclination=0){
 const pts=[];
 for(let i=0;i<=360;i++){const a=i/360*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));}
 const selected=color===0xefb284;
 const material=new THREE.LineDashedMaterial({color:selected?0x91f0ff:0x539bd1,transparent:true,opacity:selected?.8:.42,dashSize:radius*.027,gapSize:radius*.021,depthWrite:false});
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),material);
 line.computeLineDistances();line.rotation.x=-inclination;line.visible=state.orbits;
 parent.add(line);orbitLines.push(line);return line;
}`+s.slice(end);
s=s.replace("state.orbits=e.target.checked;orbitLines.forEach", "state.orbits=e.target.checked;document.body.classList.toggle('orbits-hidden',!state.orbits);orbitLines.forEach");
writeFileSync('dist/app.js',s);
let h=readFileSync('dist/index.html','utf8');
h=h.replace('<div class="scene-hint">','<div class="scene-legend" aria-label="Обозначения сцены"><span class="legend-orbit"><i></i>Орбиты</span><span class="legend-ring"><i></i>Кольца планет</span></div><div class="scene-hint">');
writeFileSync('dist/index.html',h);
let css=readFileSync('dist/style.css','utf8');
css+='\n.scene-legend{position:absolute;left:24px;bottom:57px;display:flex;flex-direction:column;gap:9px;padding:10px 12px;border:1px solid #ffffff10;border-radius:6px;background:#090f1bcc;backdrop-filter:blur(8px);font-size:9px;color:#a9bad0;pointer-events:none}.scene-legend>span{display:flex;align-items:center;gap:9px}.scene-legend i{display:block;width:23px}.legend-orbit i{border-top:1px dashed #539bd1}.legend-ring i{height:5px;background:linear-gradient(#d5cab1,#887d67,#c1b79d);border-radius:1px}.orbits-hidden .legend-orbit{opacity:.35}.cinematic .scene-legend{display:none}@media(max-width:600px){.scene-legend{left:auto;right:15px;bottom:60px;gap:6px;padding:7px 9px;font-size:8px}.scene-badge{max-width:150px;line-height:1.5}}\n';
writeFileSync('dist/style.css',css);
