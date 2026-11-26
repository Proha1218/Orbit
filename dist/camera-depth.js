export const ATLAS_FAR = 100000;
export const ATLAS_DEPTH_RATIO = 1e7;

export function inspectionNear(distance) {
 return Math.max(1e-10,Math.min(.05,distance*.01));
}

export function depthSlices(near,far,ratioLimit=1e5) {
 if(far/near<ratioLimit)return [[near,far]];
 const split=Math.sqrt(near*far);
 return [[split,far],[near,split]];
}

export function renderDepthRange(renderer,scene,camera,near,far,{background,ratioLimit}={}) {
 const ranges=depthSlices(near,far,ratioLimit);
 const setRange=(start,end)=>{
  if(camera.near===start&&camera.far===end)return;
  camera.near=start;
  camera.far=end;
  camera.updateProjectionMatrix();
 };
 if(ranges.length===1){
  setRange(near,far);
  renderer.render(scene,camera);
  return;
 }
 const autoClear=renderer.autoClear;
 const backgroundWasVisible=background?.visible;
 try{
  renderer.autoClear=true;
  setRange(...ranges[0]);
  renderer.render(scene,camera);
  renderer.autoClear=false;
  renderer.clearDepth();
  if(background)background.visible=false;
  setRange(...ranges[1]);
  renderer.render(scene,camera);
 }finally{
  if(background)background.visible=backgroundWasVisible;
  renderer.autoClear=autoClear;
  setRange(near,far);
 }
}
