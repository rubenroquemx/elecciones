import React, { useState } from 'react';
import type { SectionStructure, StructureType } from '../types/sections';
import { X, Save, Layers } from 'lucide-react';

interface AddStructureToSectionModalProps {
  isOpen: boolean;
  sectionNumber: string;
  onClose: () => void;
  onSave: (structure: SectionStructure) => void;
}

export const AddStructureToSectionModal: React.FC<AddStructureToSectionModalProps> = ({
  isOpen,
  sectionNumber,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<StructureType>('promocion');
  const [leaderName, setLeaderName] = useState('');
  const [leaderRole, setLeaderRole] = useState('Coordinador Seccional');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [metaGoal, setMetaGoal] = useState(500);
  const [currentCount, setCurrentCount] = useState(0);
  const [status, setStatus] = useState<'en_progreso' | 'completado' | 'critico'>('en_progreso');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leaderName.trim()) {
      alert('Por favor complete el nombre de la estructura y el responsable.');
      return;
    }

    const newStruct: SectionStructure = {
      id: `struct-${Date.now()}`,
      name: name.trim(),
      type,
      leaderName: leaderName.trim(),
      leaderRole: leaderRole.trim(),
      leaderPhone: leaderPhone.trim() || undefined,
      metaGoal: Number(metaGoal) || 0,
      currentCount: Number(currentCount) || 0,
      status,
      notes: notes.trim() || undefined,
    };

    onSave(newStruct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Asignar Nueva Estructura Territorial
              </h3>
              <p className="text-[11px] text-slate-500">
                Sección Electoral {sectionNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Nombre y Tipo de Estructura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nombre de la Estructura *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Promoción y Defensa del Voto"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tipo Operativo
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newT = e.target.value as StructureType;
                  setType(newT);
                  if (newT === 'defensa_casilla') {
                    setLeaderRole('Responsable General de Casilla (RG)');
                    setMetaGoal(8);
                  } else if (newT === 'sectorial') {
                    setLeaderRole('Enlace Sectorial Seccional');
                  } else {
                    setLeaderRole('Coordinador Seccional de Promoción');
                  }
                }}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="promocion">Promoción del Voto</option>
                <option value="defensa_casilla">Defensa del Voto (Casilla / RCs)</option>
                <option value="sectorial">Sectorial / Juvenil / Magisterial</option>
                <option value="general">Estructura General</option>
              </select>
            </div>
          </div>

          {/* Responsable y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Responsable Principal *
              </label>
              <input
                type="text"
                required
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="Ej. Lic. Fernando May Hernández"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Cargo Operativo
              </label>
              <input
                type="text"
                value={leaderRole}
                onChange={(e) => setLeaderRole(e.target.value)}
                placeholder="Ej. Coordinador Seccional"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Teléfono y Estatus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={leaderPhone}
                onChange={(e) => setLeaderPhone(e.target.value)}
                placeholder="+52 993 123 4567"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Estatus de Despliegue
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="en_progreso">En avance regular</option>
                <option value="completado">Meta cumplida</option>
                <option value="critico">Rezago crítico</option>
              </select>
            </div>
          </div>

          {/* Meta y Avance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Meta de Estructura (Personas / Casillas)
              </label>
              <input
                type="number"
                min="0"
                value={metaGoal}
                onChange={(e) => setMetaGoal(Number(e.target.value))}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Avance Actual Reportado
              </label>
              <input
                type="number"
                min="0"
                value={currentCount}
                onChange={(e) => setCurrentCount(Number(e.target.value))}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre cobertura de casillas o asignación de promotores..."
              className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Estructura</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
