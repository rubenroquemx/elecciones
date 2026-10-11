import React, { useState, useMemo } from 'react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader } from '../types/territory';
import { 
  X, 
  Search, 
  LogIn, 
  Users, 
  MapPin, 
  Mail, 
  Phone
} from 'lucide-react';

interface ImpersonateSubAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  allLeaders: TerritorialLeader[];
  currentUser: UserAccount;
  onImpersonate: (account: UserAccount) => void;
}

type LevelFilter = 'all' | 'cpv' | 'zona' | 'seccion' | 'promotor';

export const ImpersonateSubAccountModal: React.FC<ImpersonateSubAccountModalProps> = ({
  isOpen,
  onClose,
  accounts,
  allLeaders,
  currentUser,
  onImpersonate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>('all');

  // Construir lista unificada de todas las subcuentas disponibles en el sistema
  const allSubAccounts = useMemo(() => {
    const list: UserAccount[] = [];
    const seenIds = new Set<string>();
    const seenUsernames = new Set<string>();

    // 1. Agregar cuentas registradas en UserAccount
    accounts.forEach((acc) => {
      if (acc.level === 'admin' || acc.isSuperAdmin || acc.id === currentUser.id) return;
      seenIds.add(acc.id);
      if (acc.leaderId) seenIds.add(acc.leaderId);
      if (acc.username) seenUsernames.add(acc.username.toLowerCase());
      list.push(acc);
    });

    // 2. Agregar líderes territoriales con usuario o rol operativo que no tengan UserAccount duplicada
    allLeaders.forEach((leader) => {
      if (leader.level === 'promovido') return;
      if (seenIds.has(leader.id)) return;
      const cleanUser = leader.username?.toLowerCase() || '';
      if (cleanUser && seenUsernames.has(cleanUser)) return;

      const fallbackAccount: UserAccount = {
        id: `usr-${leader.id}`,
        username: leader.username || `user_${leader.id.slice(0, 6)}`,
        name: leader.name,
        email: leader.email || `${leader.username || 'usuario'}@elecciones.legislab.app`,
        phone: leader.phone,
        leaderId: leader.id,
        level: leader.level,
        territoryName: leader.territoryName,
        accountRoleLabel: leader.role,
        avatarBg: leader.avatarBg || 'bg-[#9d2449]',
        assignedSections: leader.assignedSections,
        assignedBy: currentUser.name,
      };

      seenIds.add(leader.id);
      if (cleanUser) seenUsernames.add(cleanUser);
      list.push(fallbackAccount);
    });

    return list;
  }, [accounts, allLeaders, currentUser]);

  // Filtrado reactivo por texto y nivel operativo
  const filteredAccounts = useMemo(() => {
    let result = allSubAccounts;

    if (selectedLevel !== 'all') {
      result = result.filter((acc) => {
        const lvl = acc.level;
        if (selectedLevel === 'cpv') return lvl === 'cpv' || lvl === 'campana' || lvl === 'estatal';
        if (selectedLevel === 'zona') return lvl === 'zona' || lvl === 'distrital' || lvl === 'responsable_zona';
        if (selectedLevel === 'seccion') return lvl === 'seccion' || lvl === 'territorial' || lvl === 'seccional';
        if (selectedLevel === 'promotor') return lvl === 'promotor';
        return true;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((acc) => {
        return (
          acc.name?.toLowerCase().includes(q) ||
          acc.username?.toLowerCase().includes(q) ||
          acc.email?.toLowerCase().includes(q) ||
          acc.phone?.toLowerCase().includes(q) ||
          acc.territoryName?.toLowerCase().includes(q) ||
          acc.accountRoleLabel?.toLowerCase().includes(q) ||
          acc.assignedSections?.some(s => String(s).includes(q))
        );
      });
    }

    return result;
  }, [allSubAccounts, selectedLevel, searchTerm]);

  // Contadores por categoría
  const countByLevel = useMemo(() => {
    let cpv = 0;
    let zona = 0;
    let seccion = 0;
    let promotor = 0;

    allSubAccounts.forEach((acc) => {
      const lvl = acc.level;
      if (lvl === 'cpv' || lvl === 'campana' || lvl === 'estatal') cpv++;
      else if (lvl === 'zona' || lvl === 'distrital' || lvl === 'responsable_zona') zona++;
      else if (lvl === 'seccion' || lvl === 'territorial' || lvl === 'seccional') seccion++;
      else if (lvl === 'promotor') promotor++;
    });

    return { all: allSubAccounts.length, cpv, zona, seccion, promotor };
  }, [allSubAccounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-none border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-[#9d2449] text-white flex items-center justify-center shrink-0 shadow-md">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Entrar a Cualquier Subcuenta
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-none">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Selecciona cualquier cuenta operativa para ver y gestionar la plataforma desde su perspectiva en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer rounded-none"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Input de Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, @usuario, correo, teléfono, demarcación o sección..."
              className="w-full bg-white border border-slate-300 rounded-none pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Pestañas de Nivel Operativo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={`px-3 py-1.5 rounded-none transition-all cursor-pointer whitespace-nowrap ${
                selectedLevel === 'all'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({countByLevel.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('cpv')}
              className={`px-3 py-1.5 rounded-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedLevel === 'cpv'
                  ? 'bg-[#9d2449] text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>CPV / Campaña ({countByLevel.cpv})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('zona')}
              className={`px-3 py-1.5 rounded-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedLevel === 'zona'
                  ? 'bg-sky-700 text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Coordinadores de Zona ({countByLevel.zona})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('seccion')}
              className={`px-3 py-1.5 rounded-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedLevel === 'seccion'
                  ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Responsables de Sección ({countByLevel.seccion})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('promotor')}
              className={`px-3 py-1.5 rounded-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedLevel === 'promotor'
                  ? 'bg-amber-700 text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Promotores ({countByLevel.promotor})</span>
            </button>
          </div>
        </div>

        {/* Listado de Cuentas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-slate-100 bg-slate-50/50">
          {filteredAccounts.map((acc) => {
            const isCpv = acc.level === 'cpv' || acc.level === 'campana' || acc.level === 'estatal';
            const isZona = acc.level === 'zona' || acc.level === 'distrital' || acc.level === 'responsable_zona';
            const isSeccion = acc.level === 'seccion' || acc.level === 'territorial' || acc.level === 'seccional';

            const badgeBg = isCpv
              ? 'bg-rose-50 text-[#9d2449] border-rose-200'
              : isZona
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : isSeccion
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={acc.id}
                className="pt-2.5 first:pt-0 bg-white border border-slate-200 hover:border-[#9d2449]/50 hover:shadow-xs p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Información Principal del Usuario */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-none flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${acc.avatarBg || 'bg-[#9d2449]'}`}>
                    {acc.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {acc.name}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 border ${badgeBg}`}>
                        {acc.accountRoleLabel || acc.level?.toUpperCase()}
                      </span>
                      {acc.username && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2">
                          @{acc.username}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                      {acc.territoryName && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{acc.territoryName}</span>
                        </span>
                      )}
                      {acc.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{acc.phone}</span>
                        </span>
                      )}
                      {acc.email && (
                        <span className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{acc.email}</span>
                        </span>
                      )}
                      {acc.assignedSections && acc.assignedSections.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({acc.assignedSections.length} {acc.assignedSections.length === 1 ? 'sección' : 'secciones'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de Entrada Inmediata */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      onImpersonate(acc);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                    title={`Entrar a la sesión de ${acc.name}`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Entrar como este usuario</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredAccounts.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron subcuentas</p>
              <p className="text-xs text-slate-400">
                Prueba con otro término de búsqueda o selecciona otra categoría.
              </p>
            </div>
          )}
        </div>

        {/* Pie de Información */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Mostrando <strong>{filteredAccounts.length}</strong> de <strong>{allSubAccounts.length}</strong> subcuentas</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-none transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
