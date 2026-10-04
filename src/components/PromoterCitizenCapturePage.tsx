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
  X,
  Maximize2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { INECameraScannerModal } from './INECameraScannerModal';
import { checkGeminiAvailable, type ExtractedINEData } from '../utils/ineScanner';

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
  const [isGeminiAvailable, setIsGeminiAvailable] = useState<boolean>(true);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionMismatchError, setSectionMismatchError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Verificar reactivamente si el sistema tiene acceso a Gemini IA
  useEffect(() => {
    let mounted = true;
    const verifyAccess = async () => {
      const available = await checkGeminiAvailable();
      if (mounted) setIsGeminiAvailable(available);
    };
    verifyAccess();

    const handleOnline = () => verifyAccess();
    const handleOffline = () => { if (mounted) setIsGeminiAvailable(false); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  // Limpieza tolerante y robusta del número telefónico (con o sin +52)
  const cleanPhoneDigits = (val: string): string => {
    let clean = val.replace(/\D/g, '');
    if (clean.startsWith('52') && clean.length > 10) {
      clean = clean.slice(2);
    }
    return clean.slice(0, 10);
  };

  const handlePhoneChange = (val: string) => {
    const digits10 = cleanPhoneDigits(val);
    setPhone(digits10);
    setFormError(null);
  };

  const handleDataExtracted = (data: ExtractedINEData) => {
    if (data.claveElector) setElectorKey(data.claveElector.toUpperCase());
    if (data.curp) setCurp(data.curp.toUpperCase());
    if (data.name) setName(data.name.toUpperCase());
    if (data.address) setAddress(data.address.toUpperCase());
    if (data.colonia) setColonia(data.colonia.toUpperCase());
    if (data.photoUrl) setInePhotoUrl(data.photoUrl);
    if (data.vigencia) {
      setVigencia(data.vigencia.toUpperCase());
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
    if (isGeminiAvailable && data.confidenceScore > 0) {
      setOcrNotice(`Datos INE verificados exitosamente con Inteligencia Artificial`);
    } else if (data.photoUrl) {
      setOcrNotice(`Fotografía de credencial INE capturada y recortada exitosamente`);
    }
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
    return `Este ciudadano ya se encuentra promovido en el sistema por otro promotor. No es posible registrarlo nuevamente.`;
  }, [duplicateLeader, currentUser]);

  useEffect(() => {
    if (existingElector) {
      setName(prev => prev || existingElector.name.toUpperCase());
      setCurp(prev => prev || (existingElector.curp ? existingElector.curp.toUpperCase() : ''));
      if (existingElector.phone && !phone) {
        setPhone(cleanPhoneDigits(existingElector.phone));
      }
      setAddress(prev => prev || (existingElector.address ? existingElector.address.toUpperCase() : ''));
      setColonia(prev => prev || (existingElector.colonia ? existingElector.colonia.toUpperCase() : ''));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim().toUpperCase();
    const trimmedKey = electorKey.trim().toUpperCase();
    const cleanDigits = cleanPhoneDigits(phone);

    if (!trimmedName) {
      setFormError('El nombre completo del ciudadano es obligatorio.');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 6) {
      setFormError('La Clave de Elector es obligatoria (mínimo 6 caracteres).');
      return;
    }
    if (!cleanDigits || cleanDigits.length < 10) {
      setFormError('El teléfono celular (WhatsApp) es obligatorio y debe tener 10 dígitos (con o sin +52).');
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

    const formattedPhone = `+52 ${cleanDigits.slice(0, 3)} ${cleanDigits.slice(3, 6)} ${cleanDigits.slice(6)}`;
    const newId = `field-promovido-${Date.now()}`;

    const newLeader: TerritorialLeader = {
      id: newId,
      name: trimmedName,
      role: 'Ciudadano Promovido',
      level: 'promovido',
      levelIndex: 5,
      parentId: currentUser?.leaderId || null,
      territoryName: `Sección ${assignedSection} - ${colonia.trim().toUpperCase() || 'TERRITORIO'}`,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: assignedSection,
      electorKey: trimmedKey,
      curp: curp.trim().toUpperCase() || undefined,
      phone: formattedPhone,
      inePhotoUrl: inePhotoUrl || undefined,
      photoUrl: inePhotoUrl || undefined,
      vigencia: vigencia.trim().toUpperCase() || undefined,
      hasAccount: false,
      metaGoal: 1,
      currentCount: 1,
      status: 'completado',
      validationStatus: isGeminiAvailable ? 'validado' : 'sin_validacion',
      notes: notes.trim().toUpperCase() || (isGeminiAvailable ? `REGISTRO DE CAMPO EN SECCIÓN ${assignedSection}.` : `REGISTRO OFFLINE (SECCIÓN ${assignedSection}) - PENDIENTE DE VALIDACIÓN AL SINCRONIZAR.`),
    };

    persistElectorProfile({
      electorKey: trimmedKey,
      name: trimmedName,
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
    <div className="flex-1 overflow-y-auto bg-white p-0 relative">
      {/* Barra Superior */}
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

        {/* Botón único condicionado según disponibilidad de Gemini */}
        {isGeminiAvailable ? (
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
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
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-500"
            title="Tomar fotografía de la credencial en modo fuera de línea"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tomar Foto de Credencial</span>
            <span className="sm:hidden">Tomar Foto</span>
          </button>
        )}
      </div>

      {/* Formulario en Página Limpia */}
      <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
        {/* FOTOGRAFÍA INE FIJA EN LA PARTE SUPERIOR PARA COTEJAR Y VERIFICAR */}
        {inePhotoUrl && (
          <div className="sticky top-0 z-30 bg-slate-900 text-white p-3.5 border-b-2 border-emerald-500 shadow-lg -mx-5 sm:-mx-8 -mt-5 sm:-mt-8 mb-6 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={inePhotoUrl}
                  alt="INE Recortado y Digitalizado"
                  className="h-16 sm:h-20 w-auto object-contain bg-black border border-slate-700 rounded-none shrink-0 cursor-pointer shadow-md hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                  title="Toca para ampliar imagen de la credencial"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                      Credencial INE (Frente Digitalizado)
                    </span>
                    {isGeminiAvailable ? (
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded-none flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Verificado con IA
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-none">
                        ⚠ Captura Offline (Sin Validación)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                    Imagen fija para verificar que los datos del formulario coincidan exactamente
                  </p>
                  {vigencia && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Vigencia: {vigencia}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-none text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Ampliar vista del INE"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Ampliar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Volver a escanear o fotografiar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reemplazar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {ocrNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-none text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{ocrNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setOcrNotice(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Alerta de Sección Fuera de Demarcación */}
        {sectionMismatchError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-none text-rose-950 flex items-start gap-3 shadow-xs">
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

          {/* Fila 3: Teléfono Celular (WhatsApp) - Obligatorio y tolerante con o sin +52 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Teléfono Celular (WhatsApp)*
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">+52</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="993 123 4567"
                className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              10 dígitos obligatorios • {phone.length}/10 capturados (válido con o sin prefijo +52)
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
              disabled={
                Boolean(duplicateNotice) || 
                Boolean(sectionMismatchError) || 
                Boolean(vigenciaError) || 
                !validation.allowed || 
                !name.trim() || 
                electorKey.length < 6 ||
                cleanPhoneDigits(phone).length < 10
              }
              className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-none shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Ciudadano Promovido</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Escáner INE con Cámara, Recorte Interactivo y Soporte Offline */}
      <INECameraScannerModal
        isOpen={isScannerOpen}
        isGeminiAvailable={isGeminiAvailable}
        onClose={() => setIsScannerOpen(false)}
        onDataExtracted={handleDataExtracted}
      />

      {/* Modal de Imagen Ampliada de la Credencial */}
      {isImageModalOpen && inePhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-10 right-0 p-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-none cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
            <img
              src={inePhotoUrl}
              alt="Credencial INE Ampliada"
              className="max-h-[80vh] w-auto object-contain block mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
