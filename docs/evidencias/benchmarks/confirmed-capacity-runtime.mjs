// Run after confirmed-capacity-db and build:worker. Never deploys fixtures/services.
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
import {Miniflare,Response,convertV4MiniflareOptions} from "miniflare";
import {statisticsRpcBody} from "../../../tests/fixtures/statistics-rpc.ts";
const source=JSON.parse(await readFile(".preview-artifacts/capacity-confirmed-source.json","utf8"));
assert.equal(source.games.length,1000);
const origin="https://capacity.example.test";
let requests=0;
const mf=new Miniflare(convertV4MiniflareOptions({
 name:"capacity-local",modules:true,scriptPath:".worker-artifacts/worker.js",compatibilityDate:"2026-10-23",compatibilityFlags:["nodejs_compat"],
 bindings:{APP_ORIGIN:origin,SUPABASE_URL:"https://db.example.test",SUPABASE_PUBLISHABLE_KEY:"fixture-publishable",SESSION_ENCRYPTION_KEY:btoa("\0".repeat(32))},
 durableObjects:{SESSIONS:{className:"SessionStore",useSQLite:true}},
 outboundService:async(request)=>{
  const url=new URL(request.url);assert.match(url.pathname,/^\/rest\/v1\/rpc\/get_public_statistics_(head|page)$/u);
  assert.equal(request.headers.get("authorization"),null);assert.equal(request.headers.get("cookie"),null);
  requests++;return Response.json(statisticsRpcBody(source,url.pathname,await request.json()));
 }
}));
try{
 const first=source.games[0].snapshot,home=first.game.home,reports=[];
 for(const [name,path]of[["list",`/api/public/teams/${source.disputeId}?scope=all`],["detail",`/api/public/teams/${source.disputeId}/${home.team.id}?registrationId=${home.registrationId}&scope=all`]]){
  const times=[];
  for(let i=0;i<4;i++){
   const before=requests,start=performance.now(),r=await mf.dispatchFetch(origin+path),body=await r.json(),elapsed=performance.now()-start;
   assert.equal(r.status,200);assert.equal(requests-before,11);
   if(name==="list"){assert.equal(body.total,100);assert.equal(body.rows.length,20);assert.ok(body.rows.every(r=>r.gamesPlayed===20));}
   else{assert.equal(body.games.total,20);assert.equal(body.statistics.gamesPlayed,20);assert.equal(body.roster.total,6);}
   if(i>0)times.push(elapsed);
  }
  times.sort((a,b)=>a-b);reports.push({operation:name,warmups:1,samples:3,p50:times[1],p95:times[2],rpcRequestsPerQuery:11});
 }
 const report={node:process.version,platform:process.platform,arch:process.arch,scope:"Local workerd with controlled outbound; source from real disposable PostgreSQL G4 writer; includes serialization/transport/cold runtime; NOT edge/account CPU/network/load evidence",games:1000,registrations:100,sourceBytes:Buffer.byteLength(JSON.stringify(source)),reports};
 await writeFile(".preview-artifacts/confirmed-capacity-runtime.json",JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await mf.dispose();}
