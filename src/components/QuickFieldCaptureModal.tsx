import React, { useState, useMemo, useEffect } from 'react';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { 
  findElectorByKey, 
  validateElectorSection, 
  persistElectorProfile, 
  normalizeSectionNumber 
} from '../utils/electorRegistry';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Send,
  UserCheck,
  UserPlus
} from 'lucide-react';

interface QuickFieldCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSections: ElectoralSection[];
  allLeaders: TerritorialLeader[];
  currentUserLeaderId?: string | null;
  onSuccess: (newLeader: TerritorialLeader) => void;
  defaultSectionNumber?: string;
}

export const QuickFieldCaptureModal: React.FC<QuickFieldCaptureModalProps> = ({
  isOpen,
  onClose,
  availableSections,
  allLeaders,
  currentUserLeaderId,
  onSuccess,
  defaultSectionNumber,
}) => {
  const [electorKey, setElectorKey] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSection, setSelectedSection] = useState(defaultSectionNumber || '0416');
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [roleType, setRoleType] = useState<'promovido' | 'promotor' | 'representante'>('promovido');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [registeredContact, setRegisteredContact] = useState<{ name: string; phone: string; section: string } | null>(null);

  // Set default section when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultSectionNumber) {
        setSelectedSection(normalizeSectionNumber(defaultSectionNumber));
      } else if (availableSections.length > 0) {
        setSelectedSection(availableSections[0].sectionNumber);
      }
      setElectorKey('');
      setName('');
      setPhone('');
      setAddress('');
      setColonia('');
      setRoleType('promovido');
      setIsSubmittedSuccess(false);
      setRegisteredContact(null);
    }
  }, [isOpen, defaultSectionNumber, availableSections]);

  // Elector uniqueness validation
  const existingElector = useMemo(() => {
    if (electorKey.trim().length >= 6) {
      return findElectorByKey(electorKey.trim().toUpperCase(), allLeaders, availableSections);
    }
    return null;
  }, [electorKey, allLeaders, availableSections]);

  // Autocomplete if existing
  useEffect(() => {
    if (existingElector) {
      setName(prev => prev || existingElector.name);
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
    // Only digits, max 10
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const cleanPhoneDigits = (phone || '').replace(/\D/g, '');

  // WhatsApp quick greeting link
  const whatsappUrl = useMemo(() => {
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) return null;
    const greeting = encodeURIComponent(
      `Hola ${name.trim() || 'compañero(a)'}, te saluda la Coordinación Territorial de la Sección ${selectedSection}. Muchas gracias por sumarte a nuestro proyecto territorial 2027. ¡Estamos en contacto!`
    );
    return `https://wa.me/52${cleanPhoneDigits}?text=${greeting}`;
  }, [cleanPhoneDigits, name, selectedSection]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !electorKey.trim() || !selectedSection || !validation.allowed) {
      return;
    }

    const newId = `field-${roleType}-${Date.now()}`;
    const levelIndex = roleType === 'promovido' ? 5 : roleType === 'promotor' ? 4 : 4;

    const newLeader: TerritorialLeader = {
      id: newId,
      name: name.trim(),
      role: roleType === 'promovido' ? 'Ciudadano Promovido' : roleType === 'promotor' ? 'Promotor Territorial' : 'Representante de Casilla',
      level: roleType === 'promovido' ? 'promovido' : 'promotor',
      levelIndex,
      parentId: currentUserLeaderId || null,
      territoryName: `Sección ${selectedSection} - ${colonia.trim() || 'Territorio'}`,
      address: address.trim(),
      colonia: colonia.trim(),
      electoralSection: normalizeSectionNumber(selectedSection),
      electorKey: electorKey.trim().toUpperCase(),
      phone: phone.trim() ? `+52 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : undefined,
      hasAccount: false,
      metaGoal: roleType === 'promovido' ? 1 : 25,
      currentCount: roleType === 'promovido' ? 1 : 0,
      status: 'completado',
      validationStatus: 'validado',
      notes: `Registro ágil de campo (Captura Móvil) en Sección ${selectedSection}.`,
    };

    // Persist in elector registry
    persistElectorProfile({
      electorKey: electorKey.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim(),
      colonia: colonia.trim(),
      electoralSection: normalizeSectionNumber(selectedSection),
      phone: newLeader.phone,
      structures: [
        {
          id: newId,
          structureName: `Célula Seccional ${selectedSection}`,
          type: roleType,
          sectionNumber: selectedSection,
          source: 'leader',
        },
      ],
    });

    onSuccess(newLeader);
    setRegisteredContact({
      name: name.trim(),
      phone: cleanPhoneDigits,
      section: selectedSection,
    });
    setIsSubmittedSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con gradiente institucional */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Captura Rápida de Campo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  Móvil
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Registro acelerado para brigadistas y coordinadores en territorio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen after registration with WhatsApp Action */}
        {isSubmittedSuccess && registeredContact ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                ¡Registro Guardado Exitosamente!
              </h4>
              <p className="text-xs text-slate-500">
                <strong>{registeredContact.name}</strong> ha quedado asignado(a) formalmente a la <strong>Sección {registeredContact.section}</strong>.
              </p>
            </div>

            {/* Direct WhatsApp Action Button */}
            {registeredContact.phone && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-emerald-900 block flex items-center justify-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Enviar Bienvenida Institucional por WhatsApp
                </span>
                <a
                  href={whatsappUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir Chat de WhatsApp (+52 {registeredContact.phone})</span>
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSubmittedSuccess(false);
                  setElectorKey('');
                  setName('');
                  setPhone('');
                  setAddress('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                + Capturar Otro Registro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Finalizar
              </button>
            </div>
          </div>
        ) : (
          /* Main Quick Form */
          <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4">
            
            {/* Directriz Global Elector Banner */}
            {!validation.allowed && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Directriz Global Bloqueada:</strong> {validation.errorMsg}
                </div>
              </div>
            )}

            {existingElector && validation.allowed && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Integrante identificado:</strong> {existingElector.name}. Datos precargados en Sección {existingElector.electoralSection}.
                </span>
              </div>
            )}

            {/* 1. Clave de Elector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clave de Elector INE (18 caracteres)*
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={electorKey}
                onChange={e => setElectorKey(e.target.value.toUpperCase())}
                placeholder="ABCD123456EFGH7890"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wider"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {electorKey.length}/18 caracteres • Llave primaria universal del ciudadano
              </span>
            </div>

            {/* 2. Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo del Ciudadano*
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre(s) y Apellidos"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 3. Teléfono / WhatsApp y Sección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono Móvil (WhatsApp)*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+52</span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="993 123 4567"
                    className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  10 dígitos sin espacios
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sección Electoral Asignada*
                </label>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {availableSections.map(s => (
                    <option key={s.id} value={s.sectionNumber}>
                      Sección {s.sectionNumber} ({s.municipio})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Domicilio y Colonia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección (Calle y No.)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Calle, No. Exterior e Interior"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colonia o Localidad
                </label>
                <input
                  type="text"
                  value={colonia}
                  onChange={e => setColonia(e.target.value)}
                  placeholder="Colonia, Fraccionamiento o Ejido"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 5. Rol en la Célula */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tipo de Integración Territorial
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleType('promovido')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    roleType === 'promovido'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Ciudadano Promovido
                </button>
                <button
                  type="button"
                  onClick={() => setRoleType('promotor')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    roleType === 'promotor'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Promotor Territorial
                </button>
                <button
                  type="button"
                  onClick={() => setRoleType('representante')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    roleType === 'representante'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Representante Casilla
                </button>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!validation.allowed || !name.trim() || electorKey.length < 6}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar en Campo</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
