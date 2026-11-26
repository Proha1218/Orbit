import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadEphemeris,C,AU,fromEcliptic} from '../dist/spacecraft/ephemeris.js';
import {events,eventById,photos} from '../dist/spacecraft/history-data.js';
import {partById,parts,statusAt} from '../dist/spacecraft/parts.js';

const assets = new URL('../dist/spacecraft/',import.meta.url);
globalThis.fetch=async(url)=>new Response(await fs.readFile(url));
const eph=await loadEphemeris();
assert.deepEqual(fromEcliptic([100,200,-300]),[100,-300,-200]);
assert.equal(eph.segmentAt(eph.meta.begin-1),undefined);
assert.equal(eph.segmentAt(eph.meta.end+1),undefined);
for(const segment of eph.meta.segments){
 assert.equal(eph.route(segment).length,segment.count);
 for(let i=1;i<segment.count;i++)assert.ok(eph.epoch(segment,i)>eph.epoch(segment,i-1));
 for(const t of [segment.first,segment.last,(segment.first+segment.last)/2]){
  const sample=eph.sample(segment,t);
  assert.ok(sample.p.every(Number.isFinite));
  assert.ok(sample.velocity.every(Number.isFinite));
 }
}

// Horizons VECTORS: -32, center 500@10, ICRF/ecliptic, KM-S, geometric, UT.
const reference=[4913402257.009129,-13442881350.80564,-10590394226.51561,
 4.251538738453079,-9.404583597469703,-11.36942248691055];
const epoch=Date.parse('2018-11-05T00:00:00Z')/1000;
const pv=eph.sample(eph.segmentAt(epoch),epoch);
const positionError=Math.hypot(...pv.p.map((v,i)=>v-reference[i]));
const speedError=Math.hypot(...pv.velocity.map((v,i)=>v-reference[i+3]));
assert.ok(positionError<2&&speedError<.001,'Separate Horizons API query');
const earth=eph.bodyAt(399,399,epoch);
const hours=Math.hypot(...pv.p.map((v,i)=>v-earth.p[i]))/C/3600;
assert.ok(hours>16&&hours<17,'Earth signal delay in hours');
console.log('Horizons 2018-11-05', {positionErrorKm:positionError,speedErrorKmS:speedError,
 signalHours:hours,distanceToSunAU:Math.hypot(...pv.p)/AU});

for(const [id,encounter] of Object.entries(eph.meta.events)){
 const {time,center,distanceKm,relativeSpeedKmS}=encounter;
 const probe=eph.sample(eph.segmentAt(time),time);
 const body=eph.bodyAt(center,0,time);
 assert.ok(body,id);
 const range=Math.hypot(...probe.p.map((v,i)=>v-body.p[i]));
 const relativeSpeed=Math.hypot(...probe.velocity.map((v,i)=>v-body.velocity[i]));
 assert.ok(Math.abs(range-distanceKm)<.03,id+' range');
 assert.ok(Math.abs(relativeSpeed-relativeSpeedKmS)<.002,id+' velocity');
 for(const dt of [-600,600]){
  const nearby=eph.sample(eph.segmentAt(time+dt),time+dt);
  const nearbyBody=eph.bodyAt(center,0,time+dt);
  assert.ok(Math.hypot(...nearby.p.map((value,i)=>value-nearbyBody.p[i]))>range,id+' local minimum');
 }
 console.log(id,encounter.utc,range.toFixed(3)+' km',relativeSpeed.toFixed(5)+' km/s');
}
for(const event of events){
 for(const photo of event.photos??[])assert.ok(photos[photo],event.id);
 for(const instrument of event.instruments??[])assert.ok(partById[instrument],event.id);
}
for(const part of parts){
 for(const image of part.photos??[])assert.ok(photos[image],part.id);
 for(const event of part.events??[])assert.ok(eventById[event],part.id);
 if(part.focus)assert.ok(partById[part.focus]?.view,part.id);
}
for(const name of Object.keys(photos)){
 const b=await fs.readFile(new URL('photos/'+name+'.jpg',assets));
 assert.equal(b.readUInt16BE(0),0xffd8,name+' JPEG signature');
}
const model=await fs.readFile(new URL('voyager.glb',assets));
assert.equal(createHash('sha256').update(model).digest('hex'),'5338241f2e89e9cfe3ebb82f519b4cad64c97e66883cccba6fdda98667aec731');
assert.match(statusAt(partById.ISS,Date.parse('1989-11-04')/1000),/Узкоугольную ещё/);
assert.match(statusAt(partById.PLS,Date.parse('2025-03-24')/1000),/Отключено/);
console.log({catalogParts:parts.length,historyEvents:events.length,photos:Object.keys(photos).length,originalGLB:true});
