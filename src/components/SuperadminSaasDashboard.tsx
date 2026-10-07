import React, { useState, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { 
  Building2, 
  Users, 
  UserCheck, 
  LogIn, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles,
  Phone,
  Pencil,
  Layers,
  Shield
} from 'lucide-react';

// Icono Oficial de WhatsApp SVG
const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Coordinadores de Campaña registrados
  const campanaCoordinators = useMemo(() => {
    return allLeaders.filter(
      l => l.level === 'campana' || l.level === 'estatal' || l.level === 'distrital'
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

  // Métricas de los 3 niveles por coordinador de campaña
  const statsByCoordinator = useMemo(() => {
    const map = new Map<string, { coordinadoresCount: number; promotoresCount: number; promovidosCount: number }>();
    campanaCoordinators.forEach(c => {
      // 1. Coordinadores Territoriales dependientes
      const territoriales = allLeaders.filter(
        l => l.level === 'territorial' && (l.parentId === c.id || l.territoryName?.includes(c.territoryName))
      );
      const territorialIds = new Set(territoriales.map(t => t.id));

      // 2. Promotores Territoriales dependientes
      const promotores = allLeaders.filter(
        l => l.level === 'promotor' && (l.parentId === c.id || (l.parentId && territorialIds.has(l.parentId)))
      );
      const promoterIds = new Set(promotores.map(p => p.id));

      // 3. Promovidos dependientes
      const promovidos = allLeaders.filter(
        l => l.level === 'promovido' && (l.parentId && promoterIds.has(l.parentId))
      );

      map.set(c.id, {
        coordinadoresCount: territoriales.length,
        promotoresCount: promotores.length,
        promovidosCount: promovidos.length,
      });
    });
    return map;
  }, [campanaCoordinators, allLeaders]);

  // TOTALES PRINCIPALES GLOBALES
  const totalCampaigns = new Set(campanaCoordinators.map(c => c.territoryName)).size || campanaCoordinators.length;
  const totalCampanaCoordinators = campanaCoordinators.length;
  const totalTerritorialCoordinators = allLeaders.filter(l => l.level === 'territorial').length;
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

  const handleCopyCredentials = (coord: TerritorialLeader, acc?: UserAccount) => {
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL*\n\n` +
      `Estimado(a) *${coord.name}*,\n` +
      `Tu cuenta como *Coordinador de Campaña*:\n` +
      `📍 *Campaña:* ${coord.territoryName}\n` +
      `👤 *Usuario:* ${acc?.username || coord.username || 'usuario'}\n` +
      `🔑 *Contraseña:* ${acc?.password || 'campana2026'}\n` +
      `🔗 *Acceso:* ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(coord.id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

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
              <span>Nuevo Coordinador de Campaña</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DATOS PRINCIPALES TOTALES (5 MÉTRICAS SOLICITADAS) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 -mt-4 z-10 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Campañas */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campañas</p>
              <h3 className="text-xl font-black text-slate-900 font-mono">{totalCampaigns}</h3>
            </div>
          </div>

          {/* 2. Coordinadores de campaña */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coord. de Campaña</p>
              <h3 className="text-xl font-black text-slate-900 font-mono">{totalCampanaCoordinators}</h3>
            </div>
          </div>

          {/* 3. Coordinadores Territoriales */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coord. Territoriales</p>
              <h3 className="text-xl font-black text-slate-900 font-mono">{totalTerritorialCoordinators}</h3>
            </div>
          </div>

          {/* 4. Promotores Territoriales */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promotores Territoriales</p>
              <h3 className="text-xl font-black text-slate-900 font-mono">{totalPromotoresTerritoriales}</h3>
            </div>
          </div>

          {/* 5. Promovidos */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5 col-span-2 sm:col-span-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promovidos</p>
              <h3 className="text-xl font-black text-emerald-700 font-mono">{totalPromovidos}</h3>
            </div>
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
              <span>Crear Primer Coordinador de Campaña</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Coordinador & Campaña</th>
                    <th className="py-3 px-4 text-center">Contacto Directo</th>
                    <th className="py-3 px-4 text-center">Equipo & Avance (3 Niveles)</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCoordinators.map((coord) => {
                    const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
                    const stats = statsByCoordinator.get(coord.id) || { coordinadoresCount: 0, promotoresCount: 0, promovidosCount: 0 };
                    const isCopied = copiedKey === coord.id;
                    const cleanPhone = (coord.phone || '').replace(/\D/g, '');

                    const targetAccount: UserAccount = acc || {
                      id: `usr-${coord.id}`,
                      username: coord.username || 'usuario',
                      name: coord.name,
                      email: coord.email || `${coord.username}@campana.mx`,
                      password: 'campana2026',
                      leaderId: coord.id,
                      level: 'campana',
                      territoryName: coord.territoryName,
                      accountRoleLabel: 'Coordinador de Campaña',
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
                                  <OfficialWhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                                </a>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Equipo & Avance: 3 NIVELES (Coordinadores, Promotores, Promovidos) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-4 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100">
                            {/* Nivel 1: Coordinadores (Territoriales) */}
                            <div className="text-center" title="Coordinadores Territoriales">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Coordinadores</span>
                              <span className="font-mono font-bold text-indigo-700 text-xs">{stats.coordinadoresCount}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            {/* Nivel 2: Promotores */}
                            <div className="text-center" title="Promotores Territoriales">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Promotores</span>
                              <span className="font-mono font-bold text-slate-800 text-xs">{stats.promotoresCount}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            {/* Nivel 3: Promovidos */}
                            <div className="text-center" title="Ciudadanos Promovidos">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Promovidos</span>
                              <span className="font-mono font-bold text-emerald-700 text-xs">{stats.promovidosCount}</span>
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

                            {/* Copiar Credenciales */}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(coord, acc)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Copiar credenciales de acceso"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Estás seguro de eliminar permanentemente al Coordinador "${coord.name}"?`)) {
                                  onDeleteCoordinator(coord.id);
                                }
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Coordinador"
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
