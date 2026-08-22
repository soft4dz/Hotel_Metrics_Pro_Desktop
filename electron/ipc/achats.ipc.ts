import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  assertObject,
  assertPositiveInteger,
  assertText,
  assertArray,
  assertAmount,
  assertDateJournal,
  assertEnum,
} from './validation';
import * as advanced from '../services/achats-advanced.service';
import type { CreateDemandeAchatInput, CreateFactureFournisseurInput, CreateOffreInput } from '../../src/shared/types/achats';
import {
  listFournisseurs,
  createFournisseur,
  listBonsCommande,
  getBonLignes,
  createBon,
  validerBon,
  envoyerBon,
  livrerBon,
  type CreateFournisseurInput,
  type CreateBonInput,
} from '../services/achats.service';

function parseCreateFournisseur(input: unknown): CreateFournisseurInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    code: assertText(o.code, 'code', { required: true, maxLength: 30 }),
    raisonSociale: assertText(o.raisonSociale, 'raisonSociale', { required: true, maxLength: 200 }),
    contactNom: o.contactNom ? assertText(o.contactNom, 'contactNom', { maxLength: 100 }) : undefined,
    email: o.email ? assertText(o.email, 'email', { maxLength: 200 }) : undefined,
    telephone: o.telephone ? assertText(o.telephone, 'telephone', { maxLength: 50 }) : undefined,
    adresse: o.adresse ? assertText(o.adresse, 'adresse', { maxLength: 500 }) : undefined,
    rc: o.rc ? assertText(o.rc, 'rc', { maxLength: 30 }) : undefined,
    nif: o.nif ? assertText(o.nif, 'nif', { maxLength: 30 }) : undefined,
    nis: o.nis ? assertText(o.nis, 'nis', { maxLength: 30 }) : undefined,
  };
}

function parseCreateBon(input: unknown): CreateBonInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  assertArray(o.lignes, 'lignes', 1);
  return {
    hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
    fournisseurId: assertPositiveInteger(o.fournisseurId, 'fournisseurId'),
    dateCommande: o.dateCommande ? assertText(o.dateCommande, 'dateCommande', { maxLength: 10 }) : undefined,
    dateLivraisonPrevue: o.dateLivraisonPrevue ? assertText(o.dateLivraisonPrevue, 'dateLivraisonPrevue', { maxLength: 10 }) : undefined,
    notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined,
    lignes: (o.lignes as CreateBonInput['lignes']),
  };
}

function parseLivrerBon(input: unknown) {
  if (input == null) return undefined;
  const o = assertObject<Record<string, unknown>>(input, 'input');
  if (o.lignes === undefined) return undefined;
  const lignesRaw = assertArray(o.lignes, 'lignes');
  return {
    lignes: lignesRaw.map((item, idx) => {
      const l = assertObject<Record<string, unknown>>(item, `lignes[${idx}]`);
      return {
        ligneId: assertPositiveInteger(l.ligneId, 'ligneId'),
        qteRecue: assertAmount(l.qteRecue, 'qteRecue'),
      };
    }),
  };
}

export function registerAchatsIpc(): void {
  Electron.ipcMain.handle('achats:listFournisseurs', (event) =>
    wrapIpc(event, () => listFournisseurs()));

  Electron.ipcMain.handle('achats:createFournisseur', (event, input: unknown) =>
    wrapIpc(event, () => createFournisseur(parseCreateFournisseur(input))));

  Electron.ipcMain.handle('achats:listBons', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, () => listBonsCommande(
      hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
      statut ? assertText(statut, 'statut', { maxLength: 30 }) : undefined,
    )));

  Electron.ipcMain.handle('achats:getBonLignes', (event, bonId: unknown) =>
    wrapIpc(event, () => getBonLignes(assertPositiveInteger(bonId, 'bonId'))));

  Electron.ipcMain.handle('achats:createBon', (event, input: unknown) =>
    wrapIpc(event, (uid) => createBon(uid, parseCreateBon(input))));

  Electron.ipcMain.handle('achats:validerBon', (event, id: unknown) =>
    wrapIpc(event, (uid) => validerBon(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('achats:envoyerBon', (event, id: unknown) =>
    wrapIpc(event, (uid) => envoyerBon(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('achats:livrerBon', (event, id: unknown, input?: unknown) =>
    wrapIpc(event, (uid) => livrerBon(uid, assertPositiveInteger(id, 'id'), parseLivrerBon(input))));

  Electron.ipcMain.handle('achats:demandes:list',(event,hotelId?:unknown)=>wrapIpc(event,uid=>advanced.listDemandes(uid,hotelId===undefined?undefined:assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('achats:demandes:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');const lines=assertArray<unknown>(o.lignes,'lignes',1).map((raw,i)=>{const l=assertObject<Record<string,unknown>>(raw,`lignes[${i}]`);return{produitId:l.produitId===undefined?undefined:assertPositiveInteger(l.produitId,'produitId'),designation:assertText(l.designation,'designation',{required:true,maxLength:200}),quantite:assertAmount(l.quantite,'quantite'),unite:l.unite?assertText(l.unite,'unite',{maxLength:30}):undefined,prixEstime:l.prixEstime===undefined?undefined:assertAmount(l.prixEstime,'prixEstime')}});const clean:CreateDemandeAchatInput={hotelId:assertPositiveInteger(o.hotelId,'hotelId'),serviceDemandeur:assertText(o.serviceDemandeur,'serviceDemandeur',{required:true,maxLength:100}),objet:assertText(o.objet,'objet',{required:true,maxLength:300}),justification:o.justification?assertText(o.justification,'justification',{maxLength:2000}):undefined,priorite:o.priorite?assertEnum(o.priorite,'priorite',['basse','normale','haute','urgente'] as const):undefined,dateBesoin:o.dateBesoin?assertDateJournal(o.dateBesoin,'dateBesoin'):undefined,lignes:lines};return advanced.createDemande(uid,clean);}));
  Electron.ipcMain.handle('achats:demandes:submit',(event,id:unknown)=>wrapIpc(event,uid=>advanced.submitDemande(uid,assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('achats:demandes:decide',(event,id:unknown,approved:unknown)=>wrapIpc(event,uid=>advanced.decideDemande(uid,assertPositiveInteger(id,'id'),approved===true)));
  Electron.ipcMain.handle('achats:consultations:list',(event,hotelId?:unknown)=>wrapIpc(event,uid=>advanced.listConsultations(uid,hotelId===undefined?undefined:assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('achats:consultations:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.createConsultation(uid,{demandeId:assertPositiveInteger(o.demandeId,'demandeId'),dateLimite:assertDateJournal(o.dateLimite,'dateLimite'),fournisseurIds:assertArray<unknown>(o.fournisseurIds,'fournisseurIds',1).map((v,i)=>assertPositiveInteger(v,`fournisseurIds[${i}]`))});}));
  Electron.ipcMain.handle('achats:offres:list',(event,consultationId:unknown)=>wrapIpc(event,uid=>advanced.listOffres(uid,assertPositiveInteger(consultationId,'consultationId'))));
  Electron.ipcMain.handle('achats:offres:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');const clean:CreateOffreInput={consultationId:assertPositiveInteger(o.consultationId,'consultationId'),fournisseurId:assertPositiveInteger(o.fournisseurId,'fournisseurId'),reference:o.reference?assertText(o.reference,'reference',{maxLength:100}):undefined,validiteJours:o.validiteJours===undefined?undefined:assertPositiveInteger(o.validiteJours,'validiteJours'),delaiLivraisonJours:o.delaiLivraisonJours===undefined?undefined:assertPositiveInteger(o.delaiLivraisonJours,'delaiLivraisonJours',{allowZero:true}),conditionsPaiement:o.conditionsPaiement?assertText(o.conditionsPaiement,'conditionsPaiement',{maxLength:500}):undefined,noteTechnique:o.noteTechnique===undefined?undefined:assertAmount(o.noteTechnique,'noteTechnique'),lignes:assertArray<unknown>(o.lignes,'lignes',1).map((raw,i)=>{const l=assertObject<Record<string,unknown>>(raw,`lignes[${i}]`);return{demandeLigneId:assertPositiveInteger(l.demandeLigneId,'demandeLigneId'),quantite:assertAmount(l.quantite,'quantite'),prixUnitaire:assertAmount(l.prixUnitaire,'prixUnitaire'),tvaPct:l.tvaPct===undefined?undefined:assertAmount(l.tvaPct,'tvaPct')}})};return advanced.createOffre(uid,clean);}));
  Electron.ipcMain.handle('achats:offres:award',(event,id:unknown)=>wrapIpc(event,uid=>advanced.awardOffre(uid,assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('achats:factures:list',(event,hotelId?:unknown)=>wrapIpc(event,uid=>advanced.listFactures(uid,hotelId===undefined?undefined:assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('achats:factures:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');const clean:CreateFactureFournisseurInput={hotelId:assertPositiveInteger(o.hotelId,'hotelId'),fournisseurId:assertPositiveInteger(o.fournisseurId,'fournisseurId'),bonId:o.bonId===undefined?undefined:assertPositiveInteger(o.bonId,'bonId'),numero:assertText(o.numero,'numero',{required:true,maxLength:100}),dateFacture:assertDateJournal(o.dateFacture,'dateFacture'),dateEcheance:assertDateJournal(o.dateEcheance,'dateEcheance'),montantHt:assertAmount(o.montantHt,'montantHt'),montantTva:assertAmount(o.montantTva,'montantTva'),montantTtc:assertAmount(o.montantTtc,'montantTtc'),observations:o.observations?assertText(o.observations,'observations',{maxLength:2000}):undefined};return advanced.createFacture(uid,clean);}));
  Electron.ipcMain.handle('achats:factures:validate',(event,id:unknown,force:unknown)=>wrapIpc(event,uid=>advanced.validateFacture(uid,assertPositiveInteger(id,'id'),force===true)));
  Electron.ipcMain.handle('achats:factures:pay',(event,id:unknown,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.payFacture(uid,assertPositiveInteger(id,'id'),{datePaiement:assertDateJournal(o.datePaiement,'datePaiement'),montant:assertAmount(o.montant,'montant'),mode:assertEnum(o.mode,'mode',['virement','cheque','especes','prelevement','autre'] as const),reference:o.reference?assertText(o.reference,'reference',{maxLength:100}):undefined,compteBancaireId:o.compteBancaireId===undefined?undefined:assertPositiveInteger(o.compteBancaireId,'compteBancaireId')});}));
}
