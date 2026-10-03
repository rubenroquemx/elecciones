import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  scanINEImage, 
  type ExtractedINEData 
} from '../utils/ineScanner';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Check
} from 'lucide-react';

interface INECameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: ExtractedINEData) => void;
  initialTab?: 'camera' | 'upload';
}

export const INECameraScannerModal: React.FC<INECameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDataExtracted,
  initialTab = 'camera',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>(initialTab);
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
    await processImageSource(canvas, canvas.width, canvas.height);
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
        await processImageSource(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  const processImageSource = async (source: CanvasImageSource, width: number, height: number) => {
    setIsProcessing(true);
    setProgressPct(5);
    setProgressStatus('Iniciando escaneo local...');

    try {
      const result = await scanINEImage(source, width, height, (pct, status) => {
        setProgressPct(pct);
        setProgressStatus(status);
      });

      setDetectedData(result);
      setEditableData({ ...result });
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setProgressStatus('Ocurrió un error al procesar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyData = () => {
    const dataToApply = editableData || detectedData;
    if (dataToApply) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-emil-fade">
      <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-emil-modal">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Escaneo Inteligente de INE
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  0 Tokens • 100% Offline
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Extracción automática local con inteligencia en el dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only when not showing results) */}
        {!detectedData && !isProcessing && (
          <div className="px-5 pt-3 pb-1 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir o Tomar Foto</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* A. Results Review Screen */}
          {detectedData ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Datos detectados exitosamente
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Reconocimiento óptico local completado ({detectedData.confidenceScore}% de confianza)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold uppercase">
                  {detectedData.detectedSide || 'INE'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <span>✏️ <strong>Revisión interactiva:</strong> Puedes ajustar o corregir cualquier dato antes de aplicarlo.</span>
              </div>

              {/* Extracted Fields Grid (Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Clave de Elector */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Clave de Elector (INE)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={editableData?.claveElector || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, claveElector: val } : prev);
                    }}
                    placeholder="ABCD123456EFGH7890"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* CURP */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    CURP
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={editableData?.curp || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setEditableData(prev => prev ? { ...prev, curp: val } : prev);
                    }}
                    placeholder="ABCD123456HDFRRN01"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Nombre Detectado */}
                <div className="sm:col-span-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Nombre del Ciudadano
                  </label>
                  <input
                    type="text"
                    value={editableData?.name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableData(prev => prev ? { ...prev, name: val } : prev);
                    }}
                    placeholder="Nombre completo"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Sección Electoral */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Sección Electoral
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editableData?.electoralSection || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditableData(prev => prev ? { ...prev, electoralSection: val } : prev);
                    }}
                    placeholder="0416"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Vigencia */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Vigencia
                  </label>
                  <input
                    type="text"
                    value={editableData?.vigencia || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableData(prev => prev ? { ...prev, vigencia: val } : prev);
                    }}
                    placeholder="2024-2034"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Domicilio */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Calle y Número
                  </label>
                  <input
                    type="text"
                    value={editableData?.address || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableData(prev => prev ? { ...prev, address: val } : prev);
                    }}
                    placeholder="Calle, No. Ext."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Colonia */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Colonia o Localidad
                  </label>
                  <input
                    type="text"
                    value={editableData?.colonia || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableData(prev => prev ? { ...prev, colonia: val } : prev);
                    }}
                    placeholder="Colonia"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Botones de Acción fijados (Sticky) al fondo para acceso inmediato en celulares */}
              <div className="sticky bottom-0 -mx-5 -mb-5 p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 z-20 shadow-lg flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleApplyData}
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Datos al Registro</span>
                </button>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* B. Processing Loading State */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
                <Cpu className="w-7 h-7 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-slate-900 text-sm">
                  Procesando Credencial en el Dispositivo
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {progressStatus || 'Analizando caracteres y hologramas...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {progressPct}% completado
              </span>
            </div>
          ) : activeTab === 'camera' ? (
            /* C. Live Camera View with Silhouette */
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-800">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tomar foto con cámara del sistema
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* INE Card Frame Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-[88%] h-[72%] border-2 border-dashed border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                      <div className="absolute -top-3 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Alinee el frente del INE aquí
                      </div>

                      {/* Corner marks */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Floating capture trigger button */}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleCaptureFromVideo}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-full text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capturar y Escanear</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* D. File Upload or System Camera Input */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Selecciona una foto o toma una captura
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admite fotos tomadas directamente con la cámara del celular o guardadas en galería
                  </p>
                </div>
                <span className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs">
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <img
                    src={previewImageUrl}
                    alt="Vista previa INE"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Foto cargada</span>
                    <span className="text-[11px] text-slate-500">Lista para procesar</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Datos procesados localmente en memoria RAM</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            PWA Offline • INE v1.0
          </span>
        </div>
      </div>
    </div>
  );
};
