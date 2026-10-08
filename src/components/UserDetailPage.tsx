import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import { resetPasswordApi } from '../services/api';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
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
import { fetchStateGeoJson } from '../services/geoService';

interface UserDetailPageProps {
  leader: TerritorialLeader;
  account?: UserAccount;
  allLeaders: TerritorialLeader[];
  currentUser: UserAccount;
  onBack: () => void;
  onEdit: (leaderId: string) => void;
  onImpersonate?: (account: UserAccount) => void;
  onDelete?: (leaderId: string) => void;
}

export const UserDetailPage: React.FC<UserDetailPageProps> = ({
  leader,
  account,
  allLeaders,
  currentUser,
  onBack,
  onEdit,
  onImpersonate,
  onDelete,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'streets' | 'sat'>('streets');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Subordinados directos
  const directTeam = allLeaders.filter(l => l.parentId === leader.id && l.level !== 'promovido');
  const directPromovidos = allLeaders.filter(l => l.parentId === leader.id && l.level === 'promovido');

  // Promovidos de toda la rama
  const countBranchPromovidos = (leaderId: string): number => {
    const directP = allLeaders.filter(l => l.parentId === leaderId && l.level === 'promovido').length;
    const subs = allLeaders.filter(l => l.parentId === leaderId && l.level !== 'promovido');
    return directP + subs.reduce((acc, sub) => acc + countBranchPromovidos(sub.id), 0);
  };
  const totalPromovidosRama = countBranchPromovidos(leader.id) + (leader.currentCount || 0);

  const username = account?.username || leader.username || 'sin-usuario';
  const phone = leader.phone || account?.phone || '';
  const email = leader.email || account?.email || '';
  const cleanPhone = phone.replace(/\D/g, '');

  // Inicializar y renderizar el mapa de la zona asignada
  // Inicializar y renderizar el mapa de la zona asignada con GeoJSON oficial
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
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

    const assigned = leader.assignedSections || account?.assignedSections || [];
    const assignedSet = new Set(assigned.map(s => String(s).trim().padStart(4, '0')));
    assigned.forEach(s => assignedSet.add(String(s).trim()));

    const isSat = mapLayer === 'sat';
    let isCancelled = false;

    // Intentar cargar la cartografía GeoJSON oficial sin cruces de líneas
    fetchStateGeoJson('tab').then(geoData => {
      if (isCancelled || !mapInstanceRef.current) return;

      if (geoData && geoData.features) {
        const geoLayer = L.geoJSON(geoData, {
          filter: (feature) => {
            const sec = String(feature.properties?.seccion || '').padStart(4, '0');
            return assignedSet.has(sec) || assignedSet.has(String(Number(sec)));
          },
          style: () => ({
            color: isSat ? '#38bdf8' : '#9d2449',
            weight: 0.8,
            smoothFactor: 1.0,
            opacity: 0.85,
            fillColor: isSat ? '#0284c7' : '#9d2449',
            fillOpacity: isSat ? 0.24 : 0.16,
          }),
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(
              `<div class="px-2 py-1 font-sans text-xs">
                <span class="font-bold text-slate-900 block">Sección ${p.seccion}</span>
                <span class="text-[10px] text-slate-500">${p.municipio || ''}</span>
              </div>`,
              { sticky: true, direction: 'top', opacity: 0.95 }
            );

            layer.on('mouseover', () => {
              (layer as L.Path).setStyle({
                weight: 2,
                fillOpacity: 0.48,
                fillColor: isSat ? '#38bdf8' : '#9d2449',
                color: '#1e1b4b',
              });
              (layer as any).bringToFront?.();
            });

            layer.on('mouseout', () => {
              geoLayer.resetStyle(layer as any);
            });
          }
        }).addTo(map);

        if (geoLayer.getLayers().length > 0) {
          map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
          return;
        }
      }

      // Fallback a coordenadas locales si el GeoJSON no tuvo matches
      const bounds = L.latLngBounds([]);
      let sectionsDrawn = 0;
      assigned.forEach(secNum => {
        const clean = String(secNum).trim();
        const norm = clean.padStart(4, '0');
        const carto = CARTOGRAPHY_BY_SECTION.get(norm) || CARTOGRAPHY_BY_SECTION.get(clean);
        if (carto && carto.polygon && carto.polygon.length >= 3) {
          const latLngs: L.LatLngExpression[] = carto.polygon.map(([lon, lat]) => [lat, lon]);
          const poly = L.polygon(latLngs, {
            color: isSat ? '#38bdf8' : '#9d2449',
            weight: 0.8,
            smoothFactor: 1.0,
            opacity: 0.85,
            fillColor: isSat ? '#0284c7' : '#9d2449',
            fillOpacity: isSat ? 0.24 : 0.16,
          }).addTo(map);
          bounds.extend(poly.getBounds());
          sectionsDrawn++;
        }
      });
      if (sectionsDrawn > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView([17.9892, -92.9281], 11);
      }
    });

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leader.assignedSections, account?.assignedSections, mapLayer]);

  const handleResetPassword = async () => {
    if (!account?.id) {
      alert('No se encontró una cuenta de usuario vinculada a este integrante.');
      return;
    }
    if (!window.confirm(`¿Deseas restablecer la contraseña de @${username}? Se generará una nueva clave temporal de 10 caracteres.`)) {
      return;
    }
    setIsResettingPass(true);
    setResetFeedback(null);
    try {
      const res = await resetPasswordApi(account.id);
      if (res.success && res.temporaryPassword) {
        setTemporaryPassword(res.temporaryPassword);
        setResetFeedback('Contraseña restablecida con éxito. Cópiala o compártela ahora.');
      } else {
        alert(res.error || 'Error al restablecer la contraseña.');
      }
    } catch {
      alert('Error de conexión al restablecer contraseña.');
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleCopyCredentials = () => {
    const passInfo = temporaryPassword ? `\n🔑 *Contraseña temporal:* ${temporaryPassword}` : '';
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL*\n\n` +
      `Estimado(a) *${leader.name}*,\n` +
      `Te compartimos tu acceso oficial como *${leader.role}*:\n\n` +
      `📍 *Demarcación:* ${leader.territoryName}\n` +
      `👤 *Usuario:* ${username}${passInfo}\n` +
      `🔗 *Acceso:* ${window.location.origin}\n\n` +
      `Favor de ingresar para comenzar tus actividades de coordinación territorial.`;
    navigator.clipboard.writeText(text);
    setCopiedKey('credentials');
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSendWhatsApp = () => {
    const passInfo = temporaryPassword ? `\n🔑 *Contraseña temporal:* ${temporaryPassword}` : '';
    const text = `Hola *${leader.name}*, te comparto tus datos de acceso como *${leader.role}*:\n\n` +
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
    id: `usr-${leader.id}`,
    username,
    name: leader.name,
    email: email || `${username}@plataforma.mx`,
    leaderId: leader.id,
    level: leader.level,
    territoryName: leader.territoryName,
    accountRoleLabel: leader.role,
    avatarBg: leader.avatarBg || 'bg-[#9d2449]',
    assignedBy: currentUser.name,
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
              title="Volver al listado"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Usuarios › {leader.role}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#9d2449] border border-rose-200">
                  {leader.territoryName}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {leader.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* BOTÓN EDITAR */}
            <button
              type="button"
              onClick={() => onEdit(leader.id)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Editar datos"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-600" />
              <span>Editar</span>
            </button>

            {/* BOTÓN RESTABLECER CONTRASEÑA */}
            {account && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResettingPass}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                title="Generar nueva contraseña temporal de 10 caracteres"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>{isResettingPass ? 'Generando...' : 'Restablecer Clave'}</span>
              </button>
            )}

            {/* BOTÓN ENTRAR A SU CUENTA (IMPERSONAR - ADMIN) */}
            {currentUser.isSuperAdmin && onImpersonate && (
              <button
                type="button"
                onClick={() => onImpersonate(targetAccount)}
                className="px-4 py-2 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                title="Iniciar sesión en la vista de este usuario"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar a su cuenta</span>
              </button>
            )}

            {/* BOTÓN ELIMINAR */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(leader.id)}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Eliminar registro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Cuerpo Principal */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        
        {/* MAPA A TODO EL ANCHO DE LA DEMARCACIÓN */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#9d2449]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Demarcación Cartográfica Asignada
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setMapLayer('streets')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  mapLayer === 'streets' ? 'bg-[#9d2449] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('sat')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  mapLayer === 'sat' ? 'bg-[#9d2449] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
            </div>
          </div>
          <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />
        </div>

        {/* MÉTRICAS Y DATOS GENERALES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
          
          {/* Métricas de Equipo y Avance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Users className="w-4 h-4 text-[#9d2449]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Equipo Directo</span>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">{directTeam.length}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Promovidos (Directos)</span>
              </div>
              <p className="text-2xl font-black text-emerald-700 font-mono">{directPromovidos.length}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total en Red</span>
              </div>
              <p className="text-2xl font-black text-indigo-700 font-mono">{totalPromovidosRama}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Secciones</span>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">{leader.assignedSections?.length || 0}</p>
            </div>
          </div>

          {/* Datos de Acceso, Contacto y Secciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Acceso y Credenciales */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#9d2449]">
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
                    <span className="font-mono text-slate-500 text-xs">••••••••••••</span>
                    {account && (
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={isResettingPass}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Restablecer clave temporal"
                      >
                        <KeyRound className="w-3 h-3 text-amber-700" />
                        <span>{isResettingPass ? '...' : 'Restablecer'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {temporaryPassword && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900">Clave temporal generada:</span>
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
                  <span className="text-slate-500 font-medium">Teléfono Móvil</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 font-mono">{phone || 'Sin registrar'}</span>
                    {cleanPhone && (
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
                          title="Enviar WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
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

              {/* Botones de Compartir */}
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
                      <span>Compartir Accesos</span>
                    </>
                  )}
                </button>

                {cleanPhone && (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-white" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Columna Derecha: Secciones Electorales */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#9d2449]">
                Secciones Electorales Asignadas
              </h4>

              {leader.assignedSections && leader.assignedSections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {leader.assignedSections.map(sec => (
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

              {/* Subordinados directos resumen */}
              <div className="pt-2">
                <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Equipo Subordinado Directo ({directTeam.length})
                </h5>
                {directTeam.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No ha registrado integrantes en su equipo aún.</p>
                ) : (
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl border border-slate-100 max-h-44 overflow-y-auto">
                    {directTeam.map(sub => (
                      <div key={sub.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{sub.name}</p>
                          <p className="text-[10px] text-slate-400">{sub.role} • {sub.territoryName}</p>
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          @{sub.username || 'sin-usuario'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer */}
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
