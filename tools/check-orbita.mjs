import assert from 'node:assert/strict';
import {depthSlices,inspectionNear,renderDepthRange,ATLAS_FAR,ATLAS_DEPTH_RATIO} from '../dist/camera-depth.js';
import {PLANETS} from '../dist/data.js';

assert.equal(PLANETS.length,8);
for(const planet of PLANETS){
 // All ordinary atlas portraits use radius 3.3 and a minimum eye distance of 4.
 const near=inspectionNear(4);
 assert.ok(near<4-3.3,planet.id);
 assert.deepEqual(depthSlices(near,ATLAS_FAR,ATLAS_DEPTH_RATIO),[[near,ATLAS_FAR]],planet.id);
}
const moonNear=inspectionNear(.00001);
assert.ok(moonNear<.000004);
const ranges=depthSlices(moonNear,ATLAS_FAR,ATLAS_DEPTH_RATIO);
assert.equal(ranges.length,2);
assert.equal(ranges[0][1],ATLAS_FAR);
assert.equal(ranges[0][0],ranges[1][1]);
assert.equal(ranges[1][0],moonNear);

const background={visible:true};
const camera={near:.05,far:ATLAS_FAR,updateProjectionMatrix(){}};
const calls=[];
const renderer={
 autoClear:true,
 clearDepth(){calls.push('depth');},
 render(_,current){calls.push([current.near,current.far,background.visible,this.autoClear]);}
};
renderDepthRange(renderer,{},camera,moonNear,ATLAS_FAR,{background,ratioLimit:ATLAS_DEPTH_RATIO});
assert.deepEqual(calls,[[...ranges[0],true,true],'depth',[...ranges[1],false,false]]);
assert.equal(camera.near,moonNear);
assert.equal(camera.far,ATLAS_FAR);
assert.equal(background.visible,true);
assert.equal(renderer.autoClear,true);

renderDepthRange(renderer,{},camera,.02,ATLAS_FAR,{ratioLimit:ATLAS_DEPTH_RATIO});
assert.deepEqual(calls.at(-1),[.02,ATLAS_FAR,true,true]);
console.log('Depth: 8 planets, sub-kilometer close view, distant layer and renderer cleanup');
await import('./check-voyager.mjs');
await import('./check-voyager-flight.mjs');
