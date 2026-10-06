import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader, LeaderChangelogEntry, LeaderNote } from '../types/territory';
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
  AlertTriangle, 
  UserCheck, 
  Save, 
  X,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Send
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

interface ChatObservation {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
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
  // Estado de escáner en vivo y fotos
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSide, setScannerSide] = useState<'anverso' | 'reverso'>('anverso');
  const [ineAnversoUrl, setIneAnversoUrl] = useState<string | null>(null);
  const [ineReversoUrl, setIneReversoUrl] = useState<string | null>(null);
  const [modalImagePreview, setModalImagePreview] = useState<{ url: string; title: string } | null>(null);

  // Referencias a inputs de archivos directos en pantalla principal
  const anversoFileInputRef = useRef<HTMLInputElement | null>(null);
  const reversoFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Lista de secciones para el selector
  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    if (assignedSection) set.add(assignedSection);
    if (currentUser?.assignedSections) {
      currentUser.assignedSections.forEach(s => set.add(normalizeSectionNumber(s)));
    }
    availableSections.forEach(s => {
      if (s.sectionNumber) set.add(normalizeSectionNumber(s.sectionNumber));
    });
    const list = Array.from(set).sort();
    return list.length > 0 ? list : ['0416'];
  }, [assignedSection, currentUser, availableSections]);

  // Campos de formulario
  const [electoralSection, setElectoralSection] = useState(assignedSection || '0416');
  const [electorKey, setElectorKey] = useState('');
  const [paternalLastName, setPaternalLastName] = useState('');
  const [maternalLastName, setMaternalLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Observaciones estilo chat
  const [observations, setObservations] = useState<ChatObservation[]>([]);
  const [newObservationText, setNewObservationText] = useState('');

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
    if (initialINEData?.name) {
      const parts = initialINEData.name.trim().split(/\s+/);
      if (parts.length >= 3) {
        setPaternalLastName(parts[0].toUpperCase());
        setMaternalLastName(parts[1].toUpperCase());
        setFirstName(parts.slice(2).join(' ').toUpperCase());
      } else if (parts.length === 2) {
        setPaternalLastName(parts[0].toUpperCase());
        setFirstName(parts[1].toUpperCase());
      } else {
        setFirstName(parts[0].toUpperCase());
      }
    }
    if (initialINEData?.address) setAddress(initialINEData.address.toUpperCase());
    if (initialINEData?.colonia) setColonia(initialINEData.colonia.toUpperCase());
  }, [initialINEData]);

  // Procesamiento y recorte automático de archivo seleccionado directamente
  const processImageFile = (file: File, side: 'anverso' | 'reverso') => {
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;

        const ineRatio = 1.586;
        let targetW = 0.90 * nw;
        let targetH = targetW / ineRatio;
        if (targetH > 0.90 * nh) {
          targetH = 0.90 * nh;
          targetW = targetH * ineRatio;
        }
        const sx = (nw - targetW) / 2;
        const sy = (nh - targetH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(targetW));
        canvas.height = Math.max(1, Math.round(targetH));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, sx, sy, targetW, targetH, 0, 0, canvas.width, canvas.height);
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          if (side === 'anverso') {
            setIneAnversoUrl(croppedDataUrl);
          } else {
            setIneReversoUrl(croppedDataUrl);
          }
          setFormError(null);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSectionChange = (val: string) => {
    const norm = normalizeSectionNumber(val);
    setElectoralSection(norm);
    setFormError(null);
    if (norm !== assignedSection) {
      setSectionMismatchError(
        `La sección seleccionada (${norm}) no coincide con tu sección asignada (${assignedSection}). Solo puedes registrar en tu demarcación.`
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

  const handlePostalCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 5);
    setPostalCode(digits);
  };

  // Abrir cámara modal
  const openScannerFor = (side: 'anverso' | 'reverso') => {
    setScannerSide(side);
    setIsScannerOpen(true);
  };

  // Callback de cámara
  const handlePhotoCaptured = (photoUrl: string) => {
    if (scannerSide === 'anverso') {
      setIneAnversoUrl(photoUrl);
    } else {
      setIneReversoUrl(photoUrl);
    }
    setIsScannerOpen(false);
    setFormError(null);
  };

  // Agregar observación al chat
  const handleAddObservation = () => {
    const trimmed = newObservationText.trim();
    if (!trimmed) return;
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newNote: ChatObservation = {
      id: `obs-${Date.now()}`,
      text: trimmed.toUpperCase(),
      authorName: currentUser?.name || 'Promotor',
      createdAt: timeFormatted,
    };
    setObservations(prev => [...prev, newNote]);
    setNewObservationText('');
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
      const parts = (existingElector.name || '').trim().split(/\s+/);
      if (parts.length >= 3) {
        setPaternalLastName(prev => prev || parts[0].toUpperCase());
        setMaternalLastName(prev => prev || parts[1].toUpperCase());
        setFirstName(prev => prev || parts.slice(2).join(' ').toUpperCase());
      } else if (parts.length === 2) {
        setPaternalLastName(prev => prev || parts[0].toUpperCase());
        setFirstName(prev => prev || parts[1].toUpperCase());
      } else if (parts.length === 1) {
        setFirstName(prev => prev || parts[0].toUpperCase());
      }
      if (existingElector.phone && !phone) {
        setPhone(cleanPhoneDigits(existingElector.phone));
      }
      setAddress(prev => prev || (existingElector.address ? existingElector.address.toUpperCase() : ''));
      setColonia(prev => prev || (existingElector.colonia ? existingElector.colonia.toUpperCase() : ''));
      if (existingElector.postalCode) {
        setPostalCode(prev => prev || existingElector.postalCode || '');
      }
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
        errorMsg: `La sección electoral seleccionada (${electoralSection}) no coincide con tu sección asignada (${assignedSection}).` 
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

  // Guardar ciudadano
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fullFullName = [paternalLastName.trim(), maternalLastName.trim(), firstName.trim()]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();

    const trimmedKey = electorKey.trim().toUpperCase();
    const cleanDigits = cleanPhoneDigits(phone);
    const cleanSection = normalizeSectionNumber(electoralSection.trim());

    if (!cleanSection) {
      setFormError('La Sección Electoral es obligatoria.');
      return;
    }
    if (cleanSection !== assignedSection) {
      setFormError(`La sección ${cleanSection} no coincide con tu sección asignada (${assignedSection}). Solo puedes registrar ciudadanos de tu sección asignada.`);
      return;
    }
    if (!paternalLastName.trim()) {
      setFormError('El Apellido Paterno es obligatorio.');
      return;
    }
    if (!firstName.trim()) {
      setFormError('El Nombre del ciudadano es obligatorio.');
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
        description: `Registro inicial de promovido en Sección ${cleanSection} por ${currentUser?.name || 'Promotor Territorial'}`,
        userName: currentUser?.name || 'Promotor Territorial',
      }
    ];

    const notesHistory: LeaderNote[] = observations.map(obs => ({
      id: obs.id,
      text: obs.text,
      authorName: obs.authorName,
      createdAt: nowIso,
    }));

    const notesText = observations.length > 0
      ? observations.map(o => `[${o.createdAt}] ${o.authorName}: ${o.text}`).join('\n')
      : `REGISTRO DE CAMPO EN SECCIÓN ${cleanSection}.`;

    const mainInePhoto = ineAnversoUrl || ineReversoUrl || undefined;

    const newLeader: TerritorialLeader = {
      id: newId,
      name: fullFullName,
      firstName: firstName.trim().toUpperCase(),
      paternalLastName: paternalLastName.trim().toUpperCase(),
      maternalLastName: maternalLastName.trim().toUpperCase() || undefined,
      role: 'Ciudadano Promovido',
      level: 'promovido',
      levelIndex: 5,
      parentId: currentUser?.leaderId || null,
      territoryName: `Sección ${cleanSection} - ${colonia.trim().toUpperCase() || 'TERRITORIO'}`,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      postalCode: postalCode.trim() || undefined,
      electoralSection: cleanSection,
      electorKey: trimmedKey,
      phone: formattedPhone,
      inePhotoUrl: mainInePhoto,
      ineAnversoUrl: ineAnversoUrl || undefined,
      ineReversoUrl: ineReversoUrl || undefined,
      photoUrl: mainInePhoto,
      hasAccount: false,
      metaGoal: 1,
      currentCount: 1,
      status: 'completado',
      validationStatus: 'sin_validacion',
      notes: notesText,
      notesHistory,
      createdAt: nowIso,
      updatedAt: nowIso,
      changelog: initialChangelog,
    };

    persistElectorProfile({
      electorKey: trimmedKey,
      name: fullFullName,
      firstName: firstName.trim().toUpperCase(),
      paternalLastName: paternalLastName.trim().toUpperCase(),
      maternalLastName: maternalLastName.trim().toUpperCase() || undefined,
      address: address.trim().toUpperCase(),
      colonia: colonia.trim().toUpperCase(),
      postalCode: postalCode.trim() || undefined,
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
      {/* 1. BARRA SUPERIOR LIMPIA */}
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
          <h1 className="text-sm sm:text-base font-bold text-white truncate">
            Capturar Promovido
          </h1>
        </div>
      </div>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">

        {/* TARJETAS DE CAPTURA ANVERSO Y REVERSO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta Anverso */}
          <div className={`p-4 border rounded-none transition-all ${
            ineAnversoUrl ? 'bg-slate-50 border-emerald-400' : 'bg-white border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Anverso del INE</span>
              </h3>
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
                    onClick={() => setModalImagePreview({ url: ineAnversoUrl, title: 'Anverso del INE' })}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalImagePreview({ url: ineAnversoUrl, title: 'Anverso del INE' })}
                      className="px-2.5 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-black"
                    >
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Ampliar</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openScannerFor('anverso')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-none flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => anversoFileInputRef.current?.click()}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-none flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Subir archivo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Toma una foto con la cámara o selecciona una imagen de tu dispositivo.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openScannerFor('anverso')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => anversoFileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Subir imagen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input oculto para carga directa desde la primera pantalla */}
            <input
              ref={anversoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) processImageFile(e.target.files[0], 'anverso');
                e.target.value = '';
              }}
            />
          </div>

          {/* Tarjeta Reverso */}
          <div className={`p-4 border rounded-none transition-all ${
            ineReversoUrl ? 'bg-slate-50 border-emerald-400' : 'bg-white border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Reverso del INE</span>
              </h3>
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
                    onClick={() => setModalImagePreview({ url: ineReversoUrl, title: 'Reverso del INE' })}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalImagePreview({ url: ineReversoUrl, title: 'Reverso del INE' })}
                      className="px-2.5 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer hover:bg-black"
                    >
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Ampliar</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openScannerFor('reverso')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-none flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => reversoFileInputRef.current?.click()}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-none flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Subir archivo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Toma una foto con la cámara o selecciona una imagen de tu dispositivo.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openScannerFor('reverso')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => reversoFileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Subir imagen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input oculto para carga directa desde la primera pantalla */}
            <input
              ref={reversoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) processImageFile(e.target.files[0], 'reverso');
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* ALERTA DE SECCIÓN FUERA DE DEMARCACIÓN */}
        {sectionMismatchError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-none text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Demarcación Inválida
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

        {existingElector && validation.allowed && !duplicateNotice && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-none text-xs text-indigo-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Elector ya identificado en padrón:</strong> {existingElector.name}.
            </span>
          </div>
        )}

        {/* FORMULARIO DE DATOS */}
        <form onSubmit={handleSubmit} className="space-y-5 border border-slate-200 bg-white p-6 sm:p-8 rounded-none shadow-none">
          {/* Fila 1: Nombres y Apellidos Separados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Apellido Paterno*
              </label>
              <input
                type="text"
                required
                value={paternalLastName}
                onChange={e => {
                  setPaternalLastName(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="Paterno"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Apellido Materno
              </label>
              <input
                type="text"
                value={maternalLastName}
                onChange={e => {
                  setMaternalLastName(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="Materno (opcional)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Nombre(s)*
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={e => {
                  setFirstName(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="Nombre(s)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Fila 2: Clave de Elector y Sección (Selector Dropdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Clave de Elector INE*
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                {electorKey.length}/18 caracteres
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Sección Electoral*
              </label>
              <select
                value={electoralSection}
                onChange={e => handleSectionChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 tracking-wider cursor-pointer"
              >
                {sectionOptions.map(sec => (
                  <option key={sec} value={sec}>
                    Sección {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 3: Teléfono Celular (WhatsApp) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Teléfono Celular (WhatsApp)*
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono font-bold">+52</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="993 123 4567"
                className="w-full pl-11 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              10 dígitos obligatorios • {phone.length}/10 capturados
            </span>
          </div>

          {/* Fila 4: Domicilio, Colonia y Código Postal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Calle y Número
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value.toUpperCase())}
                placeholder="Calle y Número exterior"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                placeholder="Colonia o Barrio"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Código Postal (CP)
              </label>
              <input
                type="text"
                maxLength={5}
                value={postalCode}
                onChange={e => handlePostalCodeChange(e.target.value)}
                placeholder="86000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                {postalCode.length}/5 dígitos
              </span>
            </div>
          </div>

          {/* Fila 5: Observaciones como Chat Minimalista que va acumulando */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Observaciones
            </label>
            
            {/* Historial acumulado tipo chat */}
            <div className="border border-slate-200 bg-slate-50 p-3 min-h-[90px] max-h-[220px] overflow-y-auto space-y-2">
              {observations.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Sin observaciones registradas aún. Escribe abajo para agregar una nota.
                </p>
              ) : (
                observations.map((obs) => (
                  <div key={obs.id} className="bg-white border border-slate-200 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="font-bold text-slate-700">{obs.authorName}</span>
                      <span>{obs.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-900 leading-relaxed break-words">{obs.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Entrada para escribir nueva nota */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newObservationText}
                onChange={e => setNewObservationText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObservation();
                  }
                }}
                placeholder="Escribe una observación y presiona Agregar..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-none text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleAddObservation}
                disabled={!newObservationText.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-none flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* BOTÓN GUARDAR LIMPIO */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('escritorio')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                Boolean(duplicateNotice) || 
                Boolean(sectionMismatchError) || 
                !validation.allowed || 
                !paternalLastName.trim() || 
                !firstName.trim() || 
                electorKey.length < 6 ||
                cleanPhoneDigits(phone).length < 10 ||
                !electoralSection ||
                normalizeSectionNumber(electoralSection) !== assignedSection
              }
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-none shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL DE CÁMARA */}
      <INECameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        side={scannerSide}
        onCapture={handlePhotoCaptured}
      />

      {/* MODAL DE AMPLIACIÓN DE FOTO */}
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
