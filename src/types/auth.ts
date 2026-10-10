import type { TerritorialLevel } from './territory';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  aboutMe?: string;
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
  campaignName?: string;
  candidateName?: string;
  partyName?: string;
  electionType?: string;
  stateId?: number;
}
