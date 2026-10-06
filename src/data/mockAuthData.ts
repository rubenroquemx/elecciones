import type { UserAccount } from '../types/auth';

export const MOCK_ACCOUNTS: UserAccount[] = [
  // 1. Super Administrador (Acceso Total)
  {
    id: 'usr-admin',
    username: 'superadmin',
    name: 'Super Administrador',
    email: 'admin@estrategia-territorial.mx',
    password: 'admin',
    leaderId: null, // Acceso Global a todo el estado
    level: 'admin',
    territoryName: 'Todo el Estado (Acceso Total)',
    accountRoleLabel: 'Super Administrador',
    avatarBg: 'bg-purple-700',
    isSuperAdmin: true,
  },

  // 2. Promotor Territorial (Ruben Roque)
  {
    id: 'usr-prom-ruben-roque',
    username: 'ruben.roque',
    name: 'Ruben Roque',
    email: 'ruben.roque@estrategia-territorial.mx',
    password: 'promotor2026',
    leaderId: 'prom-ruben-roque',
    level: 'promotor',
    territoryName: 'Zona Tamulté (Secciones 0416 y 0417)',
    assignedSections: ['0416', '0417'],
    accountRoleLabel: 'Promotor Territorial',
    avatarBg: 'bg-emerald-600',
    assignedBy: 'Coordinación Territorial',
  },
];
