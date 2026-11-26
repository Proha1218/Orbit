import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { runInNewContext } from 'node:vm';

const busy = createServer();
await new Promise((resolve,reject) => {
 busy.once('error',reject);
 busy.listen(0,'127.0.0.1',resolve);
});
try {
 const runners = [[process.execPath,'server.mjs']];
 if(process.env.ORBITA_TEST_PYTHON)runners.push([process.env.ORBITA_TEST_PYTHON,'server.py']);
 for(const [runner,entry] of runners) {
  const server = spawn(runner,[entry,'--launch'],{
   cwd:new URL('../',import.meta.url),
   env:{...process.env,ORBITA_PORT:String(busy.address().port),ORBITA_NO_BROWSER:'1'},
   stdio:['ignore','pipe','inherit']
  });
  try {
   const [data]=await Promise.race([
    once(server.stdout,'data'),
    once(server,'exit').then(([code])=>{throw Error('Server exited: '+code);}),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timed out')),5000).unref())
   ]);
   const base=String(data).match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
   assert.ok(base,'Server reported a loopback address');
   assert.notEqual(Number(new URL(base).port),busy.address().port);
   for (const [path,mime] of [
    ['', 'text/html'], ['boot.js','text/javascript'], ['app.js','text/javascript'],
    ['moons-catalog.json','application/json'], ['textures/earth_daymap.jpg','image/jpeg'],
    ['spacecraft/iss-igoal.glb','model/gltf-binary'], ['spacecraft/data/voyager-states.bin','application/octet-stream'],
    ['vendor/draco/draco_decoder.wasm','application/wasm'],
    ['photos/uranus-webb.webp','image/webp'],
    ['spacecraft/iss-igoal-low.glb','model/gltf-binary'],
   ]) {
    const response=await fetch(base+path,{method:'HEAD',signal:AbortSignal.timeout(5000)});
    assert.equal(response.status,200,path);
    assert.ok(response.headers.get('content-type')?.startsWith(mime),path);
   }
   assert.equal((await fetch(base+'missing-file')).status,404);
   console.log(entry+' · loopback, occupied port fallback, resources and MIME types');
  } finally {
   server.kill();
  }
 }
} finally {
 busy.close();
}

const status={},orbit={},diagnostic={},copy={},retry={};
const buttons={hidden:true,querySelector:selector=>selector==='[data-retry]'?retry:copy};
const elements={'[data-boot-status]':status,'.loader-orbit':orbit,'[data-boot-actions]':buttons,textarea:diagnostic};
const loader={querySelector:selector=>elements[selector]};
runInNewContext(await readFile(new URL('../dist/boot.js',import.meta.url),'utf8'),{
 document:{querySelector:()=>loader},location:{protocol:'file:'},navigator:{userAgent:'test'},AbortController,clearTimeout
});
assert.match(status.textContent,/START\.bat/);
assert.equal(buttons.hidden,false);
assert.equal(orbit.hidden,true);
console.log('file:// · startup instructions without loading ES modules');
