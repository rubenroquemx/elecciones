import React, { useState, useEffect } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  getAllowedChildLevel, 
  getAllowedLevelsForCreator, 
  getDefaultRoleForLevel, 
  ORDERED_LEVELS 
} from '../utils/hierarchy';
import { 
  X, 
  Save, 
  UserPlus, 
  UserCheck, 
  ShieldCheck, 
  Lock,
  Sparkles
} from 'lucide-react';

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
  const isSuperAdmin = currentUser.level === 'admin';
  const allowedLevels: TerritorialLevel[] = getAllowedLevelsForCreator(currentUser.level);
  const defaultInitialLevel: TerritorialLevel = isSuperAdmin 
    ? 'distrital' 
    : (getAllowedChildLevel(currentUser.level) || 'promovido');
  const isPromotorCreator = currentUser.level === 'promotor';

  const [formData, setFormData] = useState<Partial<TerritorialLeader>>({
    name: '',
    role: '',
    level: defaultInitialLevel,
    levelIndex: ORDERED_LEVELS.indexOf(defaultInitialLevel),
    parentId: currentUser.leaderId || null,
    territoryName: '',
    code: '',
    phone: '',
    email: '',
    username: '',
    hasAccount: defaultInitialLevel !== 'promovido',
    metaGoal: defaultInitialLevel === 'promovido' ? 1 : 1000,
    currentCount: defaultInitialLevel === 'promovido' ? 1 : 0,
    status: defaultInitialLevel === 'promovido' ? 'completado' : 'en_progreso',
    validationStatus: 'validado',
    notes: '',
  });

  useEffect(() => {
    if (editingLeader) {
      setFormData({
        ...editingLeader,
      });
    } else {
      // Modo Creación:
      // Superadmin arranca con distrital (o estatal), los demás fijados estrictamente a su inferior inmediato
      const targetLevel = isSuperAdmin ? 'distrital' : defaultInitialLevel;
      const targetLevelIdx = ORDERED_LEVELS.indexOf(targetLevel);

      let defaultParentId = currentUser.leaderId;
      if (isSuperAdmin) {
        // Para superadmin, buscar si hay un líder del nivel superior inmediato
        const parentLvlIdx = Math.max(0, targetLevelIdx - 1);
        const parentLvl = ORDERED_LEVELS[parentLvlIdx];
        const match = allLeaders.find(l => l.level === parentLvl);
        defaultParentId = match ? match.id : (allLeaders[0]?.id || null);
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
        metaGoal: targetLevel === 'promovido' ? 1 : 1000,
        currentCount: targetLevel === 'promovido' ? 1 : 0,
        status: targetLevel === 'promovido' ? 'completado' : 'en_progreso',
        validationStatus: 'validado',
        notes: '',
        avatarBg: 'bg-indigo-600',
      });
    }
  }, [editingLeader, allLeaders, isOpen, currentUser, isSuperAdmin, defaultInitialLevel]);

  if (!isOpen) return null;

  // Nivel seleccionado actual
  const currentLevel = (formData.level as TerritorialLevel) || defaultInitialLevel;
  const currentLevelIndex = ORDERED_LEVELS.indexOf(currentLevel);
  const curConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG.promotor;

  // Candidatos a superior inmediato según el nivel a crear
  const parentCandidates = allLeaders.filter(l => {
    if (editingLeader && l.id === editingLeader.id) return false;
    // Si es estatal, no requiere superior
    if (currentLevel === 'estatal') return false;
    // Para otros niveles, su superior idealmente es del nivel anterior
    if (currentLevelIndex > 0) {
      const requiredSuperiorLevel = ORDERED_LEVELS[currentLevelIndex - 1];
      return l.level === requiredSuperiorLevel;
    }
    return true;
  });

  const handleLevelChange = (newLevel: TerritorialLevel) => {
    const newIdx = ORDERED_LEVELS.indexOf(newLevel);
    const hasAcc = newLevel !== 'promovido';

    // Buscar superior recomendado para el nuevo nivel
    let newParentId: string | null = null;
    if (newLevel !== 'estatal' && newIdx > 0) {
      const superiorLvl = ORDERED_LEVELS[newIdx - 1];
      const match = allLeaders.find(l => l.level === superiorLvl);
      newParentId = match ? match.id : null;
    }

    setFormData(prev => ({
      ...prev,
      level: newLevel,
      levelIndex: newIdx,
      role: getDefaultRoleForLevel(newLevel),
      parentId: newParentId,
      hasAccount: hasAcc,
      metaGoal: newLevel === 'promovido' ? 1 : (newLevel === 'estatal' ? 500000 : 1000),
      currentCount: newLevel === 'promovido' ? 1 : 0,
      status: newLevel === 'promovido' ? 'completado' : 'en_progreso',
    }));
  };

  const handleNameChange = (name: string) => {
    const cleanUser = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');

    setFormData(prev => ({
      ...prev,
      name,
      username: prev.username || (cleanUser ? `${cleanUser}` : ''),
      email: prev.email || (cleanUser ? `${cleanUser}@organizacion-tabasco.mx` : ''),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Por favor ingrese el nombre del integrante.');
      return;
    }
    if (!formData.territoryName?.trim()) {
      alert('Por favor especifique la demarcación territorial (Distrito, Sección o Zona).');
      return;
    }

    const effectiveLevel = (formData.level as TerritorialLevel) || defaultInitialLevel;
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
      avatarBg: formData.avatarBg || curConfig.border.replace('border-', 'bg-') || 'bg-indigo-600',
    };

    onSave(finalLeader);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {editingLeader ? (
              <UserCheck className="w-5 h-5 text-sky-600" />
            ) : isSuperAdmin ? (
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-indigo-600" />
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingLeader
                  ? 'Modificar Registro Territorial'
                  : isSuperAdmin
                  ? 'Registrar Integrante (Privilegio Superadmin)'
                  : isPromotorCreator
                  ? 'Registrar Nuevo Ciudadano Promovido'
                  : `Crear: ${curConfig.label}`
                }
              </h3>
              <p className="text-[11px] text-slate-500">
                {isSuperAdmin
                  ? 'Como Superadministrador puede registrar cualquier nivel de la estructura jerárquica.'
                  : `Regla de Mando: Únicamente puede registrar a su inferior inmediato (${curConfig.label}).`
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
          
          {/* SELECTOR DE NIVEL JERÁRQUICO */}
          {isSuperAdmin && !editingLeader ? (
            // 1. Superadmin: Selector de Nivel Libre y Desbloqueado
            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-purple-950 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Nivel Jerárquico a Registrar (Selección Libre de Superadmin) *
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">
                  Acceso Total
                </span>
              </div>
              <select
                value={currentLevel}
                onChange={(e) => handleLevelChange(e.target.value as TerritorialLevel)}
                className="w-full bg-white text-slate-900 font-bold px-3 py-2 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer"
              >
                {allowedLevels.map((lvl) => {
                  const cfg = LEVEL_CONFIG[lvl];
                  return (
                    <option key={lvl} value={lvl}>
                      Nivel {ORDERED_LEVELS.indexOf(lvl)}: {cfg ? cfg.label : lvl}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-purple-700">
                Seleccione el nivel del organigrama. El formulario se adaptará automáticamente a los requerimientos del cargo.
              </p>
            </div>
          ) : (
            // 2. Otros usuarios: Nivel Bloqueado estrictamente a su inferior inmediato
            <div className={`p-3 rounded-xl border ${curConfig.bgLight} ${curConfig.border} flex items-center justify-between`}>
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${curConfig.color} uppercase tracking-wide`}>
                    {curConfig.label}
                  </span>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                    Nivel {formData.levelIndex ?? 0}
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Inferior Inmediato
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {formData.hasAccount 
                    ? '✓ Cuenta de usuario activa en el sistema con acceso restringido a su propia demarcación.'
                    : 'ℹ Registro de ciudadano promovido/simpatizante (no requiere acceso de sistema).'
                  }
                </p>
              </div>
              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${curConfig.border.replace('border-', 'bg-')}`} />
            </div>
          )}

          {/* Nombre y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {currentLevel === 'promovido' ? 'Nombre Completo del Ciudadano *' : 'Nombre Completo del Responsable *'}
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={currentLevel === 'promovido' ? "Ej. Roberto Gómez Sánchez" : "Ej. Lic. Roberto Gómez Sánchez"}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
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
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Superior Inmediato */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {currentLevel === 'promovido' ? 'Promotor Responsable de Afiliación' : 'Superior Inmediato (Líder Directo)'}
            </label>
            {isPromotorCreator ? (
              <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                {currentUser.name} ({currentUser.territoryName})
              </div>
            ) : (
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                {currentLevel === 'estatal' && (
                  <option value="">(Cúspide Estatal - Sin Superior Directo / Raíz)</option>
                )}
                {parentCandidates.length === 0 && currentLevel !== 'estatal' && (
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
              <label className="block text-slate-700 font-semibold mb-1">
                Demarcación Territorial Asignada *
              </label>
              <input
                type="text"
                required
                value={formData.territoryName || ''}
                onChange={(e) => setFormData({ ...formData, territoryName: e.target.value })}
                placeholder="Ej. Distrito Local 04, Zona Tamulté o Sección 0234"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Clave / Código Oficial
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej. DTO-04 o SEC-0234"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Teléfono / WhatsApp de Contacto
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+52 993 123 4567"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Correo Electrónico {formData.hasAccount && '(Credencial de Acceso) *'}
              </label>
              <input
                type="email"
                required={formData.hasAccount}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@organizacion-tabasco.mx"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Meta y Conteo Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Meta de Captación / Afiliación Asignada
              </label>
              <input
                type="number"
                min="0"
                value={formData.metaGoal ?? 0}
                onChange={(e) => setFormData({ ...formData, metaGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Logrado / Registrado a la Fecha
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentCount ?? 0}
                onChange={(e) => setFormData({ ...formData, currentCount: parseInt(e.target.value) || 0 })}
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs font-mono font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Notas u Observaciones */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Notas u Observaciones Operativas
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalles sobre asignación territorial, casillas o compromisos..."
              className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{editingLeader ? 'Guardar Cambios' : 'Registrar en Estructura'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
