import {execFile} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./dist',import.meta.url));
const launch=process.argv.includes('--launch');
const port=Number(process.env.ORBITA_PORT??4173);
if(!Number.isInteger(port)||port<0||port>65535){
 console.error('ORBITA_PORT must be an integer between 0 and 65535.');
 process.exit(1);
}
const types={
 '.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8',
 '.jpg':'image/jpeg',
 '.png':'image/png',
 '.webp':'image/webp',
 '.glb':'model/gltf-binary',
 '.gltf':'model/gltf+json',
 '.wasm':'application/wasm',
 '.bin':'application/octet-stream',
 '.txt':'text/plain; charset=utf-8'
};

const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(405,{Allow:'GET, HEAD'}).end();
   return;
  }
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+sep)){
   res.writeHead(403).end();
   return;
  }
  const entry=await stat(path);
  if(!entry.isFile()){
   res.writeHead(404).end();
   return;
  }
  res.writeHead(200,{
   'content-type':types[extname(path)]??'application/octet-stream',
   'content-length':entry.size,
   'cache-control':'no-cache'
  });
  if(req.method==='HEAD'){res.end();return;}
  const stream=createReadStream(path);
  res.once('close',()=>stream.destroy());
  stream.on('error',()=>res.destroy()).pipe(res);
 }catch{
  res.writeHead(404).end();
 }
});
let retried=false;
server.on('error',error=>{
 if(launch&&['EADDRINUSE','EACCES'].includes(error.code)&&!retried){
  retried=true;
  server.listen(0,'127.0.0.1');
  return;
 }
 console.error('Orbita: '+error.message);
 process.exitCode=1;
});
server.once('listening',()=>{
 const url='http://127.0.0.1:'+server.address().port+'/';
 console.log('Orbita: '+url+' (Ctrl+C to stop)');
 if(launch&&process.platform==='win32'&&process.env.ORBITA_NO_BROWSER!=='1'){
  execFile('rundll32.exe',['url.dll,FileProtocolHandler',url],error=>{
   if(error)console.error('Open this address manually: '+url);
  });
 }
});
server.listen(port,'127.0.0.1');
