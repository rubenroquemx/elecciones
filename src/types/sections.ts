export type SectionType = 'Urbana' | 'Rural' | 'Mixta';

export type StructureType = 'promocion' | 'defensa_casilla' | 'sectorial' | 'general';

export interface SectionStructure {
  id: string;
  name: string;
  type: StructureType;
  leaderName: string;
  leaderRole: string;
  leaderPhone?: string;
  metaGoal: number;
  currentCount: number;
  status: 'en_progreso' | 'completado' | 'critico';
  rootLeaderId?: string; // Links to a node in the hierarchical tree
  notes?: string;
}

export interface ElectoralSection {
  id: string;
  sectionNumber: string;
  municipio: string;
  municipioId: string;
  distritoLocal: string;
  tipo: SectionType;
  nominalList: number;
  nominalMen?: number;
  nominalWomen?: number;
  nominalNonBinary?: number;
  targetGoal: number;
  structures: SectionStructure[];
  center: [number, number]; // [lon, lat]
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  polygon: [number, number][]; // [[lon, lat], ...]
  notes?: string;
}
