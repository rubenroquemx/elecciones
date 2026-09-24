import type { UserAccount } from '../types/auth';

export const MOCK_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin.estatal',
    name: 'Dirección General de Operación',
    email: 'direccion.general@organizacion-tabasco.mx',
    leaderId: null, // Acceso Global
    level: 'admin',
    territoryName: 'Tabasco Completo (Vista Global)',
    accountRoleLabel: 'Superadministrador',
    avatarBg: 'bg-purple-700',
    isSuperAdmin: true,
  },
  {
    id: 'usr-prom-ruben-roque',
    username: 'ruben.roque',
    name: 'Ruben Roque',
    email: 'ruben.roque@organizacion-tabasco.mx',
    leaderId: 'prom-ruben-roque',
    level: 'promotor',
    territoryName: 'Sección Electoral 0416 (Tamulté de las Barrancas)',
    accountRoleLabel: 'Promotor Territorial',
    avatarBg: 'bg-emerald-600',
    assignedBy: 'Dirección General de Operación',
  },
];
