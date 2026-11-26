import * as THREE from './vendor/three.module.js';
export function sunMaterial(map){
 return new THREE.ShaderMaterial({
  uniforms:{surfaceMap:{value:map},appearance:{value:0}},toneMapped:false,
  vertexShader:`varying vec2 surfaceUv;varying vec3 localDirection;varying vec3 worldNormal;varying vec3 worldPosition;
   void main(){surfaceUv=uv;localDirection=normal;worldNormal=normalize(mat3(modelMatrix)*normal);worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.);}`,
  fragmentShader:`uniform sampler2D surfaceMap;uniform float appearance;varying vec2 surfaceUv;varying vec3 localDirection;varying vec3 worldNormal;varying vec3 worldPosition;
   float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){
    vec3 sampleColor=texture2D(surfaceMap,surfaceUv).rgb;
    float facing=max(0.,dot(normalize(worldNormal),normalize(cameraPosition-worldPosition)));
    float limb=.62+.38*sqrt(facing);
    float intensity=clamp(dot(sampleColor,vec3(.2126,.7152,.0722)),0.,1.);
    vec3 color=vec3(intensity)*.98;
    if(appearance>.5 && appearance<1.5)color=vec3(1.,.76,.39)*intensity*.95;
    if(appearance>1.5)color=mix(vec3(.025,.06,.30),vec3(1.,.85,.16),intensity);
    if(appearance>2.5){vec3 p=normalize(localDirection);float detail=noise(p*16.)*.18+noise(p*65.)*.28+noise(p*210.)*.54;float activity=smoothstep(.62,.86,noise(p*5.));color=mix(vec3(.62,.025,.001),vec3(1.,.32,.012),smoothstep(.18,.72,detail));color+=vec3(.38,.30,.08)*activity*.8;}
    color*=limb;
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }`
 });
}
