import React, { useState, useMemo, useEffect } from 'react';
import type { TerritorialLeader, LeaderChangelogEntry } from '../types/territory';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
import { 
  validateElectorSection, 
  persistElectorProfile, 
  normalizeSectionNumber 
} from '../utils/electorRegistry';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';

interface PromoterCitizenEditPageProps {
  citizenId: string;
  allLeaders: TerritorialLeader[];
  availableSections: ElectoralSection[];
  onSaveCitizen: (updatedLeader: TerritorialLeader) => void;
  onDeleteCitizen?: (citizenId: string) => void;
  onNavigate: (nav: MainNavSection) => void;
}

export const PromoterCitizenEditPage: React.FC<PromoterCitizenEditPageProps> = ({
  citizenId,
  allLeaders,
  availableSections,
  onSaveCitizen,
  onDeleteCitizen,
  onNavigate,
}) => {
  const citizen = allLeaders.find(l => l.id === citizenId);

  const [name, setName] = useState(citizen?.name || '');
  const [electorKey, setElectorKey] = useState(citizen?.electorKey || '');
  const [curp, setCurp] = useState(citizen?.curp || '');
  const [phone, setPhone] = useState(
    citizen?.phone ? citizen.phone.replace(/\D/g, '').slice(-10) : ''
  );
  const [selectedSection, setSelectedSection] = useState(
    citizen?.electoralSection ? normalizeSectionNumber(citizen.electoralSection) : '0416'
  );
  const [address, setAddress] = useState(citizen?.address || '');
  const [colonia, setColonia] = useState(citizen?.colonia || '');
  const [notes, setNotes] = useState(citizen?.notes || '');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (citizen) {
      setName(citizen.name || '');
      setElectorKey(citizen.electorKey || '');
      setCurp(citizen.curp || '');
      setPhone(citizen.phone ? citizen.phone.replace(/\D/g, '').slice(-10) : '');
      setSelectedSection(citizen.electoralSection ? normalizeSectionNumber(citizen.electoralSection) : '0416');
      setAddress(citizen.address || '');
      setColonia(citizen.colonia || '');
      setNotes(citizen.notes || '');
    }
  }, [citizen]);

  const sectionOptions = useMemo(() => {
    const norm = normalizeSectionNumber(selectedSection);
    const exists = availableSections.some(s => s.sectionNumber === norm);
    if (!exists) {
      return [
        { id: `sec-${norm}`, sectionNumber: norm, municipio: 'Centro' },
        ...availableSections,
      ];
    }
    return availableSections;
  }, [availableSections, selectedSection]);

  const validation = useMemo(() => {
    if (!electorKey.trim() || electorKey.trim().length < 6) {
      return { allowed: true, errorMsg: undefined };
    }
    // Filter out current citizen when checking uniqueness
    const otherLeaders = allLeaders.filter(l => l.id !== citizenId);
    return validateElectorSection(
      electorKey.trim().toUpperCase(),
      selectedSection,
      otherLeaders,
      availableSections
    );
  }, [electorKey, selectedSection, allLeaders, availableSections, citizenId]);

  if (!citizen) {
    return (
      <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-4 text-center py-16">
          <p className="text-slate-500 font-semibold text-sm">No se encontró el registro a editar.</p>
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="px-5 py-2 bg-slate-900 text-white rounded-none text-xs font-bold transition-colors cursor-pointer"
          >
            ← Volver al Escritorio
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedKey = electorKey.trim().toUpperCase();
    const normalizedSec = normalizeSectionNumber(selectedSection);

    if (!trimmedName) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 6) {
      setFormError('La Clave de Elector debe tener al menos 6 caracteres.');
      return;
    }
    if (!normalizedSec) {
      setFormError('La Sección Electoral es obligatoria.');
      return;
    }
    if (!validation.allowed) {
      setFormError(validation.errorMsg || 'No se puede registrar en esta sección según las directrices.');
      return;
    }

    const nowIso = new Date().toISOString();
    const changelogEntry: LeaderChangelogEntry = {
      id: `cl-${Date.now()}`,
      timestamp: nowIso,
      action: 'edicion',
      description: `Actualización de expediente en Sección ${normalizedSec}`,
      userName: 'Promotor Territorial',
    };

    const updatedLeader: TerritorialLeader = {
      ...citizen,
      name: trimmedName.toUpperCase(),
      electorKey: trimmedKey.toUpperCase(),
      curp: curp.trim().toUpperCase() || undefined,
      phone: phone.trim() ? `+52 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : undefined,
      electoralSection: normalizedSec,
      territoryName: `Sección ${normalizedSec} - ${colonia.trim().toUpperCase() || 'TERRITORIO'}`,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      notes: notes.trim().toUpperCase(),
      updatedAt: nowIso,
      changelog: [...(citizen.changelog || []), changelogEntry],
    };

    persistElectorProfile({
      electorKey: trimmedKey.toUpperCase(),
      name: trimmedName.toUpperCase(),
      curp: curp.trim().toUpperCase() || undefined,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: normalizedSec,
      phone: updatedLeader.phone,
      structures: [
        {
          id: citizen.id,
          structureName: `Célula Seccional ${normalizedSec}`,
          type: 'promovido',
          sectionNumber: normalizedSec,
          source: 'leader',
        },
      ],
    });

    onSaveCitizen(updatedLeader);
    onNavigate('escritorio');
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar a ${citizen.name} de tus promovidos registrados?`)) {
      onDeleteCitizen?.(citizen.id);
      onNavigate('escritorio');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white p-0">
      {/* Barra de Encabezado Superior con esquinas rectas */}
      <div className="bg-slate-900 text-white px-5 sm:px-8 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-none transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-700" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Editar Ciudadano Promovido</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-none font-bold">
                {citizen.name}
              </span>
            </h1>
          </div>
        </div>

        {onDeleteCitizen && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded-none text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eliminar Promovido</span>
          </button>
        )}
      </div>

      {/* Formulario en Página Limpia (Sin Bordes Redondeados) */}
      <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {!validation.allowed && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Bloqueo de Validación:</strong> {validation.errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 border border-slate-200 bg-white p-6 sm:p-8 rounded-none shadow-none">
          {/* Fila 1: Clave de Elector y CURP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Clave de Elector INE (18 caracteres)*
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={electorKey}
                onChange={e => {
                  setElectorKey(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="ABCD123456EFGH7890"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                {electorKey.length}/18 caracteres
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                CURP (18 caracteres)
              </label>
              <input
                type="text"
                maxLength={18}
                value={curp}
                onChange={e => {
                  setCurp(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="ABCD123456HDFRRN01"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                {curp.length}/18 caracteres • Opcional
              </span>
            </div>
          </div>

          {/* Fila 2: Nombre Completo */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Nombre Completo del Ciudadano*
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setName(e.target.value);
                setFormError(null);
              }}
              placeholder="Nombre(s) y Apellidos"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Fila 3: Teléfono y Sección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Teléfono Móvil (WhatsApp)*
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+52</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(digits);
                    setFormError(null);
                  }}
                  placeholder="993 123 4567"
                  className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                10 dígitos
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Sección Electoral Asignada*
              </label>
              <select
                value={selectedSection}
                onChange={e => {
                  setSelectedSection(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                {sectionOptions.map(s => (
                  <option key={s.id} value={s.sectionNumber}>
                    Sección {s.sectionNumber} ({s.municipio || 'Centro'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 4: Domicilio y Colonia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Calle y Número
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Calle, No. Exterior e Interior"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Colonia o Localidad
              </label>
              <input
                type="text"
                value={colonia}
                onChange={e => setColonia(e.target.value)}
                placeholder="Colonia, Fraccionamiento o Barrio"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Observaciones de Campo
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas y compromisos adquiridos"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Botones de Guardar y Cancelar */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('escritorio')}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!validation.allowed || !name.trim() || electorKey.length < 6}
              className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-none shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
