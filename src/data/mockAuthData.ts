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

  // 2. Coordinador de Campaña
  {
    id: 'usr-coord-campana',
    username: 'carlos.campana',
    name: 'Lic. Carlos Méndez Estrada',
    email: 'carlos.mendez@estrategia-territorial.mx',
    password: 'campana2026',
    leaderId: 'coord-campana-carlos',
    level: 'campana',
    territoryName: 'Distrito Local 06 (Centro Oriente)',
    accountRoleLabel: 'Coordinador de Campaña',
    avatarBg: 'bg-indigo-600',
    assignedBy: 'Super Administrador',
  },

  // 3. Coordinador Territorial
  {
    id: 'usr-coord-territorial',
    username: 'mariana.territorial',
    name: 'Ing. Mariana Garza Domínguez',
    email: 'mariana.garza@estrategia-territorial.mx',
    password: 'territorio2026',
    leaderId: 'coord-territorial-mariana',
    level: 'territorial',
    territoryName: 'Zona Tamulté (Secciones 0416 y 0417)',
    assignedSections: ['0416', '0417'],
    accountRoleLabel: 'Coordinador Territorial',
    avatarBg: 'bg-sky-600',
    assignedBy: 'Lic. Carlos Méndez Estrada',
  },

  // 4. Promotor Territorial 1 (Secciones 0416 y 0417 - Supervisado por Mariana Garza)
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
    assignedBy: 'Ing. Mariana Garza Domínguez',
  },
];
