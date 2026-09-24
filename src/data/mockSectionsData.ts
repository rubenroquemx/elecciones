import type { ElectoralSection, SectionStructure } from '../types/sections';
import rawCartography from './tabascoSectionsCartography.json';
import tabascoCatalog from './tabascoCatalog.json';

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

export const CATALOG_BY_SECTION = new Map<string, typeof tabascoCatalog[0]>(
  tabascoCatalog.map(c => [c.section, c])
);

// Catálogo oficial de estructuras dadas de alta en base de datos
export const REGISTERED_STRUCTURES: Record<string, { structures: SectionStructure[]; notes?: string }> = {
  "0416": {
    structures: [
      {
        id: "struct-0416-rr",
        name: "Brigada Territorial de Promoción",
        type: "promocion",
        leaderName: "Ruben Roque",
        leaderRole: "Promotor Territorial",
        leaderPhone: "+52 993 123 4567",
        curp: "ROQR850614HTBMNX01",
        electorKey: "ROQRRU85061427H101",
        address: "Av. Gregorio Méndez Magaña #1205",
        colonia: "Tamulté de las Barrancas",
        electoralSection: "0416",
        email: "ruben.roque@organizacion-tabasco.mx",
        metaGoal: 150,
        currentCount: 0,
        status: "en_progreso",
        rootLeaderId: "prom-ruben-roque",
        notes: "Brigada principal de promoción territorial encabezada por Ruben Roque."
      }
    ],
    notes: "Sección 0416 - Tamulté de las Barrancas"
  }
};

// FULL list of all 1,144 Electoral Sections in Tabasco from the official INE shapefile
export const INITIAL_SECTIONS: ElectoralSection[] = TABASCO_CARTOGRAPHY.map(carto => {
  const reg = REGISTERED_STRUCTURES[carto.sectionNumber];
  const cat = CATALOG_BY_SECTION.get(carto.sectionNumber);
  const nominal = (cat && cat.nominalTotal > 0) ? cat.nominalTotal : 1400;
  const target = Math.round(nominal * 0.45);

  return {
    id: `sec-${carto.sectionNumber}`,
    sectionNumber: carto.sectionNumber,
    municipio: carto.municipio,
    municipioId: carto.municipioId,
    distritoLocal: cat?.localDistrict ? `Distrito ${cat.localDistrict}` : carto.distritoLocal,
    tipo: (
      cat?.sectionType?.includes('URBAN')
        ? 'Urbana'
        : cat?.sectionType?.includes('RURAL')
        ? 'Rural'
        : cat?.sectionType?.includes('MIXT')
        ? 'Mixta'
        : carto.tipo || 'Urbana'
    ) as any,
    nominalList: nominal,
    nominalMen: cat?.nominalMen,
    nominalWomen: cat?.nominalWomen,
    nominalNonBinary: cat?.nominalNonBinary,
    targetGoal: target,
    center: carto.center,
    bbox: carto.bbox,
    polygon: carto.polygon,
    structures: reg?.structures || [],
    notes: reg?.notes,
  };
});
