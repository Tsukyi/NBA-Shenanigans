import {players} from '../data/players.js';
import {legends} from '../data/legends.js';
import {archive} from '../data/archive.js';
export {teams,teamById,metadata} from '../data/teams.js';
export const current=players.map(p=>({...p,rated:true,legend:false}));
const curated=new Map([...current,...legends.map(p=>({...p,rated:true}))].map(p=>[p.id,p]));
export const historical=archive.map(([id,name,active])=>curated.get(id)||{id,name,active,team:null,positions:['PG','SG','SF','PF','C'],unverifiedPosition:true,rated:false,legend:!active,overall:70,attributes:{inside:70,shooting:70,playmaking:70,defense:70,rebounding:70,athleticism:70},image:`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`,profile:`https://www.nba.com/player/${id}`});
export const playerById=Object.fromEntries(historical.map(p=>[p.id,p]));
export const catalog=mode=>mode==='legacy'?historical:current;
export const positions=['PG','SG','SF','PF','C'];
export const slots=['PG','SG','SF','PF','C','B1','B2','B3'];
export const attributes=[['inside','FIN','Finishing'],['shooting','SHT','Shooting'],['playmaking','PLY','Playmaking'],['defense','DEF','Defense'],['rebounding','REB','Rebounding'],['athleticism','ATH','Athleticism']];
export const nameOf=p=>p.displayName||p.name;
export function eligible(p,slot){return !slot||slot.startsWith('B')||p.positions.includes(slot);}
export function teamRating(ids){const list=ids.map(id=>playerById[id]).filter(Boolean);if(!list.length)return {overall:0,offense:0,defense:0};const avg=f=>Math.round(list.reduce((a,p,i)=>a+f(p)*(i<5?1:.6),0)/list.reduce((a,_,i)=>a+(i<5?1:.6),0));return {overall:avg(p=>p.overall),offense:avg(p=>(p.attributes.inside+p.attributes.shooting+p.attributes.playmaking)/3),defense:avg(p=>(p.attributes.defense*2+p.attributes.rebounding)/3)};}
