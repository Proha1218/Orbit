import * as THREE from './vendor/three.module.js';
export function sunMaterial(map){
 return new THREE.ShaderMaterial({
  uniforms:{surfaceMap:{value:map}},toneMapped:false,
  vertexShader:`varying vec2 surfaceUv;varying vec3 worldNormal;varying vec3 worldPosition;
   void main(){surfaceUv=uv;worldNormal=normalize(mat3(modelMatrix)*normal);worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.);}`,
  fragmentShader:`uniform sampler2D surfaceMap;varying vec2 surfaceUv;varying vec3 worldNormal;varying vec3 worldPosition;
   void main(){
    vec3 sampleColor=texture2D(surfaceMap,surfaceUv).rgb;
    float facing=max(0.,dot(normalize(worldNormal),normalize(cameraPosition-worldPosition)));
    float limb=.62+.38*sqrt(facing);
    vec3 color=sampleColor*.86*limb;
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }`
 });
}
