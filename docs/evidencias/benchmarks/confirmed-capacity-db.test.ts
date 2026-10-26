import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../../tests/fixtures/database-platform";
import { capacitySetup, capacityPublish } from "../../../tests/fixtures/confirmed-capacity";
import { statisticsSourceSchema } from "../../../src/statistics/source";
it("publica 1000 jogos válidos de 100 inscrições sem bloquear a transação G4", async () => {
 const db=await PGlite.create();
 try {
  await db.exec(platform);
  for(const file of (await readdir("supabase/migrations")).filter(n=>n.endsWith(".sql")).sort())
   await db.exec(await readFile(`supabase/migrations/${file}`,"utf8"));
  await db.exec(capacitySetup);
  await db.exec(capacityPublish);
  const run=(await db.query<{completed:number;failed_game:number|null;state:string|null;message:string|null;elapsed_ms:string}>("select * from capacity_run")).rows[0];
  const state=(await db.query<{state:unknown}>(`select jsonb_build_object(
   'published',(select count(*) from public.published_games),
   'versions',(select count(*) from private.game_publication_versions),
   'statisticsVersions',(select count(*) from private.statistics_publication_versions),
   'changes',(select count(*) from private.statistics_publication_changes),
   'receipts',(select count(*) from private.game_publication_commands),
   'sheets',(select count(*) from public.game_sheets),
   'playerGames',(select count(*) from public.published_player_games),
   'failedGame',(select to_jsonb(g) from public.games g where g.id=pg_temp.cap_id(100000+coalesce((select failed_game from capacity_run),1000))),
   'sourceBytes',(select octet_length(snapshot::text) from public.published_statistics)) as state`)).rows[0].state;
  // Planned fixture size uses actual publisher snapshots, no padding/unknown fields.
  const seed=(await db.query<{source:unknown}>(`select (h.snapshot-'gameCount')||jsonb_build_object('kind','confirmed-statistics-v1','games',
   (select jsonb_agg(jsonb_build_object('snapshot',x.snapshot,'phase',null) order by x.game_id) from
   (select snapshot,game_id from public.published_games order by game_id limit 50) x))
   as source from public.published_statistics h where dispute_id=pg_temp.cap_id(3)`)).rows[0].source;
  const source=statisticsSourceSchema.parse(seed);
  const templates=source.games.slice(0,50);
  const planned=statisticsSourceSchema.parse({...source,games:Array.from({length:1000},(_,i)=>{
   const game=structuredClone(templates[i%50]);game.snapshot.id=`f9400000-0000-4000-8000-${String(100001+i).padStart(12,"0")}`;return game;
  })});
  const plannedBytes=(await db.query<{bytes:number}>("select octet_length($1::jsonb::text) as bytes",[JSON.stringify(planned)])).rows[0].bytes;
  await db.exec('set constraints all immediate; analyze public.published_games;');
  const plan=(await db.query("explain (analyze, buffers, format json) select m.game_id,p.snapshot from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=pg_temp.cap_id(3) and m.game_id>pg_temp.cap_id(100500) order by m.game_id limit 100")).rows;
  const head=(await db.query<{head:{version:number;gameCount:number}}>("select public.get_public_statistics_head(pg_temp.cap_id(3)) as head")).rows[0].head;
  let cursor:string|null=null;const allGames:unknown[]=[];let pages=0;
  do{
   const page=(await db.query<{page:{games:unknown[];next:string|null;version:number}}>("select public.get_public_statistics_page(pg_temp.cap_id(3),$1,$2) as page",[head.version,cursor])).rows[0].page;
   expect(page.version).toBe(head.version);expect(page.games.length).toBeLessThanOrEqual(100);expect(page.games.length).toBeGreaterThan(0);
   allGames.push(...page.games);cursor=page.next;pages++;expect(pages).toBeLessThanOrEqual(120);
  }while(cursor);
  expect(allGames).toHaveLength(head.gameCount);
  const complete=statisticsSourceSchema.parse({...source,games:allGames});
  await writeFile(".preview-artifacts/capacity-confirmed-source.json",JSON.stringify(complete));
  const report={node:process.version,platform:process.platform,arch:process.arch,postgres:(await db.query("select version() as version")).rows[0],scope:"PGlite real PostgreSQL WASM; real G4 writer, all triggers enabled, disposable only; no network/edge/load proof",run,state,plan,read:{pages,games:complete.games.length,bytes:Buffer.byteLength(JSON.stringify(complete))},planned1000:{compactBytes:Buffer.byteLength(JSON.stringify(planned)),postgresJsonbTextBytes:plannedBytes,registrations:new Set(planned.games.flatMap(g=>[g.snapshot.game.home.registrationId,g.snapshot.game.away.registrationId])).size}};
  await writeFile(".preview-artifacts/confirmed-capacity-db.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  expect(state).toMatchObject({published:run.completed,versions:run.completed,statisticsVersions:run.completed,changes:run.completed,receipts:run.completed,sheets:run.completed,playerGames:run.completed*11});
  if(run.failed_game) expect(state).toMatchObject({failedGame:{state:"scheduled",version:1}});
  expect(run.state,JSON.stringify(report)).toBeNull();
  expect(run.completed).toBe(1000);
 }finally{await db.close();}
});
