import {
 Box3, DirectionalLight, Group, HemisphereLight, NeutralToneMapping,
 PerspectiveCamera, Quaternion, Raycaster, Scene, Vector2, Vector3, WebGLRenderer
} from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {modelLoadLabel,refreshModelProfile,registerGraphicsViewer,viewerRatio} from '../graphics.js';
import {resourceSignal} from '../load-resource.js';
import {stationMin,stationMax,trimStationAttributes,watchStationModel} from './station-lod.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';

const initialDirection = new Vector3(1.35, .68, 1.1).normalize();
const viewRight = new Vector3(0, 1, 0).cross(initialDirection).normalize();
const viewUp = initialDirection.clone().cross(viewRight);

function viewPoints(model,useBounds) {
 const points = [];
 const vertex = new Vector3();
 model.updateMatrixWorld(true);
 model.traverse(mesh => {
  const positions = mesh.geometry?.getAttribute('position');
  if (!positions) return;
  if(useBounds){
   mesh.geometry.computeBoundingBox();
   const {min,max}=mesh.geometry.boundingBox;
   for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
    vertex.set(x,y,z).applyMatrix4(mesh.matrixWorld);
    points.push([vertex.dot(viewRight),vertex.dot(viewUp),vertex.dot(initialDirection)]);
   }
   return;
  }
  for (let i = 0; i < positions.count; i++) {
   vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
   points.push([vertex.dot(viewRight), vertex.dot(viewUp), vertex.dot(initialDirection)]);
  }
 });
 return points;
}

export function disposeModel(model) {
 const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
 model.traverse(object => {
  if (object.geometry) geometries.add(object.geometry);
  const assigned = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of assigned) if (material) materials.add(material);
 });
 for (const material of materials) {
  for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  material.dispose();
 }
 for (const texture of textures) {
  if (typeof texture.image?.close === 'function') images.add(texture.image);
  texture.dispose();
 }
 for (const image of images) image.close();
 for (const geometry of geometries) geometry.dispose();
}

export async function loadSpacecraftModel(url,draco,signal,station=false){
   const deadline=resourceSignal(signal,60000);
   const response = await fetch(url,{signal:deadline});
   if (!response.ok) throw new Error('HTTP ' + response.status);
   const bytes = await response.arrayBuffer();
   if (signal.aborted) return;
   const loader = new GLTFLoader();
   if(station&&draco)loader.register(parser=>({name:'orbita-station-attributes',beforeRoot(){trimStationAttributes(parser.json);}}));
   if(station&&!draco){
    const {MeshoptDecoder}=await import('../vendor/meshopt_decoder.module.js');
    loader.setMeshoptDecoder(MeshoptDecoder);
   }
   let decoder;
   if (draco) {
    const {DRACOLoader} = await import('../vendor/loaders/DRACOLoader.js');
    if (signal.aborted) return;
    deadline.throwIfAborted();
    decoder = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href).setWorkerLimit(2);
    loader.setDRACOLoader(decoder);
   }
   const pending=loader.parseAsync(bytes,new URL('.',url).href).then(gltf=>{
    if(!deadline.aborted)return gltf;
    disposeModel(gltf.scene);
    throw deadline.reason;
   });
   let cancel;
   try {
    const cancelled=new Promise((_,reject)=>{
     cancel=()=>reject(deadline.reason);
     if(deadline.aborted)cancel();
     else deadline.addEventListener('abort',cancel,{once:true});
    });
    const gltf=await Promise.race([pending,cancelled]);
    if(deadline.aborted){disposeModel(gltf.scene);throw deadline.reason;}
    return gltf;
   } finally {
    deadline.removeEventListener('abort',cancel);
    decoder?.dispose();
   }
}

export function createViewer(host, url, callbacks) {
 const abort = new AbortController();
 const scene = new Scene();
 // Rotate the presentation only. Part coordinates stay in the NASA model frame.
 const presentation = new Group();
 if (callbacks.presentation) {
  const {z, roll} = callbacks.presentation;
  presentation.rotation.z = z;
  presentation.quaternion.premultiply(new Quaternion().setFromAxisAngle(initialDirection, roll));
 }
 scene.add(presentation);
 const camera = new PerspectiveCamera(40);
 const renderer = new WebGLRenderer({alpha: true, antialias: true});

 renderer.toneMapping = NeutralToneMapping;
 renderer.domElement.setAttribute('aria-label', 'Интерактивная модель аппарата');
 host.prepend(renderer.domElement);

 const controls = new OrbitControls(camera, renderer.domElement);
 controls.enablePan = callbacks.enablePan ?? false;
 controls.enableDamping = true;
 controls.autoRotateSpeed = .8;
 const key = new DirectionalLight(0xfff3e3, 4.2);
 key.position.set(5, 4, 6);
 const fill = new DirectionalLight(0xadcaff, 1.15);
 fill.position.set(-4, 1, -5);
 scene.add(key, fill, new HemisphereLight(0xe2ebff, 0x7c8395, 2.1));

 let model, modelLoad, radius, points, distance, previousTime, frame, cameraMove, highlight, down;
 let markersVisible = false, partsActive = false;
 const ray = new Raycaster(), pointer = new Vector2();
 const surfaces = [];
 const markerLayer = document.createElement('div');
 markerLayer.className = 'spacecraft-markers';
 host.append(markerLayer);
 const markers = (callbacks.parts ?? []).filter(part => part.anchor).map(part => {
  const button = document.createElement('button');
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-label', part.name);
  button.textContent = part.id === 'HGA' ? 'Антенна' : part.name;
  markerLayer.append(button);
  button.onclick = () => callbacks.select(part.id);
  return {part, button, point:new Vector3(...part.anchor)};
 });
 const clearHighlight = () => {
  if (!highlight) return;
  highlight.mesh.material = highlight.original;
  highlight.tint.dispose();
  highlight = null;
 };
 function frameTarget(position, length) {
  const target = model.localToWorld(new Vector3(...position));
  const to = target.clone().addScaledVector(initialDirection, length);
  cameraMove = {start:performance.now(), from:camera.position.clone(), to, target,
   fromTarget:controls.target.clone()};
 }
 function inspectPart(part) {
  clearHighlight();
  if (!model || !part) return;
  const mesh = part.mesh && model.getObjectByName(part.mesh);
  if (mesh?.isMesh && mesh.material.emissive) {
   const original = mesh.material;
   const tint = original.clone();
   tint.emissive.setHex(0xffb866);
   tint.emissiveIntensity = .42;
   mesh.material = tint;
   highlight = {mesh, original, tint};
  }
  if (part.view) frameTarget(part.view, part.zoom * Math.max(1, .82 / camera.aspect));
 }
 function updateMarkers() {
  const filled = [];
  const width = host.clientWidth, height = host.clientHeight;
  for (const {button, point} of markers) {
   button.hidden = true;
   if (!markersVisible) continue;
   const world = model.localToWorld(point.clone());
   const screen = world.clone().project(camera);
   if (Math.abs(screen.x) > .85 || Math.abs(screen.y) > .85 || Math.abs(screen.z) > 1) continue;
   const offset = world.clone().sub(camera.position);
   ray.set(camera.position, offset.clone().normalize());
   if (ray.intersectObjects(surfaces, false)[0]?.distance < offset.length() - .15) continue;
   const x = (screen.x*.5+.5)*width, y = (.5-screen.y*.5)*height;
   if (filled.some(p => Math.abs(p.x-x)<112 && Math.abs(p.y-y)<33)) continue;
   filled.push({x,y});
   button.style.left = x+'px';
   button.style.top = y+'px';
   button.hidden = false;
  }
 }
 const canvas = renderer.domElement;
 canvas.addEventListener('pointerdown', e => {down = [e.clientX,e.clientY];});
 canvas.addEventListener('pointerup', e => {
  if (!partsActive || !down || Math.hypot(e.clientX-down[0],e.clientY-down[1])>5) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1, 1-(e.clientY-rect.top)/rect.height*2);
  ray.setFromCamera(pointer,camera);
  const hit = ray.intersectObjects(surfaces,false)[0];
  const part = hit && callbacks.parts.find(p => p.mesh===hit.object.name);
  if (part) callbacks.select(part.id);
 });
 controls.addEventListener('start', () => {cameraMove=null;});
 function size() {
  const width = host.clientWidth, height = host.clientHeight;
  if (!width || !height) return;
  const ratio=viewerRatio(width,height,renderer.capabilities.maxTextureSize);
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  if (radius) {
   const vertical = Math.tan(camera.fov * Math.PI / 360) * .86;
   const horizontal = vertical * camera.aspect;
   let nextDistance = radius;
   for (const [x, y, depth] of points) {
    nextDistance = Math.max(nextDistance, depth + Math.max(Math.abs(x) / horizontal, Math.abs(y) / vertical));
   }
   const direction = camera.position.clone().sub(controls.target);
   const zoom = distance ? direction.length() / distance : 1;
   distance = nextDistance;
   controls.minDistance = .65;
   controls.maxDistance = distance * 4;
   direction.normalize().multiplyScalar(Math.max(controls.minDistance, Math.min(controls.maxDistance, distance * zoom)));
   camera.position.copy(controls.target).add(direction);
   camera.near = radius / 500;
   camera.far = controls.maxDistance + radius * 4;
  }
  camera.updateProjectionMatrix();
 }
 function reset() {
  if (!radius) return;
  cameraMove = null;
  clearHighlight();
  const rotating = controls.autoRotate;
  controls.autoRotate = false;
  controls.enableDamping = false;
  controls.reset();
  controls.target.set(0, 0, 0);
  camera.position.copy(initialDirection).multiplyScalar(distance);
  controls.update(0);
  controls.enableDamping = true;
  controls.autoRotate = rotating;
 }
 function zoom(factor) {
  if (!radius) return;
  const direction = camera.position.clone().sub(controls.target);
  const next = Math.min(controls.maxDistance, Math.max(controls.minDistance, direction.length() * factor));
  cameraMove = {start:performance.now(),from:camera.position.clone(),
   to:controls.target.clone().add(direction.setLength(next)),target:controls.target.clone(),
   fromTarget:controls.target.clone()};
 }
 function draw(now) {
  const dt = previousTime === undefined ? 0 : Math.min(.05, (now - previousTime) / 1000);
  previousTime = now;
  if (cameraMove) {
   const t=Math.min(1,(now-cameraMove.start)/280), smooth=t*t*(3-2*t);
   camera.position.lerpVectors(cameraMove.from,cameraMove.to,smooth);
   controls.target.lerpVectors(cameraMove.fromTarget,cameraMove.target,smooth);
   if(t===1) cameraMove=null;
  }
  controls.update(dt);
  refreshModelProfile(model);
  renderer.render(scene, camera);
  diagnostics.frame(performance.now());
  updateMarkers();
  frame = requestAnimationFrame(draw);
 }
 const diagnostics=registerGraphicsViewer(renderer,callbacks.statsSlot,()=>callbacks.label()+modelLoadLabel(modelLoad),size);
 const resize = new ResizeObserver(size);
 resize.observe(host);
 function lost(event) {
  event.preventDefault();
  if (!abort.signal.aborted) callbacks.error(new Error('Графический контекст недоступен'));
 }
 renderer.domElement.addEventListener('webglcontextlost', lost);

 async function load() {
  try {
   const gltf = await loadSpacecraftModel(url,callbacks.draco,abort.signal);
   if(!gltf)return;
   if (abort.signal.aborted) {
    disposeModel(gltf.scene);
    return;
   }
   accept(gltf);
  } catch (error) {
   if (!abort.signal.aborted) callbacks.error(error);
  }
 }

 function accept(gltf,timing){
   modelLoad=timing;
   const first=!model;
   if(model){
    clearHighlight();
    presentation.remove(model);
    disposeModel(model);
    surfaces.length=0;
   }
   model = gltf.scene;
   const bounds = callbacks.draco?new Box3(new Vector3(...stationMin),new Vector3(...stationMax)):new Box3().setFromObject(model,true);
   radius = bounds.getSize(new Vector3()).length() / 2;
   if (!Number.isFinite(radius) || radius <= 0) throw new Error('Модель не содержит геометрии');
   model.position.sub(bounds.getCenter(new Vector3()));
   presentation.add(model);
   presentation.updateMatrixWorld(true);
   model.traverse(object => {
    if (object.isMesh && !object.material.transparent) surfaces.push(object);
   });
   if(first){
    points = viewPoints(model,callbacks.draco);
    size();
    reset();
    draw(performance.now());
    callbacks.ready();
   }
 }
 if(callbacks.draco)watchStationModel(url,abort.signal,loadSpacecraftModel,accept,(error,available)=>{
  if(!available)callbacks.error(error);
  else console.warn('Не удалось переключить детализацию МКС',error);
 });
 else void load();

 return {
  reset, zoom, inspectPart,
  lighting(value){key.intensity=4.2*value;fill.intensity=1.15*value;},
  angle(x,y,z){
   cameraMove={start:performance.now(),from:camera.position.clone(),to:new Vector3(x,y,z).setLength(distance*1.25),target:new Vector3(),fromTarget:controls.target.clone()};
  },
  full: reset,
  body() { if(model) frameTarget([0,.35,0], 8*Math.max(1,.82/camera.aspect)); },
  parts(active,labels) { partsActive=active; markersVisible=active&&labels; },
  clearHighlight,
  setRotation(enabled) { controls.autoRotate = enabled; },
  dispose() {
   abort.abort();
   cancelAnimationFrame(frame);
   resize.disconnect();
   diagnostics.dispose();
   controls.dispose();
   renderer.domElement.removeEventListener('webglcontextlost', lost);
   clearHighlight();
   markerLayer.remove();
   if (model) {
    presentation.remove(model);
    disposeModel(model);
    model=null;
   }
   points=null;
   surfaces.length=0;
   scene.clear();
   renderer.dispose();
   renderer.forceContextLoss();
   renderer.domElement.remove();
  }
 };
}
