let atlas;

export const connectMissionAtlas = bridge => { atlas = bridge; };
export function missionAtlas() {
 if(!atlas)throw Error('Подождите, пока загрузится Солнечная система.');
 return atlas;
}
