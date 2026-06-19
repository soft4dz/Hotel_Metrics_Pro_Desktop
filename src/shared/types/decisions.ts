export interface Decision {
  id: number; uuid: string; hotelId: number | null; hotelNom: string | null;
  titre: string; contenu: string; type: string; priorite: string;
  statut: string; emetteurId: number | null; emetteurNom: string | null;
  destinataires: string[]; dateDecision: string; dateEcheance: string | null;
  dateArchivage: string | null; vuPar: number[]; createdAt: string;
}
export interface CreateDecisionInput {
  hotelId?: number; titre: string; contenu: string;
  type?: string; priorite?: string; destinataires?: number[];
  dateDecision?: string; dateEcheance?: string;
}
