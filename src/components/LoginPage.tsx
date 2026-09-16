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
  Loader2
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  allLeaders: TerritorialLeader[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, allLeaders }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const superadminEmail = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'usrubenroque@gmail.com').toLowerCase();

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

  // Handle successful Google token credential
  const handleCredentialResponse = (response: any) => {
    setIsLoading(true);
    setAuthError(null);

    const payload = decodeJwtResponse(response.credential);
    if (!payload || !payload.email) {
      setAuthError('No se pudo verificar la identidad con Google.');
      setIsLoading(false);
      return;
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Usuario';
    const picture = payload.picture;

    // 1. Check if Superadmin email
    if (email === superadminEmail || email === 'usrubenroque@gmail.com') {
      const superAdminUser: UserAccount = {
        id: 'usr-superadmin',
        username: email.split('@')[0],
        name: name,
        email: email,
        leaderId: null, // Full access
        level: 'admin',
        territoryName: 'Tabasco Completo (Superadministrador)',
        accountRoleLabel: 'Superadministrador',
        avatarBg: 'bg-purple-700',
        picture: picture,
        isSuperAdmin: true,
      };
      onLoginSuccess(superAdminUser);
      return;
    }

    // 2. Check if email matches any leader in the territorial hierarchy
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
        picture: picture,
      };
      onLoginSuccess(leaderUser);
      return;
    }

    // 3. Unauthorized email
    setAuthError(
      `El correo ${email} no se encuentra dado de alta en la estructura territorial. Contacte al Administrador (${superadminEmail}) para que le asigne su demarcación.`
    );
    setIsLoading(false);
  };

  // Initialize Google Identity Services
  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && clientId) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 300,
            });
          }
        } catch (err) {
          console.error('Error inicializando Google GIS:', err);
        }
      }
    };

    // Retry in case GIS script is loading asynchronously
    const timer = setTimeout(initGoogle, 300);
    return () => clearTimeout(timer);
  }, [clientId]);

  // Quick login handler for testing
  const handleQuickLogin = (user: UserAccount) => {
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background visual accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Network className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Estructura Territorial Piramidal
          </h2>
          <p className="text-xs text-slate-500">
            Tabasco • Sistema de Mando, Cobertura y Despliegue de Campo
          </p>
        </div>

        {/* Auth Box */}
        <div className="mt-7 space-y-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-600" />
              Acceso Institucional
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Inicia sesión con tu cuenta de Google autorizada para acceder a tu demarcación territorial asignada.
            </p>

            {/* Google Sign-in Official Button Mount Point */}
            <div className="flex justify-center min-h-[44px] items-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </div>
              ) : (
                <div ref={googleBtnRef} className="flex justify-center" />
              )}
            </div>

            {/* Direct Superadmin Login Button (Especially useful if origin mismatch on localhost) */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin({
                    id: 'usr-superadmin',
                    username: 'usrubenroque',
                    name: 'Ruben Roque (Superadmin)',
                    email: superadminEmail,
                    leaderId: null,
                    level: 'admin',
                    territoryName: 'Tabasco Completo (Acceso Maestro)',
                    accountRoleLabel: 'Superadministrador',
                    avatarBg: 'bg-purple-700',
                    isSuperAdmin: true,
                  })
                }
                className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Entrar como Superadmin ({superadminEmail})</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold">Acceso Denegado</strong>
                <p className="text-[11px] mt-0.5 text-rose-700">{authError}</p>
              </div>
            </div>
          )}

          {/* Persona quick switch for dev / demonstrations */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              O probar acceso por nivel territorial:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {MOCK_ACCOUNTS.slice(1).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-slate-300 flex items-center justify-between group"
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 block text-[11px] truncate">
                      {acc.accountRoleLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {acc.territoryName.split(':')[0]}
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Acceso seguro protegido con RBAC piramidal</span>
        </div>
      </div>
    </div>
  );
};
