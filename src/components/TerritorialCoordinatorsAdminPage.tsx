import React, { useState, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
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
  Send, 
  ShieldCheck, 
  Layers, 
  Eye, 
  EyeOff
} from 'lucide-react';

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

  // Coordinadores Territoriales dependientes de este Coordinador de Campaña
  const territorialCoordinators = useMemo(() => {
    return allLeaders.filter(l => 
      l.level === 'territorial' && 
      (l.parentId === currentUser.leaderId || currentUser.isSuperAdmin || !l.parentId)
    );
  }, [allLeaders, currentUser]);

  // Cuentas de usuario mapeadas
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(a => {
      if (a.leaderId) map.set(a.leaderId, a);
      if (a.username) map.set(a.username, a);
    });
    return map;
  }, [accounts]);

  // Métricas por coordinador: conteo de promotores directos y promovidos
  const metricsByCoordinator = useMemo(() => {
    const map = new Map<string, { promotersCount: number; promovidosCount: number }>();
    territorialCoordinators.forEach(coord => {
      const promoters = allLeaders.filter(l => l.parentId === coord.id && l.level === 'promotor');
      const promoterIds = new Set(promoters.map(p => p.id));
      const promovidos = allLeaders.filter(l => l.level === 'promovido' && l.parentId && promoterIds.has(l.parentId));
      map.set(coord.id, {
        promotersCount: promoters.length,
        promovidosCount: promovidos.length,
      });
    });
    return map;
  }, [territorialCoordinators, allLeaders]);

  // Filtrado de coordinadores
  const filteredCoordinators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return territorialCoordinators;
    return territorialCoordinators.filter(c => {
      const acc = accountsByLeaderId.get(c.id);
      const inSections = c.assignedSections?.some(s => s.toLowerCase().includes(q));
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (acc?.username && acc.username.toLowerCase().includes(q)) ||
        inSections
      );
    });
  }, [territorialCoordinators, searchQuery, accountsByLeaderId]);

  // Total de secciones cubiertas únicas
  const totalCoveredSections = useMemo(() => {
    const secSet = new Set<string>();
    territorialCoordinators.forEach(c => {
      (c.assignedSections || []).forEach(s => secSet.add(s));
    });
    return secSet.size;
  }, [territorialCoordinators]);

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCredentials = (coord: TerritorialLeader, acc?: UserAccount) => {
    const username = acc?.username || coord.username || 'N/A';
    const password = acc?.password || 'coordinador123';
    const text = `Credenciales Coordinador Territorial:\nSistema: ${window.location.origin}\nUsuario: ${username}\nContraseña: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(coord.id);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSendWhatsApp = (coord: TerritorialLeader, acc?: UserAccount) => {
    const username = acc?.username || coord.username || 'N/A';
    const password = acc?.password || 'coordinador123';
    const msg = `Hola *${coord.name}*, te comparto tu acceso a la plataforma territorial:\n\n🌐 *Acceso:* ${window.location.origin}\n👤 *Usuario:* ${username}\n🔑 *Contraseña:* ${password}\n\nFavor de ingresar para comenzar la supervisión.`;
    const cleanPhone = (coord.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(msg);
      setCopiedKey(coord.id);
      setTimeout(() => setCopiedKey(null), 3000);
      alert('Mensaje de WhatsApp copiado al portapapeles.');
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
                Administración de Usuarios
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Coordinadores Territoriales
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Aquí se administran los Coordinadores Territoriales a cargo de las secciones y promotores de la campaña.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('crear-coordinador-territorial')}
            className="px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-md shadow-[#9d2449]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Coordinador Territorial</span>
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
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Coordinadores</p>
              <h3 className="text-xl font-black text-slate-900">{territorialCoordinators.length}</h3>
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
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Promotores Activos</p>
              <h3 className="text-xl font-black text-slate-900">
                {Array.from(metricsByCoordinator.values()).reduce((acc, m) => acc + m.promotersCount, 0)}
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
                {Array.from(metricsByCoordinator.values()).reduce((acc, m) => acc + m.promovidosCount, 0)}
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
              placeholder="Buscar por nombre, teléfono, usuario o sección asignada..."
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

      {/* 4. Lista o Tabla de Coordinadores Territoriales */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pb-12 flex-1">
        {filteredCoordinators.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">
              No hay Coordinadores Territoriales registrados
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Da de alta a tus Coordinadores Territoriales para asignarles secciones específicas y que comiencen a desplegar a sus promotores en campo.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('crear-coordinador-territorial')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-md shadow-[#9d2449]/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Primer Coordinador Territorial</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Coordinador Territorial</th>
                    <th className="py-3.5 px-4">Usuario y Acceso</th>
                    <th className="py-3.5 px-4">Secciones Asignadas</th>
                    <th className="py-3.5 px-4 text-center">Equipo a Cargo</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCoordinators.map((coord) => {
                    const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
                    const metrics = metricsByCoordinator.get(coord.id) || { promotersCount: 0, promovidosCount: 0 };
                    const isCopied = copiedKey === coord.id;
                    const isPasswordRevealed = revealedPasswords.has(coord.id);
                    const sections = coord.assignedSections || [];

                    return (
                      <tr key={coord.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Coordinador Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#9d2449]/10 text-[#9d2449] flex items-center justify-center font-bold text-xs shrink-0 border border-[#9d2449]/20">
                              {coord.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{coord.name}</p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                {coord.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{coord.phone}</span>
                                  </span>
                                )}
                                {coord.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span className="truncate max-w-[140px]">{coord.email}</span>
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
                                @{acc?.username || coord.username || 'sin-usuario'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <span>Clave:</span>
                              <span className="font-mono text-slate-700 font-semibold">
                                {isPasswordRevealed ? (acc?.password || 'coordinador123') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(coord.id)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title={isPasswordRevealed ? 'Ocultar' : 'Ver'}
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Secciones Asignadas */}
                        <td className="py-3.5 px-4">
                          {sections.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Sin secciones asignadas</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1 max-w-xs">
                              {sections.slice(0, 5).map(sec => (
                                <span
                                  key={sec}
                                  className="px-2 py-0.5 bg-rose-50 text-[#9d2449] border border-rose-200/80 rounded-md text-[10px] font-mono font-bold"
                                >
                                  {sec}
                                </span>
                              ))}
                              {sections.length > 5 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                  +{sections.length - 5} más
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Equipo Subordinado */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-[11px]">
                            <span className="text-emerald-700 font-bold">
                              {metrics.promotersCount} Promotores
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-blue-700 font-bold">
                              {metrics.promovidosCount} Promovidos
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(coord, acc)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                              title="Enviar o copiar credenciales para WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {/* Copiar Credenciales */}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(coord, acc)}
                              className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Copiar credenciales de acceso"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar al Coordinador Territorial "${coord.name}"?`)) {
                                  onDeleteCoordinator(coord.id);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Coordinador Territorial"
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
