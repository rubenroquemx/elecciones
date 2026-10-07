import React, { useState, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { getVisibleSubtree } from '../utils/hierarchy';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { 
  Building2, 
  LogIn, 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  Phone, 
  Pencil 
} from 'lucide-react';

interface SuperadminSaasDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  accounts: UserAccount[];
  onImpersonate: (coordinatorAccount: UserAccount) => void;
  onDeleteCoordinator: (leaderId: string) => Promise<void> | void;
  onOpenCreateCoordinatorWizard?: () => void;
  onViewCoordinatorDetails?: (coordinatorId: string) => void;
  onEditCoordinator?: (coordinatorId: string) => void;
}

export const SuperadminSaasDashboard: React.FC<SuperadminSaasDashboardProps> = ({
  allLeaders,
  accounts,
  onImpersonate,
  onDeleteCoordinator,
  onOpenCreateCoordinatorWizard,
  onViewCoordinatorDetails,
  onEditCoordinator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Jefes de Campaña registrados (nivel campana o alias estatal)
  const campanaCoordinators = useMemo(() => {
    return allLeaders.filter(
      l => l.level === 'campana' || l.level === 'estatal'
    );
  }, [allLeaders]);

  // Mapa de cuentas por leaderId
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(acc => {
      if (acc.leaderId) map.set(acc.leaderId, acc);
    });
    return map;
  }, [accounts]);

  // Métricas completas recorriendo el subárbol con getVisibleSubtree
  const statsByCoordinator = useMemo(() => {
    const map = new Map<string, {
      distritales: number;
      zona: number;
      responsableZona: number;
      responsableSeccion: number;
      promotores: number;
      promovidos: number;
    }>();

    campanaCoordinators.forEach(c => {
      const subtree = getVisibleSubtree(c.id, allLeaders).filter(l => l.id !== c.id);
      map.set(c.id, {
        distritales: subtree.filter(l => l.level === 'distrital').length,
        zona: subtree.filter(l => l.level === 'zona').length,
        responsableZona: subtree.filter(l => l.level === 'responsable_zona').length,
        responsableSeccion: subtree.filter(l => l.level === 'territorial' || l.level === 'seccional').length,
        promotores: subtree.filter(l => l.level === 'promotor').length,
        promovidos: subtree.filter(l => l.level === 'promovido').length,
      });
    });
    return map;
  }, [campanaCoordinators, allLeaders]);

  // TOTALES PRINCIPALES GLOBALES (8 NIVELES)
  const totalCampaigns = new Set(campanaCoordinators.map(c => c.territoryName)).size || campanaCoordinators.length;
  const totalCampanaCoordinators = campanaCoordinators.length;
  const totalDistritales = allLeaders.filter(l => l.level === 'distrital').length;
  const totalZona = allLeaders.filter(l => l.level === 'zona').length;
  const totalRespZona = allLeaders.filter(l => l.level === 'responsable_zona').length;
  const totalRespSeccion = allLeaders.filter(l => l.level === 'territorial' || l.level === 'seccional').length;
  const totalPromotoresTerritoriales = allLeaders.filter(l => l.level === 'promotor').length;
  const totalPromovidos = allLeaders.filter(l => l.level === 'promovido').length;

  // Filtrado de coordinadores
  const filteredCoordinators = useMemo(() => {
    if (!searchQuery.trim()) return campanaCoordinators;
    const q = searchQuery.toLowerCase();
    return campanaCoordinators.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.territoryName.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  }, [campanaCoordinators, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-h-screen font-sans text-slate-800">
      {/* 1. Header SaaS */}
      <div className="bg-slate-900 text-white border-b border-slate-800 p-6 sm:p-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                PORTAL ADMINISTRADOR SAAS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-mono">Multi-Campañas Activo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestión Central de Campañas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Administración de Coordinadores de Campaña, auditoría directa de cuentas e incidencias técnicas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenCreateCoordinatorWizard?.()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Jefe de Campaña</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DATOS PRINCIPALES TOTALES (8 NIVELES EN CUADRÍCULA RESPONSIVA: 4 MÓVIL, 8 ESCRITORIO) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 -mt-4 z-10 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          
          {/* 1. Campañas */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Campañas</span>
            <h3 className="text-xl font-black text-slate-900 font-mono mt-1">{totalCampaigns}</h3>
          </div>

          {/* 2. Jefes de Campaña */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Jefes Campaña</span>
            <h3 className="text-xl font-black text-purple-700 font-mono mt-1">{totalCampanaCoordinators}</h3>
          </div>

          {/* 3. Coord. Distritales */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Distritales</span>
            <h3 className="text-xl font-black text-indigo-700 font-mono mt-1">{totalDistritales}</h3>
          </div>

          {/* 4. Coord. de Zona */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Coord. Zona</span>
            <h3 className="text-xl font-black text-indigo-600 font-mono mt-1">{totalZona}</h3>
          </div>

          {/* 5. Resp. de Zona */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Resp. Zona</span>
            <h3 className="text-xl font-black text-blue-700 font-mono mt-1">{totalRespZona}</h3>
          </div>

          {/* 6. Resp. de Sección */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Resp. Secc.</span>
            <h3 className="text-xl font-black text-blue-600 font-mono mt-1">{totalRespSeccion}</h3>
          </div>

          {/* 7. Promotores */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Promotores</span>
            <h3 className="text-xl font-black text-sky-700 font-mono mt-1">{totalPromotoresTerritoriales}</h3>
          </div>

          {/* 8. Promovidos */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate">Promovidos</span>
            <h3 className="text-xl font-black text-emerald-700 font-mono mt-1">{totalPromovidos}</h3>
          </div>

        </div>
      </div>

      {/* 3. LISTA DE COORDINADORES DE CAMPAÑA */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4 flex-1">
        {/* Barra de Filtro y Buscador */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, usuario o demarcación de campaña..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium px-2">
            Mostrando {filteredCoordinators.length} de {campanaCoordinators.length} coordinadores
          </span>
        </div>

        {filteredCoordinators.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">No hay Coordinadores de Campaña registrados</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              El Superadmin administra las campañas creando a sus Coordinadores Generales.
            </p>
            <button
              type="button"
              onClick={() => onOpenCreateCoordinatorWizard?.()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Jefe de Campaña</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Jefe de Campaña & Demarcación</th>
                    <th className="py-3 px-4 text-center">Contacto Directo</th>
                    <th className="py-3 px-4 text-center">Equipo & Avance (Jerarquía)</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCoordinators.map((coord) => {
                    const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
                    const stats = statsByCoordinator.get(coord.id) || {
                      distritales: 0,
                      zona: 0,
                      responsableZona: 0,
                      responsableSeccion: 0,
                      promotores: 0,
                      promovidos: 0,
                    };
                    const cleanPhone = (coord.phone || '').replace(/\D/g, '');

                    const targetAccount: UserAccount = acc || {
                      id: `usr-${coord.id}`,
                      username: coord.username || 'usuario',
                      name: coord.name,
                      email: coord.email || `${coord.username}@campana.mx`,
                      leaderId: coord.id,
                      level: 'campana',
                      territoryName: coord.territoryName,
                      accountRoleLabel: 'Jefe de Campaña',
                      avatarBg: 'bg-indigo-600',
                      assignedBy: 'Super Administrador (SaaS)',
                    };

                    return (
                      <tr 
                        key={coord.id} 
                        onClick={() => onViewCoordinatorDetails?.(coord.id)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Coordinador & Campaña con @usuario al lado en pequeño */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {coord.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {coord.name}
                                </span>
                                <span className="text-xs text-slate-400 font-mono font-normal">
                                  @{acc?.username || coord.username || 'usuario'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 truncate max-w-[220px]">
                                  {coord.territoryName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contacto Directo: SOLO BOTONES (Llamar y WhatsApp con logo oficial) */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-center">
                            {cleanPhone ? (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title={`Llamar a ${coord.name}`}
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                                <a
                                  href={`https://wa.me/52${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title={`Abrir WhatsApp con ${coord.name}`}
                                >
                                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                                </a>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Equipo & Avance: Desglose completo por niveles */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 font-mono text-[11px]">
                            <div title="Coordinadores Distritales">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Dist.</span>
                              <span className="font-bold text-slate-800">{stats.distritales}</span>
                            </div>
                            <span className="text-slate-300">·</span>
                            <div title="Coordinadores de Zona">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Zona</span>
                              <span className="font-bold text-slate-800">{stats.zona}</span>
                            </div>
                            <span className="text-slate-300">·</span>
                            <div title="Responsables de Zona">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">R.Zona</span>
                              <span className="font-bold text-slate-800">{stats.responsableZona}</span>
                            </div>
                            <span className="text-slate-300">·</span>
                            <div title="Responsables de Sección">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Secc.</span>
                              <span className="font-bold text-indigo-700">{stats.responsableSeccion}</span>
                            </div>
                            <span className="text-slate-300">·</span>
                            <div title="Promotores Territoriales">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Prom.</span>
                              <span className="font-bold text-sky-700">{stats.promotores}</span>
                            </div>
                            <span className="text-slate-300">·</span>
                            <div title="Ciudadanos Promovidos">
                              <span className="text-[9px] text-emerald-600 uppercase font-bold block">Promov.</span>
                              <span className="font-bold text-emerald-700">{stats.promovidos}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Acciones: BOTÓN EDITAR ANTES DE ENTRAR A SU CUENTA */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* BOTÓN EDITAR */}
                            <button
                              type="button"
                              onClick={() => onEditCoordinator?.(coord.id)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Editar datos del coordinador"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>

                            {/* BOTÓN ENTRAR A SU CUENTA */}
                            <button
                              type="button"
                              onClick={() => onImpersonate(targetAccount)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer active:scale-98"
                              title="Iniciar sesión en la cuenta del coordinador"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Entrar</span>
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Estás seguro de eliminar permanentemente al Jefe de Campaña "${coord.name}"?`)) {
                                  onDeleteCoordinator(coord.id);
                                }
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Jefe de Campaña"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
