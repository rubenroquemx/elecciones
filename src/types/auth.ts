import type { TerritorialLevel } from './territory';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  leaderId: string | null; // null for Superadmin / Global view
  level: TerritorialLevel | 'admin';
  territoryName: string;
  assignedSections?: string[];
  avatarBg?: string;
  accountRoleLabel: string;
  picture?: string;
  isSuperAdmin?: boolean;
  assignedBy?: string;
  createdAt?: string;
}
