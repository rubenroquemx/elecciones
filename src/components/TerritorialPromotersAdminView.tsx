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
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  Send, 
  Copy, 
  Check, 
  ShieldCheck, 
  Eye, 
  LayoutGrid, 
  Table, 
  Target, 
  TrendingUp, 
  X
} from 'lucide-react';

export interface PromoterWithMetrics extends TerritorialLeader {
  calculatedCaptureCount: number;
  directPromovidos: TerritorialLeader[];
  meta: number;
  progressPercent: number;
  account?: UserAccount;
}

interface TerritorialPromotersAdminViewProps {
  currentUser: UserAccount;
  promoters: TerritorialLeader[];
  allLeaders: TerritorialLeader[];
  sections: ElectoralSection[];
  accounts: UserAccount[];
  onNavigate: (nav: MainNavSection) => void;
  onSelectEditPromoter: (promoterId: string) => void;
  onDeletePromoter: (promoterId: string) => void;
}

export const TerritorialPromotersAdminView: React.FC<TerritorialPromotersAdminViewProps> = ({
  currentUser,
  promoters,
  allLeaders,
  sections,
  accounts,
  onNavigate,
  onSelectEditPromoter,
  onDeletePromoter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal para ver referidos/promovidos de un promotor
  const [viewingPromoterForReferrals, setViewingPromoterForReferrals] = useState<PromoterWithMetrics | null>(null);

  // Modal para ver credenciales
  const [viewingCredentialsAccount, setViewingCredentialsAccount] = useState<UserAccount | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Calcular promovidos para cada promotor
  const promotersWithMetrics = useMemo(() => {
    return promoters.map((promoter) => {
      // Buscar promovidos bajo este promotor
      const directPromovidos = allLeaders.filter(
        (l) => l.parentId === promoter.id && l.level === 'promovido'
      );
      const captureCount = Math.max(promoter.currentCount || 0, directPromovidos.length);
      const meta = promoter.metaGoal || 100;
      const progressPercent = Math.min(100, Math.round((captureCount / meta) * 100));

      // Buscar cuenta de usuario asociada
      const matchingAccount = accounts.find(
        (a) => a.leaderId === promoter.id || a.username === promoter.username || a.email === promoter.email
      );

      return {
        ...promoter,
        calculatedCaptureCount: captureCount,
        directPromovidos,
        meta,
        progressPercent,
        account: matchingAccount,
      };
    });
  }, [promoters, allLeaders, accounts]);

  // Totales de la zona
  const stats = useMemo(() => {
    const totalPromoters = promotersWithMetrics.length;
    const totalCaptures = promotersWithMetrics.reduce((acc, p) => acc + p.calculatedCaptureCount, 0);
    const totalGoal = promotersWithMetrics.reduce((acc, p) => acc + p.meta, 0);
    const globalPercent = totalGoal > 0 ? Math.round((totalCaptures / totalGoal) * 100) : 0;
    const activeAccounts = promotersWithMetrics.filter((p) => p.account).length;

    return { totalPromoters, totalCaptures, totalGoal, globalPercent, activeAccounts };
  }, [promotersWithMetrics]);

  // Filtros
  const filteredPromoters = useMemo(() => {
    return promotersWithMetrics.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.electoralSection?.includes(q) ||
        p.assignedSections?.some((sec) => sec.includes(q)) ||
        p.account?.username?.toLowerCase().includes(q);

      const matchesSection =
        selectedSectionFilter === 'all' ||
        p.electoralSection === selectedSectionFilter ||
        p.assignedSections?.includes(selectedSectionFilter);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completado' && p.progressPercent >= 100) ||
        (statusFilter === 'en_progreso' && p.progressPercent < 100);

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [promotersWithMetrics, searchQuery, selectedSectionFilter, statusFilter]);

  const handleCopyCredentials = (acc: UserAccount) => {
    const text = `*CREDENCIALES DE ACCESO - SISTEMA CERRADO*
👤 *Usuario:* ${acc.username}
🔑 *Contraseña:* ${acc.password || 'red2026'}
🏷️ *Rol:* Promotor Territorial
📍 *Demarcación:* ${acc.territoryName}
Plataforma: https://elecciones.legislab.app`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendWhatsAppCredentials = (acc: UserAccount) => {
    const text = encodeURIComponent(`*ACCESO A SISTEMA CERRADO DE ESTRUCTURA TERRITORIAL*
👤 *Usuario:* ${acc.username}
🔑 *Contraseña:* ${acc.password || 'red2026'}
🏷️ *Rol:* Promotor Territorial
📍 *Demarcación:* ${acc.territoryName}
Inicia sesión aquí: https://elecciones.legislab.app`);

    const phoneNum = acc.phone?.replace(/[^0-9]/g, '');
    const url = phoneNum ? `https://wa.me/52${phoneNum}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header con Resumen y Acción Principal */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full border border-sky-200">
              Coordinación Territorial
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {currentUser.territoryName}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Gestión de Promotores Territoriales
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisa avances de captación, asignación de secciones electorales y estado de cuentas de acceso en el sistema cerrado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('crear-promotor')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4 text-emerald-100" />
            <span>Crear Promotor Territorial</span>
            <span className="bg-emerald-800/60 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de la Zona */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Promotores */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Promotores</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalPromoters}</span>
            <span className="text-[11px] text-slate-500">en equipo</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {stats.activeAccounts} con cuenta en sistema cerrado
          </p>
        </div>

        {/* Total Ciudadanos Promovidos */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Promovidos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">{stats.totalCaptures}</span>
            <span className="text-[11px] text-slate-500">ciudadanos</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Registrados con credencial INE</p>
        </div>

        {/* Meta Consolidada */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Meta de Zona</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-950 font-mono">{stats.totalGoal}</span>
            <span className="text-[11px] text-slate-500">meta</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.globalPercent)}%` }}
            />
          </div>
        </div>

        {/* Avance Porcentual */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avance Global</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 font-mono">{stats.globalPercent}%</span>
            <span className="text-[11px] text-slate-500">alcanzado</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Rumbo a elecciones 2027</p>
        </div>
      </div>

      {/* 3. Barra de Búsqueda, Filtros y Switcher de Vista */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 w-full sm:w-auto">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, sección, teléfono o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 transition-all font-medium"
            />
          </div>

          {/* Filtro por Sección */}
          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">Todas las Secciones</option>
            {sections.map((s) => (
              <option key={s.id} value={s.sectionNumber}>
                Sección {s.sectionNumber} ({s.municipio})
              </option>
            ))}
          </select>

          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="hidden md:block bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="en_progreso">En Progreso</option>
            <option value="completado">Meta Cumplida</option>
          </select>
        </div>

        {/* Switcher Vista Tabla / Tarjetas */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Vista de Tabla"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Tabla</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Vista de Tarjetas"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Tarjetas</span>
          </button>
        </div>
      </div>

      {/* 4. Contenido Principal: Listado de Promotores */}
      {filteredPromoters.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No se encontraron promotores</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedSectionFilter !== 'all'
              ? 'No hay resultados que coincidan con los filtros seleccionados.'
              : 'Aún no tienes promotores territoriales registrados en tus secciones asignadas.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('crear-promotor')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Dar de alta el primer promotor</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA DE TABLA */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Promotor Territorial</th>
                  <th className="py-3 px-4">Sección(es)</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Avance de Captación</th>
                  <th className="py-3 px-4">Cuenta de Sistema</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromoters.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Promotor info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${
                            p.avatarBg || 'bg-emerald-600'
                          }`}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            {p.account ? (
                              <span className="text-sky-600 font-medium">@{p.account.username}</span>
                            ) : (
                              <span className="text-slate-400 italic">Sin cuenta vinculada</span>
                            )}
                            {p.code && <span>• {p.code}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sección */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {(p.assignedSections && p.assignedSections.length > 0
                          ? p.assignedSections
                          : [p.electoralSection || '0416']
                        ).map((sec) => (
                          <span
                            key={sec}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200/60"
                          >
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            Sec. {sec}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Contacto */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {p.phone ? (
                          <a
                            href={`https://wa.me/52${p.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline"
                            title="Enviar WhatsApp directo"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{p.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin teléfono</span>
                        )}
                        {p.email && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {p.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Avance */}
                    <td className="py-3 px-4">
                      <div className="w-40 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-mono">
                            {p.calculatedCaptureCount} / {p.meta}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              p.progressPercent >= 100 ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {p.progressPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              p.progressPercent >= 100
                                ? 'bg-emerald-500'
                                : p.progressPercent >= 50
                                ? 'bg-sky-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cuenta de Sistema */}
                    <td className="py-3 px-4">
                      {p.account ? (
                        <button
                          type="button"
                          onClick={() => setViewingCredentialsAccount(p.account!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Ver usuario y contraseña"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cuenta Activa</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Manual sin login
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ver promovidos / referidos */}
                        <button
                          type="button"
                          onClick={() => setViewingPromoterForReferrals(p)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Ver lista de ciudadanos promovidos captados"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEditPromoter(p.id);
                            onNavigate('editar-promotor');
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Editar promotor"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar al promotor "${p.name}"?`)) {
                              onDeletePromoter(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Dar de baja promotor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA DE TARJETAS / GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromoters.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-xs ${
                        p.avatarBg || 'bg-emerald-600'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors text-sm">
                        {p.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono">
                        {p.account ? `@${p.account.username}` : 'Promotor Territorial'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {p.status === 'completado' ? 'Meta Lista' : 'En Campo'}
                  </span>
                </div>

                {/* Secciones y contacto */}
                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sección:</span>
                    <strong className="text-slate-800 font-mono">
                      {p.assignedSections?.join(', ') || p.electoralSection}
                    </strong>
                  </div>

                  {p.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <a
                        href={`https://wa.me/52${p.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline"
                      >
                        {p.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Barra de progreso */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Ciudadanos Promovidos</span>
                    <span className="font-mono font-bold text-slate-900">
                      {p.calculatedCaptureCount} / {p.meta} ({p.progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p.progressPercent >= 100
                          ? 'bg-emerald-500'
                          : p.progressPercent >= 50
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewingPromoterForReferrals(p)}
                  className="flex-1 py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ver Referidos ({p.calculatedCaptureCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectEditPromoter(p.id);
                    onNavigate('editar-promotor');
                  }}
                  className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Editar datos del promotor"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Expediente de Ciudadanos Promovidos / Referidos */}
      {viewingPromoterForReferrals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-emil-fade select-none">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-emil-sheet">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ciudadanos Promovidos por {viewingPromoterForReferrals.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sección {viewingPromoterForReferrals.electoralSection} • {viewingPromoterForReferrals.calculatedCaptureCount} registros confirmados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPromoterForReferrals(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-700 space-y-3">
              {viewingPromoterForReferrals.directPromovidos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <p>Aún no se han capturado promovidos directos en el sistema.</p>
                  <p className="text-[11px]">
                    El promotor puede capturar promovidos con el escáner offline de credenciales INE desde su cuenta.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {viewingPromoterForReferrals.directPromovidos.map((prom: TerritorialLeader, idx: number) => (
                    <div key={prom.id || idx} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                          <span>{prom.name}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                            INE Validado
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{prom.address || 'Domicilio registrado'}</span>
                          {prom.colonia && <span>• Col. {prom.colonia}</span>}
                          {prom.electorKey && <span className="font-mono text-slate-400">Clave: {prom.electorKey}</span>}
                        </div>
                      </div>

                      {prom.phone && (
                        <a
                          href={`https://wa.me/52${prom.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1 shrink-0 text-[11px]"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPromoterForReferrals(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver / Copiar Credenciales del Promotor */}
      {viewingCredentialsAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-emil-fade select-none">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-emil-sheet">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Credenciales del Sistema Cerrado</h3>
                  <p className="text-[10px] text-slate-400">{viewingCredentialsAccount.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCredentialsAccount(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block">USUARIO</span>
                    <strong className="text-white text-sm">@{viewingCredentialsAccount.username}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">CONTRASEÑA</span>
                    <strong className="text-amber-400 text-sm">
                      {viewingCredentialsAccount.password || 'red2026'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-sans">DEMARCACIÓN</span>
                    <span className="text-slate-200 font-sans">{viewingCredentialsAccount.territoryName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-sans">ESTATUS</span>
                    <span className="text-emerald-400 font-sans font-bold">Autorizado</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(viewingCredentialsAccount)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? '¡Copiado!' : 'Copiar Credenciales'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsAppCredentials(viewingCredentialsAccount)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
