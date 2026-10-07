import React, { useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { 
  Building2, 
  LogIn, 
  Trash2, 
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
  onViewCoordinatorDetails,
  onEditCoordinator,
}) => {
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

  // TOTALES PRINCIPALES GLOBALES (8 NIVELES)
  const totalCampaigns = new Set(campanaCoordinators.map(c => c.territoryName)).size || campanaCoordinators.length;
  const totalCampanaCoordinators = campanaCoordinators.length;
  const totalDistritales = allLeaders.filter(l => l.level === 'distrital').length;
  const totalZona = allLeaders.filter(l => l.level === 'zona').length;
  const totalRespZona = allLeaders.filter(l => l.level === 'responsable_zona').length;
  const totalRespSeccion = allLeaders.filter(l => l.level === 'territorial' || l.level === 'seccional').length;
  const totalPromotoresTerritoriales = allLeaders.filter(l => l.level === 'promotor').length;
  const totalPromovidos = allLeaders.filter(l => l.level === 'promovido').length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 sm:pb-16">
      {/* 1. Header SaaS */}
      <div className="bg-slate-900 text-white border-b border-slate-800 p-6 sm:p-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Gestión Central de Campañas
          </h1>
        </div>
      </div>

      {/* 2. DATOS PRINCIPALES TOTALES (8 NIVELES EN UN SOLO BLOQUE UNIFICADO) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 -mt-4 z-10 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y lg:divide-y-0 divide-slate-100">
            
            {/* 1. Campañas */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Campañas</span>
              <h3 className="text-xl font-black text-slate-900 font-mono mt-1">{totalCampaigns}</h3>
            </div>

            {/* 2. Jefes de Campaña */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Jefes Campaña</span>
              <h3 className="text-xl font-black text-purple-700 font-mono mt-1">{totalCampanaCoordinators}</h3>
            </div>

            {/* 3. Coord. Distritales */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Distritales</span>
              <h3 className="text-xl font-black text-indigo-700 font-mono mt-1">{totalDistritales}</h3>
            </div>

            {/* 4. Coord. de Zona */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Coord. Zona</span>
              <h3 className="text-xl font-black text-indigo-600 font-mono mt-1">{totalZona}</h3>
            </div>

            {/* 5. Resp. de Zona */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Resp. Zona</span>
              <h3 className="text-xl font-black text-blue-700 font-mono mt-1">{totalRespZona}</h3>
            </div>

            {/* 6. Resp. de Sección */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Resp. Secc.</span>
              <h3 className="text-xl font-black text-blue-600 font-mono mt-1">{totalRespSeccion}</h3>
            </div>

            {/* 7. Promotores */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Promotores</span>
              <h3 className="text-xl font-black text-sky-700 font-mono mt-1">{totalPromotoresTerritoriales}</h3>
            </div>

            {/* 8. Promovidos */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate">Promovidos</span>
              <h3 className="text-xl font-black text-emerald-700 font-mono mt-1">{totalPromovidos}</h3>
            </div>

          </div>
        </div>
      </div>

      {/* 3. LISTA DE JEFES DE CAMPAÑA */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 sm:pb-16 space-y-4 flex-1">
        {campanaCoordinators.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 mb-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">No hay Jefes de Campaña registrados</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              El Super Administrador gestiona las campañas registrando a sus titulares oficiales.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Jefe de Campaña & Demarcación</th>
                    <th className="py-3 px-4 text-center">Contacto Directo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campanaCoordinators.map((coord) => {
                    const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
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
                        {/* 1. Jefe de Campaña & Demarcación con @usuario */}
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

                        {/* 3. Acciones: BOTÓN EDITAR ANTES DE ENTRAR A SU CUENTA */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* BOTÓN EDITAR */}
                            <button
                              type="button"
                              onClick={() => onEditCoordinator?.(coord.id)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Editar datos del jefe de campaña"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>

                            {/* BOTÓN ENTRAR A SU CUENTA */}
                            <button
                              type="button"
                              onClick={() => onImpersonate(targetAccount)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer active:scale-98"
                              title="Iniciar sesión en la cuenta del jefe de campaña"
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
