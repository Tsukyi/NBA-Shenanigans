import {playerById,teams,catalog,eligible,slots,teamRating} from './catalog.js';
export const VERSION=1;
export function rng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const average=(a,fn)=>a.reduce((s,x)=>s+fn(x),0)/a.length;
function weighted(items,weight,random){const weights=items.map(x=>Math.max(.01,weight(x)));let n=random()*weights.reduce((s,x)=>s+x,0);for(let i=0;i<items.length;i++){n-=weights[i];if(n<=0)return items[i];}return items.at(-1);}
export function validateLineup(ids,mode='current'){
 if(!Array.isArray(ids)||ids.length!==8||ids.some(id=>!id))return 'Draft five starters and three bench players first.';
 if(new Set(ids).size!==8)return 'Each player can appear only once.';
 const allowed=new Set(catalog(mode).map(p=>p.id));
 for(let i=0;i<8;i++){const p=playerById[ids[i]];if(!p||!allowed.has(ids[i]))return 'A player is not available in this draft mode.';if(!eligible(p,slots[i]))return `${p.name} cannot fill the ${slots[i]} slot.`;}
 return null;
}
/** Backtracking assigns the scarce starting positions first; it cannot strand a centre. */
export function fillLineup(pool,random,existing=Array(8).fill(null)){
 const result=[...existing];const used=new Set(result.filter(Boolean));const shuffled=shuffle(pool,random);
 const open=[0,1,2,3,4].filter(i=>!result[i]).sort((a,b)=>shuffled.filter(p=>eligible(p,slots[a])).length-shuffled.filter(p=>eligible(p,slots[b])).length);
 function assign(n){if(n===open.length)return true;const i=open[n];for(const p of shuffled){if(used.has(p.id)||!eligible(p,slots[i]))continue;result[i]=p.id;used.add(p.id);if(assign(n+1))return true;used.delete(p.id);result[i]=null;}return false;}
 if(!assign(0))throw Error('Not enough eligible players to complete the starters.');
 for(let i=5;i<8;i++)if(!result[i]){const p=shuffled.find(p=>!used.has(p.id));if(!p)throw Error('Not enough players for the bench.');result[i]=p.id;used.add(p.id);}
 return result;
}
export function createTournament({seed,franchise,lineup,mode='current',bestOf=3,strategy='balanced',opponentPool='rated'}){
 const error=validateLineup(lineup,mode);if(error)throw Error(error);
 if(!teams.some(t=>t.id===franchise))throw Error('Choose a valid NBA franchise.');
 if(![1,3,7].includes(bestOf))throw Error('Unsupported series length.');
 if(!['balanced','pace','defense'].includes(strategy))throw Error('Unsupported strategy.');
 seed=String(seed||'TIPOFF').trim().slice(0,80)||'TIPOFF';
 const random=rng(seed+':draft:'+mode+':'+opponentPool),used=new Set(lineup);
 const teamIds=shuffle(teams.filter(t=>t.id!==franchise),random).slice(0,7).map(t=>t.id);
 const pool=catalog(mode).filter(p=>opponentPool==='archive'||p.rated);
 const rosters=[{id:franchise,roster:[...lineup],strategy,user:true}];
 // Draft starting roles across all teams before benches so every team can fill every role.
 const bots=teamIds.map(id=>({id,roster:Array(8).fill(null),strategy:['balanced','pace','defense'][Math.floor(random()*3)],user:false}));
 const remaining=shuffle(pool.filter(p=>!used.has(p.id)),random);
 const positions=[...slots.slice(0,5)].sort((a,b)=>remaining.filter(p=>eligible(p,a)).length-remaining.filter(p=>eligible(p,b)).length);
 for(const slot of positions)for(const bot of shuffle(bots,random)){
  const options=remaining.filter(p=>!used.has(p.id)&&eligible(p,slot));
  if(!options.length)throw Error('Not enough position coverage in this player pool. Try another lineup.');
  // Prefer less flexible players to preserve scarce alternatives for other roles.
  const min=Math.min(...options.map(p=>p.positions.filter(s=>positions.indexOf(s)>positions.indexOf(slot)).length));
  const candidates=options.filter(p=>p.positions.filter(s=>positions.indexOf(s)>positions.indexOf(slot)).length===min);
  const p=candidates[Math.floor(random()*candidates.length)];bot.roster[slots.indexOf(slot)]=p.id;used.add(p.id);
 }
 for(const bot of bots)for(let i=5;i<8;i++){const options=remaining.filter(p=>!used.has(p.id));const p=options[Math.floor(random()*options.length)];if(!p)throw Error('Not enough players in the pool.');bot.roster[i]=p.id;used.add(p.id);}
 rosters.push(...bots);
 const draw=shuffle(rosters,random).map((t,i)=>({...t,seed:i+1}));
 const bracket=[0,7,3,4,1,6,2,5].map(i=>draw[i].id);
 return {version:VERSION,seed,mode,bestOf,strategy,opponentPool,userTeam:franchise,teams:draw,round:0,rounds:[Array.from({length:4},(_,i)=>({id:`r0s${i}`,teams:bracket.slice(i*2,i*2+2),wins:[0,0],games:[],winner:null}))],games:[],champion:null};
}
const statKeys=['min','pts','reb','oreb','dreb','ast','stl','blk','to','fgm','fga','tpm','tpa','ftm','fta','plusMinus'];
function blank(id){return {id,...Object.fromEntries(statKeys.map(k=>[k,0]))};}
function rotation(roster,shift){
 const lineup=roster.slice(0,5);const count=[0,1,2,2,2,1,0,1,2,2,2,1][shift%12];const filled=new Set();
 for(let n=0;n<count;n++){const b=roster[5+(shift+n)%3],bp=playerById[b];const choices=[0,1,2,3,4].filter(i=>!filled.has(i));const compatible=choices.filter(i=>eligible(bp,slots[i]));const target=(compatible.length?compatible:choices)[shift%(compatible.length||choices.length)];lineup[target]=b;filled.add(target);}
 return lineup;
}
/** Possession model. Scores, shooting lines, rebounds, assists, and +/- share one event stream. */
export function simulateGame(teamA,teamB,seed){
 const random=rng(seed),teamsIn=[teamA,teamB],box=teamsIn.map(t=>t.roster.map(blank)),lookup=box.map(rows=>Object.fromEntries(rows.map(r=>[r.id,r]))),scores=[0,0],quarters=[[],[]];
 let active=[[],[]],period=0;
 const stats=(side,id)=>lookup[side][id],on=side=>active[side].map(id=>playerById[id]);
 const addPoints=(side,id,n)=>{if(!n)return;stats(side,id).pts+=n;scores[side]+=n;for(const pid of active[side])stats(side,pid).plusMinus+=n;for(const pid of active[1-side])stats(1-side,pid).plusMinus-=n;};
 function rebound(side,allowOffensive=true){const offense=on(side),defense=on(1-side);const chance=clamp(.225+(average(offense,p=>p.attributes.rebounding)-average(defense,p=>p.attributes.rebounding))*.002,.12,.36);const owner=allowOffensive&&random()<chance?side:1-side;const p=weighted(on(owner),p=>p.attributes.rebounding**2*(p.positions.includes('C')?1.35:1),random);stats(owner,p.id).reb++;stats(owner,p.id)[owner===side?'oreb':'dreb']++;return owner===side;}
 function possession(side){
  let attempts=0;
  while(attempts++<6){
   const offense=on(side),defense=on(1-side),style=teamsIn[side].strategy,defStyle=teamsIn[1-side].strategy;
   const shooter=weighted(offense,p=>(p.attributes.inside*.58+p.attributes.shooting*.42-35)**2,random),s=stats(side,shooter.id);
   const defender=weighted(defense,p=>p.attributes.defense,random);
   const def=average(defense,p=>p.attributes.defense)+(defStyle==='defense'?4:0);
   const play=average(offense,p=>p.attributes.playmaking);
   const tired=Math.max(0,s.min-36)*.001;
   if(random()<clamp(.135-(play-75)*.0012+(def-80)*.001+(style==='pace'?.015:0),.07,.2)){
    s.to++;if(random()<.67)stats(1-side,defender.id).stl++;return;
   }
   const isThree=random()<clamp(.16+(shooter.attributes.shooting-65)*.011+(style==='pace'?.09:0),.015,.65);
   if(random()<(isThree?.045:.135)){
    const shots=isThree?3:2;let lastMade=false;for(let n=0;n<shots;n++){s.fta++;lastMade=random()<clamp(.61+(shooter.attributes.shooting-55)*.006,.45,.96);if(lastMade){s.ftm++;addPoints(side,shooter.id,1);}}
    if(!lastMade&&rebound(side,attempts<6))continue;return;
   }
   s.fga++;if(isThree)s.tpa++;
   const blockChance=clamp(.018+(defender.attributes.defense-70)*.001+(defender.positions.includes('C')?.025:0),.01,.095)*(isThree?.45:1);
   let made=false;
   if(random()<blockChance)stats(1-side,defender.id).blk++;
   else made=random()<clamp((isThree?.30+(shooter.attributes.shooting-75)*.0045:.49+(shooter.attributes.inside-75)*.0048)-(def-80)*.0018-tired+(style==='defense'?-.01:0),isThree?.16:.30,isThree?.49:.72);
   if(made){s.fgm++;if(isThree)s.tpm++;addPoints(side,shooter.id,isThree?3:2);if(random()<clamp(.57+(play-75)*.006,.40,.79)){const passer=weighted(offense.filter(p=>p.id!==shooter.id),p=>p.attributes.playmaking**2,random);stats(side,passer.id).ast++;}return;}
   if(!rebound(side,attempts<6))return;
  }
 }
 function playPeriod(overtime=false){
  const start=[...scores];const shifts=overtime?1:3,minutes=overtime?5:4;
  for(let shift=0;shift<shifts;shift++){
   const index=period*3+shift;active=teamsIn.map(t=>overtime?t.roster.slice(0,5):rotation(t.roster,index));
   for(let side=0;side<2;side++)for(const id of active[side])stats(side,id).min+=minutes;
   const pace=teamsIn.reduce((v,t)=>v+(t.strategy==='pace'?1:t.strategy==='defense'?-.6:0),0);
   const possessions=Math.max(6,Math.round((overtime?10:8)+random()*2+pace*.5));
   for(let j=0;j<possessions;j++){possession(0);possession(1);}
  }
  for(let side=0;side<2;side++)quarters[side].push(scores[side]-start[side]);period++;
 }
 for(let q=0;q<4;q++)playPeriod();while(scores[0]===scores[1])playPeriod(true);
 const winner=scores[0]>scores[1]?0:1;
 const totals=box.map(rows=>Object.fromEntries(statKeys.map(k=>[k,rows.reduce((s,r)=>s+r[k],0)])));
 const star=[...box[winner]].sort((a,b)=>gameScore(b)-gameScore(a))[0];
 return {id:String(seed),teams:[teamA.id,teamB.id],scores,quarters,box,totals,winner:teamsIn[winner].id,mvp:star.id,overtimes:period-4};
}
export function gameScore(s){return s.pts+1.2*s.reb+1.5*s.ast+2*s.stl+2*s.blk-s.to-.5*(s.fga-s.fgm);}
export function nextSeries(t){if(t.champion)return null;const unresolved=t.rounds[t.round].filter(s=>!s.winner);return unresolved.find(s=>s.teams.includes(t.userTeam))||unresolved[0]||null;}
export function advance(tournament){
 const t=structuredClone(tournament);if(t.champion)return t;const series=nextSeries(t);if(!series)throw Error('No available series.');
 const a=t.teams.find(x=>x.id===series.teams[0]),b=t.teams.find(x=>x.id===series.teams[1]);
 const gameNumber=series.games.length+1;
 const seed=`${t.seed}:${series.id}:game${gameNumber}:${a.roster.join(',')}:${b.roster.join(',')}:${a.strategy}:${b.strategy}`;
 const game=simulateGame(a,b,seed);game.id=`${series.id}g${gameNumber}`;game.round=t.round;game.series=series.id;game.gameNumber=gameNumber;
 series.games.push(game.id);series.wins[series.teams.indexOf(game.winner)]++;
 if(Math.max(...series.wins)>=Math.ceil(t.bestOf/2))series.winner=game.winner;
 t.games.push(game);
 if(t.rounds[t.round].every(s=>s.winner)){
  if(t.round===2)t.champion=t.rounds[2][0].winner;
  else{const winners=t.rounds[t.round].map(s=>s.winner);t.round++;t.rounds.push(Array.from({length:winners.length/2},(_,i)=>({id:`r${t.round}s${i}`,teams:winners.slice(i*2,i*2+2),wins:[0,0],games:[],winner:null})));}
 }
 return t;
}
export function finishRound(t){const round=t.round;let next=t;while(!next.champion&&next.round===round)next=advance(next);return next;}
export function leaderboard(t){const map=new Map();for(const g of t.games)for(let side=0;side<2;side++)for(const row of g.box[side]){let item=map.get(row.id);if(!item){item={...blank(row.id),games:0,team:g.teams[side]};map.set(row.id,item);}item.games++;for(const key of statKeys)item[key]+=row[key];}return [...map.values()].map(s=>({...s,ppg:s.pts/s.games,rpg:s.reb/s.games,apg:s.ast/s.games})).sort((a,b)=>b.ppg-a.ppg);}
export function tournamentMVP(t){if(!t.champion)return null;return leaderboard(t).filter(s=>s.team===t.champion).sort((a,b)=>gameScore(b)/b.games-gameScore(a)/a.games)[0]||null;}
export function validateTournament(t){
 try{if(!t||t.version!==VERSION||!Array.isArray(t.teams)||t.teams.length!==8||!Array.isArray(t.games)||!Array.isArray(t.rounds)||t.rounds.length>3||!Number.isInteger(t.round)||t.round<0||t.round>2||![1,3,7].includes(t.bestOf)||!teams.some(x=>x.id===t.userTeam)||typeof t.seed!=='string')return false;
 const teamIds=t.teams.map(x=>x.id);if(new Set(teamIds).size!==8||!teamIds.includes(t.userTeam))return false;
 const all=t.teams.flatMap(x=>x.roster);if(all.length!==64||new Set(all).size!==64)return false;
 for(const team of t.teams)if(!teams.some(x=>x.id===team.id)||validateLineup(team.roster,t.mode)||!['balanced','pace','defense'].includes(team.strategy))return false;
 if(t.games.length>49)return false;
 for(const round of t.rounds)for(const s of round)if(!Array.isArray(s.teams)||s.teams.length!==2||s.teams.some(id=>!teamIds.includes(id))||!Array.isArray(s.games)||!Array.isArray(s.wins))return false;
 return true;
 }catch{return false;}
}
