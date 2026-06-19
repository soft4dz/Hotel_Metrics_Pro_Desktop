export interface Anomalie {
  id: number; uuid: string; hotelId: number | null; hotelNom: string | null;
  typeAnomalie: string; titre: string; description: string | null;
  gravite: string; statut: string; localisation: string | null;
  signaledBy: number | null; signaledNom: string | null;
  assignedTo: number | null; assignedNom: string | null;
  dateAnomalie: string; dateResolution: string | null;
  actionsCorrectives: string | null; createdAt: string;
}
export interface CreateAnomalieInput {
  hotelId?: number; typeAnomalie?: string; titre: string;
  description?: string; gravite?: string; localisation?: string;
  assignedTo?: number; dateAnomalie?: string;
}
