
import React from 'react';
import { DataState } from '../types';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  CheckCircle, Users, Activity, Clock, ChevronRight, Info, UserX, Download, Star, Flame, Zap, Compass, AlertTriangle 
} from 'lucide-react';

interface Props {
  data: DataState;
  onShortcutClick: (prompt: string) => void;
}

const Dashboard: React.FC<Props> = ({ data, onShortcutClick }) => {
  const { insights, columns } = data;
  const registeredCount = data.cleanedData.length;
  const totalCount = insights.totalUsers;
  const unregisteredCount = insights.unregisteredCount;

  const regPercentage = totalCount > 0 ? ((registeredCount / totalCount) * 100).toFixed(1) : '0';
  const unregPercentage = totalCount > 0 ? ((unregisteredCount / totalCount) * 100).toFixed(1) : '0';

  const nameCol = columns.find(c => c.name.toLowerCase().match(/\b(nombre|first name|nombres)\b/i));
  const lastNameCol = columns.find(c => c.name.toLowerCase().match(/\b(apellido|last name|apellidos)\b/i));
  const dniCol = columns.find(c => c.type === 'IDENTIFIER' && c.name.toLowerCase().match(/(dni|documento|id|identificación|rut|cedula)/i));
  
  // Fallback para duración si no se encuentra por nombre
  const durationCol = columns.find(c => c.type === 'DURATION') || columns[columns.length - 1];
  const extraCol = dniCol || (durationCol?.type === 'DURATION' || typeof durationCol?.sampleValue === 'number' ? durationCol : null);

  const downloadCompletions = () => {
    const exportData = insights.completions.map(user => {
      const row: any = {};
      if (nameCol) row['Nombre'] = user[nameCol.name];
      if (lastNameCol) row['Apellido'] = user[lastNameCol.name];
      if (extraCol) row[extraCol.name] = user[extraCol.name];
      row['Progreso'] = "100%";
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Finalizados");
    XLSX.writeFile(workbook, "usuarios_finalizados_100.xlsx");
  };

  const matrix = insights.engagementMatrix;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total de Usuarios</p>
            <p className="text-2xl font-black text-slate-800">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Usuarios Registrados</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-slate-800">{registeredCount}</p>
              <p className="text-sm font-bold text-indigo-500">{regPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><UserX size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Usuarios No Registrados</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-slate-800">{unregisteredCount}</p>
              <p className="text-sm font-bold text-red-500">{unregPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Completaron el curso (100%)</p>
            <p className="text-2xl font-black text-slate-800">{insights.completions.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Activity size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Progreso Promedio (Registrados)</p>
            <p className="text-2xl font-black text-slate-800">
              {insights.metrics.avgProgress !== undefined 
                ? `${insights.metrics.avgProgress.toFixed(1)}%` 
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Distribution */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-indigo-500" size={20} /> Distribución de Progreso
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Segmentación de avance basada en registros activos.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.progressDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Matrix (Matriz de Compromiso) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Flame className="text-orange-500" size={20} /> Matriz de Compromiso (Esfuerzo vs Logro)
            </h3>
            <p className="text-sm text-slate-500 mt-1">Comparativa basada en las medianas de tiempo y avance.</p>
          </div>

          {matrix ? (
            <div className="flex-1 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 flex-1">
                {/* Stars */}
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-between group hover:bg-indigo-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <Star className="text-indigo-500" size={18} />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Alta Eficiencia</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-indigo-700">{matrix.stars}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">Estrellas</p>
                    <p className="text-[9px] text-indigo-400 mt-1 leading-tight">Mucho avance en poco tiempo.</p>
                  </div>
                </div>
                {/* Persisters */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col justify-between group hover:bg-emerald-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <Zap className="text-emerald-500" size={18} />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Constancia</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-emerald-700">{matrix.persisters}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Persistentes</p>
                    <p className="text-[9px] text-emerald-400 mt-1 leading-tight">Mucho avance, mucho tiempo.</p>
                  </div>
                </div>
                {/* Disconnected */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between group hover:bg-slate-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <Compass className="text-slate-400" size={18} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Abandono</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-600">{matrix.disconnected}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Desconectados</p>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">Poco avance, poco tiempo.</p>
                  </div>
                </div>
                {/* At Risk */}
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col justify-between group hover:bg-rose-100 transition-colors shadow-sm shadow-rose-100/50">
                  <div className="flex justify-between items-start">
                    <AlertTriangle className="text-rose-500" size={18} />
                    <span className="text-[10px] font-bold text-rose-400 uppercase">Frustración</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-rose-700">{matrix.atRisk}</p>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">En Riesgo</p>
                    <p className="text-[9px] text-rose-500 mt-1 leading-tight font-medium underline">Poco avance pese al mucho tiempo.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex gap-3 items-start border border-slate-100">
                <Info className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">Interpretación Ejecutiva:</span><br/>
                  El grupo <span className="text-rose-600 font-bold">En Riesgo ({matrix.atRisk})</span> es el foco crítico. Dedican más de <span className="font-mono">{matrix.medians.duration.toFixed(0)} min</span> pero su avance es inferior al <span className="font-mono">{matrix.medians.progress.toFixed(0)}%</span>. Esto sugiere contenido difícil o fallos técnicos en ese punto.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed text-center">
              <Clock className="mb-2 opacity-20" size={32} />
              <p className="text-sm">Se requiere detectar métricas de 'progreso' y 'tiempo' para generar esta matriz.</p>
            </div>
          )}
        </div>
      </div>

      {/* Completion Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Usuarios que Finalizaron (100%)</h3>
            <p className="text-sm text-slate-500">Total de {insights.completions.length} casos de éxito.</p>
          </div>
          <button 
            onClick={downloadCompletions}
            disabled={insights.completions.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm shadow-xl shadow-indigo-100"
          >
            <Download size={18} />
            Exportar Listado
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-8 py-4">{nameCol?.name || "Nombre"}</th>
                <th className="px-8 py-4">{lastNameCol?.name || "Apellido"}</th>
                {extraCol && <th className="px-8 py-4">{extraCol.name}</th>}
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insights.completions.slice(0, 10).map((user, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-700">{user[nameCol?.name || ""] || "-"}</td>
                  <td className="px-8 py-5 font-bold text-slate-700">{user[lastNameCol?.name || ""] || "-"}</td>
                  {extraCol && <td className="px-8 py-5 text-slate-500 font-mono text-xs">{user[extraCol.name] || "-"}</td>}
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Completado 100%</span>
                  </td>
                </tr>
              ))}
              {insights.completions.length === 0 && (
                <tr>
                  <td colSpan={extraCol ? 4 : 3} className="px-8 py-16 text-center text-slate-400 italic font-medium">No se detectaron usuarios al 100% de progreso.</td>
                </tr>
              )}
            </tbody>
          </table>
          {insights.completions.length > 10 && (
            <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
              <p className="text-slate-500 text-sm">Viendo los primeros 10 registros. <span className="font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => onShortcutClick('✅ ¿Quiénes completaron el curso (100%)?')}>Ver todos en el chat</span>.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-3">
        {[
          { icon: '📌', label: 'Resumen Ejecutivo', prompt: '📌 Dame un resumen ejecutivo de los hallazgos principales' },
          { icon: '📊', label: 'Análisis de Rangos', prompt: '📊 Explícame la distribución de progreso por rangos' },
          { icon: '⚠️', label: 'Alerta de Abandono', prompt: '⚠️ ¿Qué usuarios están por debajo del 25% de progreso y cuánto tiempo llevan?' },
          { icon: '⏱️', label: 'Análisis de Frustración', prompt: '⏱️ Basado en la matriz, ¿quiénes son los usuarios "En Riesgo" y qué me sugieres hacer?' }
        ].map(item => (
          <button 
            key={item.label}
            onClick={() => onShortcutClick(item.prompt)}
            className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-3"
          >
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
