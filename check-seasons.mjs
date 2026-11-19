import assert from 'node:assert/strict';
import {resolveSeason} from './dist/season-state.js';
assert.deepEqual(resolveSeason(1,'north'),{north:1,south:3,month:'июль'});
assert.deepEqual(resolveSeason(3,'north'),{north:3,south:1,month:'январь'});
assert.deepEqual(resolveSeason(1,'south'),{north:3,south:1,month:'январь'});
assert.deepEqual(resolveSeason(3,'south'),{north:1,south:3,month:'июль'});
for(let i=0;i<4;i++)assert.equal(resolveSeason(i,'north').north,resolveSeason((i+2)%4,'south').north);
console.log('Season/month and hemisphere correspondence passed.');
