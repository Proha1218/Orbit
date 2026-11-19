import {readFileSync,writeFileSync} from 'node:fs';
let s=readFileSync('dist/app.js','utf8');
s=s.replace("if(seasonLight)seasonLight.position.copy(lightDirection);", "if(seasonLight){seasonLight.position.copy(lightDirection);scene.traverse(o=>{if(o.material?.uniforms?.sunDirection)o.material.uniforms.sunDirection.value.copy(lightDirection).normalize();});}");
s=s.replace("seasonIndex=+b.dataset.season;applySeason();", "seasonIndex=+b.dataset.season;applySeason();viewSeasonDay();");
s=s.replace("seasonHemisphere=e.target.value;applySeason();", "seasonHemisphere=e.target.value;applySeason();viewSeasonDay();");
s=s.replace("<div class=\"season-status\" id=\"season-status\"></div>","<button class=\"season-day\" id=\"season-day\">☀ Вид на дневную сторону</button><div class=\"season-status\" id=\"season-status\"></div>");
s=s.replace("$('#season-hemisphere').value=seasonHemisphere;", "$('#season-hemisphere').value=seasonHemisphere;$('#season-day').onclick=viewSeasonDay;");
s=s.replace('function applySeason(){',`function viewSeasonDay(){
 if(mode!=='planet')return;
 const body=selectedMoon?moonObjects.find(o=>moonKey(o.userData.moon)===selectedMoon):null;
 const target=body?body.position.clone():new THREE.Vector3();
 const distance=body?Math.max(1.2,body.userData.radius*5.8):18;
 const offset=seasonLight.position.clone().normalize().multiplyScalar(distance);offset.y+=distance*.32;
 fly(target.clone().add(offset),target);
 if(body){follow=body;previousFollow.copy(body.position);}
}
function applySeason(){`);
writeFileSync('dist/app.js',s);
let css=readFileSync('dist/style.css','utf8');
css+='\n.season-day{font-size:9px;color:#adc4e2;border:1px solid #ffffff15;border-radius:4px;padding:6px 9px;margin-bottom:10px}.season-day:hover{background:#adc4e211}.season-panel .season-note{max-height:155px;overflow-y:auto;scrollbar-width:thin}\n';
writeFileSync('dist/style.css',css);
