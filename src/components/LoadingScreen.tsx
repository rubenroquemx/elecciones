import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  fullScreen = true,
}) => {
  if (!fullScreen) {
    return (
      <div className="flex-1 w-full min-h-[350px] h-full flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-150">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#9d2449] border-r-slate-700 animate-spin" />
          </div>
          {message && (
            <p className="text-xs font-semibold text-slate-500 tracking-wider text-center animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #000000 0%, #2E2E2E 50%, #141414 100%)',
      }}
      className="fixed inset-0 z-[99999] w-screen h-[100dvh] min-h-screen overflow-hidden flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center justify-center space-y-7">
        {/* Logo Centrado */}
        <img
          src="/logo-oscuro.svg"
          alt="VERTEX"
          className="w-52 sm:w-68 max-h-16 object-contain mx-auto drop-shadow-2xl"
          draggable={false}
        />

        {/* Símbolo de carga redondo */}
        <div className="flex flex-col items-center justify-center gap-3.5">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Anillo de fondo */}
            <div className="absolute inset-0 rounded-full border-[3px] border-white/10" />
            {/* Anillo giratorio institucional */}
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#9d2449] border-r-white/80 animate-spin" />
          </div>

          {/* Mensaje opcional */}
          {message && (
            <p className="text-xs font-medium text-slate-300 tracking-wider text-center animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
