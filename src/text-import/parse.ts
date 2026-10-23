import {
  LINE_LIMIT,
  ROW_LIMIT,
  TEXT_LIMIT,
  sourceLines,
  type TextMode,
  type TextRow,
} from "./contract";

/** Preview only. No identity matching, persistence or implicit confirmation. */
export function parseText(
  text: string,
  mode: TextMode,
  makeId: () => string = () => crypto.randomUUID(),
): TextRow[] {
  const lines = sourceLines(text);
  if (text.length > TEXT_LIMIT || lines.length > LINE_LIMIT)
    throw new RangeError("Use até 20 mil caracteres e 500 linhas.");
  const rows: TextRow[] = [];
  let parent: string | null = null;
  for (const [index, source] of lines.entries()) {
    const value = source.trim();
    if (!value) continue;
    if (rows.length === ROW_LIMIT)
      throw new RangeError("Use até 200 itens por revisão.");
    const header = /^Equipe\s*:\s*(.*)$/iu.exec(value);
    const common = {
      id: makeId(),
      line: index + 1,
      source,
      name: "",
      selected: true,
    };
    if (mode === "teams" || header) {
      parent = common.id;
      rows.push({
        ...common,
        kind: "team",
        name: header ? header[1].trim() : value,
        resolution: null,
      });
    } else {
      const player =
        /^([+-]?\d+)\s*[-–—:\t]\s*(.*)$/u.exec(value) ??
        /^([+-]?\d+)\s+(.+)$/u.exec(value) ??
        /^([+-]?\d+)$/u.exec(value);
      rows.push({
        ...common,
        kind: "athlete",
        name: player ? (player[2] ?? "").trim() : value,
        teamRowId: parent,
        jersey: player?.[1] ?? "",
        person: null,
        rosterId: makeId(),
      });
    }
  }
  return rows;
}
