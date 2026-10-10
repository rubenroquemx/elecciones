import React, { useState, useMemo } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
import { getAllowedChildLevel, getDefaultRoleForLevel, getVisibleSubtree } from '../utils/hierarchy';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Trash2, 
  ShieldCheck, 
  Pencil,
  Layers,
  MapPin
} from 'lucide-react';

interface TerritorialCoordinatorsAdminPageProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  accounts: UserAccount[];
  scopedSections: ElectoralSection[];
  onNavigate: (nav: MainNavSection) => void;
  onDeleteCoordinator: (id: string) => void;
  onViewDetails?: (leaderId: string) => void;
  onEditUser?: (leaderId: string) => void;
}

export const TerritorialCoordinatorsAdminPage: React.FC<TerritorialCoordinatorsAdminPageProps> = ({
  currentUser,
  allLeaders,
  accounts,
  scopedSections,
  onNavigate,
  onDeleteCoordinator,
  onViewDetails,
  onEditUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Determinar nivel subordinado inmediato permitido
  const targetChildLevel: TerritorialLevel = useMemo(() => {
    return getAllowedChildLevel(currentUser.level) || 'distrital';
  }, [currentUser.level]);

  // 2. Configuración de textos y etiquetas según el nivel subordinado
  const roleConfig = useMemo(() => {
    const singular = getDefaultRoleForLevel(targetChildLevel);
    const plurals: Record<TerritorialLevel, string> = {
      cpv: 'Coordinadores de Promoción al Voto',
      zona: 'Coordinadores de Zona',
      seccion: 'Responsables de Sección',
      promotor: 'Promotores Territoriales',
      promovido: 'Ciudadanos Promovidos',
      campana: 'Coordinadores de Promoción al Voto',
      distrital: 'Coordinadores de Zona',
      responsable_zona: 'Coordinadores de Zona',
      territorial: 'Responsables de Sección',
      estatal: 'Coordinadores de Promoción al Voto',
      seccional: 'Responsables de Sección',
    };
    const plural = plurals[targetChildLevel] || singular + 's';
    const cfg = LEVEL_CONFIG[targetChildLevel] || {
      color: 'text-indigo-700',
      bgLight: 'bg-indigo-50 border-indigo-200',
      border: 'border-indigo-600',
    };

    return {
      singular,
      plural,
      cfg,
    };
  }, [targetChildLevel]);

  // 3. Subordinados directos dependientes de este usuario (sin '|| !l.parentId')
  const directSubordinates = useMemo(() => {
    return allLeaders.filter(l => 
      l.level === targetChildLevel && 
      (currentUser.isSuperAdmin ? true : l.parentId === currentUser.leaderId)
    );
  }, [allLeaders, targetChildLevel, currentUser]);

  // 4. Mapeo de cuentas de usuario por leaderId o username
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(a => {
      if (a.leaderId) map.set(a.leaderId, a);
      if (a.username) map.set(a.username, a);
    });
    return map;
  }, [accounts]);

  // 5. Métricas acumuladas del equipo de cada subordinado
  const metricsByLeader = useMemo(() => {
    const map = new Map<string, { directTeamCount: number; promovidosCount: number; summary: string }>();

    directSubordinates.forEach(sub => {
      const subtree = getVisibleSubtree(sub.id, allLeaders).filter(l => l.id !== sub.id);
      const directTeam = allLeaders.filter(l => l.parentId === sub.id && l.level !== 'promovido');
      const totalPromovidos = subtree.filter(l => l.level === 'promovido').length + (sub.currentCount || 0);

      const parts: string[] = [];
      const dists = subtree.filter(l => l.level === 'distrital').length;
      if (dists > 0) parts.push(`${dists} Dist.`);
      const zonas = subtree.filter(l => l.level === 'zona').length;
      if (zonas > 0) parts.push(`${zonas} Zona`);
      const rzonas = subtree.filter(l => l.level === 'responsable_zona').length;
      if (rzonas > 0) parts.push(`${rzonas} R.Zona`);
      const rsecs = subtree.filter(l => l.level === 'territorial' || l.level === 'seccional').length;
      if (rsecs > 0) parts.push(`${rsecs} Secc.`);
      const proms = subtree.filter(l => l.level === 'promotor').length;
      if (proms > 0) parts.push(`${proms} Prom.`);
      if (totalPromovidos > 0) parts.push(`${totalPromovidos} Promov.`);

      map.set(sub.id, {
        directTeamCount: directTeam.length,
        promovidosCount: totalPromovidos,
        summary: parts.length > 0 ? parts.join(' · ') : `${directTeam.length} directos`,
      });
    });
    return map;
  }, [directSubordinates, allLeaders]);

  // 6. Filtrado de subordinados por búsqueda
  const filteredSubordinates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return directSubordinates;
    return directSubordinates.filter(c => {
      const acc = accountsByLeaderId.get(c.id);
      const inSections = c.assignedSections?.some(s => s.toLowerCase().includes(q));
      const inTerritory = c.territoryName?.toLowerCase().includes(q);
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (acc?.username && acc.username.toLowerCase().includes(q)) ||
        inSections ||
        inTerritory
      );
    });
  }, [directSubordinates, searchQuery, accountsByLeaderId]);

  // 7. Secciones asignadas únicas
  const totalCoveredSections = useMemo(() => {
    const secSet = new Set<string>();
    directSubordinates.forEach(c => {
      (c.assignedSections || []).forEach(s => secSet.add(s));
    });
    return secSet.size;
  }, [directSubordinates]);



  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans">
      {/* 1. Header Superior */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9d2449]" />
              <span className="text-xs font-bold text-[#9d2449] tracking-wider uppercase">
                Administración de Usuarios • {currentUser.accountRoleLabel || currentUser.name}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {roleConfig.plural}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Aquí se administran los {roleConfig.plural} a tu cargo directo en la estructura territorial.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('crear-coordinador-territorial')}
            className="px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-md shadow-[#9d2449]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo {roleConfig.singular}</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas Métricas */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-[#9d2449] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{roleConfig.plural}</p>
              <h3 className="text-xl font-black text-slate-900">{directSubordinates.length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Secciones Asignadas</p>
              <h3 className="text-xl font-black text-slate-900">
                {totalCoveredSections}
                {scopedSections && scopedSections.length > 0 && (
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    de {scopedSections.length}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sub-Equipo a Cargo</p>
              <h3 className="text-xl font-black text-slate-900">
                {Array.from(metricsByLeader.values()).reduce((acc, m) => acc + m.directTeamCount, 0)}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ciudadanos Promovidos</p>
              <h3 className="text-xl font-black text-slate-900">
                {Array.from(metricsByLeader.values()).reduce((acc, m) => acc + m.promovidosCount, 0)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pb-3 shrink-0">
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Buscar por nombre, teléfono, usuario o territorio...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 4. Lista o Tabla de Subordinados */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pb-12 flex-1">
        {filteredSubordinates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">
              No hay {roleConfig.plural} registrados
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Da de alta a tus {roleConfig.plural} para asignarles territorio y comenzar el despliegue en campo.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('crear-coordinador-territorial')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-md shadow-[#9d2449]/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Primer {roleConfig.singular}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">{roleConfig.singular}</th>
                    <th className="py-3.5 px-4">Territorio / Secciones</th>
                    <th className="py-3.5 px-4 text-center">Equipo y Avance</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubordinates.map((sub) => {
                    const acc = accountsByLeaderId.get(sub.id) || accounts.find(a => a.username === sub.username);
                    const metrics = metricsByLeader.get(sub.id) || { directTeamCount: 0, promovidosCount: 0, summary: '0 directos' };
                    const sections = sub.assignedSections || [];
                    const cleanPhone = (sub.phone || '').replace(/\D/g, '');

                    return (
                      <tr 
                        key={sub.id} 
                        onClick={() => onViewDetails ? onViewDetails(sub.id) : onNavigate('detalle-usuario')}
                        className="hover:bg-rose-50/30 transition-colors cursor-pointer group"
                      >
                        {/* 1. Nombre + @usuario en pequeño debajo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#9d2449]/10 text-[#9d2449] flex items-center justify-center font-bold text-xs shrink-0 border border-[#9d2449]/20 group-hover:scale-105 transition-transform">
                              {sub.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-[#9d2449] transition-colors truncate">
                                {sub.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                @{acc?.username || sub.username || 'sin-usuario'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Territorio y Secciones */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {sub.territoryName && (
                              <span className="block text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                                {sub.territoryName}
                              </span>
                            )}
                            {sections.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1 max-w-xs">
                                {sections.slice(0, 4).map(sec => (
                                  <span
                                    key={sec}
                                    className="px-2 py-0.5 bg-rose-50 text-[#9d2449] border border-rose-200/80 rounded-md text-[10px] font-mono font-bold"
                                  >
                                    {sec}
                                  </span>
                                ))}
                                {sections.length > 4 && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                    +{sections.length - 4} más
                                  </span>
                                )}
                              </div>
                            ) : !sub.territoryName ? (
                              <span className="text-slate-400 italic text-[11px]">Sin demarcación</span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. Equipo y Avance (Desglose de jerarquía) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-[11px]">
                            <span className="font-mono text-slate-700 font-medium">{metrics.summary}</span>
                          </div>
                        </td>

                        {/* 4. Acciones: WhatsApp, Llamar, Editar, Eliminar */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Oficial */}
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/52${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-[#25D366] hover:bg-emerald-50 border border-emerald-200/70 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                                title={`WhatsApp a ${sub.name}`}
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                              </a>
                            ) : null}

                            {/* Llamada Telefónica */}
                            {cleanPhone ? (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200/70 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                                title={`Llamar a ${sub.name}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            ) : null}

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => onEditUser ? onEditUser(sub.id) : onNavigate('crear-coordinador-territorial')}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title={`Editar ${roleConfig.singular}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* Eliminar (una sola confirmación) */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar a "${sub.name}" (${roleConfig.singular})?`)) {
                                  onDeleteCoordinator(sub.id);
                                }
                              }}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title={`Eliminar ${roleConfig.singular}`}
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

      {/* Pie de página pequeño */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-200/60 bg-white text-center">
        <a
          href="https://www.instagram.com/rubenroqueguzman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Creado por: Rubén Roque Guzmán
        </a>
      </footer>
    </div>
  );
};
