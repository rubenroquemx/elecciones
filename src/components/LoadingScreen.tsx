import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  fullScreen = true,
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #000000 0%, #2E2E2E 50%, #141414 100%)',
      }}
      className={`flex flex-col items-center justify-center p-6 select-none ${
        fullScreen
          ? 'fixed inset-0 z-[9990] w-screen h-screen'
          : 'flex-1 w-full min-h-[350px] h-full rounded-2xl'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-7 animate-in fade-in duration-500">
        {/* Logo Centrado */}
        <img
          src="/logo-oscuro.svg"
          alt="VERTEX"
          className="w-48 sm:w-64 max-h-14 object-contain mx-auto drop-shadow-xl"
          draggable={false}
        />

        {/* Símbolo de carga redondo */}
        <div className="flex flex-col items-center justify-center gap-3.5">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Anillo de fondo */}
            <div className="absolute inset-0 rounded-full border-[3px] border-white/10" />
            {/* Anillo giratorio con acento */}
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
