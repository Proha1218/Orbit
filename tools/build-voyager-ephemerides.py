"""Build offline Voyager 2 ephemerides from the NASA NAIF SPKs and Horizons exports."""
import hashlib
import json
import re
import sys
from bisect import bisect_right
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import spiceypy as spice

source = Path(sys.argv[1])
output = Path(sys.argv[2])
day = 86400
frame = "ECLIPJ2000"
base = "voyager_2.ST+1992_m05208u.merged.bsp"
prediction = "vgr2.x2100.bsp"
de = "de440s.bsp"
lsk = "naif0012.tls"
pck = "pck00011.tpc"
satellites = {
    "jupiter": [(501,"Io","Ио"), (502,"Europa","Европа"), (503,"Ganymede","Ганимед"),
                (504,"Callisto","Каллисто"), (505,"Amalthea","Амальтея")],
    "saturn": [(601,"Mimas","Мимас"), (602,"Enceladus","Энцелад"), (603,"Tethys","Тефия"),
               (604,"Dione","Диона"), (605,"Rhea","Рея"), (606,"Titan","Титан"),
               (607,"Hyperion","Гиперион"), (608,"Iapetus","Япет"), (609,"Phoebe","Феба"),
               (612,"Helene","Елена"), (613,"Telesto","Телесто"), (614,"Calypso","Калипсо"),
               (632,"Methone","Мефона")],
    "uranus": [(701,"Ariel","Ариэль"), (702,"Umbriel","Умбриэль"), (703,"Titania","Титания"),
               (704,"Oberon","Оберон"), (705,"Miranda","Миранда"), (715,"Puck","Пак")],
    "neptune": [(802,"Nereid","Нереида"), (803,"Naiad","Наяда"), (804,"Thalassa","Таласса"),
                (805,"Despina","Деспина"), (806,"Galatea","Галатея"), (807,"Larissa","Ларисса"),
                (808,"Proteus","Протей"), (801,"Triton","Тритон")],
}
moon_sizes = json.loads((Path(__file__).resolve().parents[1] / "dist/moon-sizes.json").read_text(encoding="utf8"))["byName"]
input_files = {pck, "sat337.bsp"}
to_scene = np.array([[1,0,0],[0,0,1],[0,-1,0]])

encounters = [
    ("jupiter", "vgr2_jup230.bsp", "1979-07-09T22:29:00", 599, 5),
    ("saturn", "vgr2_sat337.bsp", "1981-08-26T01:21:00", 699, 6),
    ("uranus", "vgr2.ura182.bsp", "1986-01-24T17:59:00", 799, 7),
    ("neptune", "vgr2_nep097.bsp", "1989-08-25T03:56:00", 899, 8),
    ("triton", "vgr2_nep097.bsp", "1989-08-25T09:10:00", 801, 8),
]

def load(names):
    spice.kclear()
    for name in names:
        spice.furnsh(str(source / name))

def utc(et):
    return spice.et2utc(et, "ISOC", 3) + "Z"

def stamp(et):
    return datetime.fromisoformat(utc(et)).timestamp()

def state(body, et):
    return spice.spkgeo(body, et, frame, 10)[0]

def hermite(a, b, u, dt):
    p = (2*u**3-3*u*u+1)*a[:3]+(u**3-2*u*u+u)*dt*a[3:]
    p += (-2*u**3+3*u*u)*b[:3]+(u**3-u*u)*dt*b[3:]
    v = ((6*u*u-6*u)*(a[:3]-b[:3]))/dt
    v += (3*u*u-4*u+1)*a[3:]+(3*u*u-2*u)*b[3:]
    return np.concatenate([p,v])

def offsets(code):
    name = "flyby-599.txt" if code == 599 else f"center-{code}.txt"
    input_files.add(name)
    return vector_export(name)


def vector_export(name):
    file = (source / name).read_text(encoding="utf8")
    rows = []
    for line in file.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines():
        cols = line.split(",")
        rows.append([(float(cols[0])-2451545.0)*day]+[float(x) for x in cols[2:8]])
    ts = [r[0] for r in rows]
    data = np.asarray(rows)
    def at(et):
        if et < ts[0] or et > ts[-1]:
            raise ValueError("Outside Horizons center offsets")
        i = max(0,min(len(ts)-2,bisect_right(ts,et)-1))
        dt = ts[i+1]-ts[i]
        return hermite(data[i,1:],data[i+1,1:],(et-ts[i])/dt,dt)
    return ts,at

output.mkdir(parents=True, exist_ok=True)
load([lsk])
begin = float(spice.spkcov(str(source / base), -32)[0])
handover = float(spice.spkcov(str(source / prediction), -32)[0])
end = float(spice.spkcov(str(source / prediction), -32)[1])
tracking_end = spice.str2et("1992-10-30T18:05:00")
leaps = []
for offset,year,month,date in re.findall(r"(\d+),\s+@(\d+)-([A-Z]+)-(\d+)",(source/lsk).read_text()):
    epoch=datetime.strptime(f"{year}-{month}-{date}","%Y-%b-%d")
    leaps.append([epoch.replace(tzinfo=timezone.utc).timestamp(),int(offset)])
if not leaps or leaps[-1][1]!=37:
    raise ValueError("Could not read NAIF leap-second table")

def boundaries(name):
    epochs = []
    handle = spice.dafopr(str(source/name))
    spice.dafbfs(handle)
    while spice.daffna():
        d,i = spice.dafus(spice.dafgs(),2,6)
        if i[0] == -32:
            epochs.extend(d.tolist())
    spice.dafcls(handle)
    return sorted(set(epochs))
cuts = []
for key,kernel,epoch,center,bary in encounters:
    reference=spice.str2et(epoch)
    if key == "jupiter":
        start, stop = spice.str2et("1979-07-08T00:00:00"), reference+.49*day
    elif key == "saturn":
        ts, correction=offsets(center)
        start, stop=max(reference-.49*day, ts[0]),min(reference+.49*day,ts[-1])
    else:
        start, stop=reference-.49*day,reference+.49*day
    cuts.append((key,kernel,start,stop,reference,center,bary))
# Neptune and Triton share one continuous navigation kernel.
cuts[3] = (*cuts[3][:3], cuts[4][3], *cuts[3][4:])
manifest = {
 "frame":frame, "center":"10 SUN", "time":"UTC POSIX seconds; SPICE ET converted via "+lsk,
 "units":["s UTC","km","km/s"], "stride":7, "begin":stamp(begin), "end":stamp(end),
 "trackingEnd":stamp(tracking_end), "leaps":leaps,
 "source":"https://naif.jpl.nasa.gov/pub/naif/VOYAGER/kernels/spk/",
 "horizons":"https://ssd.jpl.nasa.gov/horizons/", "planetSource":"DE440s", "refinement":"Hermite midpoint adaptive; independent checks at eighth-offset points of every emitted interval. Source switches are discontinuities.",
 "segments":[], "bodies":{}, "events":{}, "files":{}, "moons":[], "orientations":{}, "planetAxesKm":{},
}
blob = bytearray()
def write(fn, start, stop, step, kernel):
    times = np.append(np.arange(start,stop,step),stop)
    limit = 2 if kernel == base else 5
    def refine(t0, t1, v0, v1):
        dt = t1-t0
        if dt <= 4:
            return [(t0,v0)]
        mid = (t0+t1)*.5
        actual = fn(mid)
        deviations = [np.linalg.norm(fn(t0+u*dt)[:3]-hermite(v0,v1,u,dt)[:3]) for u in (.25,.75)]
        deviations.append(np.linalg.norm(actual[:3]-hermite(v0,v1,.5,dt)[:3]))
        if max(deviations) <= limit:
            return [(t0,v0)]
        return refine(t0,mid,v0,actual)+refine(mid,t1,actual,v1)
    rows = []
    previous = fn(times[0])
    for t0,t1 in zip(times[:-1],times[1:]):
        following = fn(t1)
        rows.extend(refine(t0,t1,previous,following))
        previous = following
    rows.append((times[-1],previous))
    times = [t for t,_ in rows]
    data = np.array([[stamp(t), *v] for t,v in rows],dtype="<f8")
    worst_pos = worst_vel = 0
    for i in range(0,len(times)-1):
        dt = times[i+1]-times[i]
        if data[i+1,0]<=data[i,0]: raise ValueError("Nonincreasing epoch")
        for u in (.125,.375,.625,.875):
            mid = times[i]+(times[i+1]-times[i])*u
            actual = fn(mid)
            expected = hermite(data[i,1:],data[i+1,1:],u,dt)
            worst_pos=max(worst_pos,float(np.linalg.norm(actual[:3]-expected[:3])))
            worst_vel=max(worst_vel,float(np.linalg.norm(actual[3:]-expected[3:])))
    record={"at":len(blob)//56,"count":len(data),"first":data[0,0],"last":data[-1,0],
            "maxPositionErrorKm":round(worst_pos,6),"maxVelocityErrorKmS":round(worst_vel,8),
            "maximumStepSecondsET":step,"source":kernel}
    blob.extend(data.tobytes())
    return record

raw_cuts={name:boundaries(name) for name in (base,prediction)}

def write_track(start,stop,step,kernel):
    internal=[cut for cut in raw_cuts.get(kernel,[]) if start<cut<stop]
    result=[]
    for a,b in zip([start]+internal,internal+[stop]):
        # A navigation segment can have a position jump. Keep distinct paths and
        # never construct a Hermite curve across the switch.
        if a in internal:
            a+=.002
        if b in internal:
            b-=.002
        result.append(write(lambda t:state(-32,t),a,b,step,kernel))
    manifest["segments"].extend(result)
    return result

previous=begin
for key,kernel,start,stop,reference,center,bary in cuts[:4]:
    load([lsk,base,de])
    write_track(previous,start,6*3600,base)
    old=state(-32,start)
    local_spks = ["sat337.bsp"] if key == "saturn" else []
    load([lsk,*local_spks,base,de,kernel,pck])
    segment=write(lambda et: state(-32,et),start,stop,120,kernel)
    segment["seamKm"]=float(np.linalg.norm(old[:3]-state(-32,start)[:3]))
    manifest["segments"].append(segment)
    previous=stop
    if key in ["jupiter","saturn"]:
        ts, correction=offsets(center)
        # Include barycenter consistent with the spacecraft's ephemeris.
        center_at=lambda et: state(bary,et)+correction(et)
        center_source=kernel+" + Horizons offset "+str(center)
    else:
        center_at=lambda et: state(center,et)
        center_source=kernel
    manifest["bodies"][str(center)]=write(center_at,start,stop,120,center_source)
    radii = spice.bodvrd(key,"RADII",3)[1]
    manifest["planetAxesKm"][str(center)] = [float(radii[i]) for i in (0,2,1)]
    rotation_rows = []
    for et in np.append(np.arange(start,stop,600),stop):
        matrix = spice.pxform("IAU_"+key.upper(),frame,et)
        w,x,y,z = spice.m2q(to_scene @ matrix @ to_scene.T)
        rotation_rows.append([stamp(et), *[round(float(q),10) for q in (x,y,z,w)]])
    manifest["orientations"][str(center)] = rotation_rows

    def encounter(event, code, at, around, interior=False, target_source=None):
        def distance(et):
            vector=state(-32,et)-at(et)
            return float(np.linalg.norm(vector[:3]))
        lo=max(start,around-.15*day)
        hi=min(stop,around+.15*day)
        for _ in range(80):
            a=lo+(hi-lo)/3
            b=hi-(hi-lo)/3
            if distance(a)<distance(b):
                hi=b
            else:
                lo=a
        epoch=(lo+hi)/2
        if interior and (epoch-start < 600 or stop-epoch < 600 or distance(epoch) > 500000):
            return
        relative=state(-32,epoch)-at(epoch)
        manifest["events"][event]={
            "utc":utc(epoch),"time":stamp(epoch),
            "distanceKm":round(distance(epoch),3),"relativeSpeedKmS":round(float(np.linalg.norm(relative[3:])),5),
            "center":code,"first":stamp(start),"last":stamp(stop),"source":kernel,
            "targetSource":target_source or center_source
        }
    encounter(key,center,center_at,reference)
    for code,name,label in satellites[key]:
        if key in ("uranus","saturn") or code == 801:
            moon_kernel = "sat337.bsp" if key == "saturn" else kernel
            coverage = spice.spkcov(str(source / moon_kernel),code)
            if not any(a <= start < stop <= b for a,b in zip(coverage[::2],coverage[1::2])):
                raise ValueError(f"{moon_kernel}: incomplete coverage for {code}")
            def moon_at(et):
                return center_at(et) + spice.spkgeo(code,et,frame,center)[0]
            provenance = moon_kernel
        else:
            filename = f"flyby-{code}.txt" if key == "jupiter" else f"moon-{code}.txt"
            input_files.add(filename)
            epochs, moon_offset = vector_export(filename)
            if epochs[0] > start or epochs[-1] < stop:
                raise ValueError(f"{filename}: incomplete coverage")
            def moon_at(et):
                return center_at(et) + moon_offset(et)
            provenance = "JPL Horizons "+filename
        manifest["bodies"][str(code)] = write(moon_at,start,stop,120,provenance)
        manifest["moons"].append({"id":code,"parent":center,"name":name,"label":label,
                                  "radiusKm":moon_sizes[name]["radiusKm"]})
        if code == 801:
            encounter("triton",code,moon_at,cuts[4][4])
        else:
            epochs = np.linspace(start,stop,145)
            closest = min(epochs,key=lambda et: np.linalg.norm((state(-32,et)-moon_at(et))[:3]))
            encounter(f"moon-{code}",code,moon_at,closest,interior=True,target_source=provenance)

load([lsk,base,de])
write_track(previous,handover,6*3600,base)
old=state(-32,handover)
load([lsk,base,de,prediction])
new=write_track(handover,tracking_end,day,prediction)[0]
new["seamKm"]=float(np.linalg.norm(old[:3]-state(-32,handover)[:3]))
write_track(tracking_end,end,5*day,prediction)

load([lsk,de])
for body, step in [(199,day),(299,2*day),(399,2*day),(4,3*day),(5,8*day),(6,8*day),(7,10*day),(8,10*day)]:
    manifest["bodies"][str(body)]=write(lambda et:state(body,et),begin,end,step,de)
for name in {lsk,de,base,prediction,*[e[1] for e in encounters],*input_files}:
    manifest["files"][name]=hashlib.sha256((source/name).read_bytes()).hexdigest()
(output/"voyager-states.bin").write_bytes(blob)
(output/"voyager-states.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf8")
print(json.dumps({k:manifest[k] for k in ("begin","end","events")},indent=2))
print(f"{len(blob)} bytes")
