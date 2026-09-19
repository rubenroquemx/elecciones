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
        id: "struct-0416-1",
        name: "Comité de Promoción y Organización",
        type: "promocion",
        leaderName: "Profra. Elena Ramos Cruz",
        leaderRole: "Coordinadora de Sección",
        leaderPhone: "+52 993 234 8901",
        curp: "RACE880923MTBRNL02",
        electorKey: "RMCR88092327M30002",
        address: "Calle Hidalgo #104",
        colonia: "Tamulté de las Barrancas",
        electoralSection: "0416",
        email: "elena.ramos@organizacion-tabasco.mx",
        metaGoal: 500,
        currentCount: 3,
        status: "en_progreso",
        rootLeaderId: "sec-fed04-0416",
        notes: "Comité seccional adscrito al COT Tamulté (Ing. Roberto Salgado Domínguez) y Coordinación Federal 04 (Lic. Carlos Eduardo Mendoza Ruiz). Célula con 3 promovidos validados."
      },
      {
        id: "struct-0416-2",
        name: "Célula de Representación Territorial",
        type: "defensa_casilla",
        leaderName: "Jorge Luis Torres Hernández",
        leaderRole: "Promotor Territorial / Representante",
        leaderPhone: "+52 993 345 6712",
        curp: "TOHJ950614HTBRRS03",
        electorKey: "TRHN95061427H40003",
        address: "Calle Nicolás Bravo #45",
        colonia: "Tamulté de las Barrancas",
        electoralSection: "0416",
        email: "jorge.torres@organizacion-tabasco.mx",
        metaGoal: 8,
        currentCount: 8,
        status: "completado",
        rootLeaderId: "prom-fed04-0416-1",
        notes: "Célula territorial de vigilancia y representación en casillas de la sección 0416."
      }
    ],
    notes: "Zona Tamulté Centro - Distrito Federal 04"
  },
  "0486": {
    structures: [
      {
        id: "struct-0486-1",
        name: "Comité de Promoción y Organización",
        type: "promocion",
        leaderName: "Ing. Fernando May Hernández",
        leaderRole: "Coordinador de Sección",
        leaderPhone: "+52 993 567 8934",
        curp: "MAHF820318HTBYRN05",
        electorKey: "MYHN82031827H60005",
        address: "Calle Central #412",
        colonia: "Gaviotas Sur (Sector Armenia)",
        electoralSection: "0486",
        email: "fernando.may@organizacion-tabasco.mx",
        metaGoal: 500,
        currentCount: 3,
        status: "en_progreso",
        rootLeaderId: "sec-fed04-0486",
        notes: "Comité seccional adscrito al COT Gaviotas y La Manga (Lic. Gabriela Narváez Osorio) y Coordinación Federal 04 (Lic. Carlos Eduardo Mendoza Ruiz). Célula con 3 promovidos validados."
      },
      {
        id: "struct-0486-2",
        name: "Célula de Representación Territorial",
        type: "defensa_casilla",
        leaderName: "Verónica Aguilar Padrón",
        leaderRole: "Promotora Territorial / Representante",
        leaderPhone: "+52 993 678 9045",
        curp: "AUPV930829MTBGLR06",
        electorKey: "AGPD93082927M70006",
        address: "Andador Río Mezcalapa #118",
        colonia: "Gaviotas Sur",
        electoralSection: "0486",
        email: "veronica.aguilar@organizacion-tabasco.mx",
        metaGoal: 9,
        currentCount: 9,
        status: "completado",
        rootLeaderId: "prom-fed04-0486-1",
        notes: "Célula territorial de vigilancia y representación en casillas de la sección 0486."
      }
    ],
    notes: "Zona Gaviotas Sur - Distrito Federal 04"
  },
  "0385": {
    structures: [
      {
        id: "struct-0385-1",
        name: "Comité de Promoción y Organización",
        type: "promocion",
        leaderName: "Lic. Carlos Mario García Martínez",
        leaderRole: "Coordinador de Sección",
        leaderPhone: "+52 993 890 1267",
        curp: "GAMC800125HTBRSR08",
        electorKey: "GRMR80012527H90008",
        address: "Calle Francisco I. Madero #512",
        colonia: "Centro Histórico",
        electoralSection: "0385",
        email: "carlos.garcia@organizacion-tabasco.mx",
        metaGoal: 300,
        currentCount: 3,
        status: "en_progreso",
        rootLeaderId: "sec-fed04-0385",
        notes: "Comité seccional adscrito al COT Centro Histórico (Lic. Martha Elena Vidal Gómez) y Coordinación Federal 04 (Lic. Carlos Eduardo Mendoza Ruiz). Célula con 3 promovidos validados."
      },
      {
        id: "struct-0385-2",
        name: "Célula de Representación Territorial",
        type: "defensa_casilla",
        leaderName: "María Cristina González Cruz",
        leaderRole: "Promotora Territorial / Representante",
        leaderPhone: "+52 993 901 2378",
        curp: "GOCM921017MTBNRN09",
        electorKey: "GZCR92101727M00009",
        address: "Calle 27 de Febrero #230",
        colonia: "Centro Histórico",
        electoralSection: "0385",
        email: "cristina.gonzalez@organizacion-tabasco.mx",
        metaGoal: 2,
        currentCount: 2,
        status: "completado",
        rootLeaderId: "prom-fed04-0385-1",
        notes: "Célula territorial de vigilancia y representación en casillas de la sección 0385."
      }
    ],
    notes: "Zona Centro Histórico - Distrito Federal 04"
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
