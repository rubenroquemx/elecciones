import React from 'react';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { Printer, X } from 'lucide-react';

interface PrintableSectionReportProps {
  section: ElectoralSection;
  leaders: TerritorialLeader[];
  onClose: () => void;
}

export const PrintableSectionReport: React.FC<PrintableSectionReportProps> = ({
  section,
  leaders,
  onClose,
}) => {
  const nominal = section.nominalList > 0 ? section.nominalList : 1400;
  const participacion50 = Math.round(nominal * 0.50);
  const metaGanar51 = Math.round(participacion50 * 0.51);
  const casillasProyectadas = Math.max(1, Math.ceil(nominal / 750));

  // Find assigned coordinators and promoters for this section
  const sectionLeaders = leaders.filter(
    l => (l.electoralSection && l.electoralSection.padStart(4, '0') === section.sectionNumber.padStart(4, '0')) ||
         (l.territoryName && l.territoryName.includes(section.sectionNumber))
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container - on screen: floating sheet; on print: full page */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        
        {/* On-screen control bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">Vista Previa de Impresión - Ficha de Casilla y Estructura</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documento</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Body */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-900 font-sans print:p-0">
          
          {/* Header Institucional */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                ORGANIZACIÓN ELECTORAL TERRITORIAL 2027
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                EXPEDIENTE DE SECCIÓN ELECTORAL {section.sectionNumber}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Municipio de {section.municipio} • {section.distritoLocal} • Tipo: {section.tipo}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800">
                SEC: {section.sectionNumber}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Fecha de Emisión: {new Date().toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>

          {/* Cuadrícula de Parámetros del Modelo Electoral 2027 */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="border border-slate-300 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Lista Nominal</span>
              <span className="text-lg font-black text-slate-900 block font-mono">
                {nominal.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400">Padrón Oficial INE</span>
            </div>

            <div className="border border-slate-300 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Part. Esperada (50%)</span>
              <span className="text-lg font-black text-blue-900 block font-mono">
                {participacion50.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400">Votación Proyectada</span>
            </div>

            <div className="border-2 border-slate-900 bg-slate-50 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-700 uppercase font-black block">Meta Victoria (51%)</span>
              <span className="text-lg font-black text-slate-900 block font-mono">
                {metaGanar51.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-600 font-bold">Votos Mínimos Triunfo</span>
            </div>

            <div className="border border-slate-300 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Casillas Proyectadas</span>
              <span className="text-lg font-black text-slate-900 block font-mono">
                {casillasProyectadas}
              </span>
              <span className="text-[9px] text-slate-400">Básica y Contiguas</span>
            </div>
          </div>

          {/* Sección de Estructura Territorial Asignada */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
              <span>1. Estructura y Células de Trabajo Asignadas ({section.structures.length} Comités)</span>
              <span className="text-[10px] font-normal text-slate-500 lowercase">responsables seccionales</span>
            </h3>

            {section.structures.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                Sección sin comités asignados formalmente al momento de la emisión.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-600 uppercase">
                    <th className="p-2">Célula / Comité</th>
                    <th className="p-2">Responsable</th>
                    <th className="p-2">Cargo</th>
                    <th className="p-2">Teléfono</th>
                    <th className="p-2">Clave de Elector INE</th>
                    <th className="p-2 text-center">Meta / Logro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {section.structures.map((st) => (
                    <tr key={st.id}>
                      <td className="p-2 font-bold text-slate-900">{st.name}</td>
                      <td className="p-2 font-semibold text-slate-800">{st.leaderName}</td>
                      <td className="p-2 text-slate-600">{st.leaderRole}</td>
                      <td className="p-2 font-mono text-slate-700">{st.leaderPhone || 'N/A'}</td>
                      <td className="p-2 font-mono text-slate-700">{st.electorKey || 'N/A'}</td>
                      <td className="p-2 text-center font-mono font-bold">
                        {st.currentCount} / {st.metaGoal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Listado de Integrantes y Promovidos para el Cotejo / Pase de Lista */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
              <span>2. Padrón Territorial y Promovidos Registrados ({sectionLeaders.length} Registros)</span>
              <span className="text-[10px] font-normal text-slate-500">cotejo de asistencia y movilización</span>
            </h3>

            {sectionLeaders.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                No hay personas registradas bajo esta sección en el padrón territorial.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-600 uppercase">
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2">Nombre Completo</th>
                    <th className="p-2">Rol / Nivel</th>
                    <th className="p-2">Domicilio</th>
                    <th className="p-2">Clave Elector</th>
                    <th className="p-2">Teléfono</th>
                    <th className="p-2 text-center w-16">Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sectionLeaders.map((l, idx) => (
                    <tr key={l.id}>
                      <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{l.name}</td>
                      <td className="p-2 text-slate-600">{l.role}</td>
                      <td className="p-2 text-slate-600 truncate max-w-[150px]">{l.address || l.colonia || 'N/A'}</td>
                      <td className="p-2 font-mono text-slate-700">{l.electorKey || 'N/A'}</td>
                      <td className="p-2 font-mono text-slate-700">{l.phone || 'N/A'}</td>
                      <td className="p-2 text-center">
                        <div className="w-4 h-4 border-2 border-slate-400 mx-auto rounded-xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Firmas Institucionales */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-800">
                Coordinación Seccional
              </div>
              <span className="text-[10px] text-slate-500">Firma del Responsable Seccional</span>
            </div>

            <div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-800">
                Comité de Org. Territorial (COT)
              </div>
              <span className="text-[10px] text-slate-500">Validación y Supervisión Distrital</span>
            </div>
          </div>

          {/* Footer pie de página */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Sistema Integral de Estructuras Electorales • Documento para uso operativo confidencial</span>
            <span>Página 1 de 1</span>
          </div>

        </div>

      </div>
    </div>
  );
};
