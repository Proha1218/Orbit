export const EARTH_MONTHS=['апрель','июль','октябрь','январь'];
export const SEASON_NAMES=['Весна','Лето','Осень','Зима'];
export function resolveSeason(index,hemisphere){
 const north=(index+(hemisphere==='south'?2:0))%4;
 return {north,south:(north+2)%4,month:EARTH_MONTHS[north]};
}
