import React, { useState } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  KeyRound, 
  Flag,
  CheckCircle2
} from 'lucide-react';

interface CampanaCoordinatorEditPageProps {
  coordinator: TerritorialLeader;
  account?: UserAccount;
  onBack: () => void;
  onSave: (updatedLeader: TerritorialLeader, updatedAccount?: UserAccount) => Promise<void>;
}

export const CampanaCoordinatorEditPage: React.FC<CampanaCoordinatorEditPageProps> = ({
  coordinator,
  account,
  onBack,
  onSave,
}) => {
  const [name, setName] = useState(coordinator.name);
  const [territoryName, setTerritoryName] = useState(coordinator.territoryName);
  const [phone, setPhone] = useState(coordinator.phone || '');
  const [email, setEmail] = useState(coordinator.email || '');
  const [username, setUsername] = useState(account?.username || coordinator.username || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedLeader: TerritorialLeader = {
        ...coordinator,
        name: name.trim(),
        territoryName: territoryName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        username: username.trim().toLowerCase(),
      };

      const updatedAccount: UserAccount | undefined = account ? {
        ...account,
        name: name.trim(),
        territoryName: territoryName.trim(),
        email: email.trim(),
        username: username.trim().toLowerCase(),
        ...(password.trim() ? { password: password.trim() } : {}),
      } : undefined;

      await onSave(updatedLeader, updatedAccount);
      setSaveSuccess(true);
      setTimeout(() => {
        onBack();
      }, 800);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header Superior */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <h1 className="text-sm sm:text-base font-bold text-slate-900">
            Editar Jefe de Campaña
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Formulario Principal en Página Completa */}
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900">
              Datos de {coordinator.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Actualiza la información general, de contacto y credenciales del jefe de campaña.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cambios guardados con éxito. Regresando...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre Completo del Coordinador *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Campaña / Demarcación *
                </label>
                <div className="relative">
                  <Flag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={territoryName}
                    onChange={(e) => setTerritoryName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9932211045"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coordinador@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-3.5 top-2.5 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Dejar vacío para conservar actual"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onBack}
                disabled={isSaving}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
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
