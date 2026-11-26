import * as THREE from './vendor/three.module.js';

export const RING_NOTES = {
 jupiter:['Внутреннее пылевое гало, главное кольцо и два разреженных внешних кольца.', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupringfact.html'],
 saturn:['Ледяные кольца C, B и A, деление Кассини и узкое внешнее кольцо F.', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html'],
 uranus:['Тонкие тёмные кольца. Выделено кольцо ε, внешние пылевые кольца ν и μ показаны слабее.', 'https://pds-rings.seti.org/uranus/uranus_rings_table.html'],
 neptune:['Пять основных колец. Четыре дуги показаны в кольце Адамса, их положение условно.', 'https://pds-rings.seti.org/neptune/neptune_tables.html']
};

const REFERENCES = {jupiter:71492,saturn:60268,uranus:25559,neptune:24764};

function band(group, scale, name, center, width, color, opacity, options = {}) {
 const {height=0, eccentricity=0, arc=null, hard=false, grain=0} = options;
 const start = arc ? arc[0] : 0, angle = arc ? arc[1] : Math.PI*2;
 const half=width/2;
 const segments=arc?48:512;
 const geo=new THREE.RingGeometry((center-half)*scale,(center+half)*scale,segments,2,start,angle);
 const pos=geo.attributes.position, uv=geo.attributes.uv;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),r=Math.hypot(x,y);
  const theta=Math.atan2(y,x);
  uv.setXY(i,(r/scale-center+half)/width,(i%(segments+1))/segments);
  const stretch=(1-eccentricity**2)/(1+eccentricity*Math.cos(theta));
  pos.setXY(i,x*stretch,y*stretch);
 }
 geo.computeBoundingSphere();
 const mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({
  side:THREE.DoubleSide,transparent:true,depthWrite:false,
  uniforms:{tint:{value:new THREE.Color(color)},strength:{value:opacity},edge:{value:hard?.045:.46},arced:{value:arc?1:0},grain:{value:grain},sunDirection:{value:group.userData.sunDirection.clone()},planetRadius:{value:group.userData.planetRadius},edgeOnFade:{value:group.userData.edgeOnFade}},
  vertexShader:`varying vec2 ringUV; varying vec3 radialPosition,ringNormal,ringWorld;
   void main(){ringUV=uv;radialPosition=mat3(modelMatrix)*position;ringWorld=(modelMatrix*vec4(position,1.)).xyz;ringNormal=normalize(mat3(modelMatrix)*vec3(0.,0.,1.));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 tint,sunDirection;uniform float strength,edge,arced,grain,planetRadius,edgeOnFade;varying vec2 ringUV;varying vec3 radialPosition,ringNormal,ringWorld;
   void main(){
    float radial=smoothstep(0.,edge,ringUV.x)*smoothstep(0.,edge,1.-ringUV.x);
    float angular=mix(1.,smoothstep(0.,.24,ringUV.y)*smoothstep(0.,.24,1.-ringUV.y),arced);
    float structure=1.-grain*(.5+.3*sin(ringUV.x*153.)+.18*sin(ringUV.x*59.));
    vec3 sun=normalize(sunDirection);
    float along=dot(radialPosition,sun);
    float shadow=(1.-step(0.,along))*(1.-smoothstep(.94,1.03,length(radialPosition-along*sun)/planetRadius));
    float lit=mix(.62,1.,sqrt(abs(dot(ringNormal,sun))))*(1.-.41*shadow);
    vec3 sight=cameraPosition-ringWorld;
    vec3 eye=normalize(sight);
    float nearby=1.-smoothstep(4.,8.,length(sight+radialPosition)/planetRadius);
    float edgeOn=1.-smoothstep(.08,.34,abs(dot(eye,ringNormal)));
    float crossesDisk=1.-smoothstep(.86,1.1,length(cross(radialPosition,eye))/planetRadius);
    float visibility=1.-edgeOnFade*nearby*edgeOn*(.65+.35*crossesDisk);
    gl_FragColor=vec4(tint*structure*lit,strength*radial*angular*visibility);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 }));
 mesh.name=name;
 mesh.rotation.x=-Math.PI/2;
 mesh.position.y=height*scale;
 group.add(mesh);
}

function jupiter(group,scale){
 for(const h of [-3100,-1500,0,1500,3100]){
  band(group,scale,'Halo',106200,33600,0xc6a995,h===0?.10:.035,{height:h});
 }
 band(group,scale,'Main',125970,5940,0xd5bd9c,.29,{hard:true,grain:.22});
 band(group,scale,'Amalthea',155145,52410,0xbda58b,.10);
 band(group,scale,'Thebe',201625,40550,0xa9937c,.055);
 band(group,scale,'Thebe extension',250950,58100,0xa9937c,.022);
}

function saturn(group,scale){
 const bands=[
  ['D',66900,74510,0x776e61,.13],['C',74658,91975,0xb7a68b,.52],
  ['B inner',91975,102000,0xd4c6a7,.85],['B middle',102000,110000,0xebdfc6,.94],
  ['B outer',110000,117507,0xc8b99d,.81],['Cassini ringlets',118100,121700,0x9e9788,.13],
  ['A inner',122340,133410,0xc9c3b9,.72],['A outer',133735,136487,0xd5cdbe,.67],
  ['A edge',136530,136780,0xeee4cd,.61],['F',139826-160,139826+160,0xe5ddcb,.52],
  ['G',166000,173000,0xb3a29a,.045],['E',180000,480000,0xa1b5c7,.018]
 ];
 for(const [name,inner,outer,color,opacity] of bands){
  band(group,scale,name,(inner+outer)/2,outer-inner,color,opacity,{hard:!['G','E'].includes(name),grain:.32});
 }
}

function uranus(group,scale){
 band(group,scale,'ζ',39600,3500,0x9a9ba6,.085);
 const narrow=[['6',41838],['5',42234],['4',42571],['α',44718],['β',45661],['η',47176],['γ',47627],['δ',48300],['λ',50024]];
 for(const [name,radius] of narrow)band(group,scale,name,radius,85,0xaeb5c2,.27,{hard:true});
 band(group,scale,'ε',51149,190,0xd5dce5,.62,{hard:true,eccentricity:.00794});
 band(group,scale,'ν',67300,3800,0xb99a8d,.095);
 band(group,scale,'μ',97700,17000,0x8aacc5,.085);
}

function neptune(group,scale){
 band(group,scale,'Galle',42000,2000,0x9e9193,.085);
 band(group,scale,'Le Verrier',53200,170,0xb8a6a9,.34,{hard:true});
 band(group,scale,'Lassell',55200,4000,0x9f8d90,.15);
 band(group,scale,'Arago',57200,170,0xb8a6a9,.25,{hard:true});
 band(group,scale,'Adams',62933,140,0xbba0a0,.25,{hard:true});
 const arcs=[['Fraternité',2.08,.18],['Égalité',2.29,.085],['Liberté',2.41,.072],['Courage',2.53,.056]];
 for(const [name,start,angle] of arcs)band(group,scale,name,62933,270,0xf1ceba,.81,{hard:true,arc:[start,angle]});
}

const build = {jupiter,saturn,uranus,neptune};

export function planetRings(id,radius,sunDirection,unitsPerKm=radius/REFERENCES[id]){
 const group=new THREE.Group();
 group.name='Rings · '+id;
 group.userData.sunDirection=sunDirection;
 group.userData.planetRadius=radius;
 group.userData.edgeOnFade=id==="uranus"?1:0;
 build[id](group,unitsPerKm);
 return group;
}
