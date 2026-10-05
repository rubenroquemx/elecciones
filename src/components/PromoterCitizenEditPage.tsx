import React, { useState, useMemo, useEffect } from 'react';
import type { TerritorialLeader, LeaderChangelogEntry, LeaderFieldChange } from '../types/territory';
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
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Phone,
  MapPin,
  Clock,
  FileText
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
  const [postalCode, setPostalCode] = useState(citizen?.postalCode || '');
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
      setPostalCode(citizen.postalCode || '');
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
    const changes: LeaderFieldChange[] = [];

    const normName = trimmedName.toUpperCase();
    if (normName !== (citizen.name || '').trim().toUpperCase()) {
      changes.push({
        field: 'name',
        label: 'Nombre Completo',
        oldValue: citizen.name || '(Sin dato)',
        newValue: normName,
      });
    }

    const normKey = trimmedKey.toUpperCase();
    if (normKey !== (citizen.electorKey || '').trim().toUpperCase()) {
      changes.push({
        field: 'electorKey',
        label: 'Clave de Elector',
        oldValue: citizen.electorKey || '(Sin dato)',
        newValue: normKey,
      });
    }

    const normCurp = curp.trim().toUpperCase();
    const oldCurp = (citizen.curp || '').trim().toUpperCase();
    if (normCurp !== oldCurp) {
      changes.push({
        field: 'curp',
        label: 'CURP',
        oldValue: oldCurp || '(Sin dato)',
        newValue: normCurp || '(Sin dato)',
      });
    }

    const newPhoneDigits = phone.replace(/\D/g, '').slice(-10);
    const oldPhoneDigits = citizen.phone ? citizen.phone.replace(/\D/g, '').slice(-10) : '';
    if (newPhoneDigits !== oldPhoneDigits) {
      changes.push({
        field: 'phone',
        label: 'Teléfono Celular',
        oldValue: citizen.phone || '(Sin dato)',
        newValue: newPhoneDigits ? `+52 ${newPhoneDigits.slice(0, 3)} ${newPhoneDigits.slice(3, 6)} ${newPhoneDigits.slice(6)}` : '(Sin dato)',
      });
    }

    const oldSec = citizen.electoralSection ? normalizeSectionNumber(citizen.electoralSection) : '';
    if (normalizedSec !== oldSec) {
      changes.push({
        field: 'electoralSection',
        label: 'Sección Electoral',
        oldValue: oldSec ? `Sección ${oldSec}` : '(Sin dato)',
        newValue: `Sección ${normalizedSec}`,
      });
    }

    const normAddress = address.trim().toUpperCase();
    const oldAddress = (citizen.address || '').trim().toUpperCase();
    if (normAddress !== oldAddress) {
      changes.push({
        field: 'address',
        label: 'Calle y Número',
        oldValue: oldAddress || '(Sin dato)',
        newValue: normAddress || '(Sin dato)',
      });
    }

    const normColonia = colonia.trim().toUpperCase();
    const oldColonia = (citizen.colonia || '').trim().toUpperCase();
    if (normColonia !== oldColonia) {
      changes.push({
        field: 'colonia',
        label: 'Colonia / Localidad',
        oldValue: oldColonia || '(Sin dato)',
        newValue: normColonia || '(Sin dato)',
      });
    }

    const normNotes = notes.trim().toUpperCase();
    const oldNotes = (citizen.notes || '').trim().toUpperCase();
    if (normNotes !== oldNotes) {
      changes.push({
        field: 'notes',
        label: 'Observaciones',
        oldValue: oldNotes || '(Sin dato)',
        newValue: normNotes || '(Sin dato)',
      });
    }

    const changeDescription = changes.length > 0
      ? `Modificó: ${changes.map(c => c.label).join(', ')}`
      : 'Actualización y confirmación de datos sin cambios de campo';

    const changelogEntry: LeaderChangelogEntry = {
      id: `cl-${Date.now()}`,
      timestamp: nowIso,
      action: 'edicion',
      description: changeDescription,
      userName: 'Promotor Territorial',
      changes: changes.length > 0 ? changes : undefined,
    };

    const updatedLeader: TerritorialLeader = {
      ...citizen,
      name: normName,
      electorKey: normKey,
      curp: normCurp || undefined,
      phone: newPhoneDigits ? `+52 ${newPhoneDigits.slice(0, 3)} ${newPhoneDigits.slice(3, 6)} ${newPhoneDigits.slice(6)}` : undefined,
      electoralSection: normalizedSec,
      territoryName: `Sección ${normalizedSec} - ${normColonia || 'TERRITORIO'}`,
      address: normAddress,
      colonia: normColonia,
      postalCode: postalCode.trim() || undefined,
      notes: normNotes,
      updatedAt: nowIso,
      changelog: [changelogEntry, ...(citizen.changelog || [])],
    };

    persistElectorProfile({
      electorKey: trimmedKey.toUpperCase(),
      name: trimmedName.toUpperCase(),
      curp: curp.trim().toUpperCase() || undefined,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      postalCode: postalCode.trim() || undefined,
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
      {/* Barra de Encabezado Superior con esquinas rectas en una sola línea idéntica a visualización (sin Llamar ni WhatsApp) */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('ver-promovido')}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
          title="Volver al expediente"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Acciones de Edición: Eliminar (opcional) y Guardar Cambios */}
        <div className="flex items-center gap-2">
          {onDeleteCitizen && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-9 h-9 flex items-center justify-center bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded-none transition-colors cursor-pointer"
              title="Eliminar Promovido"
              aria-label="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            form="edit-promovido-form"
            disabled={!validation.allowed || !name.trim() || electorKey.length < 6}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-none"
            title="Guardar Cambios"
          >
            <Save className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Contenido en Página Limpia con Ángulos Rectos (Estructura idéntica a visualización) */}
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

        <form id="edit-promovido-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Tarjeta de Identificación Principal */}
          <div className="border border-slate-200 bg-slate-50/50 p-6 rounded-none space-y-4">
            <div className="pb-4 border-b border-slate-200 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre Completo del Ciudadano*
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value.toUpperCase());
                    setFormError(null);
                  }}
                  placeholder="NOMBRE COMPLETO TAL COMO FIGURA EN EL INE"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-none text-lg sm:text-xl font-black text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-tight"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {electorKey.length}/18 caracteres
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:justify-end">
                  {citizen.validationStatus === 'sin_validacion' ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-900 rounded-none border border-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>No verificado</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-none border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Validado en Padrón</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grilla de Datos Detallados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  CURP
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
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  {curp.length}/18 caracteres • Opcional
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono font-bold">+52</span>
                  <input
                    type="tel"
                    required
                    maxLength={14}
                    value={phone}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digits);
                      setFormError(null);
                    }}
                    placeholder="993 123 4567"
                    className="w-full pl-10 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {phone.length}/10 dígitos obligatorios
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Sección Electoral
                </label>
                <select
                  value={selectedSection}
                  onChange={e => {
                    setSelectedSection(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-rose-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  {sectionOptions.map(s => (
                    <option key={s.id} value={s.sectionNumber}>
                      Sección {s.sectionNumber} ({s.municipio || 'Centro'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Demarcación territorial
                </span>
              </div>

              <div className="sm:col-span-2 p-3.5 bg-white border border-slate-200 rounded-none space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Domicilio Oficial
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Calle y Número</span>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value.toUpperCase())}
                      placeholder="Calle, No. Exterior e Interior"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Colonia o Localidad</span>
                    <input
                      type="text"
                      value={colonia}
                      onChange={e => setColonia(e.target.value.toUpperCase())}
                      placeholder="Colonia, Fraccionamiento o Barrio"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Código Postal (CP)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="86000"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  {postalCode.length}/5 dígitos
                </span>
              </div>
            </div>
          </div>

          {/* Fotografía de Credencial INE en el Expediente (Anverso y Reverso) */}
          {(citizen.ineAnversoUrl || citizen.ineReversoUrl || citizen.inePhotoUrl || citizen.photoUrl) && (
            <div className="border border-slate-200 bg-white p-6 rounded-none space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Credencial de Elector (INE) Digitalizada</span>
                </h3>
                <div className="flex items-center gap-2">
                  {citizen.validationStatus === 'sin_validacion' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-none">
                      Estatus: No verificado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-none">
                      Validado en Padrón
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Anverso */}
                {(citizen.ineAnversoUrl || citizen.inePhotoUrl || citizen.photoUrl) && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                      Anverso (Frente)
                    </span>
                    <div className="bg-slate-950 p-2 border border-slate-800">
                      <img
                        src={citizen.ineAnversoUrl || citizen.inePhotoUrl || citizen.photoUrl}
                        alt={`Anverso INE de ${citizen.name}`}
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Reverso */}
                {citizen.ineReversoUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                      Reverso (Atrás)
                    </span>
                    <div className="bg-slate-950 p-2 border border-slate-800">
                      <img
                        src={citizen.ineReversoUrl}
                        alt={`Reverso INE de ${citizen.name}`}
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección de Observaciones y Compromiso de Campo */}
          <div className="border border-slate-200 bg-white p-6 rounded-none space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Notas de Captura y Compromiso Comunitario</span>
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value.toUpperCase())}
              placeholder="Notas y compromisos de campo..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none leading-relaxed"
            />
          </div>

          {/* REGISTRO DE ACTIVIDAD */}
          <div className="border border-slate-200 bg-white p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>REGISTRO DE ACTIVIDAD</span>
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-500">
                {citizen.changelog?.length || 1} evento(s)
              </span>
            </div>

            <div className="space-y-3">
              {citizen.changelog && citizen.changelog.length > 0 ? (
                citizen.changelog.map((entry) => (
                  <div key={entry.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-none text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-none ${entry.action === 'creacion' ? 'bg-emerald-500' : 'bg-indigo-600'} inline-block`} />
                        {entry.action === 'creacion' ? 'Registro Inicial' : entry.action === 'edicion' ? 'Modificación de Expediente' : entry.action}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">{entry.description}</p>

                    {entry.changes && entry.changes.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Campos Modificados ({entry.changes.length}):
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {entry.changes.map((ch, idx) => (
                            <div 
                              key={idx} 
                              className="bg-white p-2.5 border border-slate-200 rounded-none text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                            >
                              <span className="font-bold text-slate-900">
                                {ch.label}
                              </span>
                              <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                                <span className="text-rose-700/80 bg-rose-50 px-1.5 py-0.5 border border-rose-200 line-through">
                                  {ch.oldValue || '(Sin dato)'}
                                </span>
                                <span className="text-slate-400 font-bold">→</span>
                                <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">
                                  {ch.newValue || '(Sin dato)'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.userName && (
                      <span className="text-[10px] text-slate-400 block font-semibold pt-0.5">
                        Responsable: {entry.userName}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-none text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-none bg-emerald-500 inline-block" />
                      Registro Inicial
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(citizen.createdAt || '2026-10-03T12:00:00Z').toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">Alta y validación de ciudadano promovido en sección territorial asignada.</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Guardar y Cancelar inferiores */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('ver-promovido')}
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
