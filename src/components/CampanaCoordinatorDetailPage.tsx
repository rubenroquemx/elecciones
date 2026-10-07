import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import { resetPasswordApi } from '../services/api';
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
  Pencil,
  Building2,
  Layers,
  MapPin,
  KeyRound
} from 'lucide-react';

// Icono Oficial de WhatsApp SVG
const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface CampanaCoordinatorDetailPageProps {
  coordinator: TerritorialLeader;
  account?: UserAccount;
  allLeaders: TerritorialLeader[];
  onBack: () => void;
  onEditCoordinator: (coordinatorId: string) => void;
  onImpersonate: (coordinatorAccount: UserAccount) => void;
  onDeleteCoordinator: (leaderId: string) => void;
}

export const CampanaCoordinatorDetailPage: React.FC<CampanaCoordinatorDetailPageProps> = ({
  coordinator,
  account,
  allLeaders,
  onBack,
  onEditCoordinator,
  onImpersonate,
  onDeleteCoordinator,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'streets' | 'sat'>('streets');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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
  const phone = coordinator.phone || '';
  const email = coordinator.email || '';
  const cleanPhone = phone.replace(/\D/g, '');

  // Inicializar y renderizar el mapa de la zona asignada
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
    const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
    }).addTo(map);

    const assigned = coordinator.assignedSections || [];
    const bounds = L.latLngBounds([]);
    let sectionsDrawn = 0;

    assigned.forEach(secNum => {
      const clean = String(secNum).trim();
      const norm = clean.padStart(4, '0');
      const carto = CARTOGRAPHY_BY_SECTION.get(norm) || CARTOGRAPHY_BY_SECTION.get(clean);
      if (carto && carto.polygon && carto.polygon.length >= 3) {
        const latLngs: L.LatLngExpression[] = carto.polygon.map(([lon, lat]) => [lat, lon]);
        const isSat = mapLayer === 'sat';
        const poly = L.polygon(latLngs, {
          color: isSat ? '#38bdf8' : '#4f46e5',
          weight: 0.8,
          smoothFactor: 1.0,
          opacity: 0.85,
          fillColor: isSat ? '#0284c7' : '#818cf8',
          fillOpacity: isSat ? 0.24 : 0.16,
        }).addTo(map);

        poly.bindTooltip(
          `<div class="px-2 py-1 font-sans text-xs"><span class="font-bold text-slate-900 block">Sección ${carto.sectionNumber}</span><span class="text-[10px] text-slate-500">${carto.municipio} • ${carto.tipo}</span></div>`,
          { sticky: true, direction: 'top', opacity: 0.95 }
        );

        poly.on('mouseover', () => {
          poly.setStyle({
            weight: 2,
            fillOpacity: 0.48,
            fillColor: isSat ? '#38bdf8' : '#4f46e5',
            color: '#1e1b4b',
          });
          poly.bringToFront();
        });
        poly.on('mouseout', () => {
          poly.setStyle({
            weight: 0.8,
            fillOpacity: isSat ? 0.24 : 0.16,
            fillColor: isSat ? '#0284c7' : '#818cf8',
            color: isSat ? '#38bdf8' : '#4f46e5',
          });
        });

        bounds.extend(poly.getBounds());
        sectionsDrawn++;
      }
    });

    if (sectionsDrawn > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([17.9892, -92.9281], 11);
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinator.assignedSections, mapLayer]);

  const handleResetPassword = async () => {
    if (!account?.id) {
      alert('No se encontró una cuenta asociada a este coordinador.');
      return;
    }
    if (!window.confirm('¿Deseas restablecer la contraseña de este coordinador? Se generará una nueva clave temporal.')) {
      return;
    }
    setIsResettingPass(true);
    setResetFeedback(null);
    try {
      const res = await resetPasswordApi(account.id);
      if (res.success && res.temporaryPassword) {
        setTemporaryPassword(res.temporaryPassword);
        setResetFeedback('Contraseña restablecida con éxito. Cópiala o envíala ahora.');
      } else {
        alert(res.error || 'Error al restablecer la contraseña.');
      }
    } catch (err: any) {
      alert('Error de conexión al restablecer contraseña.');
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleCopyCredentials = () => {
    const passInfo = temporaryPassword ? `\n🔑 *Contraseña temporal:* ${temporaryPassword}` : '';
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL*\n\n` +
      `Estimado(a) *${coordinator.name}*,\n` +
      `Te compartimos tu acceso a la plataforma:\n\n` +
      `📍 *Campaña:* ${coordinator.territoryName}\n` +
      `👤 *Usuario:* ${username}${passInfo}\n` +
      `🔗 *Acceso:* ${window.location.origin}\n\n` +
      `Favor de ingresar para comenzar la administración territorial.`;
    navigator.clipboard.writeText(text);
    setCopiedKey('credentials');
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSendWhatsApp = () => {
    const passInfo = temporaryPassword ? `\n🔑 *Contraseña temporal:* ${temporaryPassword}` : '';
    const text = `Hola *${coordinator.name}*, te comparto tus datos de acceso a la plataforma:\n\n` +
      `🌐 *Enlace:* ${window.location.origin}\n` +
      `👤 *Usuario:* ${username}${passInfo}\n\n` +
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
    leaderId: coordinator.id,
    level: 'campana',
    territoryName: coordinator.territoryName,
    accountRoleLabel: 'Jefe de Campaña',
    avatarBg: 'bg-indigo-600',
    assignedBy: 'Super Administrador (SaaS)',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 sm:pb-16">
      {/* 1. Header Superior */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Volver al escritorio"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Jefe de Campaña
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
            {/* BOTÓN EDITAR ANTES DE ENTRAR A SU CUENTA */}
            <button
              type="button"
              onClick={() => onEditCoordinator(coordinator.id)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Editar datos del coordinador"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-600" />
              <span>Editar</span>
            </button>

            {/* BOTÓN ENTRAR A SU CUENTA */}
            <button
              type="button"
              onClick={() => onImpersonate(targetAccount)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              title="Iniciar sesión en la cuenta del coordinador"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar a su cuenta</span>
            </button>

            {/* BOTÓN ELIMINAR */}
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        
        {/* MAPA DE LA ZONA ASIGNADA ANTES DE LOS DATOS QUE OCUPA TODO EL ANCHO */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Zona Asignada: {coordinator.territoryName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                {coordinator.assignedSections?.length || 0} secciones asignadas
              </span>

              {/* Selector de tipo de capa: Calles vs Satélite */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMapLayer('streets')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                    mapLayer === 'streets'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Calles
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('sat')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                    mapLayer === 'sat'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Satélite
                </button>
              </div>
            </div>
          </div>
          <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />
        </div>

        {/* DISEÑO FLUIDO: DATOS GENERALES, CONTACTO Y MÉTRICAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
          
          {/* Fila 1: Métricas de Equipo y Avance en línea fluida */}
          <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Coordinadores</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono">{territorialCoordinators.length}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Promotores</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono">{promoters.length}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</p>
                <h3 className="text-2xl font-black text-emerald-700 font-mono">{promovidos.length}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Secciones</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono">{coordinator.assignedSections?.length || 0}</h3>
              </div>
            </div>
          </div>

          {/* Fila 2: Datos de Acceso, Contacto Directo y Demarcación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Acceso y Credenciales */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700">
                Acceso y Comunicación
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Nombre de Usuario</span>
                  <span className="font-mono font-bold text-slate-900">@{username}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Contraseña</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-xs">
                      ••••••••••••
                    </span>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isResettingPass}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Restablecer contraseña y generar nueva clave temporal"
                    >
                      <KeyRound className="w-3 h-3 text-amber-700" />
                      <span>{isResettingPass ? 'Generando...' : 'Restablecer'}</span>
                    </button>
                  </div>
                </div>

                {temporaryPassword && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900">Nueva clave temporal:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(temporaryPassword);
                          setCopiedKey('temp-pass');
                          setTimeout(() => setCopiedKey(null), 2500);
                        }}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                      >
                        {copiedKey === 'temp-pass' ? '¡Copiada!' : 'Copiar'}
                      </button>
                    </div>
                    <p className="font-mono font-bold text-xs text-amber-950 bg-white/80 px-2 py-1 rounded border border-amber-200">
                      {temporaryPassword}
                    </p>
                    {resetFeedback && (
                      <p className="text-[10px] text-amber-700 font-medium">{resetFeedback}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Teléfono</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 font-mono">{phone || 'Sin registrar'}</span>
                    {phone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Llamar directamente"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={handleSendWhatsApp}
                          className="p-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-colors cursor-pointer"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <OfficialWhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Correo Electrónico</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800">{email || 'Sin registrar'}</span>
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Enviar correo"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción de Contacto */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'credentials' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Accesos</span>
                    </>
                  )}
                </button>

                {phone && (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <OfficialWhatsAppIcon className="w-4 h-4 text-white" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Columna Derecha: Delimitación de Secciones */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700">
                Secciones Electorales Asignadas
              </h4>

              {coordinator.assignedSections && coordinator.assignedSections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {coordinator.assignedSections.map(sec => (
                    <span
                      key={sec}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-slate-700"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No hay secciones registradas en su demarcación.</p>
              )}
            </div>
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
