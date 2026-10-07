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

export const MOCK_ACCOUNTS: UserAccount[] = [
  SUPERADMIN_ACCOUNT,
];

