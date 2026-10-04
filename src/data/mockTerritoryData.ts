import type { TerritorialLeader, TerritorialLevel } from '../types/territory';

export const LEVEL_CONFIG: Record<TerritorialLevel, { label: string; color: string; bgLight: string; border: string }> = {
  campana: {
    label: 'Coordinador de Campaña',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    border: 'border-indigo-600',
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
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    border: 'border-indigo-600',
  },
  distrital: {
    label: 'Coordinador de Campaña',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    border: 'border-indigo-600',
  },
  seccional: {
    label: 'Coordinador Territorial',
    color: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    border: 'border-sky-600',
  },
};

export const INITIAL_TERRITORY_DATA: TerritorialLeader[] = [
  // 1. Coordinador de Campaña
  {
    id: "coord-campana-carlos",
    name: "Lic. Carlos Méndez Estrada",
    role: "Coordinador de Campaña",
    level: "campana",
    levelIndex: 0,
    parentId: null,
    territoryName: "Distrito Local 06 (Centro Oriente)",
    code: "CAMP-DTO-06",
    address: "Calle Juárez #402, Centro",
    colonia: "Centro",
    electoralSection: "0234",
    curp: "MEEC780312HTBMNR03",
    electorKey: "MEEC78031227H001",
    phone: "+52 993 234 5678",
    email: "carlos.mendez@estrategia-territorial.mx",
    username: "carlos.campana",
    hasAccount: true,
    avatarBg: "bg-indigo-600",
    metaGoal: 3500,
    currentCount: 0,
    status: "en_progreso",
    validationStatus: "validado",
    notes: "Coordinación general de campaña para el Distrito Local 06 y supervisión territorial."
  },

  // 2. Coordinador Territorial
  {
    id: "coord-territorial-mariana",
    name: "Ing. Mariana Garza Domínguez",
    role: "Coordinador Territorial",
    level: "territorial",
    levelIndex: 1,
    parentId: "coord-campana-carlos",
    territoryName: "Zona Tamulté (Secciones 0416 y 0417)",
    code: "TERR-TAMULTE-01",
    assignedSections: ["0416", "0417"],
    address: "Av. Revolución #305",
    colonia: "Tamulté de las Barrancas",
    electoralSection: "0416",
    curp: "GADM820519MTBMNR05",
    electorKey: "GADM82051927M002",
    phone: "+52 993 345 6789",
    email: "mariana.garza@estrategia-territorial.mx",
    username: "mariana.territorial",
    hasAccount: true,
    avatarBg: "bg-sky-600",
    metaGoal: 800,
    currentCount: 0,
    status: "en_progreso",
    validationStatus: "validado",
    notes: "Supervisión de comités territoriales y promotores en secciones 0416 y 0417."
  },

  // 3. Promotor Territorial
  {
    id: "prom-ruben-roque",
    name: "Ruben Roque",
    role: "Promotor Territorial",
    level: "promotor",
    levelIndex: 2,
    parentId: "coord-territorial-mariana",
    territoryName: "Sección 0416 - Tamulté de las Barrancas",
    code: "PROM-0416-RR",
    assignedSections: ["0416"],
    address: "Av. Gregorio Méndez Magaña #1205",
    colonia: "Tamulté de las Barrancas",
    electoralSection: "0416",
    curp: "ROQR850614HTBMNX01",
    electorKey: "ROQRRU85061427H101",
    phone: "+52 993 123 4567",
    email: "ruben.roque@estrategia-territorial.mx",
    username: "ruben.roque",
    hasAccount: true,
    avatarBg: "bg-emerald-600",
    metaGoal: 150,
    currentCount: 3,
    status: "en_progreso",
    validationStatus: "validado",
    notes: "Promotor Territorial en Sección 0416 - Captación de promovidos y brigadas directas de campo."
  },

  {
    id: "prom-patricia-lara",
    name: "Lic. Patricia Lara Domínguez",
    role: "Promotor Territorial",
    level: "promotor",
    levelIndex: 2,
    parentId: "coord-territorial-mariana",
    territoryName: "Sección 0417 - Tamulté Sur",
    code: "PROM-0417-PL",
    assignedSections: ["0417"],
    address: "Calle Hidalgo #305",
    colonia: "Tamulté Sur",
    electoralSection: "0417",
    curp: "LADP890210MTBMNR05",
    electorKey: "LADPPA89021027M002",
    phone: "+52 993 456 7890",
    email: "patricia.lara@estrategia-territorial.mx",
    username: "patricia.lara",
    hasAccount: true,
    avatarBg: "bg-teal-600",
    metaGoal: 100,
    currentCount: 2,
    status: "en_progreso",
    validationStatus: "validado",
    notes: "Promotora Territorial en Sección 0417 - Trabajo de contacto vecinal y promoción del voto."
  },

  // 4. Promovidos (Ciudadanos capturados por Ruben Roque)
  {
    id: "promovido-ruben-1",
    name: "María Elena Gómez Morales",
    role: "Ciudadano Promovido",
    level: "promovido",
    levelIndex: 3,
    parentId: "prom-ruben-roque",
    territoryName: "Sección 0416",
    electoralSection: "0416",
    phone: "+52 993 555 1122",
    address: "Calle Libertad #102",
    colonia: "Tamulté de las Barrancas",
    curp: "GOMM900412MTBMNR08",
    electorKey: "GOMM90041227M003",
    metaGoal: 1,
    currentCount: 1,
    status: "completado",
    validationStatus: "validado",
    createdAt: "2026-10-02T10:15:00Z",
    updatedAt: "2026-10-02T10:15:00Z",
    changelog: [
      {
        id: "cl-1-1",
        timestamp: "2026-10-02T10:15:00Z",
        action: "creacion",
        description: "Registro inicial de promovido por Ruben Roque",
        userName: "Ruben Roque"
      }
    ],
    notes: "Promovida comprometida en Sección 0416."
  },
  {
    id: "promovido-ruben-2",
    name: "José Luis Hernández Torres",
    role: "Ciudadano Promovido",
    level: "promovido",
    levelIndex: 3,
    parentId: "prom-ruben-roque",
    territoryName: "Sección 0416",
    electoralSection: "0416",
    phone: "+52 993 555 3344",
    address: "Calle Allende #215",
    colonia: "Tamulté de las Barrancas",
    curp: "HETJ880923HTBMNX04",
    electorKey: "HETJ88092327H004",
    metaGoal: 1,
    currentCount: 1,
    status: "completado",
    validationStatus: "validado",
    createdAt: "2026-10-02T12:40:00Z",
    updatedAt: "2026-10-02T12:40:00Z",
    changelog: [
      {
        id: "cl-2-1",
        timestamp: "2026-10-02T12:40:00Z",
        action: "creacion",
        description: "Registro en brigada de campo por Ruben Roque",
        userName: "Ruben Roque"
      }
    ],
    notes: "Promovido registrado en brigada de campo."
  },
  {
    id: "promovido-ruben-3",
    name: "Ana Patricia Peralta Rueda",
    role: "Ciudadano Promovido",
    level: "promovido",
    levelIndex: 3,
    parentId: "prom-ruben-roque",
    territoryName: "Sección 0416",
    electoralSection: "0416",
    phone: "+52 993 555 7788",
    address: "Calle Cuauhtémoc #410",
    colonia: "Tamulté de las Barrancas",
    curp: "PERA920715MTBMNR09",
    electorKey: "PERA92071527M005",
    metaGoal: 1,
    currentCount: 1,
    status: "completado",
    validationStatus: "validado",
    createdAt: "2026-10-03T09:20:00Z",
    updatedAt: "2026-10-03T09:20:00Z",
    changelog: [
      {
        id: "cl-3-1",
        timestamp: "2026-10-03T09:20:00Z",
        action: "creacion",
        description: "Registro inicial de promovida por Ruben Roque",
        userName: "Ruben Roque"
      }
    ],
    notes: "Promovida registrada en Sección 0416."
  }
];
