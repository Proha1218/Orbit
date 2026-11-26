import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {trimStationAttributes} from '../dist/spacecraft/station-lod.js';

async function summary(suffix){
 const bytes=await readFile(new URL('../dist/spacecraft/iss-igoal'+suffix+'.glb',import.meta.url));
 const jsonEnd=20+bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.subarray(20,jsonEnd));
 const binary=bytes.subarray(jsonEnd+8);
 const images=json.images.map(image=>{
  const view=json.bufferViews[image.bufferView];
  const start=view.byteOffset??0;
  return createHash('sha256').update(binary.subarray(start,start+view.byteLength)).digest('hex');
 }).sort();
 const primitives=json.meshes.flatMap(mesh=>mesh.primitives);
 const attributes=(meshes=>meshes.flatMap(mesh=>mesh.primitives.flatMap(primitive=>Object.values(primitive.attributes))));
 const usedBytes=indices=>indices.reduce((total,index)=>{
  const a=json.accessors[index];
  const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType];
  return total+a.count*components*componentBytes;
 },0);
 const counts={
  triangles:primitives.reduce((n,primitive)=>n+json.accessors[primitive.indices].count/3,0),
  materials:json.materials.map(m=>m.name??'').sort(),
  primitives:primitives.length,
  images,
  bytes:bytes.length,
  attributeBytes:usedBytes(attributes(json.meshes)),
 };
 trimStationAttributes(json);
 counts.activeAttributeBytes=usedBytes(attributes(json.meshes));
 return counts;
}
const original=await summary('');
assert.equal(original.triangles,2975912);
let previous=original;
for(const level of ['high','medium','low']){
 const variant=await summary('-'+level);
 assert.equal(variant.primitives,original.primitives);
 assert.deepEqual(variant.materials,original.materials);
 assert.deepEqual(variant.images,original.images,'All embedded source images must remain byte-identical');
 assert.ok(variant.triangles<previous.triangles&&variant.triangles>0);
 assert.ok(variant.bytes<previous.bytes);
 console.log(level,variant.triangles,'triangles',variant.bytes,'bytes');
 previous=variant;
}
console.log('Original vertex attributes:',original.attributeBytes,'bytes; used by materials:',original.activeAttributeBytes);
