import { z } from "zod";
import {
  emptyImportPlayer,
  LINE_LIMIT,
  ROW_LIMIT,
  TEXT_LIMIT,
  sourceLines,
  normalizeName,
  readyPlayerSchema,
  type ParsedRoster,
  type PlayerField,
  type TextRow,
} from "./contract";
import { parsePositions, tokenize } from "./tokens";
const dateSchema = z.iso.date();
function parsePlayer(
  source: string,
  line: number,
  makeId: () => string,
): TextRow {
  const row: TextRow = {
    id: makeId(),
    line,
    source,
    data: emptyImportPlayer(),
    provided: ["name"],
    issues: [],
    selected: true,
    decision: null,
    rosterId: makeId(),
    rosterVersion: 0,
  };
  let value = source
    .trim()
    .replace(/[“”]/gu, '"')
    .replace(/^[-–—]\s+/u, "");
  const provided = (field: PlayerField) => {
    if (!row.provided.includes(field)) row.provided.push(field);
  };
  const issue = (field: PlayerField | null, token: string, message: string) =>
    row.issues.push({ field, token, message });
  const set = <K extends PlayerField>(
    field: K,
    val: TextRow["data"][K],
    token: string,
  ) => {
    if (
      row.provided.includes(field) &&
      JSON.stringify(row.data[field]) !== JSON.stringify(val)
    ) {
      issue(
        field,
        token,
        "Mais de um valor para o mesmo campo. Corrija a interpretação.",
      );
      return;
    }
    row.data[field] = val;
    provided(field);
  };
  const prefix = /^([+-]?\d{1,3})(?:\s*[-–—;|]\s*|\s+)(.*)$/u.exec(value);
  if (prefix) {
    row.data.jersey = prefix[1];
    provided("jersey");
    value = prefix[2];
  }
  const { tokens, unclosed } = tokenize(value);
  if (!prefix && /^[+-]?\d{1,3}$/u.test(tokens[0] ?? "") && tokens.length > 1) {
    row.data.jersey = tokens.shift()!;
    provided("jersey");
  }
  row.data.name = (tokens.shift() ?? "").trim();
  if (unclosed) issue("nickname", value, "Há aspas não fechadas nesta linha.");
  for (const token of tokens) {
    if (!token) {
      issue(
        null,
        token,
        "Há um campo vazio entre separadores. Confira a linha.",
      );
      continue;
    }
    const normal = normalizeName(token);
    const date = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(token);
    if (date || /^\d{4}-\d{2}-\d{2}$/u.test(token)) {
      const iso = date
        ? `${date[3]}-${date[2].padStart(2, "0")}-${date[1].padStart(2, "0")}`
        : token;
      if (dateSchema.safeParse(iso).success) set("birthDate", iso, token);
      else {
        provided("birthDate");
        issue("birthDate", token, "Data de nascimento inválida.");
      }
    } else if (/^".*"$/u.test(token))
      set("nickname", token.slice(1, -1), token);
    else if (/^[0-9]{6}$/u.test(token))
      set("federationRegistration", token, token);
    else if (/^[0-9]{4}$/u.test(token)) {
      const year = Number(token);
      if (year >= 1) set("birthYear", year, token);
      else {
        provided("birthYear");
        issue("birthYear", token, "Ano de nascimento inválido.");
      }
    } else if (/^\d+(?:[,.]\d+)?\s*kg$/u.test(normal))
      set(
        "weightKg",
        Number(normal.replace(/\s*kg$/u, "").replace(",", ".")),
        token,
      );
    else if (["canhoto", "esquerda", "esquerdo", "left"].includes(normal))
      set("dominantHand", "left", token);
    else if (["direita", "destro", "direito", "right"].includes(normal))
      set("dominantHand", "right", token);
    else if (["ambidestro", "ambidestra", "ambas", "both"].includes(normal))
      set("dominantHand", "both", token);
    else {
      const position = parsePositions(token);
      if (position) {
        row.data.positions = [
          ...new Set([...row.data.positions, ...position.values]),
        ];
        provided("positions");
        if (position.unknown.length)
          issue(
            "positions",
            token,
            "Posição não reconhecida. Escolha até duas posições conhecidas.",
          );
      } else {
        const height = /^(\d+(?:[,.]\d+)?)\s*(cm|m)?$/u.exec(normal);
        if (
          height &&
          (height[2] ||
            /^\d{2,3}(?:[,.]\d+)?$/u.test(normal) ||
            /^\d[,.]\d+$/u.test(normal))
        ) {
          const numeric = Number(height[1].replace(",", "."));
          const meters =
            height[2] === "m" ||
            (!height[2] && /[,.]/u.test(height[1]) && numeric < 3);
          set(
            "heightCm",
            meters ? Math.round(numeric * 1000) / 10 : numeric,
            token,
          );
        } else
          issue(
            null,
            token,
            "Informação não reconhecida. Corrija ou descarte este fragmento explicitamente.",
          );
      }
    }
  }
  const valid = readyPlayerSchema.safeParse(row.data);
  if (!valid.success)
    for (const err of valid.error.issues) {
      const field = err.path[0] as PlayerField;
      const labels: Partial<Record<PlayerField, string>> = {
        jersey: "Camisa inválida: use 0, 00 ou 1–99, ou deixe sem camisa.",
        positions: "Informe até duas posições conhecidas.",
        name: "Informe um nome com até 120 caracteres.",
        birthYear: "Ano e data de nascimento precisam ser coerentes.",
      };
      issue(
        field,
        String(row.data[field] ?? ""),
        labels[field] ?? `Valor inválido em ${field}.`,
      );
    }
  return row;
}
export function parseRoster(
  text: string,
  makeId: () => string = () => crypto.randomUUID(),
): ParsedRoster {
  const lines = sourceLines(text);
  if (text.length > TEXT_LIMIT || lines.length > LINE_LIMIT)
    throw new RangeError("Use até 20 mil caracteres e 500 linhas.");
  const result: ParsedRoster = {
    teamName: null,
    rows: [],
    ignoredLines: [],
    issues: [],
  };
  for (const [index, source] of lines.entries()) {
    const value = source.trim();
    if (!value) continue;
    const team = /^equipe\s*:\s*(.*)$/iu.exec(value);
    const columns = /^(?:n[º°o]?|numero|camisa)\s*(?:[-–—;|]\s*)?nome\b/iu.test(
      normalizeName(value),
    );
    if (team || columns) {
      result.ignoredLines.push({
        line: index + 1,
        source,
        kind: team ? "team" : "columns",
      });
      if (team) {
        const name = team[1].trim();
        if (!name) result.issues.push("Informe o nome no cabeçalho da equipe.");
        else if (
          result.teamName !== null &&
          normalizeName(result.teamName) !== normalizeName(name)
        )
          result.issues.push(
            "Importe uma equipe por operação. Separe os blocos de equipes diferentes.",
          );
        else result.teamName = name;
      }
      continue;
    }
    if (result.rows.length === ROW_LIMIT)
      throw new RangeError("Use até 200 atletas por revisão.");
    result.rows.push(parsePlayer(source, index + 1, makeId));
  }
  return result;
}
