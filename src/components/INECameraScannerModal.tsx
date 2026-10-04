import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  scanINEWithAI,
  type ExtractedINEData 
} from '../utils/ineScanner';
import {
  Camera,
  Upload,
  X,
  Check,
  RefreshCw,
  Crop,
  Maximize,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

interface CropBox {
  x: number;      // porcentaje 0 - 100
  y: number;      // porcentaje 0 - 100
  width: number;  // porcentaje 0 - 100
  height: number; // porcentaje 0 - 100
}

interface INECameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: ExtractedINEData) => void;
  initialTab?: 'camera' | 'upload';
  isGeminiAvailable?: boolean;
}

export const INECameraScannerModal: React.FC<INECameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDataExtracted,
  initialTab = 'camera',
  isGeminiAvailable = true,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>(initialTab);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Estados de flujo: captura -> recorte interactivo
  const [step, setStep] = useState<'capture' | 'crop'>('capture');
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 5, y: 15, width: 90, height: 56.7 });
  const [dragMode, setDragMode] = useState<null | 'move' | 'nw' | 'ne' | 'se' | 'sw'>(null);
  const [invalidPromptData, setInvalidPromptData] = useState<{
    result: ExtractedINEData;
    photoUrl: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; box: CropBox } | null>(null);

  // Restringir zoom táctil global con los dedos durante el escaneo
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
      setCameraError('No se pudo acceder a la cámara. Puedes subir una foto directamente.');
      setActiveTab('upload');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      const tabToUse = initialTab || 'camera';
      setActiveTab(tabToUse);
      setStep('capture');
      setRawImageSrc(null);
      setIsProcessing(false);
      setInvalidPromptData(null);
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

  // Cálculo automático del recorte proporcional al INE (85.6mm x 53.98mm = relación 1.586)
  const computeAutoCrop = (naturalW: number, naturalH: number): CropBox => {
    const ineRatio = 1.586;
    let targetW = 0.88 * naturalW;
    let targetH = targetW / ineRatio;
    if (targetH > 0.88 * naturalH) {
      targetH = 0.88 * naturalH;
      targetW = targetH * ineRatio;
    }
    const w = (targetW / naturalW) * 100;
    const h = (targetH / naturalH) * 100;
    return {
      x: (100 - w) / 2,
      y: (100 - h) / 2,
      width: w,
      height: h,
    };
  };

  // Captura desde el video en vivo
  const handleCaptureFromVideo = () => {
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

    stopCamera();
    setRawImageSrc(dataUrl);
    setCropBox(computeAutoCrop(video.videoWidth, video.videoHeight));
    setStep('crop');
  };

  // Carga de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setRawImageSrc(dataUrl);
      const img = new Image();
      img.onload = () => {
        setCropBox(computeAutoCrop(img.naturalWidth || img.width, img.naturalHeight || img.height));
        setStep('crop');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Interacción de arrastre y redimensionado del recorte
  const handlePointerDown = (mode: 'move' | 'nw' | 'ne' | 'se' | 'sw', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      box: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !dragStartRef.current || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dxPct = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
    const orig = dragStartRef.current.box;

    setCropBox(() => {
      let { x, y, width, height } = orig;
      if (dragMode === 'move') {
        x = Math.max(0, Math.min(100 - width, orig.x + dxPct));
        y = Math.max(0, Math.min(100 - height, orig.y + dyPct));
      } else if (dragMode === 'se') {
        width = Math.max(15, Math.min(100 - orig.x, orig.width + dxPct));
        height = Math.max(10, Math.min(100 - orig.y, orig.height + dyPct));
      } else if (dragMode === 'nw') {
        const newX = Math.max(0, Math.min(orig.x + orig.width - 15, orig.x + dxPct));
        const newY = Math.max(0, Math.min(orig.y + orig.height - 10, orig.y + dyPct));
        width = orig.width + (orig.x - newX);
        height = orig.height + (orig.y - newY);
        x = newX;
        y = newY;
      } else if (dragMode === 'ne') {
        const newY = Math.max(0, Math.min(orig.y + orig.height - 10, orig.y + dyPct));
        width = Math.max(15, Math.min(100 - orig.x, orig.width + dxPct));
        height = orig.height + (orig.y - newY);
        y = newY;
      } else if (dragMode === 'sw') {
        const newX = Math.max(0, Math.min(orig.x + orig.width - 15, orig.x + dxPct));
        width = orig.width + (orig.x - newX);
        height = Math.max(10, Math.min(100 - orig.y, orig.height + dyPct));
        x = newX;
      }
      return { x, y, width, height };
    });
  };

  const handlePointerUp = () => {
    setDragMode(null);
    dragStartRef.current = null;
  };

  const handleAutoFitINE = () => {
    if (!cropImgRef.current) return;
    const img = cropImgRef.current;
    setCropBox(computeAutoCrop(img.naturalWidth || img.width, img.naturalHeight || img.height));
  };

  const handleFullFrame = () => {
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  // Confirmar el recorte y enviar los datos
  const handleConfirmCrop = async () => {
    if (!rawImageSrc || !cropImgRef.current) return;
    const img = cropImgRef.current;
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    const sx = Math.max(0, Math.round((cropBox.x / 100) * naturalW));
    const sy = Math.max(0, Math.round((cropBox.y / 100) * naturalH));
    const sw = Math.min(naturalW - sx, Math.round((cropBox.width / 100) * naturalW));
    const sh = Math.min(naturalH - sy, Math.round((cropBox.height / 100) * naturalH));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (isGeminiAvailable) {
      setIsProcessing(true);
      try {
        const aiResult = await scanINEWithAI(croppedDataUrl);
        if (aiResult) {
          const isNotValid = aiResult.isValidINE === false;
          const isNotReadable = aiResult.isReadable === false;
          const lacksEssentialData = !aiResult.name && !aiResult.claveElector && !aiResult.electoralSection && !aiResult.curp;

          if (isNotValid || isNotReadable || lacksEssentialData) {
            setIsProcessing(false);
            setInvalidPromptData({
              result: aiResult,
              photoUrl: croppedDataUrl,
            });
            return;
          }

          aiResult.photoUrl = croppedDataUrl;
          aiResult.validationStatus = 'validado';
          setIsProcessing(false);
          onDataExtracted(aiResult);
          onClose();
          return;
        } else {
          setIsProcessing(false);
          setInvalidPromptData({
            result: { rawText: '', confidenceScore: 0, isValidINE: false, isReadable: false },
            photoUrl: croppedDataUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Error en Gemini AI:', err);
        setIsProcessing(false);
        setInvalidPromptData({
          result: { rawText: '', confidenceScore: 0, isValidINE: false, isReadable: false },
          photoUrl: croppedDataUrl,
        });
        return;
      }
    }

    // Modo fuera de línea o sin IA: se pasa la foto recortada directamente
    onDataExtracted({
      rawText: '',
      confidenceScore: 0,
      photoUrl: croppedDataUrl,
      validationStatus: 'sin_validacion',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 w-screen h-screen overflow-hidden">
      {/* 1. Cabecera Fija */}
      <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-none shrink-0">
            {step === 'crop' ? <Crop className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
              Escanear INE
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Alinea el frente de la credencial de elector con la guía.
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
      <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-50">
        {/* PANTALLA A: CROP / RECORTE DE LA IMAGEN */}
        {step === 'crop' && rawImageSrc && (
          <div className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden select-none bg-slate-100">
            {/* Contenedor relativo para la imagen y la máscara de recorte */}
            <div
              ref={cropContainerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative inline-block max-w-full max-h-[68vh] overflow-hidden shadow-2xl border border-slate-800 touch-none"
            >
              <img
                ref={cropImgRef}
                src={rawImageSrc}
                alt="Credencial Capturada"
                className="max-w-full max-h-[68vh] w-auto h-auto object-contain block pointer-events-none select-none"
              />

              {/* Recuadro de Recorte Interactivo */}
              <div
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                }}
                className="absolute border-2 border-emerald-400 cursor-move flex flex-col justify-between"
                onPointerDown={(e) => handlePointerDown('move', e)}
              >
                {/* Cuadrícula sutil interna */}
                <div className="w-full h-full border border-dashed border-emerald-400/40 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-r border-b border-emerald-400/20" />
                  <div className="border-b border-emerald-400/20" />
                  <div className="border-r border-emerald-400/20" />
                  <div className="border-r border-emerald-400/20" />
                  <div />
                </div>

                {/* Manija Noroeste (NW) */}
                <div
                  onPointerDown={(e) => handlePointerDown('nw', e)}
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-white border-2 border-emerald-500 cursor-nwse-resize rounded-none shadow-md z-20"
                />
                {/* Manija Noreste (NE) */}
                <div
                  onPointerDown={(e) => handlePointerDown('ne', e)}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-white border-2 border-emerald-500 cursor-nesw-resize rounded-none shadow-md z-20"
                />
                {/* Manija Sureste (SE) */}
                <div
                  onPointerDown={(e) => handlePointerDown('se', e)}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-white border-2 border-emerald-500 cursor-nwse-resize rounded-none shadow-md z-20"
                />
                {/* Manija Suroeste (SW) */}
                <div
                  onPointerDown={(e) => handlePointerDown('sw', e)}
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 bg-white border-2 border-emerald-500 cursor-nesw-resize rounded-none shadow-md z-20"
                />
              </div>
            </div>

            {/* Controles de Recorte */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={handleAutoFitINE}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-none font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Crop className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Ajustar al INE</span>
              </button>
              <button
                type="button"
                onClick={handleFullFrame}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-none font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Maximize className="w-3.5 h-3.5 text-slate-500" />
                <span>Foto Completa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('capture');
                  setRawImageSrc(null);
                  if (activeTab === 'camera') startCamera();
                }}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 rounded-none font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Tomar</span>
              </button>
            </div>
          </div>
        )}

        {/* PANTALLA B: CAPTURA EN VIVO O SUBIDA */}
        {step === 'capture' && (
          <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
            {activeTab === 'camera' && (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover sm:object-contain"
                />

                {/* Guía Visual Centrada para el Frente del INE */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  <div className="w-[88%] max-w-lg aspect-[1.586/1] border-2 border-dashed border-emerald-400/90 rounded-none relative flex items-center justify-center shadow-lg">
                    <div className="absolute -top-3 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-none uppercase tracking-wider flex items-center gap-1 shadow-xs">
                      <span>Alinea el frente de la credencial con la guía</span>
                    </div>
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
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
              <div className="p-8 text-center space-y-4 max-w-md mx-auto">
                <div className="w-20 h-20 bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto text-emerald-600">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Selecciona una fotografía del INE
                  </h4>
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
            )}
          </div>
        )}

        {/* OVERLAY DE PROCESAMIENTO (SOLO TEXTOS SOLICITADOS) */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 border-4 border-slate-200 border-t-emerald-600 animate-spin rounded-full" />
            <div className="space-y-1.5 max-w-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Espera un momento...
              </span>
              <p className="text-base sm:text-lg font-bold text-slate-900">
                Extrayendo datos
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Los datos extraídos se cargarán automáticamente en el formulario de registro.
              </p>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN: IMAGEN NO VÁLIDA O ILEGIBLE */}
        {invalidPromptData && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-40 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 space-y-4 rounded-none">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Credencial no válida o ilegible
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    La imagen que subiste no corresponde con una credencial válida o la foto es ilegible, ¿deseas continuar?
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Si continúas, la imagen se guardará en el expediente pero el registro quedará marcado como <strong className="text-slate-900 font-bold">no validado</strong> para su revisión manual.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInvalidPromptData(null);
                    setStep('capture');
                    if (activeTab === 'camera') startCamera();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-none cursor-pointer"
                >
                  Cancelar / Tomar Otra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dataToPass: ExtractedINEData = {
                      ...invalidPromptData.result,
                      photoUrl: invalidPromptData.photoUrl,
                      validationStatus: 'sin_validacion',
                      isValidINE: false,
                    };
                    setInvalidPromptData(null);
                    onDataExtracted(dataToPass);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-none cursor-pointer shadow-xs"
                >
                  Sí, Continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Barra de Acciones Inferior en Blanco */}
      <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
        {step === 'capture' && activeTab === 'camera' && (
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
        )}

        {step === 'capture' && activeTab === 'upload' && (
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

        {step === 'crop' && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep('capture');
                setRawImageSrc(null);
                if (activeTab === 'camera') startCamera();
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Tomar Otra</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmCrop}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white rounded-none text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Recorte</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
