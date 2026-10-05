import React from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { MainNavSection } from './Sidebar';
import { 
  ArrowLeft, 
  Phone, 
  Smartphone, 
  Edit3, 
  Trash2,
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
  onDeleteCitizen?: (citizenId: string) => void;
}

export const PromoterCitizenDetailPage: React.FC<PromoterCitizenDetailPageProps> = ({
  citizenId,
  allLeaders,
  onNavigate,
  onEdit,
  onDeleteCitizen,
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
      {/* 1. Barra de Encabezado Superior */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-2.5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('escritorio')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
            title="Volver al escritorio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-white truncate">
            Expediente del Promovido
          </h1>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-none transition-colors cursor-pointer"
              title="Llamar directamente por teléfono"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-none transition-colors cursor-pointer"
              title="Abrir chat en WhatsApp"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(citizen.id)}
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-900 rounded-none transition-colors cursor-pointer"
            title="Editar Datos"
          >
            <Edit3 className="w-4 h-4 text-indigo-600" />
          </button>

          {onDeleteCitizen && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Estás seguro de eliminar a ${citizen.name} de tus promovidos registrados?`)) {
                  onDeleteCitizen(citizen.id);
                }
              }}
              className="w-9 h-9 flex items-center justify-center bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded-none transition-colors cursor-pointer"
              title="Eliminar Expediente"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Contenido Limpio y Plano (Sin bloques anidados innecesarios) */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">

        {/* Cabecera del Ciudadano */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {citizen.name}
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Clave INE: <span className="font-bold text-slate-800">{citizen.electorKey || 'No registrada'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {citizen.validationStatus === 'sin_validacion' ? (
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-400 rounded-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>No verificado</span>
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-none flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Validado</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lista Plana de Datos Generales (Sin cajas dentro de cajas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Sección Electoral
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              Sección {citizen.electoralSection || '0416'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              CURP
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {citizen.curp || 'No capturada'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Teléfono Celular
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {citizen.phone || 'No registrado'}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Domicilio
            </span>
            <span className="text-slate-900 font-medium text-xs block">
              {citizen.address || 'Domicilio en la sección'}
              {citizen.colonia ? `, Col. ${citizen.colonia}` : ''}
              {citizen.postalCode ? `, C.P. ${citizen.postalCode}` : ''}
            </span>
          </div>

          {citizen.postalCode && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Código Postal (CP)
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {citizen.postalCode}
              </span>
            </div>
          )}
        </div>

        {/* Fotografía de Credencial INE (Anverso y Reverso en plano limpio) */}
        {(citizen.ineAnversoUrl || citizen.ineReversoUrl || citizen.inePhotoUrl || citizen.photoUrl) && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Credencial de Elector (INE)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(citizen.ineAnversoUrl || citizen.inePhotoUrl || citizen.photoUrl) && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Anverso (Frente)
                  </span>
                  <div className="bg-slate-950 p-2 border border-slate-800">
                    <img
                      src={citizen.ineAnversoUrl || citizen.inePhotoUrl || citizen.photoUrl}
                      alt={`Anverso INE de ${citizen.name}`}
                      className="w-full h-auto max-h-56 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              {citizen.ineReversoUrl && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Reverso (Atrás)
                  </span>
                  <div className="bg-slate-950 p-2 border border-slate-800">
                    <img
                      src={citizen.ineReversoUrl}
                      alt={`Reverso INE de ${citizen.name}`}
                      className="w-full h-auto max-h-56 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observaciones (En estilo chat o lista limpia) */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Observaciones</span>
          </h3>

          {citizen.notesHistory && citizen.notesHistory.length > 0 ? (
            <div className="space-y-2">
              {citizen.notesHistory.map((note) => (
                <div key={note.id} className="bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="font-bold text-slate-700">{note.authorName}</span>
                    <span>
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{note.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200">
              {citizen.notes || 'Sin observaciones registradas.'}
            </p>
          )}
        </div>

        {/* Registro de Actividad Plano */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Historial de Registro</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {citizen.changelog?.length || 1} evento(s)
            </span>
          </div>

          <div className="space-y-2">
            {citizen.changelog && citizen.changelog.length > 0 ? (
              citizen.changelog.map((entry) => (
                <div key={entry.id} className="p-3 bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-[11px]">
                      {entry.action === 'creacion' ? 'Alta Inicial' : entry.action === 'edicion' ? 'Modificación' : entry.action}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(entry.timestamp).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700">{entry.description}</p>
                  {entry.userName && (
                    <span className="text-[10px] text-slate-400 block">
                      Por: {entry.userName}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Alta inicial de ciudadano promovido.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
