import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadEphemeris} from '../dist/spacecraft/ephemeris.js';
import {
 fitShipDistance, localRoutePoint, sampleRouteSide, UNIT_KM
} from '../dist/spacecraft/flight-visuals.js';

globalThis.fetch=async url=>new Response(await fs.readFile(url));
const eph=await loadEphemeris();
const buffer=new Float32Array(65*3);

function inspectSide(time,direction,span){
 const segment=eph.segmentAt(time);
 const state=eph.sample(segment,time);
 const count=sampleRouteSide(eph,segment,state,time,span,direction,buffer);
 if(!count)return null;
 assert.deepEqual([...buffer.slice(0,3)],[0,0,0],'The route starts at the spacecraft');
 assert.ok(buffer.every(Number.isFinite));
 const cap=direction<0?Math.max(time-span,segment.first):Math.min(time+span,segment.last);
 const expected=localRoutePoint(eph.sample(segment,cap).p,state.p);
 const fromBuffer=[...buffer.slice(count*3-3,count*3)];
 const errorKm=Math.hypot(...expected.map((n,i)=>n-fromBuffer[i]))*UNIT_KM;
 assert.ok(errorKm<.001,'Local vertex must remain within a meter of the ephemeris');
 return {fromBuffer,errorKm};
}

// At the end of the prediction (376 AU), Float32 must not round away meter-sized motion.
const end=eph.meta.end;
assert.equal(inspectSide(end,1,10),null,'Do not extend the route past the last epoch');
const outer=inspectSide(end,-1,10);
assert.ok(Math.abs(Math.hypot(...outer.fromBuffer)*UNIT_KM-150.2)<1);
const adjacent=inspectSide(end-.1,-1,10);
assert.ok(Math.hypot(...outer.fromBuffer.map((n,i)=>n-adjacent.fromBuffer[i]))*UNIT_KM<.001);

// The two halves meet at the interpolated state during real flybys.
for(const {time} of Object.values(eph.meta.events)){
 assert.ok(inspectSide(time,-1,65));
 assert.ok(inspectSide(time,1,65));
}
for(const [i,segment] of eph.meta.segments.entries()){
 if(i===eph.meta.segments.length-1)break;
 // Just inside the current segment to avoid selecting an adjacent section at the join.
 assert.ok(inspectSide(segment.last-.05,1,90));
}
const expectedMoons = {599:5,699:13,799:6,899:8};
for(const [center,count] of Object.entries(expectedMoons)){
 const epoch = eph.meta.bodies[center];
 const moons = eph.meta.moons.filter(moon=>moon.parent===Number(center));
 assert.equal(moons.length,count);
 const times = eph.meta.orientations[center];
 assert.equal(times[0][0],epoch.first);
 assert.equal(times.at(-1)[0],epoch.last);
 for(const [i,[t,...rotation]] of times.entries()){
  assert.ok(Math.abs(Math.hypot(...rotation)-1)<1e-8);
  if(i)assert.ok(t>times[i-1][0]);
 }
 const [equatorial,polar] = eph.meta.planetAxesKm[center];
 assert.ok(polar>0&&polar<equatorial);
 for(const moon of moons){
  const time = (epoch.first+epoch.last)/2;
  const state = eph.bodyAt(moon.id,undefined,time);
  const planet = eph.bodyAt(Number(center),undefined,time);
  assert.ok(state&&state.p.every(Number.isFinite)&&state.velocity.every(Number.isFinite));
  assert.ok(Math.hypot(...state.p.map((x,i)=>x-planet.p[i]))>equatorial+moon.radiusKm);
  assert.equal(eph.bodyAt(moon.id,undefined,epoch.first-1),null);
  assert.equal(eph.bodyAt(moon.id,undefined,epoch.last+1),null);
 }
}
assert.ok(eph.meta.events['moon-503'].time<eph.meta.events.jupiter.time,'The earlier Ganymede encounter is covered');
assert.ok(eph.meta.events['moon-504'].time<eph.meta.events.jupiter.time,'The earlier Callisto encounter is covered');

const distances=[16/9,390/844,320/640].map(aspect=>{
 const scale=4000/(1000*UNIT_KM);
 const enlarged=fitShipDistance(10.8,scale,aspect,43);
 const real=fitShipDistance(10.8,scale/4000,aspect,43);
 assert.ok(enlarged>.0001&&enlarged<.0005,'Fit the ship at a useful inspection distance');
 assert.ok(Math.abs(enlarged/real-4000)<.000001);
 return {aspect,displayKm:enlarged*UNIT_KM,physicalMeters:real*UNIT_KM*1000};
});
console.log({outerVertexErrorMeters:outer.errorKm*1000,camera:distances,encounters:Object.keys(eph.meta.events).length});
