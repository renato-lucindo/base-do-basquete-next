import { initialState, type Prototype } from './model';

export type Store = Pick<Storage,'getItem'|'setItem'>;
export type Saved = {version: number; data: Prototype};
export const STORAGE_KEY = 'base-basquete-prototipo-v1';
export function readSaved(store: Store): Saved {
  let raw: string|null;
  try { raw = store.getItem(STORAGE_KEY); } catch { throw new Error('Não foi possível acessar o rascunho deste navegador.'); }
  if (!raw) return {version:0,data:initialState()};
  try {
    const value = JSON.parse(raw);
    if (value.format !== 1 || !Number.isSafeInteger(value.version) || !value.data?.competition || !Array.isArray(value.data.registrations) || !Array.isArray(value.data.batch) || !value.data.sheet?.present || !Array.isArray(value.data.publications) || !Array.isArray(value.data.recent)) throw new Error();
    return {version:value.version,data:value.data};
  } catch { throw new Error('O rascunho não pôde ser recuperado. O conteúdo salvo foi preservado.'); }
}
export function saveLocal(store: Store,version: number,data: Prototype): Saved {
  const current = readSaved(store);
  if (current.version !== version) throw new Error('Este trabalho foi alterado em outra aba. Recarregue a versão salva para revisar.');
  const result = {version:version+1,data:structuredClone(data)};
  try { store.setItem(STORAGE_KEY,JSON.stringify({format:1,...result})); }
  catch { throw new Error('Não foi possível salvar. Seu trabalho continua nesta tela. Tente novamente.'); }
  return result;
}
export function publishBatch(store: Store,version: number,data: Prototype): Saved {
  let result: Saved = {version,data:structuredClone(data)};
  // Uma gravação fictícia por jogo. Não simula uma transação única do lote.
  for (const original of data.batch.filter(i => i.selected && i.status === 'ready')) {
    const next = structuredClone(result.data);
    const item = next.batch.find(i => i.id === original.id)!;
    if (item.failPublish) { item.error = 'Falha ao publicar este jogo. Tente novamente.'; item.failPublish = false; }
    else {
      if (!next.publications.some(p => p.id === item.id)) next.publications.push({id:item.id,home:item.home,away:item.away,score:item.score,source:'pdf',version:1,reason:'',dispute:item.destination,createdAt:new Date().toISOString()});
      item.status='published'; item.selected=false; item.error='';
    }
    result = saveLocal(store,result.version,next);
  }
  return result;
}
