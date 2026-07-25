export type IpcErrorCode = 'FORBIDDEN' | 'SESSION_EXPIRED' | 'NOT_FOUND' | 'SERVER_ERROR';

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode: IpcErrorCode };

export interface UserListItem {
  id: number;
  uuid: string;
  email: string;
  fullName: string;
  roleId: number;
  roleCode: string;
  roleLabel: string;
  hotelId: number | null;
  hotelName: string | null;
  hotelIds: number[];
  allHotelsAccess: boolean;
  hotelsLabel: string;
  isActive: boolean;
  accountStatus: 'actif' | 'en_attente' | 'inactif';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  roleId: number;
  hotelId?: number | null;
  hotelIds?: number[];
  allHotelsAccess?: boolean;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  roleId?: number;
  hotelId?: number | null;
  hotelIds?: number[];
  allHotelsAccess?: boolean;
  isActive?: boolean;
  password?: string;
}

export interface HotelListItem {
  id: number;
  uuid: string;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  logoFile: string | null;
  logoUrl: string | null;
  rubriqueIds: number[];
}

export interface CreateHotelInput {
  code: string;
  name: string;
  city?: string | null;
  isActive?: boolean;
}

export interface UpdateHotelInput {
  code?: string;
  name?: string;
  city?: string | null;
  isActive?: boolean;
  rubriqueIds?: number[];
}

export interface RoleListItem {
  id: number;
  uuid: string;
  code: string;
  label: string;
  description: string | null;
  permissionCodes: string[];
  userCount: number;
  editable: boolean;
  profileCategory?: string;
  profileGuideSlug?: string;
}

export interface PermissionListItem {
  id: number;
  code: string;
  label: string;
  module: string;
}

export interface RoleOption {
  id: number;
  code: string;
  label: string;
}

export interface RubriqueListItem {
  id: number;
  uuid: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  parentLabel: string | null;
}

export interface CreateRubriqueInput {
  code: string;
  label: string;
  sortOrder?: number;
  parentId?: number | null;
}

export interface UpdateRubriqueInput {
  code?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: number | null;
}

export interface ReorderRubriqueItem {
  id: number;
  sortOrder: number;
  parentId: number | null;
}

export interface AuditLogItem {
  id: number;
  uuid: string;
  userEmail: string | null;
  roleCode: string | null;
  action: string;
  module: string;
  page: string | null;
  description: string;
  createdAt: string;
}

export interface AuditListFilters {
  search?: string;
  module?: string;
  action?: string;
  limit?: number;
}
