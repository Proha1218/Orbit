import {BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, BufferAttribute} from './vendor/three.module.js';

export const MARS_MOON_AXES_KM = {
 Phobos:[12.95, 9.16, 11.30],
 Deimos:[8.04, 5.11, 5.89]
};
export const MARS_MOON_SHAPE_SOURCE = 'https://doi.org/10.1186/s40623-023-01814-7';
export const CASSINI_MOON_SHAPE_SOURCE = 'https://doi.org/10.26033/ewy3-jy61';
const cassiniMoons = ['Atlas','Calypso','Daphnis','Epimetheus','Helene','Hyperion','Janus','Pan','Pandora','Prometheus','Telesto'];
const shapes = new Map();

export async function loadMoonShapes() {
 return Promise.allSettled([...Object.keys(MARS_MOON_AXES_KM), ...cassiniMoons].map(async name => {
  const response = await fetch(new URL('./shapes/' + name.toLowerCase() + '.bin', import.meta.url));
  if (!response.ok) throw Error('Не удалось загрузить форму: ' + name);
  const bytes = await response.arrayBuffer();
  const header = new DataView(bytes);
  const vertexCount = header.getUint32(0, true), indexCount = header.getUint32(4, true);
  const indexOffset = 8 + vertexCount * 32;
  if (vertexCount === 0 || indexCount === 0 || indexCount % 3 || bytes.byteLength !== indexOffset + indexCount * 2) {
   throw Error('Повреждённая модель: ' + name);
  }
  shapes.set(name, {
   vertices:new Float32Array(bytes, 8, vertexCount * 8),
   indices:new Uint16Array(bytes, indexOffset, indexCount)
  });
 }));
}

export function moonShapeGeometry(name, unitsPerKm) {
 const shape = shapes.get(name);
 if (!shape || !unitsPerKm) return null;
 const interleaved = new InterleavedBuffer(shape.vertices.slice(), 8);
 const geometry = new BufferGeometry();
 geometry.setAttribute('position', new InterleavedBufferAttribute(interleaved, 3, 0));
 geometry.setAttribute('normal', new InterleavedBufferAttribute(interleaved, 3, 3));
 geometry.setAttribute('uv', new InterleavedBufferAttribute(interleaved, 2, 6));
 geometry.setIndex(new BufferAttribute(shape.indices.slice(), 1));
 geometry.scale(unitsPerKm, unitsPerKm, unitsPerKm);
 geometry.computeBoundingSphere();
 return geometry;
}

export const hasMoonShape = name => shapes.has(name);


export const hasCassiniMoonShape = name => cassiniMoons.includes(name) && hasMoonShape(name);
