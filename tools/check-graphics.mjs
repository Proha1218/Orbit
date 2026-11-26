import assert from 'node:assert/strict';
import {graphicsRatio,mountGraphics,refreshModelProfile} from '../dist/graphics.js';

for(const [width,height] of [[320,640],[390,844],[768,1024],[1366,768],[1920,1080],[2560,1440]]){
 const values=['low','medium','high','ultra'].map(level=>graphicsRatio(level,width,height,2));
 assert.deepEqual(values,[...values].sort((a,b)=>a-b));
 assert.ok(width*height*values[0]**2<=1000000.001);
 assert.equal(values[3],2);
}
assert.ok(graphicsRatio('ultra',6000,1000,2,4096)*6000<=4096);

const select={},toggle={},stats={},open={},close={},saved=new Map();
const dialog={querySelector:selector=>({select,input:toggle,button:close}[selector])};
Object.assign(globalThis,{
 innerWidth:1920,innerHeight:1080,devicePixelRatio:2,
 localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},
 document:{querySelector:id=>({'#graphics-dialog':dialog,'#graphics-open':open,'#graphics-stats':stats}[id]),addEventListener(){}}
});
const renderer={info:{reset(){}},capabilities:{maxTextureSize:4096}};
const densities=[];
const graphics=mountGraphics(renderer,()=>'',density=>densities.push(density));
for(let frame=1;frame<=60;frame++)graphics.sample(60,frame*60);
assert.deepEqual(densities,[.65],'Persistent slow frames step down from high to medium');
select.value='ultra';
select.onchange();
for(let frame=1;frame<=180;frame++)graphics.sample(60,frame*60);
assert.deepEqual(densities,[.65,1],'Manual quality is preserved through slow frames');
assert.equal(saved.get('orbita-graphics'),'ultra');
const passMaterial={side:2,transparent:true,forceSinglePass:false};
const opaque={side:2,transparent:false,forceSinglePass:false};
const model={userData:{},traverse:visit=>visit({material:[passMaterial,opaque]})};
select.value='low';
select.onchange();
refreshModelProfile(model);
assert.equal(passMaterial.forceSinglePass,true);
assert.equal(opaque.forceSinglePass,false);
select.value='ultra';
select.onchange();
refreshModelProfile(model);
assert.equal(passMaterial.forceSinglePass,false,'Ultra restores the original pass');

const active={info:{render:{calls:53,triangles:5268143},memory:{geometries:120,textures:128}},domElement:{width:1100,height:1219}};
toggle.checked=true;
for(let i=0;i<40;i++)graphics.record(active,i*40,'МКС',false);
assert.match(stats.textContent,/25 FPS/);
assert.match(stats.textContent,/53 команд/);
assert.match(stats.textContent,/1100 × 1219 px/);
const other={info:{render:{calls:5,triangles:20390},memory:{geometries:5,textures:4}},domElement:{width:740,height:680}};
graphics.record(other,1600,'Voyager 2');
assert.match(stats.textContent,/5 команд/);
assert.match(stats.textContent,/740 × 680 px/);
console.log('Graphics: adaptive profiles, model pass restoration and active frame diagnostics');
