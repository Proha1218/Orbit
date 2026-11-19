import {readFileSync,writeFileSync} from 'node:fs';
let code=readFileSync('dist/app.js','utf8');
code=code.replaceAll('moonRelief(key,[',"moonRelief(info?key:'minor',[").replaceAll('moonRelief(key),bumpScale',"moonRelief(info?key:'minor'),bumpScale").replace('body.castShadow=true;body.receiveShadow=true;if','body.castShadow=important;body.receiveShadow=important;if');
code=code.replace('object.getWorldPosition(temp);const dist=',"object.getWorldPosition(temp);if(mode==='planet'&&object!==focusPlanet){const toward=temp.clone().sub(camera.position);const t=-camera.position.dot(toward)/toward.lengthSq();if(t>0&&t<1&&camera.position.clone().addScaledVector(toward,t).length()<3.3)visible=false;}const dist=");
code=code.replace('object.userData.radius/dist*h*.65','object.userData.radius/dist*h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))+12');
writeFileSync('dist/app.js',code);
