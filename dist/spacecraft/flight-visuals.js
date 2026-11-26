import * as T from '../vendor/three.module.js';
import {fromEcliptic} from './ephemeris.js';

export const UNIT_KM = 1e6;
const POINTS_PER_SIDE = 65;
const TRAVELED = 0x77cfe5;
const AHEAD = 0x777eaa;

// Subtract the time-dependent origin while coordinates are still Float64.
export function localRoutePoint(position, origin) {
 return fromEcliptic(position.map((value,i)=>(value-origin[i])/UNIT_KM));
}

export function fitShipDistance(radius, scale, aspect, fov) {
 const vertical=T.MathUtils.degToRad(fov*.5);
 const horizontal=Math.atan(Math.tan(vertical)*aspect);
 return radius*scale*1.22/Math.sin(Math.min(vertical,horizontal));
}

export function sampleRouteSide(eph, segment, state, time, span, direction, output) {
 const limit=direction<0?segment.first:segment.last;
 const end=direction<0?Math.max(limit,time-span):Math.min(limit,time+span);
 if(end===time)return 0;
 output.set([0,0,0]);
 for(let i=1;i<POINTS_PER_SIDE;i++){
  const t=i===POINTS_PER_SIDE-1?end:time+(end-time)*i/(POINTS_PER_SIDE-1);
  const point=eph.sample(segment,t).p;
  output.set(localRoutePoint(point,state.p),i*3);
 }
 return POINTS_PER_SIDE;
}

function makeLocalLine(color) {
 const positions=new T.Float32BufferAttribute(new Float32Array(POINTS_PER_SIDE*3),3);
 positions.setUsage(T.DynamicDrawUsage);
 const geometry=new T.BufferGeometry().setAttribute('position',positions);
 geometry.setDrawRange(0,0);
 const line=new T.Line(geometry,new T.LineBasicMaterial({color,transparent:true,depthWrite:false,opacity:.82}));
 line.frustumCulled=false;
 return line;
}

export function makeFlightRoute(eph, root, scene) {
 const distant=eph.meta.segments.map(segment=>{
  const locations=eph.route(segment);
  const origin=locations[0];
  const positions=locations.flatMap(point=>localRoutePoint(point,origin));
  const seconds=locations.map((_,i)=>eph.epoch(segment,i)-segment.first);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('routeSecond',new T.Float32BufferAttribute(seconds,1));
  const cut={value:0};
  const material=new T.ShaderMaterial({
   transparent:true,depthWrite:false,
   uniforms:{cut,pastColor:{value:new T.Color(TRAVELED)},nextColor:{value:new T.Color(AHEAD)}},
   vertexShader:`
    attribute float routeSecond;
    varying float trackSecond;
    void main(){
     trackSecond=routeSecond;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }
   `,
   fragmentShader:`
    uniform float cut;
    uniform vec3 pastColor, nextColor;
    varying float trackSecond;
    void main(){
     gl_FragColor=vec4(trackSecond<=cut?pastColor:nextColor,.84);
     #include <colorspace_fragment>
    }
   `
  });
  const line=new T.Line(geometry,material);
  line.position.fromArray(localRoutePoint(origin,[0,0,0]));
  root.add(line);
  return {segment,line,cut};
 });
 const near=[makeLocalLine(TRAVELED),makeLocalLine(AHEAD)];
 scene.add(...near);
 return {
  update({segment,state,time,overview,visible,cameraDistance}){
   for(const {segment,line,cut} of distant){
    line.visible=visible&&overview;
    if(line.visible)cut.value=time-segment.first;
   }
   for(const [i,line] of near.entries()){
    line.visible=visible&&!overview;
    if(!line.visible)continue;
    const speed=Math.hypot(...state.velocity);
    const span=T.MathUtils.clamp(12*cameraDistance*UNIT_KM/Math.max(speed,.01),.02,604800);
    const positions=line.geometry.attributes.position;
    const count=sampleRouteSide(eph,segment,state,time,span,i===0?-1:1,positions.array);
    positions.needsUpdate=true;
    line.geometry.setDrawRange(0,count);
   }
  },
  dispose(){
   for(const line of near){
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
   }
  }
 };
}

export function makeFlightSky(pixelRatio) {
 let seed=731;
 const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const positions=[], colors=[], sizes=[];
 const total=2900;
 for(let i=0;i<total;i++){
  const angle=random()*Math.PI*2;
  const y=random()*2-1;
  const radius=Math.sqrt(1-y*y);
  positions.push(radius*Math.cos(angle),y,radius*Math.sin(angle));
  const brightness=.25+random()**2*.48;
  const tint=random();
  colors.push(brightness*(.8+.2*tint),brightness*.9,brightness*(1-.21*tint));
  sizes.push((1+random()**4*1.35)*pixelRatio);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('starColor',new T.Float32BufferAttribute(colors,3));
 geometry.setAttribute('starSize',new T.Float32BufferAttribute(sizes,1));
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,
  vertexShader:`
   attribute vec3 starColor;
   attribute float starSize;
   varying vec3 tint;
   void main(){
    tint=starColor;
    gl_Position=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);
    gl_Position.z=gl_Position.w;
    gl_PointSize=starSize;
   }
  `,
  fragmentShader:`
   varying vec3 tint;
   void main(){
    float opacity=1.0-smoothstep(.21,.5,length(gl_PointCoord-vec2(.5)));
    gl_FragColor=vec4(tint,opacity*.78);
   }
  `
 });
 const sky=new T.Points(geometry,material);
 sky.frustumCulled=false;
 return sky;
}
