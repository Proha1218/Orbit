export const OEM_SOURCE='https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt';
export function parseOEM(text){
 if(!/REF_FRAME\s*=\s*EME2000\b/.test(text)||!/TIME_SYSTEM\s*=\s*UTC\b/.test(text)||
    !/OBJECT_ID\s*=\s*1998-067-A?\b/.test(text)||!/CENTER_NAME\s*=\s*Earth\b/i.test(text))throw Error('Неподдерживаемый набор NASA OEM');
 const rows=text.split(/\r?\n/).filter(line=>/^\d{4}-\d\d-\d\dT/.test(line)).map(line=>{
  const [date,...values]=line.trim().split(/\s+/);
  return [Date.parse(date+'Z')/1000,...values.map(Number)];
 });
 if(rows.length<2||rows.some((row,i)=>row.length!==7||!row.every(Number.isFinite)||(i&&row[0]<=rows[i-1][0])))throw Error('Некорректные эфемериды NASA');
 return {rows,min:rows[0][0],max:rows.at(-1)[0],created:text.match(/CREATION_DATE\s*=\s*(\S+)/)?.[1]};
}
export function sampleOEM(data,t){
 if(t<data.min||t>data.max)return null;
 let low=0,high=data.rows.length-1;
 while(high-low>1){const mid=(low+high)>>1;if(data.rows[mid][0]<=t)low=mid;else high=mid;}
 const a=data.rows[low],b=data.rows[high],dt=b[0]-a[0],u=(t-a[0])/dt,v=u*u,w=v*u;
 const p=[],velocity=[];
 for(let i=1;i<=3;i++){
  p.push((2*w-3*v+1)*a[i]+(w-2*v+u)*dt*a[i+3]+(-2*w+3*v)*b[i]+(w-v)*dt*b[i+3]);
  velocity.push((6*v-6*u)*(a[i]-b[i])/dt+(3*v-4*u+1)*a[i+3]+(3*v-2*u)*b[i+3]);
 }
 return {p,velocity};
}
const rad=Math.PI/180;
export function earthAngle(t){
 const d=t/86400+2440587.5-2451545,T=d/36525;
 return ((280.46061837+360.98564736629*d+.000387933*T*T-T*T*T/38710000)%360)*rad;
}
export function earthPoint(p,t){
 const [x,y,z]=p,r=Math.hypot(x,y),a=6378.137,e2=.00669437999014;
 let lat=Math.atan2(z,r*(1-e2)),height=0;
 for(let i=0;i<5;i++){
  const N=a/Math.sqrt(1-e2*Math.sin(lat)**2);
  height=r/Math.cos(lat)-N;
  lat=Math.atan2(z,r*(1-e2*N/(N+height)));
 }
 const lon=(Math.atan2(y,x)-earthAngle(t))/rad;
 return {lat:lat/rad,lon:((lon+180)%360+360)%360-180,height};
}
export async function readISSOrbit(signal, refresh=false){
 const cacheKey='orbita-nasa-iss-oem';
 if(refresh){
  const response=await fetch(OEM_SOURCE,{cache:'no-store',signal});
  if(!response.ok)throw Error('NASA OEM: HTTP '+response.status);
  const source=await response.text(),data=parseOEM(source);
  try{localStorage.setItem(cacheKey,source);}catch{}
  return data;
 }
 try{const cached=localStorage.getItem(cacheKey);if(cached){const data=parseOEM(cached);if(data.max>Date.now()/1000)return data;}}catch{}
 const response=await fetch(new URL('./data/iss-oem.txt',import.meta.url),{signal});
 if(!response.ok)throw Error('Локальные эфемериды недоступны');
 return parseOEM(await response.text());
}
