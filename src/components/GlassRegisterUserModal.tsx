import React, { useState } from 'react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import {
  X,
  UserPlus,
  Mail,
  User,
  Phone,
  Shield,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface GlassRegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterUser: (newUser: UserAccount, newLeader: TerritorialLeader) => void;
  onSimulateLogin: (user: UserAccount) => void;
  allLeaders: TerritorialLeader[];
}

export const GlassRegisterUserModal: React.FC<GlassRegisterUserModalProps> = ({
  isOpen,
  onClose,
  onRegisterUser,
  onSimulateLogin,
  allLeaders,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [districtType, setDistrictType] = useState<'local' | 'federal'>('local');
  const [selectedDistrictNumber, setSelectedDistrictNumber] = useState<number>(6);
  const [registeredUser, setRegisteredUser] = useState<UserAccount | null>(null);

  if (!isOpen) return null;

  // Tabasco Local Districts list with section counts
  const localDistricts = [
    { num: 1, name: 'Distrito Local 01 - Cárdenas / Huimanguillo', sections: 56 },
    { num: 2, name: 'Distrito Local 02 - Cárdenas Poniente', sections: 52 },
    { num: 3, name: 'Distrito Local 03 - Cárdenas Oriente', sections: 50 },
    { num: 4, name: 'Distrito Local 04 - Centla / Frontera', sections: 64 },
    { num: 5, name: 'Distrito Local 05 - Centro Norte (Villahermosa)', sections: 34 },
    { num: 6, name: 'Distrito Local 06 - Centro Oriente (Tamulté / Atasta)', sections: 44 },
    { num: 7, name: 'Distrito Local 07 - Centro Poniente', sections: 61 },
    { num: 8, name: 'Distrito Local 08 - Centro Centro (Casco Urbano)', sections: 53 },
    { num: 9, name: 'Distrito Local 09 - Centro Sur (Gaviotas / Manga)', sections: 85 },
    { num: 10, name: 'Distrito Local 10 - Centro / Ocuiltzapotlán', sections: 39 },
    { num: 11, name: 'Distrito Local 11 - Comalcalco Norte', sections: 48 },
    { num: 12, name: 'Distrito Local 12 - Comalcalco Sur', sections: 52 },
    { num: 13, name: 'Distrito Local 13 - Cunduacán', sections: 50 },
    { num: 14, name: 'Distrito Local 14 - Emiliano Zapata / Jonuta / Balancán', sections: 82 },
    { num: 15, name: 'Distrito Local 15 - Huimanguillo Norte', sections: 63 },
    { num: 16, name: 'Distrito Local 16 - Huimanguillo Sur', sections: 70 },
    { num: 17, name: 'Distrito Local 17 - Jalpa de Méndez', sections: 48 },
    { num: 18, name: 'Distrito Local 18 - Macuspana Norte', sections: 42 },
    { num: 19, name: 'Distrito Local 19 - Macuspana Sur', sections: 55 },
    { num: 20, name: 'Distrito Local 20 - Nacajuca', sections: 54 },
    { num: 21, name: 'Distrito Local 21 - Teapa / Tacotalpa / Jalapa', sections: 89 },
  ];

  // Tabasco Federal Districts list
  const federalDistricts = [
    { num: 1, name: 'Distrito Federal 01 - Macuspana / Balancán / Jonuta / Tenosique', sections: 213 },
    { num: 2, name: 'Distrito Federal 02 - Cárdenas / Huimanguillo', sections: 221 },
    { num: 3, name: 'Distrito Federal 03 - Comalcalco / Cunduacán', sections: 160 },
    { num: 4, name: 'Distrito Federal 04 - Centro (Villahermosa)', sections: 229 },
    { num: 5, name: 'Distrito Federal 05 - Paraíso / Centla / Jalpa', sections: 199 },
    { num: 6, name: 'Distrito Federal 06 - Centro Sur / Teapa / Tacotalpa', sections: 171 },
  ];

  const currentDistrictsList = districtType === 'local' ? localDistricts : federalDistricts;
  const currentDistrictInfo = currentDistrictsList.find((d) => d.num === selectedDistrictNumber) || currentDistrictsList[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      alert('Por favor completa el nombre y correo electrónico.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const userId = `usr-dist-${districtType}-${selectedDistrictNumber}`;
    const leaderId = `coord-dist-${districtType}-${selectedDistrictNumber}`;
    const roleLabel = districtType === 'local'
      ? `Coordinador(a) Distrital Local 0${selectedDistrictNumber}`
      : `Coordinador(a) Distrital Federal 0${selectedDistrictNumber}`;

    const territoryLabel = districtType === 'local'
      ? `Distrito Local 0${selectedDistrictNumber} - ${currentDistrictInfo.name.split(' - ')[1] || 'Tabasco'}`
      : `Distrito Federal 0${selectedDistrictNumber} - ${currentDistrictInfo.name.split(' - ')[1] || 'Tabasco'}`;

    // Find state root node to attach this coordinator
    const stateLeader = allLeaders.find((l) => l.level === 'estatal') || allLeaders[0];

    // New Territorial Leader Node
    const newLeader: TerritorialLeader = {
      id: leaderId,
      name: name.trim(),
      role: roleLabel,
      level: 'distrital' as TerritorialLevel,
      levelIndex: 1,
      parentId: stateLeader ? stateLeader.id : null,
      territoryName: territoryLabel,
      code: `DTO-${districtType.toUpperCase()}-0${selectedDistrictNumber}`,
      phone: phone.trim() || '+52 993 100 0000',
      email: cleanEmail,
      username: cleanEmail.split('@')[0],
      hasAccount: true,
      avatarBg: districtType === 'local' ? 'bg-violet-600' : 'bg-indigo-600',
      metaGoal: districtType === 'local' ? 25000 : 80000,
      currentCount: 1500,
      status: 'en_progreso',
      validationStatus: 'validado',
      notes: `Coordinación asignada por Superadministrador. Supervisa ${currentDistrictInfo.sections} secciones electorales.`,
    };

    // New User Account
    const newUser: UserAccount = {
      id: userId,
      username: cleanEmail.split('@')[0],
      name: name.trim(),
      email: cleanEmail,
      leaderId: leaderId,
      level: 'distrital',
      territoryName: territoryLabel,
      accountRoleLabel: roleLabel,
      avatarBg: districtType === 'local' ? 'bg-violet-600' : 'bg-indigo-600',
    };

    onRegisterUser(newUser, newLeader);
    setRegisteredUser(newUser);
  };

  const handleSimulate = () => {
    if (registeredUser) {
      onSimulateLogin(registeredUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-white/30 flex items-center justify-center text-white shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Dar de Alta Nuevo Usuario
              </h2>
              <p className="text-xs text-slate-400">
                Acceso Superadministrador • Asignación de demarcación distrital
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Form OR Success Simulation Panel */}
        {registeredUser ? (
          <div className="py-6 space-y-6 text-center relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ¡Usuario Registrado con Éxito!
              </span>
              <h3 className="text-xl font-black text-white pt-1">
                {registeredUser.name}
              </h3>
              <p className="text-xs text-slate-300">
                Asignado a: <strong className="text-white">{registeredUser.territoryName}</strong>
              </p>
              <div className="p-3 rounded-2xl glass-card text-xs text-indigo-300 border border-indigo-400/30 flex items-center justify-between">
                <span>Secciones que verá en su dashboard:</span>
                <strong className="text-white text-sm font-black">{currentDistrictInfo.sections} secciones</strong>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSimulate}
                className="w-full sm:w-auto px-6 py-3 rounded-xl glass-button-primary text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simular Inicio de Sesión como este Usuario</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-xl glass-button text-xs font-bold cursor-pointer text-slate-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-5 space-y-4 relative z-10">
            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Correo Electrónico del Usuario *</span>
              </label>
              <input
                type="email"
                required
                placeholder="ej. nuevo.coordinador@organizacion.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Este correo servirá para que el nuevo usuario inicie sesión en la plataforma.
              </span>
            </div>

            {/* Nombre Completo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Nombre Completo *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Mariana Trejo Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Teléfono / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  placeholder="ej. +52 993 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Tipo de Distrito: Local vs Federal */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nivel / Tipo de Distrito Asignado</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDistrictType('local');
                    setSelectedDistrictNumber(6);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    districtType === 'local'
                      ? 'bg-violet-600/80 text-white border border-violet-400/50 shadow-md'
                      : 'glass-card text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Distrital Local (1-21)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDistrictType('federal');
                    setSelectedDistrictNumber(4);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    districtType === 'federal'
                      ? 'bg-indigo-600/80 text-white border border-indigo-400/50 shadow-md'
                      : 'glass-card text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Distrital Federal (1-6)</span>
                </button>
              </div>
            </div>

            {/* Selector de Distrito Específico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Demarcación Distrital a Asignar</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  {currentDistrictInfo.sections} secciones asignadas
                </span>
              </label>

              <select
                value={selectedDistrictNumber}
                onChange={(e) => setSelectedDistrictNumber(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 text-xs glass-input rounded-xl text-white bg-[#0f172a] focus:outline-none cursor-pointer"
              >
                {currentDistrictsList.map((d) => (
                  <option key={d.num} value={d.num} className="bg-[#0f172a] text-white">
                    {d.name} ({d.sections} secciones)
                  </option>
                ))}
              </select>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl glass-button cursor-pointer text-slate-300 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-black rounded-xl glass-button-primary cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrar Usuario</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
