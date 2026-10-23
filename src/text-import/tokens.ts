import { normalizeName, type ImportPlayer } from "./contract";
const dictionary: Record<string, ImportPlayer["positions"][number]> = {
  "1": "Armador",
  pg: "Armador",
  "point guard": "Armador",
  armador: "Armador",
  "2": "Ala Armador",
  sg: "Ala Armador",
  "shooting guard": "Ala Armador",
  "ala armador": "Ala Armador",
  "3": "Ala",
  sf: "Ala",
  "small forward": "Ala",
  ala: "Ala",
  "4": "Ala Pivô",
  pf: "Ala Pivô",
  "power forward": "Ala Pivô",
  "ala pivo": "Ala Pivô",
  "5": "Pivô",
  c: "Pivô",
  center: "Pivô",
  pivo: "Pivô",
};
export function parsePositions(
  token: string,
): { values: string[]; unknown: string[] } | null {
  const whole = dictionary[normalizeName(token).replace(/-/gu, " ")];
  if (whole) return { values: [whole], unknown: [] };
  const parts = token.split(/[/-]/u).map(normalizeName);
  if (parts.length < 2) return null;
  const values = parts.flatMap((p) => (dictionary[p] ? [dictionary[p]] : []));
  if (!values.length) return null;
  return {
    values: [...new Set(values)],
    unknown: parts.filter((p) => !dictionary[p]),
  };
}
/** Delimiters outside quotes only; hyphens inside names, ISO dates and 1-2 remain intact. */
export function tokenize(value: string): {
  tokens: string[];
  unclosed: boolean;
} {
  const tokens: string[] = [];
  let part = "",
    quoted = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '"') {
      quoted = !quoted;
      part += c;
      continue;
    }
    const separator =
      !quoted &&
      (c === ";" ||
        c === "|" ||
        (/[-–—]/u.test(c) &&
          /\s/u.test(value[i - 1] ?? "") &&
          /\s/u.test(value[i + 1] ?? "")));
    if (separator) {
      tokens.push(part.trim());
      part = "";
    } else part += c;
  }
  tokens.push(part.trim());
  return { tokens, unclosed: quoted };
}
