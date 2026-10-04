import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  scanINEImage, 
  type ExtractedINEData 
} from '../utils/ineScanner';
import { normalizeSectionNumber } from '../utils/electorRegistry';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Check,
  ArrowLeft
} from 'lucide-react';

interface INECameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: ExtractedINEData) => void;
  initialTab?: 'camera' | 'upload';
  assignedSection?: string;
}

export const INECameraScannerModal: React.FC<INECameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDataExtracted,
  initialTab = 'camera',
  assignedSection,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>(initialTab);
  const selectedSide = 'anverso'; // Modo frontal predeterminado (frente del INE)
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedData, setDetectedData] = useState<ExtractedINEData | null>(null);
  const [editableData, setEditableData] = useState<ExtractedINEData | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restringir zoom táctil con los dedos (Pinch-to-zoom)
  useEffect(() => {
    if (!isOpen) return;

    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventPinchZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture as any);
    document.addEventListener('gesturechange', preventGesture as any);

    return () => {
      document.removeEventListener('touchmove', preventPinchZoom);
      document.removeEventListener('gesturestart', preventGesture as any);
      document.removeEventListener('gesturechange', preventGesture as any);
    };
  }, [isOpen]);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start rear camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu navegador o dispositivo no soporta acceso directo a la cámara.');
        setActiveTab('upload');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Puedes subir una foto directamente.');
      setActiveTab('upload');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      const tabToUse = initialTab || 'camera';
      setActiveTab(tabToUse);
      setDetectedData(null);
      setEditableData(null);
      setPreviewImageUrl(null);
      setIsProcessing(false);
      setProgressPct(0);
      if (tabToUse === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialTab, startCamera, stopCamera]);

  // Handle capture from live video feed
  const handleCaptureFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewImageUrl(dataUrl);

    stopCamera();
    await processImageSource(canvas, canvas.width, canvas.height, dataUrl);
  };

  // Handle file select (from device gallery or camera snapshot)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setPreviewImageUrl(dataUrl);
      img.onload = async () => {
        await processImageSource(img, img.naturalWidth || img.width, img.naturalHeight || img.height, dataUrl);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  const processImageSource = async (
    source: CanvasImageSource, 
    width: number, 
    height: number, 
    capturedPhotoDataUrl?: string
  ) => {
    setIsProcessing(true);
    setProgressPct(5);
    setProgressStatus('Iniciando lectura de credencial...');

    try {
      const result = await scanINEImage(source, width, height, selectedSide, (pct, status) => {
        setProgressPct(pct);
        setProgressStatus(status);
      });

      // Asegurar que la fotografía tomada quede adjunta a los datos para el expediente
      if (capturedPhotoDataUrl) {
        result.photoUrl = capturedPhotoDataUrl;
      }

      setDetectedData(result);
      setEditableData({ ...result });
    } catch (err: any) {
      console.error('OCR/AI processing error:', err);
      setProgressStatus('Ocurrió un error al procesar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Validación de sección asignada
  const normalizedAssigned = assignedSection ? normalizeSectionNumber(assignedSection) : null;
  const currentSection = editableData?.electoralSection ? normalizeSectionNumber(editableData.electoralSection) : null;
  const isSectionMismatch = Boolean(
    normalizedAssigned &&
    currentSection &&
    currentSection !== normalizedAssigned
  );

  // Validación de vigencia (que no sea menor a 2026)
  const parseVigenciaYear = (vig?: string): number | null => {
    if (!vig) return null;
    const matches = vig.match(/20\d{2}/g);
    if (!matches || matches.length === 0) return null;
    return parseInt(matches[matches.length - 1], 10);
  };

  const vigenciaYear = parseVigenciaYear(editableData?.vigencia);
  const isVigenciaInvalid = vigenciaYear !== null && vigenciaYear < 2026;

  // Validación individual de campos para marcación en verde
  const isClaveValid = (editableData?.claveElector || '').trim().length === 18;
  const isCurpValid = (editableData?.curp || '').trim().length === 18;
  const isNameValid = (editableData?.name || '').trim().split(/\s+/).length >= 2;
  const isSectionValid = currentSection !== null && normalizedAssigned !== null && currentSection === normalizedAssigned;
  const isVigenciaOk = vigenciaYear !== null && vigenciaYear >= 2026;
  const isAddressValid = Boolean((editableData?.address || '').trim());

  // Bloqueo estricto del botón de aplicar si hay sección diferente o vigencia vencida
  const isApplyDisabled = isSectionMismatch || isVigenciaInvalid || !editableData?.name?.trim();

  const handleApplyData = () => {
    if (isApplyDisabled) return;

    const dataToApply = editableData || detectedData;
    if (dataToApply) {
      // Garantizar que la foto capturada se pase al expediente
      if (previewImageUrl && !dataToApply.photoUrl) {
        dataToApply.photoUrl = previewImageUrl;
      }
      onDataExtracted(dataToApply);
      onClose();
    }
  };

  const handleRetake = () => {
    setDetectedData(null);
    setEditableData(null);
    setPreviewImageUrl(null);
    setIsProcessing(false);
    setProgressPct(0);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col p-0 m-0 overflow-hidden select-none touch-manipulation">
      <div className="bg-white w-full h-full rounded-none flex flex-col overflow-hidden">
        {/* Barra Superior Limpia (Sin textos redundantes ni marcas) */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-none transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          {/* Selector de Entrada: Cámara vs Subir Foto (solo cuando no hay resultados) */}
          {!detectedData && !isProcessing && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-none border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`px-3 py-1 font-bold rounded-none transition-all flex items-center gap-1.5 ${
                  activeTab === 'camera'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cámara en Vivo</span>
                <span className="sm:hidden">Cámara</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  stopCamera();
                }}
                className={`px-3 py-1 font-bold rounded-none transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cargar Foto</span>
                <span className="sm:hidden">Foto</span>
              </button>
            </div>
          )}
          {/* Escaneo predeterminado del frente/frontal del INE */}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-none hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal a Pantalla Completa */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {/* A. Resultados y Revisión de Datos */}
          {detectedData ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Notificación oficial de datos detectados exitosamente */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-none flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Datos detectados exitosamente
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Verificación completada ({detectedData.confidenceScore}% de coincidencia)
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerta Bloqueante si la Sección NO Coincide */}
              {isSectionMismatch && (
                <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-none text-xs text-rose-950 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black uppercase tracking-wider text-rose-700 text-xs">
                      Ciudadano fuera de demarcación territorial
                    </h5>
                    <p className="mt-1 leading-relaxed">
                      Este promovido pertenece a la <strong>Sección Electoral {currentSection}</strong>. Tu sección asignada es la <strong>{normalizedAssigned}</strong>.
                      <span className="block font-bold mt-1 text-rose-900">
                        El sistema no permite capturar ciudadanos fuera de tu sección asignada.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta Bloqueante si la Vigencia es Menor a 2026 */}
              {isVigenciaInvalid && (
                <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-none text-xs text-rose-950 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black uppercase tracking-wider text-rose-700 text-xs">
                      Credencial de Elector no vigente
                    </h5>
                    <p className="mt-1 leading-relaxed">
                      La vigencia detectada es <strong>{vigenciaYear}</strong> (menor a 2026). La credencial no es válida para el proceso electoral 2026/2027.
                    </p>
                  </div>
                </div>
              )}

              {/* Vista Previa de la Fotografía del INE Capturada */}
              {previewImageUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-none flex items-center gap-4">
                  <img
                    src={previewImageUrl}
                    alt="Credencial Capturada"
                    className="w-24 h-16 object-cover border border-slate-300 rounded-none shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Fotografía del INE Capturada</span>
                    <span className="text-[11px] text-slate-500 block">Esta imagen se guardará automáticamente en el expediente oficial del ciudadano.</span>
                  </div>
                </div>
              )}

              {/* Grilla de Datos con Resaltado en Verde de Datos Correctos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Clave de Elector */}
                <div className={`p-3 border rounded-none space-y-1 transition-colors ${
                  isClaveValid 
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isClaveValid ? 'text-emerald-800' : 'text-slate-500'
                    }`}>
                      Clave de Elector (INE)
                    </label>
                    {isClaveValid && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Válida (18 chars)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={18}
                    value={editableData?.claveElector || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, claveElector: val } : prev);
                    }}
                    placeholder="ABCD123456EFGH7890"
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs font-mono font-bold tracking-wider focus:outline-none ${
                      isClaveValid 
                        ? 'border-emerald-500 text-emerald-900' 
                        : 'border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* CURP */}
                <div className={`p-3 border rounded-none space-y-1 transition-colors ${
                  isCurpValid 
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isCurpValid ? 'text-emerald-800' : 'text-slate-500'
                    }`}>
                      CURP
                    </label>
                    {isCurpValid && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Válida (18 chars)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={18}
                    value={editableData?.curp || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, curp: val } : prev);
                    }}
                    placeholder="ABCD123456HDFRRN01"
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs font-mono font-bold tracking-wider focus:outline-none ${
                      isCurpValid 
                        ? 'border-emerald-500 text-emerald-900' 
                        : 'border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* Nombre Detectado */}
                <div className={`sm:col-span-2 p-3 border rounded-none space-y-1 transition-colors ${
                  isNameValid 
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isNameValid ? 'text-emerald-800' : 'text-slate-500'
                    }`}>
                      Nombre del Ciudadano
                    </label>
                    {isNameValid && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Nombre Completo
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editableData?.name || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, name: val } : prev);
                    }}
                    placeholder="Nombre completo"
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs font-bold focus:outline-none ${
                      isNameValid 
                        ? 'border-emerald-500 text-emerald-950' 
                        : 'border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Sección Electoral */}
                <div className={`p-3 border rounded-none space-y-1 transition-colors ${
                  isSectionMismatch
                    ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                    : isSectionValid
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isSectionMismatch 
                        ? 'text-rose-800' 
                        : isSectionValid 
                        ? 'text-emerald-800' 
                        : 'text-slate-500'
                    }`}>
                      Sección Electoral
                    </label>
                    {isSectionValid && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Sección Asignada ({normalizedAssigned})
                      </span>
                    )}
                    {isSectionMismatch && (
                      <span className="text-[9px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        ✕ Asignada es {normalizedAssigned}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={editableData?.electoralSection || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditableData(prev => prev ? { ...prev, electoralSection: val } : prev);
                    }}
                    placeholder="0416"
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs font-mono font-bold focus:outline-none ${
                      isSectionMismatch
                        ? 'border-rose-500 text-rose-800'
                        : isSectionValid
                        ? 'border-emerald-500 text-emerald-900'
                        : 'border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* Vigencia */}
                <div className={`p-3 border rounded-none space-y-1 transition-colors ${
                  isVigenciaInvalid
                    ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                    : isVigenciaOk
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isVigenciaInvalid 
                        ? 'text-rose-800' 
                        : isVigenciaOk 
                        ? 'text-emerald-800' 
                        : 'text-slate-500'
                    }`}>
                      Vigencia
                    </label>
                    {isVigenciaOk && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Vigente ({vigenciaYear} ≥ 2026)
                      </span>
                    )}
                    {isVigenciaInvalid && (
                      <span className="text-[9px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        ✕ Vencida ({vigenciaYear} &lt; 2026)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editableData?.vigencia || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableData(prev => prev ? { ...prev, vigencia: val } : prev);
                    }}
                    placeholder="2024-2034"
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs font-mono font-bold focus:outline-none ${
                      isVigenciaInvalid
                        ? 'border-rose-500 text-rose-800'
                        : isVigenciaOk
                        ? 'border-emerald-500 text-emerald-900'
                        : 'border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* Domicilio */}
                <div className={`p-3 border rounded-none space-y-1 transition-colors ${
                  isAddressValid 
                    ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isAddressValid ? 'text-emerald-800' : 'text-slate-500'
                    }`}>
                      Calle y Número
                    </label>
                    {isAddressValid && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-none flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Detectado
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editableData?.address || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, address: val } : prev);
                    }}
                    placeholder="Calle, No. Ext."
                    className={`w-full px-2.5 py-1.5 bg-white border rounded-none text-xs focus:outline-none ${
                      isAddressValid 
                        ? 'border-emerald-500 text-emerald-950 font-semibold' 
                        : 'border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* Colonia */}
                <div className="p-3 bg-white border border-slate-300 rounded-none space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Colonia o Localidad
                  </label>
                  <input
                    type="text"
                    value={editableData?.colonia || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, colonia: val } : prev);
                    }}
                    placeholder="Colonia"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de Acción fijados al pie */}
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 z-20 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  disabled={isApplyDisabled}
                  onClick={handleApplyData}
                  className={`w-full sm:flex-1 py-3 px-4 rounded-none text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isApplyDisabled
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSectionMismatch
                      ? `No Permitido: Sección No Coincide (${currentSection})`
                      : isVigenciaInvalid
                      ? `No Permitido: Vigencia Menor a 2026 (${vigenciaYear})`
                      : 'Aplicar Datos al Registro'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-none text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* B. Procesando Credencial */
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
                <Cpu className="w-7 h-7 text-slate-900 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-slate-900 text-sm">
                  Procesando Credencial
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {progressStatus || 'Extrayendo datos oficiales...'}
                </p>
              </div>

              <div className="w-full max-w-xs bg-slate-200 h-2 rounded-none overflow-hidden">
                <div
                  className="bg-slate-900 h-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {progressPct}% completado
              </span>
            </div>
          ) : activeTab === 'camera' ? (
            /* C. Cámara en Vivo */
            <div className="max-w-2xl mx-auto space-y-3">
              {cameraError ? (
                <div className="p-8 bg-rose-50 border border-rose-200 rounded-none text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-800">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tomar foto con cámara del sistema
                  </button>
                </div>
              ) : (
                <div className="relative rounded-none overflow-hidden bg-black aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Silueta / Marco para credencial */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-[88%] h-[72%] border-2 border-dashed border-emerald-400/90 rounded-none relative flex items-center justify-center">
                      <div className="absolute -top-3 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-none uppercase tracking-wider flex items-center gap-1 shadow-xs">
                        <span>Alinee el FRENTE de la credencial aquí</span>
                      </div>

                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Botón flotante de captura */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleCaptureFromVideo}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-none text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capturar Foto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* D. Subir Foto o Selector de Galería */
            <div className="max-w-xl mx-auto space-y-4 pt-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-900 bg-white hover:bg-slate-50/50 rounded-none p-10 text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-none bg-slate-100 text-slate-800 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Selecciona una foto o toma una captura
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Admite fotos tomadas directamente con la cámara del celular o guardadas en galería
                  </p>
                </div>
                <span className="inline-block px-4 py-2 bg-slate-900 text-white rounded-none text-xs font-bold">
                  Elegir foto del INE
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {previewImageUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-none flex items-center gap-3">
                  <img
                    src={previewImageUrl}
                    alt="Vista previa INE"
                    className="w-16 h-12 object-cover border border-slate-200 rounded-none shrink-0"
                  />
                  <div className="text-xs flex-1 min-w-0">
                    <span className="font-bold text-slate-800 truncate block">Imagen cargada</span>
                    <span className="text-[11px] text-slate-500">Lista para procesar</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
