import React from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { MainNavSection } from './Sidebar';
import { 
  ArrowLeft, 
  Phone, 
  Smartphone, 
  Edit3, 
  MapPin, 
  CheckCircle2, 
  CreditCard, 
  FileText,
  Clock
} from 'lucide-react';

interface PromoterCitizenDetailPageProps {
  citizenId: string;
  allLeaders: TerritorialLeader[];
  onNavigate: (nav: MainNavSection) => void;
  onEdit: (citizenId: string) => void;
}

export const PromoterCitizenDetailPage: React.FC<PromoterCitizenDetailPageProps> = ({
  citizenId,
  allLeaders,
  onNavigate,
  onEdit,
}) => {
  const citizen = allLeaders.find(l => l.id === citizenId);

  if (!citizen) {
    return (
      <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-4 text-center py-16">
          <p className="text-slate-500 font-semibold text-sm">No se encontró el registro del promovido seleccionado.</p>
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="px-5 py-2 bg-slate-900 text-white rounded-none text-xs font-bold transition-colors cursor-pointer"
          >
            ← Volver al Escritorio
          </button>
        </div>
      </div>
    );
  }

  const cleanPhone = (citizen.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone.length >= 10
    ? `https://wa.me/52${cleanPhone}?text=Hola%20${encodeURIComponent(citizen.name)},%20te%20saluda%20la%20Coordinaci%C3%B3n%20Territorial.`
    : null;

  return (
    <div className="flex-1 overflow-y-auto bg-white p-0">
      {/* Barra de Encabezado Superior con esquinas rectas */}
      <div className="bg-slate-900 text-white px-5 sm:px-8 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-none transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-700" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Expediente del Promovido</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-none font-bold">
                {citizen.electoralSection ? `Sección ${citizen.electoralSection}` : 'Sección Asignada'}
              </span>
            </h1>
          </div>
        </div>

        {/* Acciones Rápidas: Llamar, WhatsApp, Editar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold transition-all flex items-center gap-1.5 shadow-none"
              title="Llamar directamente por teléfono"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Llamar</span>
            </a>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-none text-xs font-bold transition-all flex items-center gap-1.5"
              title="Abrir chat en WhatsApp"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(citizen.id)}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-none text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Editar Datos</span>
          </button>
        </div>
      </div>

      {/* Contenido en Página Limpia con Ángulos Rectos */}
      <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
        {/* Tarjeta de Identificación Principal */}
        <div className="border border-slate-200 bg-slate-50/50 p-6 rounded-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-600 text-white font-black text-xl flex items-center justify-center rounded-none shadow-sm">
                {citizen.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {citizen.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded-none font-bold">
                    Clave INE: {citizen.electorKey || 'No registrada'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-none border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Validado en Padrón</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grilla de Datos Detallados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                CURP
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {citizen.curp || 'No capturada'}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Teléfono de Contacto
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {citizen.phone || 'No registrado'}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Sección Electoral
              </span>
              <span className="font-mono font-bold text-rose-700 text-sm">
                Sección {citizen.electoralSection || '0416'}
              </span>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-white border border-slate-200 rounded-none space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Domicilio Oficial
              </span>
              <span className="text-slate-900 font-semibold text-xs block">
                {citizen.address || 'Domicilio en la sección'}
                {citizen.colonia ? ` • Col. ${citizen.colonia}` : ''}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-none space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Estatus Operativo
              </span>
              <span className="text-emerald-700 font-bold text-xs">
                Ciudadano Comprometido 2027
              </span>
            </div>
          </div>
        </div>

        {/* Fotografía de Credencial INE en el Expediente */}
        {(citizen.inePhotoUrl || citizen.photoUrl) && (
          <div className="border border-slate-200 bg-white p-6 rounded-none space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Credencial de Elector (INE) Digitalizada</span>
              </h3>
              {citizen.vigencia && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-none flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vigencia: {citizen.vigencia}</span>
                </span>
              )}
            </div>
            <div className="bg-slate-950 p-2 border border-slate-800 max-w-md">
              <img
                src={citizen.inePhotoUrl || citizen.photoUrl}
                alt={`Credencial INE de ${citizen.name}`}
                className="w-full h-auto max-h-72 object-contain"
              />
            </div>
          </div>
        )}

        {/* Sección de Observaciones y Compromiso de Campo */}
        <div className="border border-slate-200 bg-white p-6 rounded-none space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Notas de Captura y Compromiso Comunitario</span>
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 border border-slate-200 rounded-none">
            {citizen.notes || 'Registro de campo verificado en la sección asignada.'}
          </p>
        </div>
      </div>
    </div>
  );
};
