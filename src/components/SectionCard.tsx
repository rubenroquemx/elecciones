import React, { useState } from 'react';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import { SectionMapThumbnail } from './SectionMapThumbnail';
import { 
  PlusCircle, 
  Network, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';

interface SectionCardProps {
  section: ElectoralSection;
  onAddStructure: (sectionId: string) => void;
  onSelectStructureToViewTree: (structure: SectionStructure, section: ElectoralSection) => void;
  onEditSection: (section: ElectoralSection) => void;
  onDeleteSection?: (sectionId: string) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  onAddStructure,
  onSelectStructureToViewTree,
  onEditSection,
}) => {
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    section.structures[0]?.id || ''
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const activeStructure = section.structures.find(s => s.id === selectedStructureId) || section.structures[0];

  // Calculations for total section goal and current achieved
  const totalPromovidos = section.structures
    .filter(s => s.type === 'promocion' || s.type === 'general')
    .reduce((sum, s) => sum + s.currentCount, 0);

  const nominalPenetrationPct = section.nominalList > 0 
    ? Math.min(100, Math.round((totalPromovidos / section.nominalList) * 100))
    : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Map Thumbnail & Header Area */}
      <div className="p-4 pb-2">
        <SectionMapThumbnail
          polygon={section.polygon}
          bbox={section.bbox}
          center={section.center}
          sectionNumber={section.sectionNumber}
          municipio={section.municipio}
          height={145}
        />

        {/* Section Identification Title & Badges */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Sección {section.sectionNumber}
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                section.tipo === 'Urbana' 
                  ? 'bg-sky-50 text-sky-700 border-sky-200' 
                  : section.tipo === 'Rural'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {section.tipo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {section.municipio} • {section.distritoLocal}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onEditSection(section)}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-md transition-colors"
            title="Editar datos de sección"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Numerical Indicators */}
      <div className="px-4 py-2.5 grid grid-cols-3 gap-2 bg-slate-50 border-y border-slate-100 text-center">
        <div>
          <span className="text-[10px] text-slate-500 font-medium block">Lista Nominal</span>
          <span className="text-xs font-bold text-slate-900 block">
            {section.nominalList.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-medium block">Promovidos</span>
          <span className="text-xs font-bold text-sky-700 block">
            {totalPromovidos.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-medium block">Penetración</span>
          <span className="text-xs font-bold text-emerald-600 block">
            {nominalPenetrationPct}%
          </span>
        </div>
      </div>

      {/* Multi-Structure Tabs Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Estructuras en Sección ({section.structures.length})
            </span>
            <button
              type="button"
              onClick={() => onAddStructure(section.id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nueva Estructura</span>
            </button>
          </div>

          {section.structures.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
              <p className="text-xs text-slate-500">No hay estructuras asignadas a esta sección.</p>
              <button
                type="button"
                onClick={() => onAddStructure(section.id)}
                className="mt-2 text-xs font-semibold text-sky-600 hover:underline inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Dar de alta la primera estructura
              </button>
            </div>
          ) : (
            <>
              {/* Structure Tabs / Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5">
                {section.structures.map(struct => {
                  const isSelected = struct.id === activeStructure?.id;
                  return (
                    <button
                      key={struct.id}
                      type="button"
                      onClick={() => setSelectedStructureId(struct.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {struct.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Structure Detail Box */}
              {activeStructure && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {activeStructure.leaderName}
                        </span>
                        {activeStructure.type === 'defensa_casilla' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            Casilla
                          </span>
                        )}
                        {activeStructure.type === 'promocion' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                            Promoción
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {activeStructure.leaderRole}
                      </p>
                    </div>

                    {/* Status badge */}
                    {activeStructure.status === 'completado' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Logrado
                      </span>
                    )}
                    {activeStructure.status === 'en_progreso' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        <Clock className="w-3 h-3" /> En avance
                      </span>
                    )}
                    {activeStructure.status === 'critico' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        <AlertCircle className="w-3 h-3" /> Rezago
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const pct = activeStructure.metaGoal > 0 
                      ? Math.min(100, Math.round((activeStructure.currentCount / activeStructure.metaGoal) * 100))
                      : 0;

                    return (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Meta de Estructura:</span>
                          <span className="font-bold text-slate-800">
                            {activeStructure.currentCount} / {activeStructure.metaGoal}{' '}
                            <span className="text-sky-600 ml-0.5 font-extrabold">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 100 ? 'bg-emerald-500' : pct < 30 ? 'bg-rose-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Contact button if phone exists */}
                  {activeStructure.leaderPhone && (
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {activeStructure.leaderPhone}
                      </span>
                      <a
                        href={`https://wa.me/${activeStructure.leaderPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    </div>
                  )}

                  {/* Button to explore hierarchy of this structure */}
                  <button
                    type="button"
                    onClick={() => onSelectStructureToViewTree(activeStructure, section)}
                    className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-slate-100 text-sky-700 hover:text-sky-800 rounded-lg text-xs font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs group"
                  >
                    <Network className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                    <span>Abrir Organigrama Piramidal de esta Estructura</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section Notes / Observations Toggle */}
        {section.notes && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-[11px] text-slate-500 hover:text-slate-800"
            >
              <span className="flex items-center gap-1 font-medium">
                <FileText className="w-3 h-3 text-slate-400" />
                Notas operativas de casilla
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {isExpanded && (
              <p className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80 leading-relaxed">
                {section.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
