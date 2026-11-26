import {resourceSignal} from '../load-resource.js';
const stride = 7;
export const AU = 149597870.7;
export const C = 299792.458;
export const fromEcliptic = ([x,y,z]) => [x,z,-y];

export async function loadEphemeris(signal) {
 const deadline=resourceSignal(signal,30000);
 const responses = await Promise.all(['voyager-states.json','voyager-states.bin'].map(
  name=>fetch(new URL('./data/'+name,import.meta.url),{signal:deadline})));
 if (responses.some(r=>!r.ok)) throw Error('Локальные файлы эфемерид недоступны.');
 const [meta, bytes]=await Promise.all([responses[0].json(),responses[1].arrayBuffer()]);
 const states = new Float64Array(bytes);
 for(const segment of [...meta.segments,...Object.values(meta.bodies)]) {
  if(segment.count<2 || (segment.at+segment.count)*stride>states.length) throw Error('Повреждены эфемериды.');
 }
 // LSK: TT = UTC + delta-AT + 32.184, with NAIF's periodic TDB term.
 const j2000=946728000;
 function et(t) {
  const leap=meta.leaps.findLast(([when])=>when<=t)[1];
  const tt=t-j2000+leap+32.184;
  const m=6.239996+1.99096871e-7*tt;
  return tt+.001657*Math.sin(m+.01671*Math.sin(m));
 }
 function epoch(segment,i){return states[(segment.at+i)*stride];}
 function sample(segment,t) {
  if (!segment || t<segment.first || t>segment.last) return null;
  let lo=0,hi=segment.count-1;
  while(hi-lo>1){
   const mid=(lo+hi)>>1;
   if(epoch(segment,mid)<=t)lo=mid;else hi=mid;
  }
  const a=(segment.at+lo)*stride,b=a+stride;
  const ea=et(states[a]),step=et(states[b])-ea,u=(et(t)-ea)/step,v=u*u,w=v*u;
  const p=[],velocity=[];
  for(let i=1;i<=3;i++){
   const dx=states[b+i]-states[a+i],va=states[a+i+3],vb=states[b+i+3];
   p.push(states[a+i]+(3*v-2*w)*dx+step*((w-2*v+u)*va+(w-v)*vb));
   velocity.push((6*u-6*v)*dx/step+(3*v-4*u+1)*va+(3*v-2*u)*vb);
  }
  return {p,velocity,source:segment.source,interpolated:t!==states[a]&&t!==states[b]};
 }
 function segmentAt(t){
  return meta.segments.findLast(s=>t>=s.first && t<=s.last);
 }
 function bodyAt(center,barycenter,t){
  return sample(meta.bodies[center],t) ?? sample(meta.bodies[barycenter],t);
 }
 function route(segment,t,strideBy=1){
  const output=[];
  for(let i=0;i<segment.count;i+=strideBy){
   if(t!==undefined&&epoch(segment,i)>t) break;
   const k=(segment.at+i)*stride;
   output.push([states[k+1],states[k+2],states[k+3]]);
  }
  if(t!==undefined && t>=segment.first&&t<=segment.last)output.push(sample(segment,t).p);
  return output;
 }
 return {meta,epoch,sample,segmentAt,bodyAt,route};
}
export const utcText = time => new Date(time*1000).toISOString().slice(0,19).replace('T',' ')+' UTC';
