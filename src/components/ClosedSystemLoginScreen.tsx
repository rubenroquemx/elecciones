import React, { useState } from 'react';
import type { UserAccount } from '../types/auth';
import { 
  Shield, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface ClosedSystemLoginScreenProps {
  accounts: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const ClosedSystemLoginScreen: React.FC<ClosedSystemLoginScreenProps> = ({
  accounts,
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

    // 1. Intento de autenticación directa con el servidor
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
      });

      if (res.ok) {
        const user = await res.json();
        setIsSubmitting(false);
        onLogin(user);
        return;
      } else if (res.status === 401) {
        setIsSubmitting(false);
        setErrorMsg('Credenciales incorrectas. Verifica tu usuario/correo y contraseña.');
        return;
      }
    } catch {
      // Si el backend no responde o estamos offline, verificar contra cuentas locales autorizadas
    }

    // 2. Verificación contra cuentas autorizadas en el cliente / localStorage
    const user = accounts.find(
      (a) =>
        a.username.toLowerCase() === cleanId ||
        a.email.toLowerCase() === cleanId
    );

    setIsSubmitting(false);

    if (!user) {
      setErrorMsg(
        'Acceso denegado: El usuario no existe en este sistema cerrado. Contacta a la Coordinación Central para tu acceso.'
      );
      return;
    }

    if (user.password && user.password !== cleanPass) {
      setErrorMsg('Contraseña incorrecta para el usuario indicado.');
      return;
    }

    onLogin(user);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#9d2449]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-[#9d2449]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Warning Banner */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-200">Sistema Cerrado • Acceso Restringido</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-500">Sin registro público • Entorno Real</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold">Red Protegida</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#9d2449] text-white shadow-xl shadow-[#9d2449]/30 mb-1 border border-white/20">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white apple-title-2">
              Estructura Territorial
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Plataforma de alta seguridad para operación y control territorial. Ingresa con tus credenciales autorizadas.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl relative space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs animate-emil-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                    placeholder="ej. usrubenroqueguzman@gmail.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449] transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449] transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#9d2449] hover:bg-[#851e3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#9d2449]/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{isSubmitting ? 'Verificando...' : 'Ingresar al Sistema Cerrado'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 text-center leading-relaxed">
              ¿No tienes cuenta? Los accesos únicamente los generan los coordinadores autorizados. No existe registro público.
            </div>
          </div>
        </div>
      </main>

      {/* Footer Features */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/90 py-3 px-4 text-center text-[11px] text-slate-500 z-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Sistema Cerrado
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#9d2449]" />
          Acceso Restringido
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          Entorno de Producción
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          0 Tokens IA
        </span>
      </footer>
    </div>
  );
};
