import React, { useState, useEffect } from 'react';
import type { SectionStructure, StructureType, ElectoralSection } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { 
  validateElectorSection, 
  persistElectorProfile, 
  normalizeSectionNumber,
  type ElectorProfile 
} from '../utils/electorRegistry';
import { 
  X, 
  Save, 
  Layers, 
  User, 
  Phone, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';

interface AddStructureToSectionModalProps {
  isOpen: boolean;
  sectionNumber: string;
  onClose: () => void;
  onSave: (structure: SectionStructure) => void;
  allLeaders?: TerritorialLeader[];
  allSections?: ElectoralSection[];
}

export const AddStructureToSectionModal: React.FC<AddStructureToSectionModalProps> = ({
  isOpen,
  sectionNumber,
  onClose,
  onSave,
  allLeaders = [],
  allSections = [],
}) => {
  const [electorKey, setElectorKey] = useState('');
  const [curp, setCurp] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<StructureType>('promocion');
  const [leaderName, setLeaderName] = useState('');
  const [leaderRole, setLeaderRole] = useState('Coordinador Seccional');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [metaGoal, setMetaGoal] = useState(500);
  const [currentCount, setCurrentCount] = useState(0);
  const [status, setStatus] = useState<'en_progreso' | 'completado' | 'critico'>('en_progreso');
  const [notes, setNotes] = useState('');

  // Validation alert & blocking state
  const [validationAlert, setValidationAlert] = useState<{
    type: 'error' | 'success';
    message: string;
    profile?: ElectorProfile;
  } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setElectorKey('');
      setCurp('');
      setName('');
      setType('promocion');
      setLeaderName('');
      setLeaderRole('Coordinador Seccional');
      setLeaderPhone('');
      setMetaGoal(500);
      setCurrentCount(0);
      setStatus('en_progreso');
      setNotes('');
      setValidationAlert(null);
      setIsBlocked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleElectorKeyChange = (val: string) => {
    const cleanKey = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
    setElectorKey(cleanKey);

    if (cleanKey.length >= 8) {
      const result = validateElectorSection(cleanKey, sectionNumber, allLeaders, allSections);
      if (!result.allowed) {
        setIsBlocked(true);
        setValidationAlert({
          type: 'error',
          message: result.errorMsg || 'Por directriz global, el usuario ya pertenece a otra sección electoral.',
          profile: result.existingProfile || undefined,
        });
      } else if (result.existingProfile) {
        setIsBlocked(false);
        setValidationAlert({
          type: 'success',
          message: `Integrante existente en esta Sección Electoral detectado ("${result.existingProfile.name}"). Sus datos han sido precargados automáticamente. Puede asignarlo a esta nueva estructura.`,
          profile: result.existingProfile,
        });
        // Preload fields if available
        if (result.existingProfile.name) setLeaderName(result.existingProfile.name);
        if (result.existingProfile.phone) setLeaderPhone(result.existingProfile.phone);
        if (result.existingProfile.curp) setCurp(result.existingProfile.curp);
      } else {
        setIsBlocked(false);
        setValidationAlert(null);
      }
    } else {
      setIsBlocked(false);
      setValidationAlert(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      alert('No se puede registrar este integrante: por directriz global, no puede pertenecer a más de una sección electoral.');
      return;
    }

    if (!electorKey.trim()) {
      alert('Por favor ingrese la Clave de Elector del responsable.');
      return;
    }

    if (!name.trim() || !leaderName.trim()) {
      alert('Por favor complete el nombre de la estructura y el responsable.');
      return;
    }

    const cleanKey = electorKey.trim().toUpperCase();
    const result = validateElectorSection(cleanKey, sectionNumber, allLeaders, allSections);
    if (!result.allowed) {
      setIsBlocked(true);
      setValidationAlert({
        type: 'error',
        message: result.errorMsg || 'No se puede registrar en esta sección.',
      });
      return;
    }

    const structId = `struct-${Date.now()}`;

    const newStruct: SectionStructure = {
      id: structId,
      name: name.trim(),
      type,
      leaderName: leaderName.trim(),
      leaderRole: leaderRole.trim(),
      leaderPhone: leaderPhone.trim() || undefined,
      electorKey: cleanKey,
      curp: curp.trim().toUpperCase() || undefined,
      electoralSection: normalizeSectionNumber(sectionNumber),
      metaGoal: Number(metaGoal) || 0,
      currentCount: Number(currentCount) || 0,
      status,
      notes: notes.trim() || undefined,
    };

    // Persist to unified elector registry
    persistElectorProfile({
      electorKey: cleanKey,
      name: leaderName.trim(),
      curp: curp.trim().toUpperCase() || undefined,
      phone: leaderPhone.trim() || undefined,
      electoralSection: normalizeSectionNumber(sectionNumber),
      structures: [{
        id: structId,
        structureName: name.trim(),
        type,
        sectionNumber: normalizeSectionNumber(sectionNumber),
        role: leaderRole.trim(),
        source: 'section_structure',
      }],
    });

    onSave(newStruct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Asignar Nueva Estructura Territorial
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Sección Electoral <span className="font-bold font-mono text-indigo-600">{sectionNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Validation Alert Banner */}
          {validationAlert && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 shadow-2xs ${
              validationAlert.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {validationAlert.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              )}
              <div className="space-y-0.5 text-xs">
                <p className="font-bold">
                  {validationAlert.type === 'error' ? 'Restricción de Sección Electoral' : 'Usuario Localizado'}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {validationAlert.message}
                </p>
              </div>
            </div>
          )}

          {/* CLAVE DE ELECTOR (Campo Clave) */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-slate-800 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Clave de Elector del Responsable *
              </span>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Campo Clave INE
              </span>
            </label>
            <input
              type="text"
              required
              maxLength={18}
              value={electorKey}
              onChange={(e) => handleElectorKeyChange(e.target.value)}
              placeholder="18 caracteres de la credencial para votar"
              className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs font-mono tracking-wider uppercase text-xs"
            />
            <p className="text-[10px] text-slate-500 italic">
              Si la persona ya está registrada en el sistema, se precargarán sus datos y se validará que no pertenezca a otra sección electoral.
            </p>
          </div>

          {/* Responsable Principal y CURP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Responsable Principal *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Ej. Lic. Fernando May Hernández"
                  className="w-full bg-white text-slate-800 pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                CURP
              </label>
              <input
                type="text"
                maxLength={18}
                value={curp}
                onChange={(e) => setCurp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="18 caracteres alfanuméricos"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs font-mono uppercase"
              />
            </div>
          </div>

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

          {/* Cargo y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  placeholder="+52 993 123 4567"
                  className="w-full bg-white text-slate-800 pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Meta, Avance y Estatus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Meta de Estructura
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
                Avance Actual
              </label>
              <input
                type="number"
                min="0"
                value={currentCount}
                onChange={(e) => setCurrentCount(Number(e.target.value))}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Estatus
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="en_progreso">En avance</option>
                <option value="completado">Cumplido</option>
                <option value="critico">Rezago crítico</option>
              </select>
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
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBlocked}
              className={`px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                isBlocked
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
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

