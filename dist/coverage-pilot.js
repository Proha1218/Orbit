export function installCoveragePilot(material,id){
 const original=material.onBeforeCompile;
 const state={pilotMode:{value:0},pilotMask:{value:null},pilotField:{value:null}};
 if(id==='europa')state.pilotDisplay={value:null};
 material.userData.coveragePilot=state;
 material.userData.coveragePilotId=id;
 material.onBeforeCompile=function(shader,renderer){
  original.call(this,shader,renderer);
  Object.assign(shader.uniforms,state);
  shader.fragmentShader='uniform int pilotMode; uniform sampler2D pilotMask; uniform sampler2D pilotField;\n'+(id==='europa'?'uniform sampler2D pilotDisplay;\n':'')+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('float strength=max',[
   'if(pilotMode>0){',
   ' bool observed=texture2D(pilotMask,vMapUv).r>.5;',
   ' if(pilotMode==3) diffuseColor.rgb=observed?vec3(.44,.81,.71):vec3(.16,.19,.24);',
   ...(id==='europa'?[' else if(pilotMode==2){ if(texture2D(pilotDisplay,vMapUv).r<=.5) diffuseColor.rgb=texture2D(pilotField,vMapUv).rgb; }']:[]),
   ' else if(!observed) diffuseColor.rgb=pilotMode==2?texture2D(pilotField,vMapUv).rgb:vec3(.085,.095,.11);',
   '}else{',
   'float strength=max'
  ].join('\n')).replace('emptyColor,nodata);','emptyColor,nodata); }');
 };
 material.customProgramCacheKey=()=> 'hd-coverage-pilot-'+id;
}
