import React from 'react';

export const ConfiguracionPlaceholderPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans">
      {/* Header Limpio */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5 shrink-0">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Configuración
        </h1>
      </div>

      {/* Área en blanco */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        {/* Página en blanco para definir elementos posteriores */}
      </div>

      {/* Pie de página pequeño */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-200/60 bg-white text-center">
        <a
          href="https://www.instagram.com/rubenroqueguzman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Creado por: Rubén Roque Guzmán
        </a>
      </footer>
    </div>
  );
};
