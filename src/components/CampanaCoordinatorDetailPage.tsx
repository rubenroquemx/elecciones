import React, { useState } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { 
  ArrowLeft, 
  LogIn, 
  Copy, 
  Check, 
  Trash2, 
  Phone, 
  Mail, 
  Users, 
  UserCheck, 
  Eye, 
  EyeOff, 
  Send,
  Layers,
  Building2
} from 'lucide-react';

interface CampanaCoordinatorDetailPageProps {
  coordinator: TerritorialLeader;
  account?: UserAccount;
  allLeaders: TerritorialLeader[];
  onBack: () => void;
  onImpersonate: (coordinatorAccount: UserAccount) => void;
  onDeleteCoordinator: (leaderId: string) => void;
}

export const CampanaCoordinatorDetailPage: React.FC<CampanaCoordinatorDetailPageProps> = ({
  coordinator,
  account,
  allLeaders,
  onBack,
  onImpersonate,
  onDeleteCoordinator,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subordinados dependientes
  const territorialCoordinators = allLeaders.filter(
    l => l.level === 'territorial' && (l.parentId === coordinator.id || l.territoryName?.includes(coordinator.territoryName))
  );
  const territorialIds = new Set(territorialCoordinators.map(t => t.id));
  
  const promoters = allLeaders.filter(
    l => l.level === 'promotor' && (l.parentId === coordinator.id || (l.parentId && territorialIds.has(l.parentId)))
  );
  const promoterIds = new Set(promoters.map(p => p.id));

  const promovidos = allLeaders.filter(
    l => l.level === 'promovido' && (l.parentId && promoterIds.has(l.parentId))
  );

  const username = account?.username || coordinator.username || 'N/A';
  const password = account?.password || 'campana2026';
  const phone = coordinator.phone || '';
  const email = coordinator.email || '';
  const cleanPhone = phone.replace(/\D/g, '');

  const handleCopyCredentials = () => {
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL*\n\n` +
      `Estimado(a) *${coordinator.name}*,\n` +
      `Te compartimos tu acceso a la plataforma:\n\n` +
      `📍 *Campaña:* ${coordinator.territoryName}\n` +
      `👤 *Usuario:* ${username}\n` +
      `🔑 *Contraseña:* ${password}\n` +
      `🔗 *Acceso:* ${window.location.origin}\n\n` +
      `Favor de ingresar para comenzar la administración territorial.`;
    navigator.clipboard.writeText(text);
    setCopiedKey('credentials');
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSendWhatsApp = () => {
    const text = `Hola *${coordinator.name}*, te comparto tus datos de acceso a la plataforma:\n\n` +
      `🌐 *Enlace:* ${window.location.origin}\n` +
      `👤 *Usuario:* ${username}\n` +
      `🔑 *Contraseña:* ${password}\n\n` +
      `Cualquier duda, estamos a tu disposición.`;
    if (cleanPhone) {
      window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      navigator.clipboard.writeText(text);
      setCopiedKey('whatsapp');
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  const targetAccount: UserAccount = account || {
    id: `usr-${coordinator.id}`,
    username,
    name: coordinator.name,
    email: email || `${username}@campana.mx`,
    password,
    leaderId: coordinator.id,
    level: 'campana',
    territoryName: coordinator.territoryName,
    accountRoleLabel: 'Coordinador de Campaña',
    avatarBg: 'bg-indigo-600',
    assignedBy: 'Super Administrador (SaaS)',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* 1. Header Superior */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Volver a la lista de coordinadores"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Coordinador de Campaña
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {coordinator.territoryName}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {coordinator.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onImpersonate(targetAccount)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar a su cuenta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Estás seguro de eliminar permanentemente al coordinador "${coordinator.name}"?`)) {
                  onDeleteCoordinator(coordinator.id);
                  onBack();
                }
              }}
              className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Eliminar Coordinador"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Contenido Principal */}
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        {/* Métricas Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Coord. Territoriales</p>
              <h3 className="text-xl font-black text-slate-900">{territorialCoordinators.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Promotores Activos</p>
              <h3 className="text-xl font-black text-slate-900">{promoters.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Ciudadanos Promovidos</p>
              <h3 className="text-xl font-black text-slate-900">{promovidos.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Secciones</p>
              <h3 className="text-xl font-black text-slate-900">{coordinator.assignedSections?.length || 0}</h3>
            </div>
          </div>
        </div>

        {/* Paneles Informativos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Credenciales y Comunicación Directa */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
              Credenciales y Acceso al Sistema
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Nombre de Usuario</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {username}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Contraseña</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {showPassword ? password : '••••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Teléfono</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{phone || 'No registrado'}</span>
                  {phone && (
                    <>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Llamar directamente"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        title="Enviar mensaje por WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Correo Electrónico</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800">{email || 'No registrado'}</span>
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="p-1.5 bg-slate-200/60 text-slate-700 hover:bg-slate-300 rounded-lg transition-colors"
                      title="Enviar correo"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedKey === 'credentials' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copiar Accesos Completos</span>
                  </>
                )}
              </button>

              {phone && (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {/* Panel 2: Delimitación de Campaña */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
              Delimitación y Cobertura Territorial
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Demarcación Oficial</span>
                <span className="font-bold text-slate-900">{coordinator.territoryName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Nivel de Responsabilidad</span>
                <span className="font-bold text-indigo-700 uppercase">{coordinator.level}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Secciones Electorales Asignadas</span>
                <span className="font-bold text-slate-800">{coordinator.assignedSections?.length || 0} secciones</span>
              </div>
            </div>

            {coordinator.assignedSections && coordinator.assignedSections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Listado de Secciones Electorales:</p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {coordinator.assignedSections.map(sec => (
                    <span
                      key={sec}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 font-bold"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Pie de página con autoría */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white mt-auto">
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
