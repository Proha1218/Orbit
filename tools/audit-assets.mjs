import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function files(directory){
 const entries=await readdir(directory,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>{
  const path=resolve(directory,entry.name);
  return entry.isDirectory()?files(path):path;
 }))).flat();
}
function imageSize(bytes){
 if(bytes.length>=25&&bytes.toString('ascii',8,16)==='WEBPVP8L'){
  const bits=bytes.readUInt32LE(21);
  return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
 }
 if(bytes.length>24&&bytes.readUInt32BE(0)===0x89504e47)return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(bytes.length<4||bytes.readUInt16BE(0)!==0xffd8)return null;
 for(let i=2;i+8<bytes.length;){
  if(bytes[i++]!==0xff)return null;
  while(bytes[i]===0xff)i++;
  const marker=bytes[i++];
  if(marker===0xda||marker===0xd9)return null;
  const length=bytes.readUInt16BE(i);
  if(length<2)return null;
  if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker)) {
   return [bytes.readUInt16BE(i+5),bytes.readUInt16BE(i+3)];
  }
  i+=length;
 }
 return null;
}
const totals={},rows=[],hashes=new Map(),models=[];
for(const path of (await files(root)).sort()){
 const file=relative(root,path).replaceAll('\\','/');
 const kind=file.startsWith('textures/')?'textures':/(^|\/)photos\//.test(file)?'photos':
  file.startsWith('vendor/')?'vendor':file.endsWith('.glb')?'models':
  /\.(bin|json|txt)$/.test(file)?'data and shapes':'application';
 const bytes=await readFile(path);
 totals[kind]=(totals[kind]??0)+bytes.length;
 const dimensions=imageSize(bytes);
 if(dimensions){
  const [width,height]=dimensions;
  const hash=createHash('sha256').update(bytes).digest('hex');
  const duplicateOf=hashes.get(hash)??'';
  if(!duplicateOf)hashes.set(hash,file);
  rows.push({file,kind,format:extname(file).slice(1),bytes:bytes.length,width,height,
   rgbaBytes:width*height*4,rgbaWithMipmapsBytes:Math.ceil(width*height*16/3),duplicateOf});
 }
 if(file.endsWith('.glb')){
  const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  const primitives=gltf.meshes.flatMap(mesh=>mesh.primitives);
  models.push({file,bytes:bytes.length,primitives:primitives.length,
   triangles:primitives.reduce((total,p)=>total+(gltf.accessors[p.indices]?.count??0)/3,0),
   materials:gltf.materials.length,embeddedImages:gltf.images?.length??0,
   extensions:gltf.extensionsUsed??[]});
 }
}
if(process.argv.includes('--csv')){
 const columns=Object.keys(rows[0]);
 console.log(columns.join(','));
 for(const row of rows)console.log(columns.map(key=>JSON.stringify(row[key])).join(','));
}else {
 console.log(JSON.stringify({totalBytes:Object.values(totals).reduce((a,b)=>a+b,0),
  totals,models,images:rows.length,duplicates:rows.filter(x=>x.duplicateOf),
  largest:rows.sort((a,b)=>b.bytes-a.bytes).slice(0,6)},null,2));
}
