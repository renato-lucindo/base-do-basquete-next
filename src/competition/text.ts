export type TextRow = {
  id: string;
  line: number;
  team: string;
  name: string;
  jersey: string;
  identity: '' | 'new' | 'existing';
  error: string;
};

export function parseTeams(text: string): TextRow[] {
  const rows: TextRow[] = [];
  let team = '';
  const blockMode = /^\s*Equipe\s*:/im.test(text);
  text.split(/\r?\n/).forEach((line, index) => {
    const value = line.trim();
    if (!value) return;
    const heading = /^Equipe\s*:\s*(.*)$/i.exec(value);
    if (heading) { team = heading[1].trim(); return; }
    const player = /^(\d+)\s*[-–—]\s*(.+)$/.exec(value);
    rows.push({ id: `line-${index + 1}`, line: index + 1,
      team: blockMode ? team : value,
      name: blockMode ? (player?.[2] ?? value).trim() : '',
      jersey: blockMode ? player?.[1] ?? '' : '', identity: '', error: '' });
  });
  // Blocos vazios ainda representam uma inscrição revisável.
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const name = /^\s*Equipe\s*:\s*(.+)$/i.exec(line)?.[1].trim();
    if (name && !rows.some(row => row.team === name)) rows.push({ id: `team-${index}`, line: index+1, team: name, name: '', jersey: '', identity: '', error: '' });
  }
  return rows;
}

export function validateRows(rows: TextRow[]): TextRow[] {
  const used = new Set<string>();
  return rows.map(row => {
    let error = '';
    const key = `${row.team.trim().toLocaleLowerCase('pt-BR')}|${row.jersey}`;
    if (!row.team.trim()) error = 'Informe a equipe.';
    else if (row.name && !row.jersey) error = 'Informe a camisa.';
    else if (row.name && !/^(00|0|[1-9][0-9]?)$/.test(row.jersey)) error = 'Camisa inválida: use 0, 00 ou 1–99.';
    else if (row.name && used.has(key)) error = 'Camisa repetida nesta equipe.';
    else if (row.name.toLocaleLowerCase('pt-BR').trim() === 'ana da silva' && !row.identity) error = 'Resolva a identidade: existem pessoas com este nome.';
    if (row.name && !error) used.add(key);
    return { ...row, error };
  });
}
