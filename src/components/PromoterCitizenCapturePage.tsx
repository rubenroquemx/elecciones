import React, { useState, useMemo, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader, LeaderChangelogEntry } from '../types/territory';
import { 
  findElectorByKey, 
  validateElectorSection, 
  persistElectorProfile, 
  normalizeSectionNumber 
} from '../utils/electorRegistry';
import { 
  ArrowLeft, 
  Camera, 
  AlertTriangle, 
  UserCheck, 
  Save, 
  X,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Info
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
  // Estado de escáner y fotos
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSide, setScannerSide] = useState<'anverso' | 'reverso'>('anverso');
  const [ineAnversoUrl, setIneAnversoUrl] = useState<string | null>(null);
  const [ineReversoUrl, setIneReversoUrl] = useState<string | null>(null);
  const [modalImagePreview, setModalImagePreview] = useState<{ url: string; title: string } | null>(null);

  // Errores de validación
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionMismatchError, setSectionMismatchError] = useState<string | null>(null);

  const assignedSection = useMemo(() => {
    if (defaultSectionNumber) return normalizeSectionNumber(defaultSectionNumber);
    if (currentUser?.assignedSections && currentUser.assignedSections.length > 0) {
      return normalizeSectionNumber(currentUser.assignedSections[0]);
    }
    const match = currentUser?.territoryName?.match(/\d{3,4}/);
    if (match) return normalizeSectionNumber(match[0]);
    return '0416';
  }, [defaultSectionNumber, currentUser]);

  // Campos de datos complementarios
  const [electoralSection, setElectoralSection] = useState(assignedSection || '0416');
  const [electorKey, setElectorKey] = useState('');
  const [curp, setCurp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (assignedSection && (!electoralSection || electoralSection === '0416')) {
      setElectoralSection(assignedSection);
    }
  }, [assignedSection]);

  // Si recibe initialINEData
  useEffect(() => {
    if (initialINEData?.photoUrl) {
      setIneAnversoUrl(initialINEData.photoUrl);
    }
    if (initialINEData?.claveElector) setElectorKey(initialINEData.claveElector.toUpperCase());
    if (initialINEData?.curp) setCurp(initialINEData.curp.toUpperCase());
    if (initialINEData?.name) setName(initialINEData.name.toUpperCase());
    if (initialINEData?.address) setAddress(initialINEData.address.toUpperCase());
    if (initialINEData?.colonia) setColonia(initialINEData.colonia.toUpperCase());
  }, [initialINEData]);

  const handleSectionChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setElectoralSection(digits);
    setFormError(null);
    if (digits.length === 4) {
      const norm = normalizeSectionNumber(digits);
      if (norm !== assignedSection) {
        setSectionMismatchError(
          `La sección ingresada (${norm}) no coincide con tu sección asignada (${assignedSection}). No es posible registrar ciudadanos fuera de tu demarcación.`
        );
      } else {
        setSectionMismatchError(null);
      }
    } else if (digits.length > 0 && digits !== assignedSection.slice(0, digits.length)) {
      setSectionMismatchError(
        `La sección ingresada (${digits}) no coincide con tu sección asignada (${assignedSection}).`
      );
    } else {
      setSectionMismatchError(null);
    }
  };

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

  // Abrir cámara para un lado específico
  const openScannerFor = (side: 'anverso' | 'reverso') => {
    setScannerSide(side);
    setIsScannerOpen(true);
  };

  // Callback al capturar foto desde INECameraScannerModal
  const handlePhotoCaptured = (photoUrl: string) => {
    if (scannerSide === 'anverso') {
      setIneAnversoUrl(photoUrl);
      setIsScannerOpen(false);
      // Si el reverso aún no se ha capturado, sugerir/abrir automáticamente para agilizar el flujo de 4 pasos
      if (!ineReversoUrl) {
        setTimeout(() => {
          setScannerSide('reverso');
          setIsScannerOpen(true);
        }, 350);
      }
    } else {
      setIneReversoUrl(photoUrl);
      setIsScannerOpen(false);
    }
    setFormError(null);
  };

  const existingElector = useMemo(() => {
    if (electorKey.trim().length >= 6) {
      return findElectorByKey(electorKey.trim().toUpperCase(), allLeaders, availableSections);
    }
    return null;
  }, [electorKey, allLeaders, availableSections]);

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
    if (electoralSection && normalizeSectionNumber(electoralSection) !== assignedSection) {
      return { 
        allowed: false, 
        errorMsg: `La sección electoral capturada (${electoralSection}) no coincide con tu sección asignada (${assignedSection}).` 
      };
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
  }, [electorKey, assignedSection, electoralSection, sectionMismatchError, allLeaders, availableSections]);

  // Paso 4: Guardar como "No verificado"
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim().toUpperCase();
    const trimmedKey = electorKey.trim().toUpperCase();
    const cleanDigits = cleanPhoneDigits(phone);
    const cleanSection = normalizeSectionNumber(electoralSection.trim());

    if (!cleanSection) {
      setFormError('La Sección Electoral (4 dígitos) es obligatoria.');
      return;
    }
    if (cleanSection !== assignedSection) {
      setFormError(`La sección ${cleanSection} no coincide con tu sección asignada (${assignedSection}). Solo puedes registrar ciudadanos de tu sección asignada.`);
      return;
    }
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
    if (!validation.allowed) {
      setFormError(validation.errorMsg || 'No se puede registrar este ciudadano según las directrices territoriales.');
      return;
    }

    const formattedPhone = `+52 ${cleanDigits.slice(0, 3)} ${cleanDigits.slice(3, 6)} ${cleanDigits.slice(6)}`;
    const newId = `field-promovido-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const initialChangelog: LeaderChangelogEntry[] = [
      {
        id: `cl-${Date.now()}`,
        timestamp: nowIso,
        action: 'creacion',
        description: `Registro inicial de promovido en Sección ${cleanSection} por ${currentUser?.name || 'Promotor Territorial'} (Guardado como No verificado)`,
        userName: currentUser?.name || 'Promotor Territorial',
      }
    ];

    const mainInePhoto = ineAnversoUrl || ineReversoUrl || undefined;

    const newLeader: TerritorialLeader = {
      id: newId,
      name: trimmedName,
      role: 'Ciudadano Promovido',
      level: 'promovido',
      levelIndex: 5,
      parentId: currentUser?.leaderId || null,
      territoryName: `Sección ${cleanSection} - ${colonia.trim().toUpperCase() || 'TERRITORIO'}`,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: cleanSection,
      electorKey: trimmedKey,
      curp: curp.trim().toUpperCase() || undefined,
      phone: formattedPhone,
      inePhotoUrl: mainInePhoto,
      ineAnversoUrl: ineAnversoUrl || undefined,
      ineReversoUrl: ineReversoUrl || undefined,
      photoUrl: mainInePhoto,
      hasAccount: false,
      metaGoal: 1,
      currentCount: 1,
      status: 'completado',
      validationStatus: 'sin_validacion', // Siempre guardado como "No verificado"
      notes: notes.trim().toUpperCase() || `REGISTRO DE CAMPO EN SECCIÓN ${cleanSection}.`,
      createdAt: nowIso,
      updatedAt: nowIso,
      changelog: initialChangelog,
    };

    persistElectorProfile({
      electorKey: trimmedKey,
      name: trimmedName,
      curp: curp.trim().toUpperCase() || undefined,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      electoralSection: cleanSection,
      phone: newLeader.phone,
      inePhotoUrl: mainInePhoto,
      ineAnversoUrl: ineAnversoUrl || undefined,
      ineReversoUrl: ineReversoUrl || undefined,
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
      {/* 1. BARRA SUPERIOR */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-20">
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
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              Capturar Promovido
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Flujo oficial: Anverso → Reverso → Datos complementarios → Guardar "No verificado"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
            <Info className="w-3 h-3 text-amber-400" />
            <span>Estatus: No verificado</span>
          </span>
        </div>
      </div>

      {/* 2. BARRA DE INDICADOR DE 4 PASOS */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Paso 1 */}
            <div 
              onClick={() => openScannerFor('anverso')}
              className={`p-2.5 border rounded-none cursor-pointer transition-all flex items-center gap-2.5 ${
                ineAnversoUrl 
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
                  : 'bg-white border-slate-300 hover:border-emerald-500 text-slate-800'
              }`}
            >
              <div className={`w-6 h-6 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
                ineAnversoUrl ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {ineAnversoUrl ? '✓' : '1'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold block truncate uppercase">1. Anverso INE</span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {ineAnversoUrl ? 'Listo' : 'Alinear y capturar'}
                </span>
              </div>
            </div>

            {/* Paso 2 */}
            <div 
              onClick={() => openScannerFor('reverso')}
              className={`p-2.5 border rounded-none cursor-pointer transition-all flex items-center gap-2.5 ${
                ineReversoUrl 
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
                  : 'bg-white border-slate-300 hover:border-emerald-500 text-slate-800'
              }`}
            >
              <div className={`w-6 h-6 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
                ineReversoUrl ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {ineReversoUrl ? '✓' : '2'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold block truncate uppercase">2. Reverso INE</span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {ineReversoUrl ? 'Listo' : 'Alinear y capturar'}
                </span>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="p-2.5 bg-white border border-slate-300 rounded-none flex items-center gap-2.5 text-slate-800">
              <div className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold block truncate uppercase">3. Datos</span>
                <span className="text-[10px] text-slate-500 block truncate">Formulario</span>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="p-2.5 bg-white border border-slate-300 rounded-none flex items-center gap-2.5 text-slate-800">
              <div className="w-6 h-6 rounded-none bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold block truncate uppercase">4. Guardar</span>
                <span className="text-[10px] text-amber-700 font-bold block truncate">No verificado</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">

        {/* PASOS 1 Y 2: TARJETAS DE CAPTURA ANVERSO Y REVERSO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta Paso 1: Anverso */}
          <div className={`p-4 border rounded-none transition-all ${
            ineAnversoUrl ? 'bg-slate-50 border-emerald-400' : 'bg-white border-dashed border-2 border-slate-300 hover:border-emerald-500'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 flex items-center justify-center text-xs font-black ${
                  ineAnversoUrl ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  1
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Anverso del INE (Frente)</span>
                </h3>
              </div>
              {ineAnversoUrl && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Capturado</span>
                </span>
              )}
            </div>

            {ineAnversoUrl ? (
              <div className="space-y-3">
                <div className="relative bg-black aspect-[1.586/1] border border-slate-700 overflow-hidden flex items-center justify-center group">
                  <img
                    src={ineAnversoUrl}
                    alt="Anverso del INE"
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setModalImagePreview({ url: ineAnversoUrl, title: 'Anverso del INE (Frente)' })}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalImagePreview({ url: ineAnversoUrl, title: 'Anverso del INE (Frente)' })}
                      className="px-2.5 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-black"
                    >
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Ampliar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openScannerFor('anverso')}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-emerald-500"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Volver a capturar</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-500">Recorte automático a la cuadrícula</span>
                  <button
                    type="button"
                    onClick={() => openScannerFor('anverso')}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reemplazar Anverso</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Alinea el frente de la credencial con la guía para recortar automáticamente.
                </p>
                <button
                  type="button"
                  onClick={() => openScannerFor('anverso')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Anverso</span>
                </button>
              </div>
            )}
          </div>

          {/* Tarjeta Paso 2: Reverso */}
          <div className={`p-4 border rounded-none transition-all ${
            ineReversoUrl ? 'bg-slate-50 border-emerald-400' : 'bg-white border-dashed border-2 border-slate-300 hover:border-emerald-500'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 flex items-center justify-center text-xs font-black ${
                  ineReversoUrl ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  2
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Reverso del INE (Atrás)</span>
                </h3>
              </div>
              {ineReversoUrl && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Capturado</span>
                </span>
              )}
            </div>

            {ineReversoUrl ? (
              <div className="space-y-3">
                <div className="relative bg-black aspect-[1.586/1] border border-slate-700 overflow-hidden flex items-center justify-center group">
                  <img
                    src={ineReversoUrl}
                    alt="Reverso del INE"
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setModalImagePreview({ url: ineReversoUrl, title: 'Reverso del INE (Atrás)' })}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalImagePreview({ url: ineReversoUrl, title: 'Reverso del INE (Atrás)' })}
                      className="px-2.5 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-black"
                    >
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Ampliar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openScannerFor('reverso')}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-emerald-500"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Volver a capturar</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-500">Recorte automático a la cuadrícula</span>
                  <button
                    type="button"
                    onClick={() => openScannerFor('reverso')}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reemplazar Reverso</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Alinea el reverso (código de barras / firma) con la guía para recortar.
                </p>
                <button
                  type="button"
                  onClick={() => openScannerFor('reverso')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Reverso</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ALERTA DE SECCIÓN FUERA DE DEMARCACIÓN */}
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

        {/* ALERTA BLOQUEANTE SI CLAVE ESTÁ DUPLICADA */}
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
              <strong>Elector ya identificado en padrón:</strong> {existingElector.name}.
            </span>
          </div>
        )}

        {/* PASO 3: FORMULARIO DE DATOS COMPLEMENTARIOS */}
        <form onSubmit={handleSubmit} className="space-y-6 border border-slate-200 bg-white p-6 sm:p-8 rounded-none shadow-none">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Paso 3: Capturar Datos Complementarios
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Coteja la información visualizando las fotos superiores
            </span>
          </div>

          {/* Fila 1: Sección Electoral, Clave de Elector y CURP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Sección Electoral*</span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">
                  Asignada: {assignedSection}
                </span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={electoralSection}
                onChange={e => handleSectionChange(e.target.value)}
                placeholder={assignedSection}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-none text-xs font-mono font-bold uppercase focus:outline-none tracking-wider ${
                  electoralSection && normalizeSectionNumber(electoralSection) !== assignedSection
                    ? 'border-rose-500 text-rose-700 bg-rose-50 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 text-slate-900 focus:ring-1 focus:ring-slate-900'
                }`}
              />
              <span className="text-[10px] mt-1 block font-mono">
                {electoralSection && normalizeSectionNumber(electoralSection) !== assignedSection ? (
                  <span className="text-rose-600 font-bold">⚠ Debe coincidir con sección {assignedSection}</span>
                ) : (
                  <span className="text-slate-500">4 dígitos • Demarcación del promotor</span>
                )}
              </span>
            </div>

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

          {/* PASO 4: BOTONES DE GUARDAR COMO "NO VERIFICADO" Y CANCELAR */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>El registro se guardará con estatus <strong>"No verificado"</strong></span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('escritorio')}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-none transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  Boolean(duplicateNotice) || 
                  Boolean(sectionMismatchError) || 
                  !validation.allowed || 
                  !name.trim() || 
                  electorKey.length < 6 ||
                  cleanPhoneDigits(phone).length < 10 ||
                  !electoralSection ||
                  normalizeSectionNumber(electoralSection) !== assignedSection
                }
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-none shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer tracking-wide"
                title="Paso 4: Guardar promovido con estatus No verificado"
              >
                <Save className="w-4 h-4 text-emerald-200" />
                <span>Guardar como "No verificado"</span>
                <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-none">
                  Paso 4
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL DE CÁMARA (ANVERSO O REVERSO CON GUÍA Y RECORTE AUTOMÁTICO) */}
      <INECameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        side={scannerSide}
        onCapture={handlePhotoCaptured}
      />

      {/* MODAL DE AMPLIACIÓN DE FOTO (ANVERSO O REVERSO) */}
      {modalImagePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setModalImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700 p-2 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {modalImagePreview.title}
              </span>
              <button
                type="button"
                onClick={() => setModalImagePreview(null)}
                className="p-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-none cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <X className="w-4 h-4" />
                <span>Cerrar</span>
              </button>
            </div>
            <img
              src={modalImagePreview.url}
              alt={modalImagePreview.title}
              className="max-h-[75vh] w-auto object-contain block mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
