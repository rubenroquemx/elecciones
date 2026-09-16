import React, { useState, useEffect } from 'react';
import type { ElectoralSection } from '../types/sections';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import { X, Save, MapPin, Search, CheckCircle2 } from 'lucide-react';

interface CreateSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: ElectoralSection) => void;
  editingSection: ElectoralSection | null;
}

export const CreateSectionModal: React.FC<CreateSectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSection,
}) => {
  const [sectionNumber, setSectionNumber] = useState('');
  const [municipio, setMunicipio] = useState('Centro');
  const [municipioId, setMunicipioId] = useState('4');
  const [distritoLocal, setDistritoLocal] = useState('Distrito 6');
  const [tipo, setTipo] = useState<'Urbana' | 'Rural' | 'Mixta'>('Urbana');
  const [nominalList, setNominalList] = useState(2500);
  const [targetGoal, setTargetGoal] = useState(1000);
  const [notes, setNotes] = useState('');
  const [hasOfficialCartography, setHasOfficialCartography] = useState(false);

  useEffect(() => {
    if (editingSection) {
      setSectionNumber(editingSection.sectionNumber);
      setMunicipio(editingSection.municipio);
      setMunicipioId(editingSection.municipioId);
      setDistritoLocal(editingSection.distritoLocal);
      setTipo(editingSection.tipo);
      setNominalList(editingSection.nominalList);
      setTargetGoal(editingSection.targetGoal);
      setNotes(editingSection.notes || '');
      setHasOfficialCartography(editingSection.polygon.length > 0);
    } else {
      setSectionNumber('');
      setMunicipio('Centro');
      setMunicipioId('4');
      setDistritoLocal('Distrito 6');
      setTipo('Urbana');
      setNominalList(2500);
      setTargetGoal(1000);
      setNotes('');
      setHasOfficialCartography(false);
    }
  }, [editingSection, isOpen]);

  if (!isOpen) return null;

  // Handle autocomplete when user types or changes the section number
  const handleSectionNumberChange = (rawVal: string) => {
    const padded = rawVal.trim().padStart(rawVal.trim().length > 0 ? 4 : 0, '0');
    setSectionNumber(rawVal);

    // Look up in INE cartography
    const carto = CARTOGRAPHY_BY_SECTION.get(padded) || CARTOGRAPHY_BY_SECTION.get(rawVal.trim());
    if (carto) {
      setMunicipio(carto.municipio);
      setMunicipioId(carto.municipioId);
      setDistritoLocal(carto.distritoLocal || 'Distrito 1');
      setTipo(carto.tipo);
      setHasOfficialCartography(true);
    } else {
      setHasOfficialCartography(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = sectionNumber.trim().padStart(4, '0');
    if (!cleanNum || cleanNum === '0000') {
      alert('Por favor ingrese un número de sección válido.');
      return;
    }

    const carto = CARTOGRAPHY_BY_SECTION.get(cleanNum);

    const newSection: ElectoralSection = {
      id: editingSection?.id || `sec-${cleanNum}`,
      sectionNumber: cleanNum,
      municipio,
      municipioId,
      distritoLocal,
      tipo,
      nominalList: Number(nominalList) || 0,
      targetGoal: Number(targetGoal) || 0,
      structures: editingSection?.structures || [],
      center: carto?.center || editingSection?.center || [-92.93, 17.98],
      bbox: carto?.bbox || editingSection?.bbox || [-93.0, 17.9, -92.8, 18.0],
      polygon: carto?.polygon || editingSection?.polygon || [],
      notes: notes.trim() || undefined,
    };

    onSave(newSection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {editingSection ? 'Modificar Sección Electoral' : 'Dar de Alta Sección Electoral'}
            </h3>
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
          {/* Section Number with INE Cartography detector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
              <span>Número de Sección Electoral (INE) *</span>
              {hasOfficialCartography && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cartografía INE vinculada
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={4}
                value={sectionNumber}
                onChange={(e) => handleSectionNumberChange(e.target.value)}
                placeholder="Ej. 0234, 0550, 1131"
                className="w-full bg-white text-slate-900 px-3 py-2 pl-8 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 font-mono text-sm font-bold shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Al escribir el número, se enlazará automáticamente con el polígono del mapa oficial de Tabasco.
            </p>
          </div>

          {/* Municipio y Distrito Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Municipio de Tabasco *
              </label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="Balancán">Balancán</option>
                <option value="Cárdenas">Cárdenas</option>
                <option value="Centla">Centla</option>
                <option value="Centro">Centro (Villahermosa)</option>
                <option value="Comalcalco">Comalcalco</option>
                <option value="Cunduacán">Cunduacán</option>
                <option value="Emiliano Zapata">Emiliano Zapata</option>
                <option value="Huimanguillo">Huimanguillo</option>
                <option value="Jalapa">Jalapa</option>
                <option value="Jalpa de Méndez">Jalpa de Méndez</option>
                <option value="Jonuta">Jonuta</option>
                <option value="Macuspana">Macuspana</option>
                <option value="Nacajuca">Nacajuca</option>
                <option value="Paraíso">Paraíso</option>
                <option value="Tacotalpa">Tacotalpa</option>
                <option value="Teapa">Teapa</option>
                <option value="Tenosique">Tenosique</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Distrito Electoral Local *
              </label>
              <input
                type="text"
                required
                value={distritoLocal}
                onChange={(e) => setDistritoLocal(e.target.value)}
                placeholder="Ej. Distrito 6"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Tipo de Sección, Lista Nominal y Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tipo de Sección
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="Urbana">Urbana</option>
                <option value="Rural">Rural</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Lista Nominal (Electores)
              </label>
              <input
                type="number"
                min="0"
                value={nominalList}
                onChange={(e) => setNominalList(Number(e.target.value))}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Meta de Penetración
              </label>
              <input
                type="number"
                min="0"
                value={targetGoal}
                onChange={(e) => setTargetGoal(Number(e.target.value))}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Notas u Observaciones de la Casilla / Territorio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ubicación de casillas, escuelas, particularidades operativas..."
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Sección</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
