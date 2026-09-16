import React, { useState, useEffect } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { getAllowedChildLevel, getDefaultRoleForLevel, ORDERED_LEVELS } from '../utils/hierarchy';
import { X, Save, UserPlus, UserCheck, ShieldCheck, AtSign, Phone, MapPin, Target, FileText } from 'lucide-react';

interface EditLeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leader: TerritorialLeader) => void;
  editingLeader: TerritorialLeader | null;
  allLeaders: TerritorialLeader[];
  currentUser: UserAccount;
}

export const EditLeaderModal: React.FC<EditLeaderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLeader,
  allLeaders,
  currentUser,
}) => {
  const allowedLevel: TerritorialLevel | null = getAllowedChildLevel(currentUser.level);
  const isPromotorCreator = currentUser.level === 'promotor';

  const [formData, setFormData] = useState<Partial<TerritorialLeader>>({
    name: '',
    role: '',
    level: allowedLevel || 'territorial',
    levelIndex: allowedLevel ? ORDERED_LEVELS.indexOf(allowedLevel) : 1,
    parentId: currentUser.leaderId || null,
    territoryName: '',
    code: '',
    phone: '',
    email: '',
    username: '',
    hasAccount: !isPromotorCreator,
    metaGoal: isPromotorCreator ? 1 : 1000,
    currentCount: isPromotorCreator ? 1 : 0,
    status: isPromotorCreator ? 'completado' : 'en_progreso',
    validationStatus: 'validado',
    notes: '',
  });

  useEffect(() => {
    if (editingLeader) {
      setFormData({
        ...editingLeader,
      });
    } else {
      // Creation mode: enforce allowed level by user's role
      const targetLevel = allowedLevel || 'distrital';
      const targetLevelIdx = ORDERED_LEVELS.indexOf(targetLevel);
      
      // Select appropriate parent candidate
      // For Promotor, parent is ALWAYS the Promotor himself!
      // For others, default to currentUser.leaderId or the first candidate in subtree
      let defaultParentId = currentUser.leaderId;
      if (!defaultParentId && allLeaders.length > 0) {
        defaultParentId = allLeaders[0].id;
      }

      setFormData({
        id: `node-${Date.now()}`,
        name: '',
        role: getDefaultRoleForLevel(targetLevel),
        level: targetLevel,
        levelIndex: targetLevelIdx,
        parentId: defaultParentId,
        territoryName: '',
        code: '',
        phone: '',
        email: '',
        username: '',
        hasAccount: targetLevel !== 'promovido',
        metaGoal: targetLevel === 'promovido' ? 1 : 500,
        currentCount: targetLevel === 'promovido' ? 1 : 0,
        status: targetLevel === 'promovido' ? 'completado' : 'en_progreso',
        validationStatus: 'validado',
        notes: '',
        avatarBg: 'bg-indigo-600',
      });
    }
  }, [editingLeader, allLeaders, isOpen, currentUser, allowedLevel]);

  if (!isOpen) return null;

  // Potential superiors must be within the creator's visible hierarchy
  // And must be at levelIndex = targetLevelIndex - 1
  const targetLevelIndex = formData.levelIndex ?? (allowedLevel ? ORDERED_LEVELS.indexOf(allowedLevel) : 0);
  const requiredParentLevelIndex = Math.max(0, targetLevelIndex - 1);
  const requiredParentLevel = ORDERED_LEVELS[requiredParentLevelIndex];

  const parentCandidates = allLeaders.filter(l => {
    if (editingLeader && l.id === editingLeader.id) return false;
    // When creating, parent should ideally match the superior level
    if (!editingLeader && targetLevelIndex > 0) {
      return l.level === requiredParentLevel;
    }
    return true;
  });

  const handleNameChange = (name: string) => {
    const cleanUser = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');

    setFormData(prev => ({
      ...prev,
      name,
      username: prev.hasAccount && !editingLeader ? cleanUser : prev.username,
      email: prev.hasAccount && !editingLeader ? `${cleanUser}@tabasco-organizacion.mx` : prev.email,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.territoryName?.trim()) {
      alert('Por favor complete el nombre y el territorio o domicilio.');
      return;
    }

    const effectiveLevel = editingLeader ? (formData.level || 'distrital') : (allowedLevel || 'distrital');
    const effectiveLevelIndex = ORDERED_LEVELS.indexOf(effectiveLevel);
    const hasAcc = effectiveLevel !== 'promovido';

    const finalLeader: TerritorialLeader = {
      id: editingLeader?.id || `node-${Date.now()}`,
      name: formData.name.trim(),
      role: formData.role?.trim() || getDefaultRoleForLevel(effectiveLevel),
      level: effectiveLevel,
      levelIndex: effectiveLevelIndex,
      parentId: formData.parentId || null,
      territoryName: formData.territoryName.trim(),
      code: formData.code?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      email: hasAcc ? (formData.email?.trim() || undefined) : undefined,
      username: hasAcc ? (formData.username?.trim() || undefined) : undefined,
      hasAccount: hasAcc,
      metaGoal: Number(formData.metaGoal) || 0,
      currentCount: Number(formData.currentCount) || 0,
      status: formData.status || (hasAcc ? 'en_progreso' : 'completado'),
      validationStatus: formData.validationStatus || 'validado',
      notes: formData.notes?.trim() || undefined,
      avatarBg: formData.avatarBg || 'bg-indigo-600',
    };

    onSave(finalLeader);
    onClose();
  };

  const curConfig = formData.level ? LEVEL_CONFIG[formData.level] : LEVEL_CONFIG.promotor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {editingLeader ? (
              <UserCheck className="w-5 h-5 text-sky-600" />
            ) : isPromotorCreator ? (
              <UserPlus className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingLeader
                  ? 'Modificar Registro Territorial'
                  : isPromotorCreator
                    ? 'Registrar Nuevo Ciudadano Promovido'
                    : `Crear Cuenta: ${curConfig.label}`
                }
              </h3>
              <p className="text-[11px] text-slate-500">
                {isPromotorCreator
                  ? 'Registro ciudadano en territorio (sin cuenta de acceso al sistema)'
                  : `Creación restringida por rol a nivel inmediato inferior: ${curConfig.label}`
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Automatic Level & Role Banner */}
          <div className={`p-3 rounded-xl border ${curConfig.bgLight} ${curConfig.border} flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${curConfig.color} uppercase tracking-wide`}>
                  {curConfig.label}
                </span>
                <span className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                  Nivel {formData.levelIndex ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {formData.hasAccount 
                  ? '✓ Cuenta de usuario activa en el sistema con acceso a su sub-pirámide.'
                  : 'ℹ Registro de ciudadano afiliado/promovido (no requiere credenciales de sistema).'
                }
              </p>
            </div>

            <span className={`w-3 h-3 rounded-full shrink-0 ${curConfig.border.replace('border-', 'bg-')}`} />
          </div>

          {/* Nombre y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {isPromotorCreator ? 'Nombre Completo del Ciudadano *' : 'Nombre Completo del Responsable *'}
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={isPromotorCreator ? "Ej. Roberto Gómez Sánchez" : "Ej. Lic. Roberto Gómez Sánchez"}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Cargo / Rol Operativo
              </label>
              <input
                type="text"
                required
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder={curConfig.label}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Superior Inmediato */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isPromotorCreator ? 'Promotor Responsable de Afiliación' : 'Superior Inmediato (Líder Directo)'}
            </label>
            {isPromotorCreator ? (
              <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                {currentUser.name} ({currentUser.territoryName})
              </div>
            ) : (
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                {parentCandidates.length === 0 && (
                  <option value="">(Sin superiores disponibles en su ámbito)</option>
                )}
                {parentCandidates.map((p) => {
                  const pCfg = LEVEL_CONFIG[p.level];
                  return (
                    <option key={p.id} value={p.id}>
                      [{pCfg ? pCfg.label.replace('Comité de Organización ', 'Comité ') : p.level}] {p.name} — {p.territoryName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Territory & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{isPromotorCreator ? 'Dirección / Manzana / Calle *' : 'Territorio Asignado / Jurisdicción *'}</span>
              </label>
              <input
                type="text"
                required
                value={formData.territoryName || ''}
                onChange={(e) => setFormData({ ...formData, territoryName: e.target.value })}
                placeholder={isPromotorCreator ? "Calle Hidalgo #124, Tamulté" : "Ej. Sección 0234 o Zona 4-A"}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {isPromotorCreator ? 'Clave Elector / Folio' : 'Clave Oficial'}
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={isPromotorCreator ? "PMV-01" : "SEC-0234"}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* User Account Credentials (Only for levels with account: Distrital, Territorial, Seccional, Promotor) */}
          {formData.hasAccount && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <AtSign className="w-3.5 h-3.5 text-sky-600" />
                <span>Credenciales de Cuenta de Sistema</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Usuario de Acceso (@usuario) *
                  </label>
                  <input
                    type="text"
                    required={formData.hasAccount}
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="nombre.apellido"
                    className="w-full bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@tabasco-organizacion.mx"
                    className="w-full bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact and Goals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Teléfono / WhatsApp</span>
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+52 993 123 4567"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
            {!isPromotorCreator && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Meta Asignada</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.metaGoal ?? 0}
                  onChange={(e) => setFormData({ ...formData, metaGoal: Number(e.target.value) })}
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>
            )}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Estatus Operativo
              </label>
              <select
                value={formData.status || 'en_progreso'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TerritorialLeader['status'] })}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
              >
                <option value="en_progreso">En avance regular</option>
                <option value="completado">Completado / Meta Lograda</option>
                <option value="critico">En rezago</option>
                <option value="vacante">Vacante</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Observaciones / Notas de Campo</span>
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isPromotorCreator ? "Compromiso de voto, simpatía con el proyecto..." : "Notas sobre avances, reuniones o despliegue..."}
              className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 shadow-2xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{editingLeader ? 'Guardar Cambios' : isPromotorCreator ? 'Registrar Promovido' : 'Crear Cuenta y Asignar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
