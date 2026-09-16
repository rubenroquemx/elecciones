import type { ElectoralSection, SectionStructure } from '../types/sections';
import rawCartography from './tabascoSectionsCartography.json';

export interface CartographyEntry {
  id: string;
  sectionNumber: string;
  municipioId: string;
  municipio: string;
  distritoLocal: string;
  tipo: 'Urbana' | 'Rural' | 'Mixta';
  control: string;
  center: [number, number];
  bbox: [number, number, number, number];
  polygon: [number, number][];
}

export const TABASCO_CARTOGRAPHY: CartographyEntry[] = rawCartography as CartographyEntry[];

// Quick map by section number for lookup
export const CARTOGRAPHY_BY_SECTION = new Map<string, CartographyEntry>(
  TABASCO_CARTOGRAPHY.map(c => [c.sectionNumber, c])
);

// Sample structures for key showcase sections across different municipalities
const SAMPLE_STRUCTURES: Record<string, { structures: SectionStructure[]; notes?: string }> = {
  '0234': {
    notes: 'Sección clave en Villahermosa urbana. 4 casillas electorales en Escuela Primaria 27 de Febrero.',
    structures: [
      {
        id: 'struct-0234-1',
        name: 'Promoción del Voto y Afiliación',
        type: 'promocion',
        leaderName: 'Lic. Claudia Morales Priego',
        leaderRole: 'Coordinadora Seccional de Promoción',
        leaderPhone: '+52 993 145 8920',
        metaGoal: 700,
        currentCount: 540,
        status: 'en_progreso',
        rootLeaderId: 'node-sec-0234',
        notes: 'Estructura con alta penetración en colonia Atasta de Serra.',
      },
      {
        id: 'struct-0234-2',
        name: 'Defensa del Voto (Representantes de Casilla)',
        type: 'defensa_casilla',
        leaderName: 'Ing. Fernando May Hernández',
        leaderRole: 'Responsable General de Casilla (RG)',
        leaderPhone: '+52 993 234 5678',
        metaGoal: 8,
        currentCount: 8,
        status: 'completado',
        notes: '4 casillas básicas y contiguas cubiertas al 100% con propietarios y suplentes.',
      },
      {
        id: 'struct-0234-3',
        name: 'Comité de Protagonistas Juveniles',
        type: 'sectorial',
        leaderName: 'Lic. Sofía Rovirosa Valenzuela',
        leaderRole: 'Enlace Juvenil Seccional',
        leaderPhone: '+52 993 512 8844',
        metaGoal: 150,
        currentCount: 110,
        status: 'en_progreso',
        notes: 'Brigadas universitarias de difusión comunitaria.',
      }
    ]
  },
  '0256': {
    notes: 'Zona de Tamulté de las Barrancas. Cobertura vecinal sólida.',
    structures: [
      {
        id: 'struct-0256-1',
        name: 'Promoción Territorial',
        type: 'promocion',
        leaderName: 'Mtro. Héctor Javier Zapata',
        leaderRole: 'Coordinador Seccional',
        leaderPhone: '+52 993 301 9922',
        metaGoal: 900,
        currentCount: 780,
        status: 'en_progreso',
        rootLeaderId: 'node-sec-0256',
      },
      {
        id: 'struct-0256-2',
        name: 'Defensa Electoral (RCs)',
        type: 'defensa_casilla',
        leaderName: 'Lic. Mariana Balboa Ortiz',
        leaderRole: 'Responsable de Casilla',
        leaderPhone: '+52 993 420 1199',
        metaGoal: 10,
        currentCount: 8,
        status: 'en_progreso',
      }
    ]
  },
  '0480': {
    notes: 'Sección territorial en Centro. Meta superada con 680 registros de apoyo.',
    structures: [
      {
        id: 'struct-0480-1',
        name: 'Estructura Territorial Única',
        type: 'promocion',
        leaderName: 'Lic. Guadalupe Domínguez Ramos',
        leaderRole: 'Coordinadora de Seccional',
        leaderPhone: '+52 937 114 6633',
        metaGoal: 650,
        currentCount: 680,
        status: 'completado',
      }
    ]
  },
  '0089': {
    notes: 'Zona urbana céntrica de Cárdenas, Tabasco.',
    structures: [
      {
        id: 'struct-0089-1',
        name: 'Promoción en Cabecera Cárdenas',
        type: 'promocion',
        leaderName: 'C. Roberto Carlos Palma',
        leaderRole: 'Coordinador Seccional Cárdenas',
        leaderPhone: '+52 937 200 4411',
        metaGoal: 600,
        currentCount: 450,
        status: 'en_progreso',
      },
      {
        id: 'struct-0089-2',
        name: 'Vigilancia de Casillas',
        type: 'defensa_casilla',
        leaderName: 'Lic. Laura Elena Frías',
        leaderRole: 'Representante General',
        leaderPhone: '+52 937 311 8899',
        metaGoal: 6,
        currentCount: 6,
        status: 'completado',
      }
    ]
  },
  '0603': {
    notes: 'Cabecera de Comalcalco. Cobertura activa.',
    structures: [
      {
        id: 'struct-0603-1',
        name: 'Comité de Base Ciudadano Comalcalco',
        type: 'sectorial',
        leaderName: 'Mtro. Alberto Córdova Peralta',
        leaderRole: 'Enlace Seccional Comalcalco',
        leaderPhone: '+52 933 102 7744',
        metaGoal: 600,
        currentCount: 520,
        status: 'en_progreso',
      },
      {
        id: 'struct-0603-2',
        name: 'Vigilancia de Casillas',
        type: 'defensa_casilla',
        leaderName: 'C. Jorge Luis Montejo',
        leaderRole: 'Representante General',
        leaderPhone: '+52 933 245 9900',
        metaGoal: 8,
        currentCount: 4,
        status: 'critico',
        notes: 'Faltan 4 representantes para casillas contiguas.',
      }
    ]
  },
  '0950': {
    notes: 'Zona urbana y comunidades de Macuspana.',
    structures: [
      {
        id: 'struct-0950-1',
        name: 'Estructura Comunitaria Macuspana',
        type: 'promocion',
        leaderName: 'Don José Reyes Chablé',
        leaderRole: 'Delegado Seccional',
        leaderPhone: '+52 936 123 4455',
        metaGoal: 500,
        currentCount: 460,
        status: 'en_progreso',
      }
    ]
  },
  '1131': {
    notes: 'Zona urbana de Tenosique cercana a la estación del Tren Maya.',
    structures: [
      {
        id: 'struct-1131-1',
        name: 'Coordinación Territorial Fronteriza',
        type: 'promocion',
        leaderName: 'Lic. Carlos Mario Ulin',
        leaderRole: 'Coordinador de Zona Frontera Sur',
        leaderPhone: '+52 934 105 8899',
        metaGoal: 600,
        currentCount: 520,
        status: 'en_progreso',
      },
      {
        id: 'struct-1131-2',
        name: 'Defensa Electoral Seccional',
        type: 'defensa_casilla',
        leaderName: 'Dra. Patricia Osorio',
        leaderRole: 'Representante de Casilla',
        metaGoal: 6,
        currentCount: 6,
        status: 'completado',
      }
    ]
  }
};

// FULL list of all 1,144 Electoral Sections in Tabasco from the official INE shapefile
export const INITIAL_SECTIONS: ElectoralSection[] = TABASCO_CARTOGRAPHY.map(carto => {
  const sample = SAMPLE_STRUCTURES[carto.sectionNumber];
  const numInt = parseInt(carto.sectionNumber, 10) || 1;
  const nominal = 1400 + ((numInt * 31) % 1800);
  const target = Math.round(nominal * 0.45);

  return {
    id: `sec-${carto.sectionNumber}`,
    sectionNumber: carto.sectionNumber,
    municipio: carto.municipio,
    municipioId: carto.municipioId,
    distritoLocal: carto.distritoLocal,
    tipo: carto.tipo,
    nominalList: nominal,
    targetGoal: target,
    center: carto.center,
    bbox: carto.bbox,
    polygon: carto.polygon,
    structures: sample?.structures || [],
    notes: sample?.notes,
  };
});
