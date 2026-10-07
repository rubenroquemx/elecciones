import type { UserAccount } from '../types/auth';

// Credenciales oficiales de Superadministrador configuradas desde variables de entorno
const getEnvSuperadminEmail = (): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPERADMIN_EMAIL) {
    return (window as any).__ENV__.VITE_SUPERADMIN_EMAIL;
  }
  return import.meta.env.VITE_SUPERADMIN_EMAIL || 'usrubenroqueguzman@gmail.com';
};

const getEnvSuperadminPassword = (): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPERADMIN_PASSWORD) {
    return (window as any).__ENV__.VITE_SUPERADMIN_PASSWORD;
  }
  return import.meta.env.VITE_SUPERADMIN_PASSWORD || 'admin123';
};

const superadminEmail = getEnvSuperadminEmail().toLowerCase();
const superadminPassword = getEnvSuperadminPassword();

export const SUPERADMIN_ACCOUNT: UserAccount = {
  id: 'usr-superadmin',
  username: superadminEmail.includes('@') ? superadminEmail.split('@')[0] : superadminEmail,
  name: 'Super Administrador',
  email: superadminEmail,
  password: superadminPassword,
  leaderId: null, // Acceso Global central
  level: 'admin',
  territoryName: 'Nivel Central (Acceso Total)',
  accountRoleLabel: 'Super Administrador',
  avatarBg: 'bg-[#9d2449]',
  isSuperAdmin: true,
};

export const JEFE_CAMPANA_ACCOUNT: UserAccount = {
  id: 'usr-jefe-campana',
  username: 'jefe.campana',
  name: 'Lic. Manuel Gurría Reséndez',
  email: 'jefe.campana@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-jefe-campana',
  level: 'campana',
  territoryName: 'Campaña General (Tabasco)',
  accountRoleLabel: 'Jefe de Campaña',
  avatarBg: 'bg-rose-700',
};

export const COORD_DISTRITAL_ACCOUNT: UserAccount = {
  id: 'usr-coord-distrital',
  username: 'coord.distrital',
  name: 'Ing. Fernando Pérez',
  email: 'coord.distrital@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-coord-distrital',
  level: 'distrital',
  territoryName: 'Distrito Federal 04 (Centro)',
  accountRoleLabel: 'Coordinador Distrital',
  avatarBg: 'bg-indigo-700',
  assignedSections: ['0285', '0366', '0286', '0287', '0288'],
};

export const COORD_ZONA_ACCOUNT: UserAccount = {
  id: 'usr-coord-zona',
  username: 'coord.zona',
  name: 'Lic. Mariana Morales',
  email: 'coord.zona@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-coord-zona',
  level: 'zona',
  territoryName: 'Zona 1 Norte (Centro)',
  accountRoleLabel: 'Coordinador de Zona',
  avatarBg: 'bg-purple-700',
  assignedSections: ['0285', '0366', '0286'],
};

export const RESP_ZONA_ACCOUNT: UserAccount = {
  id: 'usr-resp-zona',
  username: 'resp.zona',
  name: 'Lic. Carlos Eduardo May',
  email: 'resp.zona@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-resp-zona',
  level: 'responsable_zona',
  territoryName: 'Sector Centro - Tamulté',
  accountRoleLabel: 'Responsable de Zona',
  avatarBg: 'bg-amber-700',
  assignedSections: ['0285', '0366'],
};

export const RESP_SECCION_ACCOUNT: UserAccount = {
  id: 'usr-resp-seccion',
  username: 'resp.seccion',
  name: 'Lic. Elena Ramos',
  email: 'resp.seccion@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-resp-seccion',
  level: 'territorial',
  territoryName: 'Sección 0285 y 0366',
  accountRoleLabel: 'Responsable de Sección',
  avatarBg: 'bg-sky-700',
  assignedSections: ['0285', '0366'],
};

export const PROMOTOR_ACCOUNT: UserAccount = {
  id: 'usr-promotor',
  username: 'promotor.territorial',
  name: 'Rubén Roque Guzmán',
  email: 'promotor.territorial@vertex.mx',
  password: 'admin123',
  leaderId: 'lead-promotor',
  level: 'promotor',
  territoryName: 'Sección 0416',
  accountRoleLabel: 'Promotor Territorial',
  avatarBg: 'bg-emerald-700',
  assignedSections: ['0416'],
};

// Cuentas de demostración iniciales para cada uno de los niveles
export const MOCK_ACCOUNTS: UserAccount[] = [
  SUPERADMIN_ACCOUNT,
  JEFE_CAMPANA_ACCOUNT,
  COORD_DISTRITAL_ACCOUNT,
  COORD_ZONA_ACCOUNT,
  RESP_ZONA_ACCOUNT,
  RESP_SECCION_ACCOUNT,
  PROMOTOR_ACCOUNT,
];
