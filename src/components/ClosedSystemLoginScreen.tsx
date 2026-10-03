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
  Sparkles,
  Users
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Por favor introduce tu usuario o correo y contraseña.');
      return;
    }

    // Buscar en cuentas autorizadas
    const user = accounts.find(
      (a) =>
        a.username.toLowerCase() === cleanId ||
        a.email.toLowerCase() === cleanId
    );

    if (!user) {
      setErrorMsg(
        'Acceso denegado: El usuario no existe en la base de datos de este sistema cerrado. Contacta a tu Coordinador Territorial para que te dé de alta manualmente.'
      );
      return;
    }

    if (user.password && user.password !== cleanPass) {
      setErrorMsg('Contraseña incorrecta para el usuario indicado.');
      return;
    }

    onLogin(user);
  };

  const handleSelectQuickAccount = (acc: UserAccount) => {
    setIdentifier(acc.username);
    setPassword(acc.password || 'red2026');
    setErrorMsg(null);
    onLogin(acc);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Warning Banner */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-200">Sistema Cerrado • Acceso Restringido</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-500">Sin registro público • Sin proveedores externos</span>
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-emerald-500 text-white shadow-xl shadow-indigo-950/50 mb-1 border border-white/20">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white apple-title-2">
              Estructura Territorial
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Plataforma de alta seguridad para operación y control territorial. Solo personal autorizado con cuenta dada de alta manualmente.
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
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="ej. ruben.roque o usuario@dominio.mx"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
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
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-600 hover:from-indigo-500 hover:via-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/40 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Ingresar al Sistema Cerrado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 text-center leading-relaxed">
              ¿No tienes cuenta? Los accesos únicamente los generan los coordinadores de campaña y territoriales. No existe registro público.
            </div>
          </div>

          {/* Quick Access Switcher for 4 Official Levels + Manual Accounts */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Cuentas Autorizadas ({accounts.length})
              </span>
              <span className="text-[10px] text-slate-500">1-clic para ingresar</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectQuickAccount(acc)}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700 transition-all text-left text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${acc.avatarBg || 'bg-slate-700'}`}>
                      {acc.level === 'admin' ? <Shield className="w-3.5 h-3.5" /> : acc.name.charAt(0)}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="font-bold text-slate-200 group-hover:text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                        <span className="font-mono text-indigo-400">@{acc.username}</span>
                        <span>•</span>
                        <span className="text-slate-400 truncate">{acc.accountRoleLabel}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white px-2 py-0.5 rounded-lg transition-colors font-semibold shrink-0 ml-2">
                    Acceder
                  </span>
                </button>
              ))}
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
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          Altas Manuales
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-sky-400" />
          Sin Google / Sin Rastreadores
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          0 Tokens IA
        </span>
      </footer>
    </div>
  );
};
