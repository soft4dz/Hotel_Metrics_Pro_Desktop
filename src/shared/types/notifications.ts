export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lu: boolean;
  createdAt: string;
}

export interface NotificationRule {
  code: string;
  module: string;
  conditionLabel: string;
  actif: boolean;
}
