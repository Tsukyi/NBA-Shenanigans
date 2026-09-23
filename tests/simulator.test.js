import test from 'node:test';
import assert from 'node:assert/strict';
import {current,historical,playerById,slots,eligible,catalog} from '../src/catalog.js';
import {rng,fillLineup,createTournament,simulateGame,advance,finishRound,validateLineup,validateTournament,leaderboard,tournamentMVP} from '../src/simulator.js';

const draft=(mode='current',seed='draft')=>fillLineup(catalog(mode).filter(p=>p.rated),rng(seed));
const run=(opts={})=>createTournament({seed:'TEST',franchise:'LAL',lineup:draft(opts.mode),...opts});
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
function checkGame(g){
 assert.notEqual(g.scores[0],g.scores[1]);
 assert.equal(g.winner,g.teams[g.scores[0]>g.scores[1]?0:1]);
 assert.ok(g.box[g.teams.indexOf(g.winner)].some(r=>r.id===g.mvp));
 for(let i=0;i<2;i++){
  assert.equal(g.box[i].length,8);
  assert.equal(sum(g.box[i],'pts'),g.scores[i]);
  assert.equal(g.quarters[i].reduce((a,b)=>a+b,0),g.scores[i]);
  assert.equal(g.quarters[i].length,4+g.overtimes);
  assert.equal(sum(g.box[i],'min'),240+25*g.overtimes);
  assert.equal(sum(g.box[i],'plusMinus'),5*(g.scores[i]-g.scores[1-i]));
  assert.ok(g.totals[i].ast<=g.totals[i].fgm);
  assert.ok(g.totals[i].stl<=g.totals[1-i].to);
  assert.ok(g.totals[i].blk<=g.totals[1-i].fga-g.totals[1-i].fgm);
  for(const row of g.box[i]){
   assert.equal(row.pts,2*row.fgm+row.tpm+row.ftm);
   assert.equal(row.reb,row.oreb+row.dreb);
   assert.ok(row.fgm<=row.fga&&row.tpm<=row.tpa&&row.tpm<=row.fgm&&row.ftm<=row.fta);
   assert.ok(row.min>0&&row.min<=48+g.overtimes*5);
   for(const [k,n] of Object.entries(row))if(k!=='id')assert.ok(Number.isInteger(n)&&(k==='plusMinus'||n>=0));
  }
  for(const key of Object.keys(g.totals[i]))assert.equal(g.totals[i][key],sum(g.box[i],key));
 }
}

test('directory contains all 5,205 unique identities and 175 curated profiles',()=>{
 assert.equal(current.length,100);assert.equal(historical.length,5205);
 assert.equal(new Set(historical.map(p=>p.id)).size,5205);
 assert.equal(historical.filter(p=>p.rated).length,175);
 for(const p of historical){assert.ok(p.name&&p.id);for(const value of Object.values(p.attributes))assert.ok(value>=0&&value<=99);}
 assert.equal(playerById['893'].name,'Michael Jordan');
 assert.equal(playerById['76001'].overall,70);
 assert.equal(playerById['76001'].unverifiedPosition,true);
});
test('lineups reject duplicates and position conflicts; partial drafts preserve choices',()=>{
 const lineup=draft();assert.equal(validateLineup(lineup),null);
 assert.ok(validateLineup([...lineup.slice(0,7),lineup[0]]));
 const center=current.find(p=>p.positions.length===1&&p.positions[0]==='C');
 assert.ok(validateLineup([center.id,...lineup.slice(1)]));
 const initial=Array(8).fill(null);initial[0]='201939';initial[7]='2544';
 const filled=fillLineup(current,rng('keep'),initial);
 assert.equal(filled[0],initial[0]);assert.equal(filled[7],initial[7]);assert.equal(validateLineup(filled),null);
 assert.throws(()=>run({bestOf:2}));
});
test('500 seeds produce unique, position-valid opponents across both eras and archive pools',()=>{
 for(let i=0;i<500;i++){
  const mode=i%2?'legacy':'current';const t=run({seed:'coverage-'+i,mode,lineup:draft(mode,'user'+i),opponentPool:i%3===0?'archive':'rated'});
  assert.equal(new Set(t.teams.flatMap(t=>t.roster)).size,64);assert.equal(validateTournament(t),true);
  for(const team of t.teams)for(let n=0;n<5;n++)assert.ok(eligible(playerById[team.roster[n]],slots[n]));
 }
});
test('seeded games are repeatable and every event balances across 300 games including overtime',()=>{
 const t=run();const [a,b]=t.teams;let overtime=0;
 assert.deepEqual(simulateGame(a,b,'same'),simulateGame(a,b,'same'));
 assert.notDeepEqual(simulateGame(a,b,'same'),simulateGame(a,b,'other'));
 for(let i=0;i<300;i++){const g=simulateGame(a,b,'balance'+i);checkGame(g);overtime+=g.overtimes;}
 assert.ok(overtime>0,'overtime was exercised');
});
test('all series formats advance correctly to a champion with retained box scores',()=>{
 for(const bestOf of [1,3,7])for(const mode of ['current','legacy']){
  let t=run({bestOf,mode});const original=JSON.stringify(t);const first=advance(t);
  assert.equal(JSON.stringify(t),original,'advance must not mutate the saved run');
  assert.deepEqual(first,advance(JSON.parse(original)));
  for(let round=0;round<3;round++)t=finishRound(t);
  assert.ok(t.champion);assert.equal(t.rounds.length,3);assert.equal(t.rounds[2][0].winner,t.champion);
  assert.equal(validateTournament(JSON.parse(JSON.stringify(t))),true);
  assert.ok(t.games.length>=7*Math.ceil(bestOf/2)&&t.games.length<=7*bestOf);
  for(const round of t.rounds)for(const s of round){assert.equal(Math.max(...s.wins),Math.ceil(bestOf/2));assert.equal(s.games.length,s.wins[0]+s.wins[1]);}
  for(const g of t.games)checkGame(g);
  const leaders=leaderboard(t);assert.equal(leaders.length,64);
  assert.equal(sum(leaders,'pts'),t.games.reduce((n,g)=>n+g.scores[0]+g.scores[1],0));
  assert.equal(tournamentMVP(t).team,t.champion);assert.deepEqual(advance(t),t);
 }
});
test('unrated historic players can fill any role and participate in a complete run',()=>{
 const initial=Array(8).fill(null);initial[0]='76001';
 const lineup=fillLineup(historical.filter(p=>p.rated),rng('archive'),initial);
 let t=run({mode:'legacy',lineup,opponentPool:'archive',bestOf:1});
 while(!t.champion)t=advance(t);
 assert.equal(t.games.length,7);assert.ok(leaderboard(t).some(p=>p.id==='76001'));
 assert.equal(validateTournament({...t,teams:[]}),false);
});
