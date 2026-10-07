import type { TerritorialLeader, TerritorialLevel } from '../types/territory';

export const LEVEL_CONFIG: Record<TerritorialLevel, { label: string; color: string; bgLight: string; border: string }> = {
  campana: {
    label: 'Coordinador de Campaña',
    color: 'text-[#9d2449]',
    bgLight: 'bg-[#9d2449]/5 border-[#9d2449]/20',
    border: 'border-[#9d2449]',
  },
  territorial: {
    label: 'Coordinador Territorial',
    color: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    border: 'border-sky-600',
  },
  promotor: {
    label: 'Promotor Territorial',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50 border-emerald-200',
    border: 'border-emerald-600',
  },
  promovido: {
    label: 'Ciudadano Promovido',
    color: 'text-slate-700',
    bgLight: 'bg-slate-100 border-slate-200',
    border: 'border-slate-400',
  },
  // Legacy aliases for backward-compatibility
  estatal: {
    label: 'Coordinador de Campaña',
    color: 'text-[#9d2449]',
    bgLight: 'bg-[#9d2449]/5 border-[#9d2449]/20',
    border: 'border-[#9d2449]',
  },
  distrital: {
    label: 'Coordinador de Campaña',
    color: 'text-[#9d2449]',
    bgLight: 'bg-[#9d2449]/5 border-[#9d2449]/20',
    border: 'border-[#9d2449]',
  },
  seccional: {
    label: 'Coordinador Territorial',
    color: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    border: 'border-sky-600',
  },
};

// Estructura territorial inicial vacía para entorno real (sin datos de ejemplo)
export const INITIAL_TERRITORY_DATA: TerritorialLeader[] = [];
