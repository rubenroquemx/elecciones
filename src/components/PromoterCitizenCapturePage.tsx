import React, { useState, useMemo, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { 
  findElectorByKey, 
  validateElectorSection, 
  persistElectorProfile, 
  normalizeSectionNumber 
} from '../utils/electorRegistry';
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Save,
  X
} from 'lucide-react';
import { INECameraScannerModal } from './INECameraScannerModal';
import type { ExtractedINEData } from '../utils/ineScanner';

interface PromoterCitizenCapturePageProps {
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  allLeaders: TerritorialLeader[];
  onSaveCitizen: (newLeader: TerritorialLeader) => void;
  onNavigate: (nav: any) => void;
  defaultSectionNumber?: string;
}

export const PromoterCitizenCapturePage: React.FC<PromoterCitizenCapturePageProps> = ({
  currentUser,
  availableSections,
  allLeaders,
  onSaveCitizen,
  onNavigate,
  defaultSectionNumber,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const initialSection = useMemo(() => {
    if (defaultSectionNumber) return normalizeSectionNumber(defaultSectionNumber);
    if (currentUser?.assignedSections && currentUser.assignedSections.length > 0) {
      return normalizeSectionNumber(currentUser.assignedSections[0]);
    }
    const match = currentUser?.territoryName?.match(/\d{3,4}/);
    if (match) return normalizeSectionNumber(match[0]);
    return '0416';
  }, [defaultSectionNumber, currentUser]);

  const [electorKey, setElectorKey] = useState('');
  const [curp, setCurp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSection, setSelectedSection] = useState(initialSection);
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [notes, setNotes] = useState('');

  const sectionOptions = useMemo(() => {
    const norm = normalizeSectionNumber(selectedSection || initialSection);
    const exists = availableSections.some(s => s.sectionNumber === norm);
    if (!exists) {
      return [
        { id: `sec-${norm}`, sectionNumber: norm, municipio: 'Centro' },
        ...availableSections,
      ];
    }
    return availableSections;
  }, [availableSections, selectedSection, initialSection]);

  const handleDataExtracted = (data: ExtractedINEData) => {
    if (data.claveElector) setElectorKey(data.claveElector.toUpperCase());
    if (data.curp) setCurp(data.curp.toUpperCase());
    if (data.name) setName(data.name);
    if (data.address) setAddress(data.address);
    if (data.colonia) setColonia(data.colonia);
    if (data.electoralSection) {
      setSelectedSection(normalizeSectionNumber(data.electoralSection));
    }
    setFormError(null);
    setOcrNotice(`Datos INE detectados en dispositivo (${data.confidenceScore}% confianza)`);
  };

  const existingElector = useMemo(() => {
    if (electorKey.trim().length >= 6) {
      return findElectorByKey(electorKey.trim().toUpperCase(), allLeaders, availableSections);
    }
    return null;
  }, [electorKey, allLeaders, availableSections]);

  useEffect(() => {
    if (existingElector) {
      setName(prev => prev || existingElector.name);
      setCurp(prev => prev || (existingElector.curp || ''));
      setPhone(prev => prev || (existingElector.phone || ''));
      setAddress(prev => prev || (existingElector.address || ''));
      setColonia(prev => prev || (existingElector.colonia || ''));
      if (existingElector.electoralSection) {
        setSelectedSection(normalizeSectionNumber(existingElector.electoralSection));
      }
    }
  }, [existingElector]);

  const validation = useMemo(() => {
    if (!electorKey.trim() || electorKey.trim().length < 6) {
      return { allowed: true, errorMsg: undefined };
    }
    return validateElectorSection(
      electorKey.trim().toUpperCase(),
      selectedSection,
      allLeaders,
      availableSections
    );
  }, [electorKey, selectedSection, allLeaders, availableSections]);

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedKey = electorKey.trim().toUpperCase();
    const normalizedSec = normalizeSectionNumber(selectedSection || initialSection);

    if (!trimmedName) {
      setFormError('El nombre completo del ciudadano es obligatorio.');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 6) {
      setFormError('La Clave de Elector es obligatoria (mínimo 6 caracteres).');
      return;
    }
    if (!normalizedSec) {
      setFormError('Debe indicar la Sección Electoral.');
      return;
    }
    if (!validation.allowed) {
      setFormError(validation.errorMsg || 'No se puede registrar este ciudadano según las directrices.');
      return;
    }

    const newId = `field-promovido-${Date.now()}`;
    const newLeader: TerritorialLeader = {
      id: newId,
      name: trimmedName,
      role: 'Ciudadano Promovido',
      level: 'promovido',
      levelIndex: 5,
      parentId: currentUser?.leaderId || null,
      territoryName: `Sección ${normalizedSec} - ${colonia.trim() || 'Territorio'}`,
      address: address.trim(),
      colonia: colonia.trim(),
      electoralSection: normalizedSec,
      electorKey: trimmedKey,
      curp: curp.trim().toUpperCase() || undefined,
      phone: phone.trim() ? `+52 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : undefined,
      hasAccount: false,
      metaGoal: 1,
      currentCount: 1,
      status: 'completado',
      validationStatus: 'validado',
      notes: notes.trim() || `Registro de campo en Sección ${normalizedSec}.`,
    };

    persistElectorProfile({
      electorKey: trimmedKey,
      name: trimmedName,
      curp: curp.trim().toUpperCase() || undefined,
      address: address.trim(),
      colonia: colonia.trim(),
      electoralSection: normalizedSec,
      phone: newLeader.phone,
      structures: [
        {
          id: newId,
          structureName: `Célula Seccional ${normalizedSec}`,
          type: 'promovido',
          sectionNumber: normalizedSec,
          source: 'leader',
        },
      ],
    });

    onSaveCitizen(newLeader);
    onNavigate('escritorio');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white p-0">
      {/* Barra Superior con botón para volver y esquinas rectas */}
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
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Capturar Promovido</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-none font-bold">
                Sección {selectedSection}
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-none text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Escanear INE con Cámara</span>
          <span className="sm:hidden">Escanear INE</span>
        </button>
      </div>

      {/* Formulario en Página Limpia (Sin Márgenes Redondeados) */}
      <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
        {ocrNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-none text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ocrNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setOcrNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {!validation.allowed && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Bloqueo de Directriz:</strong> {validation.errorMsg}</span>
          </div>
        )}

        {existingElector && validation.allowed && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-none text-xs text-indigo-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Elector ya identificado:</strong> {existingElector.name}. Datos precargados en Sección {existingElector.electoralSection}.
            </span>
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
              placeholder="Nombre(s) y Apellidos tal como figuran en el INE"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Fila 3: Teléfono y Sección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Teléfono Celular (WhatsApp)*
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+52</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="993 123 4567"
                  className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                10 dígitos para comunicación directa
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Sección Electoral*
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
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Observaciones / Compromiso de Apoyo
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas de visita, apoyo comprometido, etc."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
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
              <span>Guardar Ciudadano Promovido</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Escáner INE con Cámara */}
      <INECameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDataExtracted={handleDataExtracted}
      />
    </div>
  );
};
