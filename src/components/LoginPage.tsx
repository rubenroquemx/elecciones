import React, { useEffect, useRef, useState } from 'react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader } from '../types/territory';
import { MOCK_ACCOUNTS } from '../data/mockAuthData';
import { 
  Network, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Mail, 
  KeyRound
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  allLeaders: TerritorialLeader[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, allLeaders }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');

  // Runtime environment variables from server or fallback
  const clientId =
    (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_GOOGLE_CLIENT_ID) ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '791878516583-f9hht0avcqd4cvv3o2rvhovsqe7bdvat.apps.googleusercontent.com';

  const superadminEmail = (
    (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPERADMIN_EMAIL) ||
    import.meta.env.VITE_SUPERADMIN_EMAIL ||
    'usrubenroque@gmail.com'
  ).toLowerCase();

  // Helper to parse JWT token from Google
  const decodeJwtResponse = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding Google JWT token', e);
      return null;
    }
  };

  // Authenticate by verified email (works for both Google and direct email)
  const authenticateEmail = (emailInput: string, nameInput?: string, pictureInput?: string) => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setAuthError('Por favor ingresa un correo electrónico.');
      return;
    }

    setAuthError(null);
    setIsLoading(true);

    // 1. Superadmin match
    if (email === superadminEmail || email === 'usrubenroque@gmail.com') {
      const superAdminUser: UserAccount = {
        id: 'usr-superadmin',
        username: email.split('@')[0],
        name: nameInput || 'Ruben Roque',
        email: email,
        leaderId: null, // Acceso global
        level: 'admin',
        territoryName: 'Tabasco Completo (Superadministrador)',
        accountRoleLabel: 'Superadministrador',
        avatarBg: 'bg-purple-700',
        picture: pictureInput,
        isSuperAdmin: true,
      };
      onLoginSuccess(superAdminUser);
      return;
    }

    // 2. Check if email matches any territorial leader in hierarchy
    const matchingLeader = allLeaders.find(
      (l) => l.email && l.email.toLowerCase() === email
    );

    if (matchingLeader) {
      const leaderUser: UserAccount = {
        id: `usr-${matchingLeader.id}`,
        username: matchingLeader.username || email.split('@')[0],
        name: matchingLeader.name,
        email: email,
        leaderId: matchingLeader.id,
        level: matchingLeader.level,
        territoryName: matchingLeader.territoryName,
        accountRoleLabel: matchingLeader.role,
        avatarBg: matchingLeader.avatarBg || 'bg-indigo-600',
        picture: pictureInput,
      };
      onLoginSuccess(leaderUser);
      return;
    }

    // 3. Check mock accounts
    const mockMatch = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
    if (mockMatch) {
      onLoginSuccess({
        ...mockMatch,
        picture: pictureInput,
      });
      return;
    }

    // 4. Unauthorized email
    setIsLoading(false);
    setAuthError(
      `El correo "${email}" no está registrado en la estructura territorial. Contacte al Administrador (${superadminEmail}) para que le asigne su demarcación.`
    );
  };

  // Google credential response
  const handleCredentialResponse = (response: any) => {
    const payload = decodeJwtResponse(response.credential);
    if (!payload || !payload.email) {
      setAuthError('No se pudo verificar la identidad con Google.');
      return;
    }
    authenticateEmail(payload.email, payload.name || payload.given_name, payload.picture);
  };

  // Initialize Google Identity Services with automatic script loader and retry
  useEffect(() => {
    let intervalId: any = null;

    const renderGoogleBtn = () => {
      if ((window as any).google?.accounts?.id && googleBtnRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          googleBtnRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });
          return true;
        } catch (e) {
          console.error('Error renderizando botón de Google:', e);
        }
      }
      return false;
    };

    // Dynamically inject Google script if not yet loaded
    if (!(window as any).google?.accounts?.id) {
      const existing = document.getElementById('google-gis-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'google-gis-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => renderGoogleBtn();
        document.head.appendChild(script);
      }
    }

    if (!renderGoogleBtn()) {
      intervalId = setInterval(() => {
        if (renderGoogleBtn()) {
          clearInterval(intervalId);
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [clientId]);

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-7 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-13 h-13 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-2">
            <Network className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Estructura Territorial Piramidal
          </h2>
          <p className="text-xs text-slate-500">
            Tabasco • Sistema de Mando y Despliegue Electoral
          </p>
        </div>

        {/* Superadmin Direct Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => authenticateEmail(superadminEmail, 'Ruben Roque')}
            className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-md shadow-indigo-900/20 transition-all active:scale-[0.99] border border-indigo-700/30 group"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Acceder como Superadmin ({superadminEmail})</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>

        {/* Tabs: Google / Email */}
        <div className="mt-4 bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'google'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Google One-Click</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'email'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Ingreso por Correo</span>
          </button>
        </div>

        {/* Tab 1: Google Login */}
        {activeTab === 'google' && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-3">
            <p className="text-[11px] text-slate-500">
              Usa tu cuenta de Google institucional para entrar de inmediato:
            </p>

            <div className="flex justify-center min-h-[44px] items-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando con Google...</span>
                </div>
              ) : (
                <div ref={googleBtnRef} className="flex justify-center" />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Manual Email Login */}
        {activeTab === 'email' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              authenticateEmail(manualEmail);
            }}
            className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 text-xs"
          >
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Correo Electrónico Registrado:
              </label>
              <input
                type="email"
                required
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="ej. usrubenroque@gmail.com o tu correo oficial"
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500 text-xs shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Iniciar Sesión</span>
            </button>
          </form>
        )}

        {/* Error Banner */}
        {authError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Acceso Denegado</strong>
              <p className="text-[11px] mt-0.5 text-rose-700">{authError}</p>
            </div>
          </div>
        )}

        {/* Quick Roles Sandbox */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            O probar acceso directo por rol territorial:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {MOCK_ACCOUNTS.slice(1).map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onLoginSuccess(acc)}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-slate-300 flex items-center justify-between group"
              >
                <div className="truncate">
                  <span className="font-semibold text-slate-800 block text-[11px] truncate">
                    {acc.accountRoleLabel}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {acc.name.split(' ')[0]} {acc.name.split(' ')[1] || ''}
                  </span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>Acceso seguro protegido con jerarquía y RBAC</span>
        </div>
      </div>
    </div>
  );
};
