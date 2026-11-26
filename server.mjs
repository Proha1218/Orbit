import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./dist',import.meta.url));
const port=Number(process.env.ORBITA_PORT??4173);
const types={
 '.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8',
 '.jpg':'image/jpeg',
 '.png':'image/png',
 '.glb':'model/gltf-binary',
 '.bin':'application/octet-stream',
 '.txt':'text/plain; charset=utf-8'
};

createServer(async(req,res)=>{
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
}).listen(port,'127.0.0.1',()=>console.log('ОРБИТА: http://127.0.0.1:'+port+'/'));
