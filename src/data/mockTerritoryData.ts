import type { TerritorialLeader, TerritorialLevel } from '../types/territory';

export const LEVEL_CONFIG: Record<TerritorialLevel, { label: string; color: string; bgLight: string; border: string }> = {
  campana: {
    label: 'Jefe de Campaña',
    color: 'text-[#9d2449]',
    bgLight: 'bg-[#9d2449]/5 border-[#9d2449]/20',
    border: 'border-[#9d2449]',
  },
  distrital: {
    label: 'Coordinador Distrital',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    border: 'border-indigo-600',
  },
  zona: {
    label: 'Coordinador de Zona',
    color: 'text-purple-700',
    bgLight: 'bg-purple-50 border-purple-200',
    border: 'border-purple-600',
  },
  responsable_zona: {
    label: 'Responsable de Zona',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200',
    border: 'border-amber-600',
  },
  territorial: {
    label: 'Responsable de Sección',
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
  // Legacy aliases
  estatal: {
    label: 'Jefe de Campaña',
    color: 'text-[#9d2449]',
    bgLight: 'bg-[#9d2449]/5 border-[#9d2449]/20',
    border: 'border-[#9d2449]',
  },
  seccional: {
    label: 'Responsable de Sección',
    color: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    border: 'border-sky-600',
  },
};

// Estructura territorial inicial en blanco (Cero datos de ejemplo)
export const INITIAL_TERRITORY_DATA: TerritorialLeader[] = [];


