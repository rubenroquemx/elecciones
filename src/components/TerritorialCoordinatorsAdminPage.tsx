import React, { useState, useMemo } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
import { getAllowedChildLevel, getDefaultRoleForLevel } from '../utils/hierarchy';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  Users, 
  UserPlus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Layers, 
  Eye, 
  EyeOff
} from 'lucide-react';

const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.17 1.74 2.65 4.21 3.72.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.47-.29z"/>
  </svg>
);

interface TerritorialCoordinatorsAdminPageProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  accounts: UserAccount[];
  scopedSections: ElectoralSection[];
  onNavigate: (nav: MainNavSection) => void;
  onDeleteCoordinator: (id: string) => void;
}

export const TerritorialCoordinatorsAdminPage: React.FC<TerritorialCoordinatorsAdminPageProps> = ({
  currentUser,
  allLeaders,
  accounts,
  scopedSections,
  onNavigate,
  onDeleteCoordinator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  // 1. Determinar nivel subordinado inmediato permitido
  const targetChildLevel: TerritorialLevel = useMemo(() => {
    return getAllowedChildLevel(currentUser.level) || 'distrital';
  }, [currentUser.level]);

  // 2. Configuración de textos y etiquetas según el nivel subordinado
  const roleConfig = useMemo(() => {
    const singular = getDefaultRoleForLevel(targetChildLevel);
    const plurals: Record<TerritorialLevel, string> = {
      campana: 'Jefes de Campaña',
      distrital: 'Coordinadores Distritales',
      zona: 'Coordinadores de Zona',
      responsable_zona: 'Responsables de Zona',
      territorial: 'Responsables de Sección',
      promotor: 'Promotores Territoriales',
      promovido: 'Ciudadanos Promovidos',
      estatal: 'Jefes de Campaña',
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

  // 3. Subordinados directos dependientes de este usuario
  const directSubordinates = useMemo(() => {
    return allLeaders.filter(l => 
      l.level === targetChildLevel && 
      (currentUser.isSuperAdmin || l.parentId === currentUser.leaderId || !l.parentId)
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
    const map = new Map<string, { directTeamCount: number; promovidosCount: number }>();
    
    // Función recursiva para contar promovidos en la rama inferior
    const countBranchPromovidos = (leaderId: string): number => {
      const directPromovidos = allLeaders.filter(l => l.parentId === leaderId && l.level === 'promovido').length;
      const subLeaders = allLeaders.filter(l => l.parentId === leaderId && l.level !== 'promovido');
      return directPromovidos + subLeaders.reduce((acc, sub) => acc + countBranchPromovidos(sub.id), 0);
    };

    directSubordinates.forEach(sub => {
      const directTeam = allLeaders.filter(l => l.parentId === sub.id && l.level !== 'promovido');
      const totalPromovidos = countBranchPromovidos(sub.id) + (sub.currentCount || 0);
      map.set(sub.id, {
        directTeamCount: directTeam.length,
        promovidosCount: totalPromovidos,
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

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCredentials = (sub: TerritorialLeader, acc?: UserAccount) => {
    const username = acc?.username || sub.username || 'N/A';
    const password = acc?.password || 'admin123';
    const text = `Credenciales de Acceso (${roleConfig.singular}):\nPlataforma: ${window.location.origin}\nUsuario: ${username}\nContraseña: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(sub.id);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSendWhatsApp = (sub: TerritorialLeader, acc?: UserAccount) => {
    const username = acc?.username || sub.username || 'N/A';
    const password = acc?.password || 'admin123';
    const msg = `Hola *${sub.name}*, te comparto tu acceso oficial a la plataforma como *${roleConfig.singular}*:\n\n🌐 *Acceso:* ${window.location.origin}\n👤 *Usuario:* ${username}\n🔑 *Contraseña:* ${password}\n\nFavor de ingresar para comenzar tus actividades de coordinación.`;
    const cleanPhone = (sub.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(msg);
      setCopiedKey(sub.id);
      setTimeout(() => setCopiedKey(null), 3000);
      alert('Mensaje copiado al portapapeles. Agrega el número de teléfono para enviar por WhatsApp.');
    }
  };

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
                    <th className="py-3.5 px-4">Usuario y Acceso</th>
                    <th className="py-3.5 px-4">Territorio / Secciones</th>
                    <th className="py-3.5 px-4 text-center">Equipo y Avance</th>
                    <th className="py-3.5 px-4 text-right">Contacto y Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubordinates.map((sub) => {
                    const acc = accountsByLeaderId.get(sub.id) || accounts.find(a => a.username === sub.username);
                    const metrics = metricsByLeader.get(sub.id) || { directTeamCount: 0, promovidosCount: 0 };
                    const isCopied = copiedKey === sub.id;
                    const isPasswordRevealed = revealedPasswords.has(sub.id);
                    const sections = sub.assignedSections || [];
                    const cleanPhone = (sub.phone || '').replace(/\D/g, '');

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Integrante Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#9d2449]/10 text-[#9d2449] flex items-center justify-center font-bold text-xs shrink-0 border border-[#9d2449]/20">
                              {sub.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{sub.name}</p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                {sub.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{sub.phone}</span>
                                  </span>
                                )}
                                {sub.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span className="truncate max-w-[140px]">{sub.email}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Usuario y Acceso */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                @{acc?.username || sub.username || 'sin-usuario'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <span>Clave:</span>
                              <span className="font-mono text-slate-700 font-semibold">
                                {isPasswordRevealed ? (acc?.password || 'admin123') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(sub.id)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title={isPasswordRevealed ? 'Ocultar' : 'Ver'}
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Territorio y Secciones */}
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
                              <span className="text-slate-400 italic text-[11px]">Sin asignación territorial</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Equipo Subordinado */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-[11px]">
                            <span className="text-indigo-700 font-bold">
                              {metrics.directTeamCount} Equipo
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-700 font-bold">
                              {metrics.promovidosCount} Promovidos
                            </span>
                          </div>
                        </td>

                        {/* Contacto y Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Oficial */}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/52${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#25D366] hover:bg-emerald-50 border border-emerald-200/70 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={`WhatsApp a ${sub.name}`}
                              >
                                <OfficialWhatsAppIcon className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Llamada Telefónica */}
                            {cleanPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                title={`Llamar a ${sub.name}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Enviar Credenciales por WhatsApp / Mensaje */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(sub, acc)}
                              className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                              title="Compartir credenciales de acceso"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>

                            {/* Copiar Credenciales */}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(sub, acc)}
                              className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Copiar credenciales al portapapeles"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar a "${sub.name}" (${roleConfig.singular})?`)) {
                                  onDeleteCoordinator(sub.id);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
