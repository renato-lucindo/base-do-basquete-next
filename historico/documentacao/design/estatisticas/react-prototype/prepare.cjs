// Extract named declarations from the supplied source, then apply scoped adapters.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const write = (name, text) => fs.writeFileSync(path.join(root, name), text);
fs.mkdirSync(path.join(root, "adapted"), { recursive: true });
function declaration(file, name) {
  const text = read("upstream/" + file);
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const node = source.statements.find((n) => n.name?.getText(source) === name);
  if (!node) throw new Error(`Declaration not found: ${name}`);
  return node.getText(source);
}
function change(text, from, to) {
  if (!text.includes(from))
    throw new Error(`Adapter pattern not found: ${from.slice(0, 90)}`);
  return text.replace(from, to);
}
let button = declaration("statistics-explorer.tsx", "SortButton");
button = change(button, "  onClick,", "  onClick,\n  sortKey,");
button = change(
  button,
  "  onClick: () => void;",
  "  onClick: () => void;\n  sortKey: string;",
);
button = change(
  button,
  "  return (",
  "  const tooltip = useNameTooltip(metricName(sortKey, label));\n  return (",
);
button = change(
  button,
  '<button className="statistics-sort" onClick={onClick} type="button">',
  '<button {...tooltip} className="statistics-sort sort" data-sort={metricCode(sortKey)} aria-label={`Ordenar por ${label}`} aria-pressed={active} onClick={(event) => { onClick(); tooltip.onClick(event); }} type="button">',
);
button = change(
  button,
  '<span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>',
  '{active ? <span className="sort-arrow" aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span> : null}',
);
let header = declaration("statistics-explorer.tsx", "SortHeader");
header = change(
  header,
  '      scope="col"',
  '      data-column={metricCode(sortKey)}\n      className={activeKey === sortKey ? "reference-sorted active-column" : undefined}\n      scope="col"',
);
header = change(
  header,
  "        active={activeKey === sortKey}",
  "        sortKey={sortKey}\n        active={activeKey === sortKey}",
);
let table = declaration("statistics-explorer.tsx", "ScoresheetStatisticsTable");
table = change(
  table,
  "function ScoresheetStatisticsTable",
  "export function ScoresheetStatisticsTable",
);
table = table.replace(
  /  context,\r?\n|  positionOffset,\r?\n|  searchParams,\r?\n|  showDisqualifications,\r?\n/g,
  "",
);
table = table.replace(
  /  context: CompetitionContext;\r?\n|  positionOffset: number;\r?\n|  searchParams: URLSearchParams;\r?\n|  showDisqualifications: boolean;\r?\n/g,
  "",
);
table = change(table, "  direction,", "  direction,\n  mode,");
table = change(
  table,
  "  direction: SortDirection;",
  "  direction: SortDirection;\n  mode: Mode;",
);
table = change(
  table,
  "players: ScoresheetPlayerStatistics[]",
  "players: PlayerRow[]",
);
table = change(
  table,
  "}) {\n  return (",
  "}) {\n  const showDisqualifications = true;\n  return (",
);
table = change(
  table,
  "<caption>Dados registrados por súmula</caption>",
  '<caption className="sr-only">Copa da Base 2026, Sub-19 masculino. {metricCount > 0 ? "Selecione um cabeçalho numérico para ordenar. Legenda ao final da tabela." : "Ordem do ranking preservada."}</caption>',
);
table = change(table, "<col span={7}", "<col span={11}");
table = change(table, '<th scope="col">Pos.</th>', '<th scope="col">Pos.</th>');
for (const [label, key] of [
  ["Atleta", "player"],
  ["Equipe", "team"],
]) {
  const pattern = new RegExp(
    `            <SortHeader\\s+activeKey=\\{sortKey\\}\\s+direction=\\{direction\\}\\s+label="${label}"\\s+onSort=\\{onSort\\}\\s+sortKey="${key}"\\s+/>`,
  );
  if (!pattern.test(table)) throw new Error(`Text header pattern: ${key}`);
  table = table.replace(pattern, `            <th scope="col">${label}</th>`);
}
table = change(table, 'label="PTS/J"', 'label="PPJ"');
table = change(
  table,
  'label="2PC"',
  'label={mode === "averages" ? "2P/J" : "2P"}',
);
table = change(
  table,
  'label="3PC"',
  'label={mode === "averages" ? "3P/J" : "3P"}',
);
table = change(
  table,
  'label="LLC"',
  'label={mode === "averages" ? "LL/J" : "LL"}',
);
table = change(table, 'label="F"', 'label={mode === "averages" ? "F/J" : "F"}');
table = change(
  table,
  '            <SortHeader\n              activeKey={sortKey}\n              direction={direction}\n              label={mode === "averages" ? "2P/J" : "2P"}',
  `            <SortHeader activeKey={sortKey} direction={direction} label="PP%" onSort={onSort} sortKey="pointShare" />
            <SortHeader
              activeKey={sortKey}
              direction={direction}
              label={mode === "averages" ? "2P/J" : "2P"}`,
);
table = change(
  table,
  "            {showDisqualifications ? (",
  '            <SortHeader activeKey={sortKey} direction={direction} label={mode === "averages" ? "T/J" : "T"} onSort={onSort} sortKey="technical" />\n            <SortHeader activeKey={sortKey} direction={direction} label={mode === "averages" ? "U/J" : "U"} onSort={onSort} sortKey="unsportsmanlike" />\n            <SortHeader activeKey={sortKey} direction={direction} label="5F" onSort={onSort} sortKey="fiveFoulGames" />\n            {showDisqualifications ? (',
);
table = change(table, "players.map((player, index)", "players.map((player)");
table = change(
  table,
  "<tr key={player.playerId}>",
  "<tr key={player.id} data-athlete={player.id}>",
);
table = change(table, "{positionOffset + index + 1}", '{player.rank ?? "—"}');
table = change(
  table,
  '<th scope="row">',
  '<th scope="row" className="reference-player">',
);
table = change(
  table,
  "<Link to={playerPath(context, player, searchParams)}>{player.playerName}</Link>",
  '<span className="player"><span className="player-name">{player.playerName}</span>{" "}<span className="player-jersey" aria-label={`Camisa ${player.jersey ?? "não informada"}`}>{player.jersey === null ? "—" : `#${player.jersey}`}</span></span>',
);
table = change(
  table,
  "<td>\n                <TeamCell player={player} />\n              </td>",
  '<td className="team-name">{player.teamName}</td>',
);
const fields = [
  ["gamesPlayed", "j"],
  ["points", "pts"],
  ["pointsPerGame", "ppj"],
  ["twoPointMade", "two"],
  ["threePointMade", "three"],
  ["freeThrowMade", "ft"],
  ["fouls", "fouls"],
  ["disqualifications", "gd"],
];
for (const [field, code] of fields) {
  const pattern = new RegExp(
    `<td(?: className="scoresheet-extra-metric")?>\\s*\\{(?:displayNumber\\(player\\.${field}\\)|player\\.${field})\\}\\s*</td>`,
  );
  if (!pattern.test(table)) throw new Error(`Metric cell pattern: ${field}`);
  table = table.replace(
    pattern,
    `<MetricCell player={player} metric="${field}" mode={mode} sortKey={sortKey} />`,
  );
}
table = change(
  table,
  '<MetricCell player={player} metric="twoPointMade"',
  '<MetricCell player={player} metric="pointShare" mode={mode} sortKey={sortKey} />\n              <MetricCell player={player} metric="twoPointMade"',
);
table = change(
  table,
  "              {showDisqualifications ? (\n                <MetricCell",
  '              <MetricCell player={player} metric="technical" mode={mode} sortKey={sortKey} />\n              <MetricCell player={player} metric="unsportsmanlike" mode={mode} sortKey={sortKey} />\n              <MetricCell player={player} metric="fiveFoulGames" mode={mode} sortKey={sortKey} />\n              {showDisqualifications ? (\n                <MetricCell',
);
// Column visibility is applied to the extracted JSX, removing cells and widths together.
table = change(table, "  mode,", "  mode,\n  visibleColumns,");
table = change(
  table,
  "  mode: Mode;",
  "  mode: Mode;\n  visibleColumns: string[];",
);
table = change(
  table,
  "const showDisqualifications = true;",
  'const showDisqualifications = visibleColumns.includes("disqualifications");\n  const showTeam=visibleColumns.includes("team");\n  const metricCount=visibleColumns.length-Number(showTeam);',
);
table = table.replace(
  /<colgroup>[\s\S]*?<\/colgroup>/,
  `<colgroup>
  <col className="column-position" /><col className="column-player" />{showTeam ? <col className="column-team" /> : null}
  {metricCount>0 ? <col span={metricCount} className="column-metric" /> : null}
</colgroup>`,
);
table = change(
  table,
  '<table className="statistics-table statistics-table-scoresheet">',
  '<table className="statistics-table statistics-table-scoresheet" style={{ minWidth: `calc(var(--identity-columns, 450px) - ${showTeam ? "0px" : "var(--team-column, 135px)"} + ${metricCount * 68}px)` }}>',
);
table = change(
  table,
  '<th scope="col">Equipe</th>',
  '{showTeam ? <th className="team-column-header" scope="col">Equipe</th> : null}',
);
table = change(
  table,
  '<td className="team-name">{player.teamName}</td>',
  '{showTeam ? <td className="team-name">{player.teamName}</td> : null}',
);
table = table.replace(/<SortHeader\b[\s\S]*?\/>/g, (jsx) => {
  const key = jsx.match(/sortKey="([^"]+)"/)[1];
  if (key === "disqualifications") return jsx;
  return `{visibleColumns.includes("${key}") ? (${jsx}) : null}`;
});
table = table.replace(/<MetricCell\b[^>]*\/>/g, (jsx) => {
  const field = jsx.match(/metric="([^"]+)"/)[1];
  if (field === "disqualifications") return jsx;
  const key = field === "gamesPlayed" ? "games" : field;
  return `{visibleColumns.includes("${key}") ? (${jsx}) : null}`;
});
// TypeScript's getText retains source line endings. Normalise only in adapted copies.
const prefix = `// Adapted from upstream/statistics-explorer.tsx: extracted declarations, not a new HTML renderer.\nimport { ScrollableTable } from '../upstream/scrollable-table';\nimport { useNameTooltip } from './tooltip';\nimport { MetricCell } from './metric-cell';\nimport { metricName, metricCode, type PlayerRow, type Mode } from '../model';\nimport type { SortDirection, StatisticsSortKey } from './table-controls';\n\n`;
write(
  "adapted/scoresheet-statistics-table.tsx",
  prefix + [button, header, table].join("\n\n"),
);
const controls = ["normalizeSearch", "compareValues", "nextSort"].map((name) =>
  declaration("table-controls.ts", name),
);
write(
  "adapted/table-controls.ts",
  `// Functions extracted without logic changes from upstream/table-controls.ts.\nexport type SortDirection = "asc" | "desc";\nexport type StatisticsSortKey = string;\n\n` +
    controls.join("\n\n"),
);
const css = read("upstream/boxscore-statistics.css");
const start = css.indexOf(".reference-explorer > .scrollable-table {");
const end = css.indexOf(".reference-explorer .statistics-pagination {", start);
let excerpt = css.slice(start, end);
// Remove the optional help-icon rules: the supplied feedback explicitly removes icons.
excerpt = excerpt
  .replace(/\.metric-help-icon \{[\s\S]*?\n\}/, "")
  .replace(
    /\.statistics-sort:is\(:hover, :focus-visible\) \.metric-help-icon \{[\s\S]*?\n\}/,
    "",
  );
write(
  "adapted/reference-table.css",
  "/* Table rules extracted from upstream/boxscore-statistics.css; help-icon rules removed. */\n" +
    excerpt,
);
// Carry forward the previously validated fictional match-level data, not its renderer.
const legacy = fs.readFileSync(path.join(root, "../app.js"), "utf8");
const data = legacy.slice(
  legacy.indexOf("  const teams ="),
  legacy.indexOf("  const columns ="),
);
write(
  "fixtures.js",
  "// Fictional match-level data retained from prototype revision 2.\n" +
    data +
    `
// Fictional disciplinary breakdowns are subsets of F, not additions to it.
const discipline = {
  'joao-pinheiros':[2,1], 'rafael-paulistano':[2,0], 'gabriel-franca':[3,2],
  'matheus-saoJose':[0,1], 'lucas-bauru':[2,1], 'davi-mogi':[1,1],
  'pedro-pinheiros':[0,0], 'arthur-paulistano':[1,1], 'enzo-franca':[1,0],
  'bernardo-bauru':[0,2], 'thiago-saoJose':[1,0], 'felipe-mogi':[1,1],
  'lucas-pinheiros':[2,1], 'henrique-paulistano':[0,0], 'miguel-franca':[0,0], 'vicente-bauru':[0,0],
};
for (const a of athletes) {
  for (const g of a.games) { g.technical=0; g.unsportsmanlike=0; }
  const totals=discipline[a.id];
  const existingGD=a.games.findIndex(g=>g.gd===1);
  const unsportOffset=existingGD>=0?existingGD:totals[0];
  for (const [field,amount,offset] of [['technical',totals[0],0],['unsportsmanlike',totals[1],unsportOffset]]) {
    for (let n=0;n<amount;n++) {
      const game=Array.from({length:a.games.length},(_,i)=>a.games[(i+n+offset)%a.games.length]).find(g=>(g.fouls===null||g.technical+g.unsportsmanlike<g.fouls)&&(g.gd===1||g.technical+g.unsportsmanlike===0));
      if (!game) throw new Error('Disciplinary fixture exceeds F: '+a.id);
      game[field]++;
    }
  }
  if (a.id==='felipe-mogi') a.games.at(-1).technical=null;
  if (a.id==='matheus-saoJose') a.games.at(-1).unsportsmanlike=null;
}
export { teams, athletes };
`,
);
// Extract the actual team-filter fieldset from the ZIP, retaining its JSX/actions.
const filterSourceText = read("upstream/boxscore-statistics-explorer.tsx");
const filterSource = ts.createSourceFile(
  "boxscore-statistics-explorer.tsx",
  filterSourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let fieldset;
function findFieldset(node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(filterSource) === "fieldset" &&
    node.openingElement.attributes.properties.some(
      (p) =>
        p.name?.getText(filterSource) === "className" &&
        p.initializer?.getText(filterSource) === '"reference-team-filter"',
    )
  )
    fieldset = node;
  if (!fieldset) ts.forEachChild(node, findFieldset);
}
findFieldset(filterSource);
if (!fieldset) throw new Error("Original team-filter fieldset not found");
let filterBody = fieldset.getText(filterSource);
const replacements = [];
function findHandlers(node) {
  if (
    ts.isJsxAttribute(node) &&
    ["onClick", "onChange"].includes(node.name.getText(filterSource))
  ) {
    const old = node.getText(filterSource);
    const name = node.name.getText(filterSource);
    const replacement =
      name === "onClick"
        ? old.includes("next.append")
          ? "onClick={() => onChange([])}"
          : "onClick={() => onChange(data.teams.map(t => t.slug))}"
        : "onChange={() => { const next = new Set(selectedTeams); if (next.has(team.slug)) next.delete(team.slug); else next.add(team.slug); onChange(data.teams.filter(t => next.has(t.slug)).map(t => t.slug)); }}";
    replacements.push([old, replacement]);
  }
  ts.forEachChild(node, findHandlers);
}
findHandlers(fieldset);
for (const [old, next] of replacements)
  filterBody = change(filterBody, old, next);
filterBody = change(filterBody, "<input", "<input data-team={team.slug}");
write(
  "adapted/team-filter.tsx",
  `// Team-filter fieldset extracted from upstream/boxscore-statistics-explorer.tsx.
// Local adapter replaces URL mutations with a controlled array; original choices and actions retained.
import {useEffect,useRef,useState} from 'react';
export function TeamFilter({options,value,onChange}:{options:{id:string;name:string}[];value:string[];onChange:(ids:string[])=>void}) {
  const [open,setOpen]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const data={teams:options.map(t=>({...t,slug:t.id}))};
  const selectedTeams=new Set(value), selectedTeamCount=value.length;
  const hasTeamFilter=selectedTeamCount!==data.teams.length;
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!container.current?.contains(e.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return ()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  const title=selectedTeamCount===data.teams.length?'Todas as equipes':selectedTeamCount===0?'Nenhuma equipe':'Equipes · '+selectedTeamCount+' de '+data.teams.length;
  return <div ref={container} className="team-filter" data-source-component="TeamFilter" onKeyDown={e=>{if(e.key==='Escape'&&open){setOpen(false);trigger.current?.focus();}}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <span id="team-filter-label" className="filter-label">Equipe</span>
    <button id="team-filter-toggle" ref={trigger} type="button" aria-labelledby="team-filter-label team-filter-value" aria-expanded={open} aria-controls="team-filter-panel" onClick={()=>setOpen(v=>!v)}><span id="team-filter-value">{title}</span><span aria-hidden="true">⌄</span></button>
    {open?<div id="team-filter-panel" className="team-filter-panel">${filterBody}</div>:null}
  </div>;
}
`,
);
// Retain the actual column-options JSX from the ZIP; adapt its URL state to local selection.
let columnOptionsNode;
function findColumnOptions(node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.attributes.properties.some(
      (p) =>
        p.name?.getText(filterSource) === "className" &&
        p.initializer?.getText(filterSource) === '"column-options"',
    )
  )
    columnOptionsNode = node;
  if (!columnOptionsNode) ts.forEachChild(node, findColumnOptions);
}
findColumnOptions(filterSource);
if (!columnOptionsNode) throw new Error("Original column-options not found");
let columnBody = columnOptionsNode.getText(filterSource);
function adaptColumnAttributes(node) {
  if (ts.isJsxAttribute(node)) {
    const name = node.name.getText(filterSource);
    if (name === "onChange")
      columnBody = change(
        columnBody,
        node.getText(filterSource),
        `onChange={(event) => {
      const selected = new Set(selectedColumns);
      for (const metric of option.metrics) { if (event.target.checked) selected.add(metric); else selected.delete(metric); }
      onChange(options.filter(m => selected.has(m.key)).map(m => m.key));
    }}`,
      );
    if (name === "disabled")
      columnBody = change(columnBody, node.getText(filterSource), "");
  }
  ts.forEachChild(node, adaptColumnAttributes);
}
adaptColumnAttributes(columnOptionsNode);
columnBody = change(
  columnBody,
  "<input",
  "<input data-column-choice={option.metrics[0]}",
);
write(
  "adapted/column-picker.tsx",
  `// Column-options JSX extracted from upstream/boxscore-statistics-explorer.tsx.
// Controlled adapter: responsive defaults, optional team and metrics, accessible popup/focus.
import {useEffect,useRef,useState} from 'react';
export function ColumnPicker({options,value,onChange}:{options:readonly {key:string;label:string;name:string}[];value:string[];onChange:(keys:string[])=>void}) {
  const [open,setOpen]=useState(false);
  const [panelHeight,setPanelHeight]=useState(560);
  const container=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const selectedColumns=value;
  const columnOptions=options.map(m=>({label:m.name ? m.label+' · '+m.name : m.label,metrics:[m.key]}));
  useEffect(()=>{
    if(!open)return;
    const resize=()=>setPanelHeight(Math.max(160,Math.min(560,window.innerHeight-(trigger.current?.getBoundingClientRect().bottom??0)-24)));
    resize();
    const outside=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    window.addEventListener('resize',resize);window.addEventListener('scroll',resize);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize);window.removeEventListener('scroll',resize);};
  },[open]);
  return <div className="column-picker" ref={container} data-source-component="ColumnPicker" onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);trigger.current?.focus();}}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <button id="column-picker-toggle" ref={trigger} type="button" aria-expanded={open} aria-controls="column-picker-panel" onClick={()=>setOpen(v=>!v)}>Colunas · {value.length} de {options.length}<span aria-hidden="true">⌄</span></button>
    {open?<div id="column-picker-panel" className="team-filter-panel column-picker-panel" style={{maxHeight:panelHeight}}>
      <fieldset className="column-picker-fieldset"><legend>Colunas da tabela</legend>
        <div className="column-actions"><button type="button" onClick={()=>onChange(options.map(m=>m.key))}>Todas</button><button type="button" onClick={()=>onChange([])}>Nenhuma</button></div>
        <p className="column-picker-note">Atleta e posição ficam sempre visíveis.</p>
        ${columnBody}
      </fieldset>
    </div>:null}
  </div>;
}
`,
);
console.log(
  "Extracted and adapted: ScoresheetStatisticsTable, SortHeader, SortButton, TeamFilter, ColumnPicker; responsive visibility for 12 metrics; original ScrollableTable/ResourceState; 3 unchanged control helpers; match-level disciplinary fixtures.",
);
