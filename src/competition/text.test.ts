import { describe, expect, it } from 'vitest';
import { parseTeams, validateRows } from './text';

describe('prévia de equipes e elencos', () => {
  it('aceita equipes simples e mantém camisas 0 e 00 distintas', () => {
    expect(parseTeams('Lobos\nÁguias\nEstrelas').map(r => r.team)).toEqual(['Lobos', 'Águias', 'Estrelas']);
    const rows = parseTeams('Equipe: Lobos\n0 - Ana\n00 - Beatriz');
    expect(rows.map(r => r.jersey)).toEqual(['0', '00']);
    expect(validateRows(rows).every(r => !r.error)).toBe(true);
  });
  it('isola camisa repetida/inválida e exige resolução explícita de homônimo', () => {
    const rows = validateRows(parseTeams('Equipe: Estrelas\n7 - Joana Santos\n7 - Maria Lima\n100 - Luiza Costa\n8 - Ana da Silva'));
    expect(rows[1].error).toContain('repetida');
    expect(rows[2].error).toContain('inválida');
    expect(rows[3].error).toContain('identidade');
    expect(rows[0].error).toBe('');
  });
  it('revalida erros depois da edição sem inventar camisa', () => {
    const rows = parseTeams('Equipe: Lobos\nAna sem camisa');
    expect(rows[0].jersey).toBe('');
    expect(validateRows(rows)[0].error).toContain('camisa');
    expect(validateRows([{...rows[0], jersey: '12'}])[0].error).toBe('');
  });
});
