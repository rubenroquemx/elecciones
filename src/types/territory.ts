export type TerritorialLevel = 
  | 'estatal'        // Coordinación Estatal
  | 'distrital'      // Comité de Organización Distrital (local o federal)
  | 'territorial'    // Comité de Organización Territorial (Zona / Ruta)
  | 'seccional'      // Coordinador de Sección
  | 'promotor'       // Promotor Territorial
  | 'promovido';     // Promovido (Ciudadano promovido)


export interface TerritorialLeader {
  id: string;
  name: string;
  role: string; // e.g. "Comité de Organización Distrital", "Coordinador de Sección", etc.
  level: TerritorialLevel;
  levelIndex: number; // 0 = Distrital ... 4 = Promovido
  parentId: string | null;
  territoryName: string; // e.g. "Distrito Local 06", "Zona Territorial Norte", "Sección 0234"
  code?: string; // Clave oficial, ej. "DTO-06", "SEC-0234"
  phone?: string;
  email?: string;
  photoUrl?: string;
  avatarBg?: string;
  
  // Cuenta de sistema
  hasAccount?: boolean;
  username?: string;

  // Metas y Métricas
  metaGoal: number; // Meta de simpatizantes / electores / registros
  currentCount: number; // Total directo alcanzado
  directTeamCount?: number; // Cuántos subordinados directos tiene
  totalTeamCount?: number; // Cuántos subordinados en toda la sub-pirámide
  aggregatedCount?: number; // Total acumulado en su rama (él + toda su pirámide)
  aggregatedGoal?: number; // Meta total acumulada en su rama
  
  // Estatus operativo
  status: 'completado' | 'en_progreso' | 'critico' | 'vacante';
  validationStatus: 'validado' | 'pendiente' | 'rechazado';
  notes?: string;
  
  // Coordenadas aproximadas para vista territorial
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface HierarchyStats {
  totalPeople: number;
  totalGoal: number;
  totalAchieved: number;
  overallPercentage: number;
  levelCounts: Record<TerritorialLevel, number>;
  statusCounts: Record<string, number>;
  topPerformers: TerritorialLeader[];
  criticalNodes: TerritorialLeader[];
}

export interface FilterOptions {
  searchQuery: string;
  levelFilter: TerritorialLevel | 'all';
  statusFilter: string | 'all';
  validationFilter: string | 'all';
  focusNodeId: string | null;
}
