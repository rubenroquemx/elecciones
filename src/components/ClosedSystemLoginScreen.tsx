import React, { useState } from 'react';
import type { UserAccount } from '../types/auth';
import { setAuthToken } from '../services/http';
import { 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

interface ClosedSystemLoginScreenProps {
  accounts?: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const ClosedSystemLoginScreen: React.FC<ClosedSystemLoginScreenProps> = ({
  onLogin,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Por favor introduce tu usuario o correo y contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsSubmitting(false);
        if (data.token) {
          setAuthToken(data.token);
        }
        onLogin(data.user || data);
        return;
      }

      setIsSubmitting(false);
      if (res.status === 401) {
        setErrorMsg('Credenciales incorrectas. Verifica tu usuario/correo y contraseña.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.error || 'Error al iniciar sesión en el servidor.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Sin conexión con el servidor. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 font-sans text-slate-800">
      {/* Spacer superior para centrado visual */}
      <div className="h-4" />

      {/* Tarjeta Limpia de Inicio de Sesión */}
      <main className="w-full max-w-sm my-auto">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 sm:p-8 shadow-sm space-y-6">
          <div className="text-center">
            <img 
              src="/logo-claro.svg" 
              alt="VERTEX" 
              className="h-14 sm:h-16 mx-auto object-contain" 
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="usuario o correo electrónico"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449] transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#9d2449] hover:bg-[#851e3e] active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isSubmitting ? 'Iniciando...' : 'Ingresar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Pie de página con autoría */}
      <footer className="py-4 text-center text-xs text-slate-400">
        <span>Creado por: </span>
        <a
          href="https://www.instagram.com/rubenroqueguzman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-600 underline transition-colors"
        >
          Rubén Roque Guzmán
        </a>
      </footer>
    </div>
  );
};
