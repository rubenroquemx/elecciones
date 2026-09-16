import type { TerritorialLevel } from './territory';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  leaderId: string | null; // null for Superadmin / Global view
  level: TerritorialLevel | 'admin';
  territoryName: string;
  avatarBg?: string;
  accountRoleLabel: string;
  picture?: string;
  isSuperAdmin?: boolean;
}
