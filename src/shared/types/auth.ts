/** Types auth partagés main ↔ renderer */

export interface AuthUserDto {
  id: number;
  uuid: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  hotelId: number | null;
  hotelIds: number[];
  allHotelsAccess: boolean;
  mustChangePassword: boolean;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: AuthUserDto;
  remainingAttempts?: number;
  sessionToken?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

export interface UserProfileDto {
  id: number;
  email: string;
  fullName: string;
  roleCode: string;
  roleLabel: string;
  hotelId: number | null;
  lastLoginAt: string | null;
}
