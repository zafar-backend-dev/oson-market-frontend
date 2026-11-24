import type { UserRole } from './auth';

export type AdminUserAccountStatus = 'ACTIVE' | 'BLOCKED';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: AdminUserAccountStatus | string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  language: string | null;
  emailVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminUsersPageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminUsersListResponse {
  content: AdminUserRecord[];
  page: AdminUsersPageMeta;
}

export interface AdminUsersListParams {
  q?: string;
  role?: UserRole;
  status?: AdminUserAccountStatus;
  page?: number;
  size?: number;
}

export interface UpdateAdminUserStatusPayload {
  status: AdminUserAccountStatus;
}
