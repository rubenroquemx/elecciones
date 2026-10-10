import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 650,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Iniciar desvanecimiento 250ms antes de terminar
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 250, 200));

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #000000 0%, #2E2E2E 50%, #141414 100%)',
      }}
      className={`fixed inset-0 z-[99999] w-screen h-[100dvh] min-h-screen overflow-hidden flex flex-col items-center justify-center p-6 transition-opacity duration-400 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center transform transition-transform duration-700 ease-out scale-100 animate-in fade-in zoom-in-95">
        <img
          src="/logo-oscuro.svg"
          alt="VERTEX"
          className="w-56 sm:w-72 max-h-16 object-contain mx-auto drop-shadow-2xl"
          draggable={false}
        />
      </div>
    </div>
  );
};
