import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SelfieCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setIsLoading(true);
    setCameraError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      setCameraError('No fue posible acceder a la cámara. Asegúrate de otorgar los permisos necesarios en tu navegador.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleTakeSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Efecto espejo y centrado
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#9d2449]/10 text-[#9d2449]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tomar Foto Selfie</h3>
              <p className="text-[11px] text-slate-500">Alinea tu rostro frente a la cámara</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Contenido */}
        <div className="p-5 flex flex-col items-center justify-center bg-slate-900 min-h-[320px] relative">
          {cameraError ? (
            <div className="p-4 text-center max-w-xs space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-none transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-64 h-64 border-2 border-[#9d2449] overflow-hidden shadow-lg bg-black">
              <img
                src={capturedImage}
                alt="Selfie capturada"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="relative w-64 h-64 border-2 border-white/40 overflow-hidden shadow-lg bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">
                  Iniciando cámara...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          {capturedImage ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repetir</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#9d2449] hover:bg-[#831e3d] transition-colors shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Usar esta foto</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={Boolean(cameraError) || isLoading}
              onClick={handleTakeSelfie}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#9d2449] hover:bg-[#831e3d] disabled:opacity-50 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Capturar Foto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
