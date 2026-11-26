import {trimStationAttributes} from '../dist/spacecraft/station-lod.js';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [dependencies,level]=process.argv.slice(2);
if(!dependencies||!['high','medium','low'].includes(level))throw Error('Usage: node tools/build-iss-lod.mjs <dependency-directory> high|medium|low');
const require=createRequire(resolve(dependencies,'package.json'));
const load=async name=>import(pathToFileURL(require.resolve(name)).href);
const {NodeIO,GLB_BUFFER}=await load('@gltf-transform/core');
const {ALL_EXTENSIONS,EXTMeshoptCompression}=await load('@gltf-transform/extensions');
const {simplify,prune,reorder,quantize,weld}=await load('@gltf-transform/functions');
const {MeshoptEncoder}=await load('meshoptimizer');
const {MeshoptSimplifier}=await load('meshopt-next');
const decoderPath=resolve('dist/vendor/draco');
const draco=require(resolve(decoderPath,'draco_wasm_wrapper.js'));
const decoderModule=await draco({wasmBinary:await readFile(resolve(decoderPath,'draco_decoder.wasm'))});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
await MeshoptEncoder.ready;
const source=await io.binaryToJSON(await readFile('dist/spacecraft/iss-igoal.glb'));
const original=source.resources[GLB_BUFFER];
const extension='KHR_draco_mesh_compression';
source.json.extensionsUsed=source.json.extensionsUsed.filter(name=>name!==extension);
source.json.extensionsRequired=source.json.extensionsRequired.filter(name=>name!==extension);
const components={
 5120:[Int8Array,decoderModule.DT_INT8],5121:[Uint8Array,decoderModule.DT_UINT8],
 5122:[Int16Array,decoderModule.DT_INT16],5123:[Uint16Array,decoderModule.DT_UINT16],
 5125:[Uint32Array,decoderModule.DT_UINT32],5126:[Float32Array,decoderModule.DT_FLOAT32]
};
const decoder=new decoderModule.Decoder();
trimStationAttributes(source.json);
const compressed=source.json.meshes.flatMap(mesh=>mesh.primitives).map(primitive=>{
 const compressed=primitive.extensions[extension];
 delete primitive.extensions[extension];
 return [primitive,compressed];
});
const doc=await io.readJSON(source);
const accessors=doc.getRoot().listAccessors();
if(accessors.length!==source.json.accessors.length)throw Error('Unexpected accessor mapping');
for(const [i,[primitive,compressedData]] of compressed.entries()){
 const view=source.json.bufferViews[compressedData.bufferView];
 const input=new Int8Array(original.buffer,original.byteOffset+(view.byteOffset??0),view.byteLength);
 const mesh=new decoderModule.Mesh();
 try{
  const status=decoder.DecodeArrayToMesh(input,input.length,mesh);
  if(!status.ok())throw Error('Draco primitive '+i+': '+status.error_msg());
  const index=primitive.indices;
  const count=3*mesh.num_faces();
  accessors[index].setArray(decodeArray(Uint32Array,count,
   (bytes,pointer)=>decoder.GetTrianglesUInt32Array(mesh,bytes,pointer)));
  for(const [semantic,id] of Object.entries(compressedData.attributes)){
   const attribute=decoder.GetAttributeByUniqueId(mesh,id);
   const count=attribute.num_components()*mesh.num_points();
   const accessor=accessors[primitive.attributes[semantic]];
   const [Type,dataType]=components[source.json.accessors[primitive.attributes[semantic]].componentType];
   accessor.setArray(decodeArray(Type,count,(bytes,pointer)=>
    decoder.GetAttributeDataArrayForAllPoints(mesh,attribute,dataType,bytes,pointer)));
  }
 }finally{decoderModule.destroy(mesh);}
}
decoderModule.destroy(decoder);

function decodeArray(Type,count,read){
 const bytes=count*Type.BYTES_PER_ELEMENT;
 const pointer=decoderModule._malloc(bytes);
 try{
  if(!pointer||!read(bytes,pointer))throw Error('Draco array decode failed');
  return new Type(decoderModule.HEAPU8.buffer,pointer,count).slice();
 }finally{decoderModule._free(pointer);}
}
const options={high:[.44,.001],medium:[.16,.002],low:[.055,.004]}[level];
await doc.transform(weld());
const attributes=new Map(doc.getRoot().listMeshes().flatMap(mesh=>mesh.listPrimitives()).map(primitive=>[
 primitive.getAttribute('POSITION').getArray(),primitive
]));
const simplifier={...MeshoptSimplifier,simplify(indices,positions,stride,target,error,flags){
 const primitive=attributes.get(positions);
 if(!primitive)return MeshoptSimplifier.simplify(indices,positions,stride,target,error,flags);
 const uv=primitive.getAttribute('TEXCOORD_0')?.getArray();
 const normal=primitive.getAttribute('NORMAL')?.getArray();
 const count=positions.length/stride;
 const weights=[.7,.7,.7,16,16];
 const data=new Float32Array(count*weights.length);
 for(let i=0;i<count;i++){
  data[i*5]=normal?.[i*3]??0;
  data[i*5+1]=normal?.[i*3+1]??0;
  data[i*5+2]=normal?.[i*3+2]??0;
  data[i*5+3]=uv?.[i*2]??0;
  data[i*5+4]=uv?.[i*2+1]??0;
 }
 return MeshoptSimplifier.simplifyWithAttributes(indices,positions,stride,data,5,weights,null,target,error,[...flags,'Permissive']);
}};
await doc.transform(simplify({simplifier,ratio:options[0],error:options[1]}),prune({keepAttributes:true}),quantize({quantizePosition:16,quantizeNormal:12,quantizeTexcoord:15,quantizeColor:12}),reorder({encoder:MeshoptEncoder,target:'size'}));
for(const accessor of doc.getRoot().listAccessors())accessor.setSparse(false);
doc.createExtension(EXTMeshoptCompression).setRequired(true);
const prims=doc.getRoot().listMeshes().flatMap(mesh=>mesh.listPrimitives());
console.log(level,prims.length,'primitives',prims.reduce((n,p)=>n+p.getIndices().getCount()/3,0),'triangles');
await io.write('dist/spacecraft/iss-igoal-'+level+'.glb',doc);
