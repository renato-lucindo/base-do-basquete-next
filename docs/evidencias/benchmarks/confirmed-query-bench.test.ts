import {it} from "vitest";
import {writeFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
import {teamStatisticsFixture} from "../../../tests/fixtures/team-statistics";
import {pubId} from "../../../tests/fixtures/publication";
import {buildTeamsPage} from "../../../src/team-statistics/domain";
import {buildTeamDetail} from "../../../src/team-statistics/detail";
import {parseTeamsQuery} from "../../../src/team-statistics/query-contract";
import {parseTeamDetailQuery} from "../../../src/team-statistics/detail-query";
it("records local pure query measurements without publishing fixtures",async()=>{
 const reports=[];
 for(const count of [100,1000]){
  const source=teamStatisticsFixture(),seed=source.games[0];
  source.games=Array.from({length:count},(_,i)=>{
   const g=structuredClone(seed);g.snapshot.id=pubId(80000+i);
   for(const side of ["home","away"] as const){const index=(i*2+(side==="home"?0:1))%100,id=pubId(81000+index);g.snapshot.game[side].registrationId=id;g.snapshot.game[side].name=`Inscrição ${index}`;
    for(const [n,p] of g.snapshot.facts.players.filter(p=>p.side===side).entries()) {p.registrationId=id;p.person.id=pubId(82000+index*20+n);}
    const cap=g.snapshot.facts.players.find(p=>p.side===side&&p.captain)!.person;g.snapshot.staff[side].captain=cap;g.snapshot.staff[side].coach=cap;
   }
   return g;
  });
  const bytes=Buffer.byteLength(JSON.stringify(source)),q=parseTeamsQuery(new URLSearchParams("scope=all")),dq=parseTeamDetailQuery(new URLSearchParams("scope=all"));
  for(const [name,run] of [["list",()=>buildTeamsPage(source,q)],["detail",()=>buildTeamDetail(source,pubId(9),pubId(81000),dq)]] as const){
   for(let i=0;i<2;i++)run();const samples=[];for(let i=0;i<5;i++){const t=performance.now();run();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);
   reports.push({operation:name,registrations:100,games:count,sourceBytes:bytes,withinSource4MiB:bytes<=4*1024*1024,warmups:2,samples:5,p50:samples[2],p95:samples[4],provisionalLocalTargetMs:250});
  }
 }
 const report={node:process.version,platform:process.platform,arch:process.arch,scope:"pure validation and calculation; pre-parsed synthetic source, no SQL/network/edge/account limits",reports};
 await writeFile(".preview-artifacts/confirmed-query-benchmark.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
});
