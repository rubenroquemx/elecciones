import React, { useState } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { 
  Building2, 
  X, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Target, 
  Check, 
  Copy, 
  ShieldCheck
} from 'lucide-react';

interface CreateCampanaCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leader: TerritorialLeader, account: UserAccount) => Promise<void>;
}

export const CreateCampanaCoordinatorModal: React.FC<CreateCampanaCoordinatorModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [territoryName, setTerritoryName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [metaGoal, setMetaGoal] = useState<number>(3500);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState<UserAccount | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/\s+/g, '.')) {
      const parts = val.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
      if (parts.length >= 2) {
        setUsername(`${parts[0]}.${parts[1]}`);
        if (!email) setEmail(`${parts[0]}.${parts[1]}@campana-electoral.mx`);
      } else if (parts[0]) {
        setUsername(parts[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !territoryName.trim() || !username.trim()) {
      alert('Por favor completa el nombre, territorio y usuario.');
      return;
    }

    setSaving(true);
    const id = `coord-campana-${username.toLowerCase().replace(/[^a-z0-9]/g, '-') || Date.now()}`;
    const cleanPassword = password.trim() || 'campana2026';

    const newLeader: TerritorialLeader = {
      id,
      name: name.trim(),
      role: 'Coordinador de Campaña',
      level: 'campana',
      levelIndex: 0,
      parentId: null,
      territoryName: territoryName.trim(),
      code: code.trim() || `CAMP-${Date.now().toString().slice(-4)}`,
      email: email.trim() || undefined,
      username: username.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      hasAccount: true,
      metaGoal: Number(metaGoal) || 0,
      currentCount: 0,
      status: 'en_progreso',
      validationStatus: 'validado',
      avatarBg: 'bg-indigo-600',
      notes: notes.trim() || 'Coordinador General de Campaña registrado desde Panel Superadmin SaaS.',
    };

    const newAccount: UserAccount = {
      id: `usr-${id}`,
      username: username.trim().toLowerCase(),
      name: name.trim(),
      email: (email.trim() || `${username.trim().toLowerCase()}@campana-electoral.mx`).toLowerCase(),
      password: cleanPassword,
      leaderId: id,
      level: 'campana',
      territoryName: territoryName.trim(),
      accountRoleLabel: 'Coordinador de Campaña',
      avatarBg: 'bg-indigo-600',
      assignedBy: 'Super Administrador (SaaS)',
    };

    try {
      await onSave(newLeader, newAccount);
      setCreatedSuccess(newAccount);
    } catch (err: any) {
      console.error('Error creando coordinador de campaña:', err);
      alert('Error al guardar el coordinador: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!createdSuccess) return;
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL (SAAS)*\n\n` +
      `Estimado(a) *${createdSuccess.name}*,\n` +
      `Has sido dado de alta como *Coordinador de Campaña*:\n` +
      `📍 *Campaña:* ${createdSuccess.territoryName}\n` +
      `👤 *Usuario:* ${createdSuccess.username}\n` +
      `🔑 *Contraseña:* ${createdSuccess.password || 'campana2026'}\n` +
      `🔗 *Acceso:* https://elecciones.legislab.app\n\n` +
      `Inicia sesión para gestionar tus coordinadores territoriales, promotores y cobertura seccional.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-emil-fade">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Dar de Alta Coordinador de Campaña
              </h3>
              <p className="text-xs text-indigo-200/80">
                Panel Superadmin SaaS • Asignación de nueva campaña o demarcación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {createdSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-emerald-950">
                  ¡Coordinador de Campaña Creado con Éxito!
                </h4>
                <p className="text-xs text-emerald-800">
                  El coordinador ya cuenta con acceso para gestionar su campaña territorial.
                </p>
              </div>

              {/* Ficha de Accesos */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Coordinador:</span>
                  <span className="font-bold text-slate-900 font-sans">{createdSuccess.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Demarcación:</span>
                  <span className="font-bold text-indigo-600 font-sans">{createdSuccess.territoryName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Usuario:</span>
                  <span className="font-bold text-slate-900">{createdSuccess.username}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Contraseña:</span>
                  <span className="font-bold text-emerald-700">{createdSuccess.password || 'campana2026'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plataforma:</span>
                  <span className="text-slate-600">https://elecciones.legislab.app</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Credenciales para WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo del Coordinador *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej. Lic. Roberto González Estrada"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Territorio o Campaña */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Demarcación / Nombre de la Campaña *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={territoryName}
                      onChange={(e) => setTerritoryName(e.target.value)}
                      placeholder="Ej. Distrito Local 06 (Centro Oriente) o Presidencia Centro"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Código */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Campaña
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. CAMP-DTO-06"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+52 993 123 4567"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Usuario */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="ej. roberto.campana"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña Inicial *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="campana2026"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="roberto@campana.mx"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Meta Global */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meta Global de Promovidos
                  </label>
                  <div className="relative">
                    <Target className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      value={metaGoal}
                      onChange={(e) => setMetaGoal(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notas u Observaciones de la Campaña
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones especiales, límites geográficos o enlace con el Superadmin..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {saving ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Crear Coordinador y Asignar Campaña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
