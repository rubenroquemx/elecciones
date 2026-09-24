import type { TerritorialLeader, TerritorialLevel } from '../types/territory';

export const LEVEL_CONFIG: Record<TerritorialLevel, { label: string; color: string; bgLight: string; border: string }> = {
  estatal: {
    label: 'Coordinación Estatal',
    color: 'text-purple-700',
    bgLight: 'bg-purple-50 border-purple-200',
    border: 'border-purple-600',
  },
  distrital: {
    label: 'Comité de Organización Distrital',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    border: 'border-indigo-500',
  },
  territorial: {
    label: 'Comité de Organización Territorial',
    color: 'text-cyan-700',
    bgLight: 'bg-cyan-50 border-cyan-200',
    border: 'border-cyan-500',
  },
  seccional: {
    label: 'Coordinador de Sección',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200',
    border: 'border-amber-500',
  },
  promotor: {
    label: 'Promotor Territorial',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50 border-emerald-200',
    border: 'border-emerald-500',
  },
  promovido: {
    label: 'Ciudadano Promovido',
    color: 'text-slate-700',
    bgLight: 'bg-slate-100 border-slate-300',
    border: 'border-slate-500',
  },
};

export const INITIAL_TERRITORY_DATA: TerritorialLeader[] = [
  {
    id: "prom-ruben-roque",
    name: "Ruben Roque",
    role: "Promotor Territorial",
    level: "promotor",
    levelIndex: 4,
    parentId: null,
    territoryName: "Sección 0416 - Tamulté de las Barrancas",
    code: "PROM-0416-RR",
    address: "Av. Gregorio Méndez Magaña #1205",
    colonia: "Tamulté de las Barrancas",
    electoralSection: "0416",
    curp: "ROQR850614HTBMNX01",
    electorKey: "ROQRRU85061427H101",
    phone: "+52 993 123 4567",
    email: "ruben.roque@organizacion-tabasco.mx",
    username: "ruben.roque",
    hasAccount: true,
    avatarBg: "bg-emerald-600",
    metaGoal: 150,
    currentCount: 0,
    status: "en_progreso",
    validationStatus: "validado",
    notes: "Promotor Territorial principal - Estrategia territorial y brigadas de campo."
  }
];
