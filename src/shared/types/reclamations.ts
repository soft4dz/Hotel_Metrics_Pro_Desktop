export interface Reclamation {
  id: number;
  uuid: string;
  hotelId: number | null;
  hotelNom: string | null;
  reference: string;
  clientNom: string;
  clientEmail: string | null;
  clientTel: string | null;
  canal: string;
  categorie: string;
  objet: string;
  description: string | null;
  priorite: string;
  statut: string;
  satisfaction: number | null;
  assigneA: number | null;
  assigneANom: string | null;
  reponse: string | null;
  dateReception: string;
  dateEcheance: string | null;
  dateResolution: string | null;
  createdAt: string;
}

export interface CreateReclamationInput {
  hotelId?: number | null;
  clientNom: string;
  clientEmail?: string;
  clientTel?: string;
  canal?: string;
  categorie?: string;
  objet: string;
  description?: string;
  priorite?: string;
  dateEcheance?: string;
  assigneA?: number | null;
}
