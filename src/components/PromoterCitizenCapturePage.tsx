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
  Upload,
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
  initialINEData?: ExtractedINEData | null;
}

export const PromoterCitizenCapturePage: React.FC<PromoterCitizenCapturePageProps> = ({
  currentUser,
  availableSections,
  allLeaders,
  onSaveCitizen,
  onNavigate,
  defaultSectionNumber,
  initialINEData,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'upload'>('camera');
  const [canUseCamera, setCanUseCamera] = useState<boolean>(true);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionMismatchError, setSectionMismatchError] = useState<string | null>(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          setCanUseCamera(false);
          setScannerTab('upload');
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        setCanUseCamera(hasVideo);
        if (!hasVideo) setScannerTab('upload');
      } catch {
        setCanUseCamera(false);
        setScannerTab('upload');
      }
    };
    checkCamera();
  }, []);

  const assignedSection = useMemo(() => {
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
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [notes, setNotes] = useState('');
  const [inePhotoUrl, setInePhotoUrl] = useState<string | null>(null);
  const [vigencia, setVigencia] = useState<string>('');
  const [vigenciaError, setVigenciaError] = useState<string | null>(null);

  const handleDataExtracted = (data: ExtractedINEData) => {
    if (data.claveElector) setElectorKey(data.claveElector.toUpperCase());
    if (data.curp) setCurp(data.curp.toUpperCase());
    if (data.name) setName(data.name.toUpperCase());
    if (data.address) setAddress(data.address.toUpperCase());
    if (data.colonia) setColonia(data.colonia.toUpperCase());
    if (data.photoUrl) setInePhotoUrl(data.photoUrl);
    if (data.vigencia) {
      setVigencia(data.vigencia);
      const matches = data.vigencia.match(/20\d{2}/g);
      if (matches && matches.length > 0) {
        const expYear = parseInt(matches[matches.length - 1], 10);
        if (expYear < 2026) {
          setVigenciaError(`La credencial INE tiene vigencia ${expYear} (menor a 2026) y no es válida para el proceso electoral.`);
        } else {
          setVigenciaError(null);
        }
      }
    }

    // Validación estricta: Notificar si el INE escaneado no es de la sección asignada
    if (data.electoralSection) {
      const extractedSec = normalizeSectionNumber(data.electoralSection);
      if (extractedSec !== assignedSection) {
        setSectionMismatchError(
          `Este promovido pertenece a la Sección Electoral ${extractedSec}. Tu sección asignada es la ${assignedSection}. No es posible registrar ciudadanos fuera de tu sección asignada.`
        );
      } else {
        setSectionMismatchError(null);
      }
    } else {
      setSectionMismatchError(null);
    }

    setFormError(null);
    setOcrNotice(`Datos INE verificados exitosamente (${data.confidenceScore}% confianza)`);
  };

  useEffect(() => {
    if (initialINEData) {
      handleDataExtracted(initialINEData);
    }
  }, [initialINEData]);

  const existingElector = useMemo(() => {
    if (electorKey.trim().length >= 6) {
      return findElectorByKey(electorKey.trim().toUpperCase(), allLeaders, availableSections);
    }
    return null;
  }, [electorKey, allLeaders, availableSections]);

  // Detección estricta de duplicados por Clave de Elector en toda la estructura territorial
  const duplicateLeader = useMemo(() => {
    const cleanKey = electorKey.trim().toUpperCase();
    if (cleanKey.length < 6) return null;
    return allLeaders.find(l => l.electorKey && l.electorKey.trim().toUpperCase() === cleanKey);
  }, [electorKey, allLeaders]);

  const duplicateNotice = useMemo(() => {
    if (!duplicateLeader) return null;
    const isOwnLeader = duplicateLeader.parentId === currentUser?.leaderId || duplicateLeader.id === currentUser?.leaderId;
    if (isOwnLeader) {
      return `Este ciudadano ya se encuentra promovido por ti en esta sección electoral (${duplicateLeader.name.toUpperCase()}).`;
    }
    const promoter = allLeaders.find(l => l.id === duplicateLeader.parentId);
    const promoterName = promoter ? promoter.name.toUpperCase() : 'OTRO PROMOTOR TERRITORIAL';
    const territory = duplicateLeader.territoryName ? ` (${duplicateLeader.territoryName.toUpperCase()})` : '';
    return `Este ciudadano ya se encuentra promovido en el sistema por ${promoterName}${territory}. No es posible registrarlo nuevamente.`;
  }, [duplicateLeader, currentUser, allLeaders]);

  useEffect(() => {
    if (existingElector) {
      setName(prev => prev || existingElector.name);
      setCurp(prev => prev || (existingElector.curp || ''));
      setPhone(prev => prev || (existingElector.phone || ''));
      setAddress(prev => prev || (existingElector.address || ''));
      setColonia(prev => prev || (existingElector.colonia || ''));
      if (existingElector.electoralSection) {
        const sec = normalizeSectionNumber(existingElector.electoralSection);
        if (sec !== assignedSection) {
          setSectionMismatchError(
            `Este ciudadano está registrado en la Sección Electoral ${sec}. Tu sección asignada es la ${assignedSection}. No es posible registrar promovidos fuera de tu demarcación asignada.`
          );
        } else {
          setSectionMismatchError(null);
        }
      }
    }
  }, [existingElector, assignedSection]);

  const validation = useMemo(() => {
    if (sectionMismatchError) {
      return { allowed: false, errorMsg: sectionMismatchError };
    }
    if (!electorKey.trim() || electorKey.trim().length < 6) {
      return { allowed: true, errorMsg: undefined };
    }
    return validateElectorSection(
      electorKey.trim().toUpperCase(),
      assignedSection,
      allLeaders,
      availableSections
    );
  }, [electorKey, assignedSection, sectionMismatchError, allLeaders, availableSections]);

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

    if (!trimmedName) {
      setFormError('El nombre completo del ciudadano es obligatorio.');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 6) {
      setFormError('La Clave de Elector es obligatoria (mínimo 6 caracteres).');
      return;
    }
    if (duplicateNotice) {
      setFormError(duplicateNotice);
      return;
    }
    if (sectionMismatchError) {
      setFormError(sectionMismatchError);
      return;
    }
    if (vigenciaError) {
      setFormError(vigenciaError);
      return;
    }
    if (!validation.allowed) {
      setFormError(validation.errorMsg || 'No se puede registrar este ciudadano según las directrices territoriales.');
      return;
    }

    const newId = `field-promovido-${Date.now()}`;
    const newLeader: TerritorialLeader = {
      id: newId,
      name: trimmedName.toUpperCase(),
      role: 'Ciudadano Promovido',
      level: 'promovido',
      levelIndex: 5,
      parentId: currentUser?.leaderId || null,
      territoryName: `Sección ${assignedSection} - ${colonia.trim().toUpperCase() || 'TERRITORIO'}`,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: assignedSection,
      electorKey: trimmedKey.toUpperCase(),
      curp: curp.trim().toUpperCase() || undefined,
      phone: phone.trim() ? `+52 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : undefined,
      inePhotoUrl: inePhotoUrl || undefined,
      photoUrl: inePhotoUrl || undefined,
      vigencia: vigencia.trim().toUpperCase() || undefined,
      hasAccount: false,
      metaGoal: 1,
      currentCount: 1,
      status: 'completado',
      validationStatus: 'validado',
      notes: notes.trim().toUpperCase() || `REGISTRO DE CAMPO EN SECCIÓN ${assignedSection}.`,
    };

    persistElectorProfile({
      electorKey: trimmedKey.toUpperCase(),
      name: trimmedName.toUpperCase(),
      curp: curp.trim().toUpperCase() || undefined,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: assignedSection,
      phone: newLeader.phone,
      inePhotoUrl: inePhotoUrl || undefined,
      vigencia: vigencia.trim().toUpperCase() || undefined,
      structures: [
        {
          id: newId,
          structureName: `Célula Seccional ${assignedSection}`,
          type: 'promovido',
          sectionNumber: assignedSection,
          source: 'leader',
        },
      ],
    });

    onSaveCitizen(newLeader);
    onNavigate('escritorio');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white p-0">
      {/* Barra Superior con botón para volver y grupo unificado de escaneo (Sin indicador de sección) */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-white truncate">
            Capturar Promovido
          </h1>
        </div>

        {/* Botón Dinámico: Solo Escanear cuando la cámara está disponible; en caso contrario Cargar Foto */}
        {canUseCamera ? (
          <button
            type="button"
            onClick={() => {
              setScannerTab('camera');
              setIsScannerOpen(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500"
            title="Escanear INE con cámara en vivo e Inteligencia Artificial"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Escanear INE (IA)</span>
            <span className="sm:hidden">Escanear INE</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setScannerTab('upload');
              setIsScannerOpen(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-500"
            title="Cargar foto de credencial INE para procesar con Inteligencia Artificial"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cargar Foto INE (IA)</span>
            <span className="sm:hidden">Cargar Foto</span>
          </button>
        )}
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

        {/* Alerta de Sección no coincidente */}
        {sectionMismatchError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-none text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Captura No Permitida - Demarcación Inválida
              </h4>
              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                {sectionMismatchError}
              </p>
            </div>
          </div>
        )}

        {/* Alerta de Vigencia Menor a 2026 */}
        {vigenciaError && !sectionMismatchError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-none text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Captura No Permitida - Credencial No Vigente
              </h4>
              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                {vigenciaError}
              </p>
            </div>
          </div>
        )}

        {/* Alerta Bloqueante si la Clave de Elector ya está registrada en la estructura */}
        {duplicateNotice && (
          <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-none text-amber-950 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Ciudadano Ya Promovido (Clave Duplicada)
              </h4>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                {duplicateNotice}
              </p>
            </div>
          </div>
        )}

        {formError && !sectionMismatchError && !duplicateNotice && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {!validation.allowed && !sectionMismatchError && !duplicateNotice && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-none text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Bloqueo de Directriz:</strong> {validation.errorMsg}</span>
          </div>
        )}

        {existingElector && validation.allowed && !duplicateNotice && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-none text-xs text-indigo-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Elector ya identificado:</strong> {existingElector.name}.
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
                setName(e.target.value.toUpperCase());
                setFormError(null);
              }}
              placeholder="Nombre(s) y Apellidos tal como figuran en el INE"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Fila 3: Teléfono Celular (WhatsApp) */}
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

          {/* Fila 4: Domicilio y Colonia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Calle y Número
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value.toUpperCase())}
                placeholder="Calle, No. Exterior e Interior"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Colonia o Localidad
              </label>
              <input
                type="text"
                value={colonia}
                onChange={e => setColonia(e.target.value.toUpperCase())}
                placeholder="Colonia, Fraccionamiento o Barrio"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value.toUpperCase())}
              placeholder="Notas de visita, detalles del promovido, etc."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Fotografía del INE Digitalizada (si fue capturada) */}
          {inePhotoUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={inePhotoUrl}
                  alt="Fotografía INE digitalizada"
                  className="w-20 h-14 object-cover border border-slate-300 rounded-none shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Fotografía del INE Digitalizada</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">
                    Se guardará automáticamente en el expediente del ciudadano
                  </span>
                  {vigencia && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Vigencia detectada: {vigencia}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInePhotoUrl(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer"
              >
                Quitar Foto
              </button>
            </div>
          )}

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
              disabled={Boolean(duplicateNotice) || Boolean(sectionMismatchError) || Boolean(vigenciaError) || !validation.allowed || !name.trim() || electorKey.length < 6}
              className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-none shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Ciudadano Promovido</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Escáner INE con Cámara y Modo de Subida */}
      <INECameraScannerModal
        isOpen={isScannerOpen}
        initialTab={scannerTab}
        assignedSection={assignedSection}
        onClose={() => setIsScannerOpen(false)}
        onDataExtracted={handleDataExtracted}
      />
    </div>
  );
};
