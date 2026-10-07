import React, { useState, useMemo } from 'react';
import type { TerritorialLeader } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ExtractedINEData } from '../../utils/ineScanner';
import { INECameraScannerModal } from '../INECameraScannerModal';
import { 
  MapPin, 
  ArrowRight, 
  Search, 
  Clock, 
  Phone, 
  Trash2, 
  Camera, 
  Plus, 
  UserCheck
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface PromotorTerritorialDashboardProps {
  currentUser: UserAccount;
  visibleLeaders: TerritorialLeader[];
  onNavigateView: (view: any) => void;
  onOpenQuickCapture?: (initialData?: ExtractedINEData) => void;
  onViewCitizen?: (citizenId: string) => void;
  onDeleteCitizen?: (citizenId: string) => void;
}

export const PromotorTerritorialDashboard: React.FC<PromotorTerritorialDashboardProps> = ({
  currentUser,
  visibleLeaders,
  onNavigateView,
  onOpenQuickCapture,
  onViewCitizen,
  onDeleteCitizen,
}) => {
  const [promotorSearch, setPromotorSearch] = useState<string>('');
  const [isIneScannerOpen, setIsIneScannerOpen] = useState(false);

  const promovidosList = useMemo(() => {
    return visibleLeaders.filter(l => l.level === 'promovido');
  }, [visibleLeaders]);

  const filteredPromovidos = useMemo(() => {
    const q = promotorSearch.trim().toLowerCase();
    if (!q) return promovidosList;
    return promovidosList.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.electorKey && p.electorKey.toLowerCase().includes(q)) ||
      (p.curp && p.curp.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.colonia && p.colonia.toLowerCase().includes(q))
    );
  }, [promovidosList, promotorSearch]);

  const promotorNode = useMemo(() => {
    return (
      visibleLeaders.find(l => l.id === currentUser.leaderId) ||
      visibleLeaders.find(l => l.level === 'promotor') ||
      visibleLeaders[0] ||
      null
    );
  }, [visibleLeaders, currentUser.leaderId]);

  const promotorSection = useMemo(() => {
    return (
      promotorNode?.electoralSection ||
      promotorNode?.assignedSections?.[0] ||
      currentUser.territoryName.match(/\d{3,4}/)?.[0] ||
      'Sin sección'
    );
  }, [promotorNode, currentUser.territoryName]);

  const promotorAssignedGoal = promotorNode?.metaGoal || 0;
  const promotorAchievedCount = promovidosList.length;
  const promotorRemaining = Math.max(0, promotorAssignedGoal - promotorAchievedCount);
  const promotorProgressPct = promotorAssignedGoal > 0
    ? Math.min(100, Math.round((promotorAchievedCount / promotorAssignedGoal) * 100))
    : 0;

  const validIneCount = useMemo(() => {
    return promovidosList.filter(p => Boolean(p.electorKey && p.electorKey.trim().length > 5)).length;
  }, [promovidosList]);

  const validInePct = promovidosList.length > 0
    ? Math.round((validIneCount / promovidosList.length) * 100)
    : 100;

  return (
    <div className="flex-1 bg-[#f5f5f7] p-0 space-y-0 overflow-visible md:overflow-y-auto pb-24 md:pb-0 font-sans text-slate-800">
      <div className="w-full space-y-0">

        {/* Encabezado con identidad y barra de progreso */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 rounded-none p-5 sm:p-6 text-white shadow-none relative overflow-hidden border-b border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-emerald-500/10 rounded-none blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5">
                Nivel 6 • Promotor Territorial
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {currentUser.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Sección <strong className="text-white font-bold">{promotorSection}</strong>
                    {promotorNode?.colonia ? ` • ${promotorNode.colonia}` : ''}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateView('mis-secciones')}
                  className="text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded border border-emerald-400/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver mapa de sección</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Métrica de Meta y Avance */}
            <div className="w-full md:w-96 shrink-0 bg-white/[0.04] border border-white/10 rounded-none p-3.5 sm:p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Meta de Promovidos
                </span>
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-2 py-0.5 rounded-none">
                  ✓ {validInePct}% INE ({validIneCount}/{promotorAchievedCount})
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {promotorAchievedCount}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {promotorAssignedGoal > 0 ? `/ ${promotorAssignedGoal} meta` : '/ Meta no definida'}
                  </span>
                </div>
                {promotorAssignedGoal > 0 ? (
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {promotorProgressPct}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">
                    Sin meta
                  </span>
                )}
              </div>

              <div className="w-full bg-white/10 h-2 rounded-none overflow-hidden mt-2 p-[1px]">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-rose-700 h-full rounded-none transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(promotorProgressPct === 0 ? 2 : promotorProgressPct, 2)}%` }}
                />
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>Registros confirmados</span>
                <span>{promotorAssignedGoal > 0 ? `Faltan ${promotorRemaining} para meta` : 'Meta no definida'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas de Campo */}
        <div className="bg-white border-b border-slate-200 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              Directorio de Ciudadanos Promovidos ({promovidosList.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsIneScannerOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escanear INE con Cámara</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuickCapture?.()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Capturar Promovido</span>
            </button>
          </div>
        </div>

        {/* Listado de Promovidos */}
        <div className="bg-white border-b border-slate-200 rounded-none overflow-hidden shadow-none">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, clave de elector, curp..."
                value={promotorSearch}
                onChange={(e) => setPromotorSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-none pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredPromovidos.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold">No se encontraron promovidos registrados.</p>
                <p className="text-xs text-slate-400 mt-1">Usa los botones superiores para registrar a un ciudadano.</p>
              </div>
            ) : (
              filteredPromovidos.map((promovido) => {
                const isModified = Boolean(promovido.updatedAt && promovido.updatedAt !== promovido.createdAt);
                const dateLabel = isModified ? 'Modificado:' : 'Registrado:';
                const rawDate = promovido.updatedAt || promovido.createdAt || '2026-10-03T12:00:00Z';
                let formattedDate = rawDate;
                try {
                  formattedDate = new Date(rawDate).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                } catch {
                  formattedDate = rawDate;
                }

                const cleanPhone = (promovido.phone || '').replace(/\D/g, '');

                return (
                  <div 
                    key={promovido.id} 
                    onClick={() => onViewCitizen?.(promovido.id)}
                    className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {promovido.name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          Clave: {promovido.electorKey || 'N/A'}
                        </span>
                        {promovido.validationStatus === 'sin_validacion' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-50 text-amber-800 border border-amber-300">
                            ⚠ No verificado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Validado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {dateLabel} {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {cleanPhone && (
                        <>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none flex items-center justify-center transition-all cursor-pointer"
                            title="Llamar"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://wa.me/52${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 text-[#25D366] border border-emerald-300 rounded-none flex items-center justify-center transition-all cursor-pointer"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        </>
                      )}

                      {onDeleteCitizen && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar a ${promovido.name}?`)) {
                              onDeleteCitizen(promovido.id);
                            }
                          }}
                          className="w-8 h-8 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-none flex items-center justify-center transition-all cursor-pointer"
                          title="Eliminar promovido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal de Escaneo con Cámara */}
      <INECameraScannerModal
        isOpen={isIneScannerOpen}
        onClose={() => setIsIneScannerOpen(false)}
        onDataExtracted={(extracted) => {
          setIsIneScannerOpen(false);
          onOpenQuickCapture?.(extracted);
        }}
      />
    </div>
  );
};
