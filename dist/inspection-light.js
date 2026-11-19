export function installInspectionLight(root,uniform){
 root.traverse(object=>{
  const material=object.material;
  if(!material?.isMeshStandardMaterial||material.userData.inspectionInstalled)return;
  material.userData.inspectionInstalled=true;
  const originalCompile=material.onBeforeCompile;
  const originalKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
   originalCompile.call(this,shader,renderer);
   shader.uniforms.inspectionLight=uniform;
   shader.fragmentShader='uniform float inspectionLight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',
    'outgoingLight = mix(outgoingLight, diffuseColor.rgb, inspectionLight);\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=>originalKey+'|inspection-light-v1';
  material.needsUpdate=true;
 });
}
