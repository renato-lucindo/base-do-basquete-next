import type { History, Sheet } from '../domain/scoresheet';
import type { TextRow } from '../competition/text';

export type Competition = { id: string; name: string; year: string; city: string; disputes: {id: string; sex: 'Feminino'|'Masculino'; category: string; division: string}[] };
export type Registration = { id: string; dispute: string; globalTeam: string; name: string; players: {id: number; name: string; jersey: string}[] };
export type BatchItem = { id: string; file: string; destination: string; home: string; away: string; format: string; status: 'pending'|'ready'|'error'|'duplicate'|'published'; error: string; selected: boolean; resolved: boolean; failPublish: boolean; score: [number, number]; date: string };
export type Publication = {id: string; home: string; away: string; score: [number, number]; source: 'sheet'|'pdf'; version: number; reason: string; dispute: string; document?: Sheet; createdAt: string};
export type Prototype = {
  competition: Competition;
  catalog: Competition[];
  registrations: Registration[];
  text: string;
  preview: TextRow[];
  batch: BatchItem[];
  sheet: History;
  game: {id: string; home: string; away: string; dispute: string};
  publications: Publication[];
  recent: {label: string; at: string; route: string}[];
};

export function initialState(): Prototype {
  const document: Sheet = {
    rulesVersion: 'FIBA_2024', periods: 4,
    roster: [
      {rosterEntryId: 1, registrationId: 1, side: 'home', jersey: '7', played: false},
      {rosterEntryId: 2, registrationId: 1, side: 'home', jersey: '00', played: false},
      {rosterEntryId: 3, registrationId: 1, side: 'home', jersey: '0', played: false},
      {rosterEntryId: 4, registrationId: 2, side: 'away', jersey: '4', played: false},
      {rosterEntryId: 5, registrationId: 2, side: 'away', jersey: '12', played: false},
    ], coachPlayer: {home: null, away: null}, events: [],
  };
  const competition:Competition = {id:'copa', name: 'Copa Metropolitana', year: '2026', city: '', disputes: [{id:'f-adulto',sex:'Feminino',category:'Adulto',division:''},{id:'m-sub18',sex:'Masculino',category:'Sub-18',division:''}]};
  return {
    competition, catalog:[competition],
    registrations: [
      {id: 'lobos',dispute:'f-adulto',globalTeam:'Lobos',name:'Lobos',players:[{id:1,name:'Ana da Silva',jersey:'7'},{id:2,name:'Beatriz Costa',jersey:'00'},{id:3,name:'Elisa Rocha',jersey:'0'}]},
      {id:'aguias',dispute:'f-adulto',globalTeam:'Águias',name:'Águias',players:[{id:4,name:'Carla Souza',jersey:'4'},{id:5,name:'Daniela Lima',jersey:'12'}]},
    ], text:'', preview:[],batch:[], sheet:{present:document,past:[],future:[]}, game:{id:'jogo-exemplo',home:'Lobos',away:'Águias',dispute:'f-adulto'},publications:[],recent:[],
  };
}

export function exampleBatch(): BatchItem[] {
  return [
    {id:'pdf-1',file:'Lobos x Águias.pdf',destination:'f-adulto',home:'Lobos',away:'Águias',format:'FIBA / Genius Sports',status:'ready',error:'',selected:true,resolved:true,failPublish:false,score:[62,58],date:'2026-05-06T19:00'},
    {id:'pdf-2',file:'Estrelas x Aurora.pdf',destination:'m-sub18',home:'Estrelas',away:'Aurora',format:'Basketball Site',status:'pending',error:'Resolva a identidade de J. Silva.',selected:false,resolved:false,failPublish:true,score:[54,51],date:'2026-05-07T19:00'},
    {id:'pdf-3',file:'Litoral x Serranos.pdf',destination:'f-adulto',home:'Litoral',away:'Serranos',format:'FIBA / Genius Sports',status:'ready',error:'',selected:true,resolved:true,failPublish:false,score:[71,64],date:'2026-05-09T18:00'},
    {id:'pdf-4',file:'Arquivo ilegível.pdf',destination:'f-adulto',home:'',away:'',format:'Não reconhecido',status:'error',error:'Não foi possível reconhecer este PDF. Substitua o arquivo.',selected:false,resolved:false,failPublish:false,score:[0,0],date:''},
    {id:'pdf-5',file:'Lobos x Águias (cópia).pdf',destination:'f-adulto',home:'Lobos',away:'Águias',format:'FIBA / Genius Sports',status:'duplicate',error:'Arquivo já incluído no lote. Revisão necessária.',selected:false,resolved:false,failPublish:false,score:[62,58],date:'2026-05-06T19:00'},
  ];
}
