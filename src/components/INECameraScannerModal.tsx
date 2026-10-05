import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ExtractedINEData } from '../utils/ineScanner';
import {
  Camera,
  Upload,
  X,
} from 'lucide-react';

interface INECameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted?: (data: ExtractedINEData) => void;
  onCapture?: (photoUrl: string) => void;
  initialTab?: 'camera' | 'upload';
  side?: 'anverso' | 'reverso';
  title?: string;
  subtitle?: string;
}

export const INECameraScannerModal: React.FC<INECameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDataExtracted,
  onCapture,
  initialTab = 'camera',
  side = 'anverso',
  title,
  subtitle,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>(initialTab);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guideRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detener la cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Iniciar la cámara trasera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu dispositivo no soporta acceso directo a la cámara.');
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
      setCameraError('No se pudo acceder a la cámara. Puedes seleccionar una foto directamente.');
      setActiveTab('upload');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      const tabToUse = initialTab || 'camera';
      setActiveTab(tabToUse);
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

  // Captura y recorte automático exacto a la cuadrícula/guía sin reencuadrar
  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    // Calcular posición exacta de la cuadrícula visual sobre el fotograma del video
    if (guideRef.current && videoRef.current) {
      const guideRect = guideRef.current.getBoundingClientRect();
      const videoRect = videoRef.current.getBoundingClientRect();

      if (videoRect.width > 0 && videoRect.height > 0) {
        const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
        const displayedW = vw * scale;
        const displayedH = vh * scale;
        const offsetX = (videoRect.width - displayedW) / 2;
        const offsetY = (videoRect.height - displayedH) / 2;

        const guideX = guideRect.left - videoRect.left;
        const guideY = guideRect.top - videoRect.top;

        sx = Math.max(0, (guideX - offsetX) / scale);
        sy = Math.max(0, (guideY - offsetY) / scale);
        sw = Math.min(vw - sx, guideRect.width / scale);
        sh = Math.min(vh - sy, guideRect.height / scale);
      }
    } else {
      // Recorte de respaldo proporcional centrado (relación oficial INE 1.586)
      const ineRatio = 1.586;
      let targetW = 0.88 * vw;
      let targetH = targetW / ineRatio;
      if (targetH > 0.88 * vh) {
        targetH = 0.88 * vh;
        targetW = targetH * ineRatio;
      }
      sx = (vw - targetW) / 2;
      sy = (vh - targetH) / 2;
      sw = targetW;
      sh = targetH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();

    // Retornar inmediatamente el INE recortado a la cuadrícula sin OCR ni IA
    if (onCapture) {
      onCapture(croppedDataUrl);
    }
    if (onDataExtracted) {
      onDataExtracted({
        rawText: '',
        confidenceScore: 100,
        photoUrl: croppedDataUrl,
        isValidINE: true,
        isReadable: true,
        validationStatus: 'sin_validacion',
      });
    }
    onClose();
  };

  // Carga de archivo con recorte automático a proporción del INE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

          stopCamera();
          if (onCapture) {
            onCapture(croppedDataUrl);
          }
          if (onDataExtracted) {
            onDataExtracted({
              rawText: '',
              confidenceScore: 100,
              photoUrl: croppedDataUrl,
              isValidINE: true,
              isReadable: true,
              validationStatus: 'sin_validacion',
            });
          }
          onClose();
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const displayTitle = title || (side === 'reverso' ? 'Paso 2: Capturar Reverso del INE' : 'Paso 1: Capturar Anverso del INE');
  const displaySubtitle = subtitle || (side === 'reverso' 
    ? 'Alinea la parte trasera de la credencial dentro de la cuadrícula.' 
    : 'Alinea el frente de la credencial dentro de la cuadrícula.');
  const guideLabel = side === 'reverso' 
    ? 'REVERSO (PARTE TRASERA) • ALINEAR A LA CUADRÍCULA' 
    : 'ANVERSO (FRENTE) • ALINEAR A LA CUADRÍCULA';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 w-screen h-screen overflow-hidden">
      {/* 1. Cabecera */}
      <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-none shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
              {displayTitle}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-800 rounded-none hover:bg-slate-100 transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Cuerpo Principal */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-black">
        {activeTab === 'camera' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Máscara y Cuadrícula / Guía de Enfoque Centrada */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              <div
                ref={guideRef}
                className="w-[88%] max-w-lg aspect-[1.586/1] border-2 border-emerald-400 rounded-none relative flex flex-col justify-between shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              >
                {/* Cuadrícula sutil interna */}
                <div className="w-full h-full border border-dashed border-emerald-400/40 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div />
                </div>

                {/* Esquinas guía */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400 pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400 pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400 pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400 pointer-events-none" />

                {/* Etiqueta superior */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-none uppercase tracking-wider flex items-center gap-1 shadow-md whitespace-nowrap">
                  <span>{guideLabel}</span>
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="absolute bottom-24 px-4 py-2 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs text-center max-w-md">
                {cameraError}
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center p-6">
            <div className="p-8 text-center space-y-4 max-w-md mx-auto bg-white border border-slate-200 shadow-sm">
              <div className="w-20 h-20 bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto text-emerald-600">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Selecciona una fotografía del INE
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  El sistema la recortará automáticamente a la cuadrícula.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Barra de Acciones Inferior en Blanco */}
      <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
        {activeTab === 'camera' ? (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Cargar Archivo</span>
            </button>

            <button
              type="button"
              onClick={handleCaptureFromVideo}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-none text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>Tomar Fotografía</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-500" />
              <span>Usar Cámara</span>
            </button>
            <div />
          </>
        )}
      </div>
    </div>
  );
};
