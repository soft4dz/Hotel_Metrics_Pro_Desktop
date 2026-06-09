export type ExportKind =
  | 'port_factures'
  | 'port_creances'
  | 'recettes_historique'
  | 'port_contrats'
  | 'dashboard';

export interface ExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
}
