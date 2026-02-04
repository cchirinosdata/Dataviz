import React, { useState } from 'react';
import { Upload, FileText, Database, Settings, RefreshCw, BarChart3, MessageSquare, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataState, ColumnInfo } from './types';
import { fixEncoding, classifyColumn, processInsights } from './utils/dataProcessor';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';

const App: React.FC = () => {
  const [data, setData] = useState<DataState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  const [externalPrompt, setExternalPrompt] = useState<string | undefined>();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) return;

        let workbook: XLSX.WorkBook;
        if (typeof result === 'string') {
          workbook = XLSX.read(result, { type: 'string' });
        } else {
          const dataArr = new Uint8Array(result as ArrayBuffer);
          workbook = XLSX.read(dataArr, { type: 'array' });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet) as any[];

        if (rawJson.length === 0) {
          setError("El archivo parece estar vacío o mal formateado.");
          setLoading(false);
          return;
        }

        const originalHeaders = Object.keys(rawJson[0]);
        const cleanedHeaders = originalHeaders.map(fixEncoding);
        
        const normalizedRawData = rawJson.map(row => {
          const newRow: any = {};
          originalHeaders.forEach((header, idx) => {
            const val = row[header];
            newRow[cleanedHeaders[idx]] = typeof val === 'string' ? fixEncoding(val) : val;
          });
          return newRow;
        });

        const columns: ColumnInfo[] = cleanedHeaders.map((h, idx) => ({
          originalName: h,
          name: h,
          type: classifyColumn(h, normalizedRawData.map(r => r[h]), idx, cleanedHeaders.length),
          sampleValue: normalizedRawData[0][h]
        }));

        const insights = processInsights(normalizedRawData, columns);

        setData({
          raw: normalizedRawData,
          headers: cleanedHeaders,
          columns,
          cleanedData: insights.filteredData,
          insights: {
            completions: insights.completions,
            progressDistribution: insights.progressDistribution,
            lowProgressCount: insights.lowProgressCount,
            engagementMatrix: insights.engagementMatrix,
            metrics: insights.metrics,
            corrections: insights.corrections,
            totalUsers: normalizedRawData.length,
            unregisteredCount: normalizedRawData.length - insights.filteredData.length
          }
        });
        setLoading(false);
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      console.error(err);
      setError("Error al procesar el archivo. Asegúrate de que sea un CSV o XLSX válido.");
      setLoading(false);
    }
  };

  const downloadFullExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const wsFullData = XLSX.utils.json_to_sheet(data.raw);
    XLSX.utils.book_append_sheet(wb, wsFullData, "Base Completa");

    const metricsRows = [
      { "Categoría": "RESUMEN EJECUTIVO", "Métrica": "Total Usuarios en Archivo", "Valor": data.raw.length },
      { "Categoría": "RESUMEN EJECUTIVO", "Métrica": "Usuarios Válidos (Segmentados)", "Valor": data.cleanedData.length },
      { "Categoría": "RESUMEN EJECUTIVO", "Métrica": "Promedio de Avance", "Valor": `${data.insights.metrics.avgProgress?.toFixed(2)}%` || "N/A" },
      { "Categoría": "RESUMEN EJECUTIVO", "Métrica": "Casos de Éxito (100%)", "Valor": data.insights.completions.length },
      {},
      { "Categoría": "DISTRIBUCIÓN DE PROGRESO", "Métrica": "Rango de Avance", "Valor": "Cantidad de Usuarios" },
      ...data.insights.progressDistribution.map(d => ({
        "Categoría": "DISTRIBUCIÓN DE PROGRESO",
        "Métrica": d.range,
        "Valor": d.count
      }))
    ];

    if (data.insights.engagementMatrix) {
      metricsRows.push(
        {},
        { "Categoría": "MATRIZ DE COMPROMISO", "Métrica": "Segmento Comportamental", "Valor": "Cantidad" },
        { "Categoría": "MATRIZ DE COMPROMISO", "Métrica": "Estrellas (Alta Eficiencia)", "Valor": data.insights.engagementMatrix.stars },
        { "Categoría": "MATRIZ DE COMPROMISO", "Métrica": "Persistentes (Alto Esfuerzo)", "Valor": data.insights.engagementMatrix.persisters },
        { "Categoría": "MATRIZ DE COMPROMISO", "Métrica": "Desconectados", "Valor": data.insights.engagementMatrix.disconnected },
        { "Categoría": "MATRIZ DE COMPROMISO", "Métrica": "En Riesgo (Foco Crítico)", "Valor": data.insights.engagementMatrix.atRisk }
      );
    }

    const wsMetrics = XLSX.utils.json_to_sheet(metricsRows);
    XLSX.utils.book_append_sheet(wb, wsMetrics, "Informe de Métricas");

    XLSX.writeFile(wb, `DataViz_Reporte_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleShortcutClick = (prompt: string) => {
    setExternalPrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 h-full w-20 bg-slate-900 flex flex-col items-center py-8 space-y-8 z-50">
        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
          <Database size={24} />
        </div>
        <div className="flex-1 flex flex-col space-y-6">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white'}`}
          >
            <BarChart3 size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white'}`}
          >
            <MessageSquare size={24} />
          </button>
        </div>
        <div className="p-3 text-slate-500 hover:text-white cursor-pointer">
          <Settings size={24} />
        </div>
      </nav>

      <main className="flex-1 ml-20 bg-slate-50 p-8 lg:p-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">DataViz <span className="text-indigo-600">AI</span></h1>
            <p className="text-slate-500 mt-2 max-w-lg">
              Analítica inteligente para decisiones educativas y sociales de alto impacto.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {!data && (
              <label className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 cursor-pointer transition-all shadow-md shadow-indigo-200">
                <Upload size={20} />
                <span>Analizar Datos</span>
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
              </label>
            )}
            {data && (
              <>
                <button 
                  onClick={downloadFullExcel}
                  title="Descarga el archivo completo con todos los usuarios y métricas"
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100/50"
                >
                  <Download size={20} />
                  <span>Exportar Excel Completo</span>
                </button>
                <label className="flex items-center gap-2 px-5 py-3 border border-slate-300 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  <RefreshCw size={20} />
                  <span>Nuevo Archivo</span>
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                </label>
              </>
            )}
          </div>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700">Interpretando semántica...</p>
              <p className="text-sm text-slate-400">Limpiando encoding y preparando KPIs de negocio.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top duration-300">
            <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <h4 className="font-bold text-red-800">Error de Ingesta</h4>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-16 flex flex-col items-center justify-center text-center bg-white shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
              <FileText size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Carga tus registros para comenzar</h2>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2 mb-6">
              {data.insights.corrections.map((c, i) => (
                <span key={i} className="px-3 py-1 bg-white text-slate-500 text-[10px] font-bold uppercase rounded-full tracking-wider border border-slate-200 shadow-sm">
                  {c}
                </span>
              ))}
            </div>

            {activeTab === 'dashboard' ? (
              <Dashboard data={data} onShortcutClick={handleShortcutClick} />
            ) : (
              <div className="animate-in slide-in-from-bottom duration-500">
                <Chat 
                  data={data} 
                  externalPrompt={externalPrompt} 
                  onPromptProcessed={() => setExternalPrompt(undefined)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="ml-20 py-6 px-12 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-400">
        <div>DataViz AI © 2026 - Business Intelligence Framework powered by Claudia Chirinos</div>
        <div className="flex gap-6">
          <span className="hover:text-indigo-500 cursor-pointer">Seguridad de Datos</span>
          <span className="hover:text-indigo-500 cursor-pointer">Soporte Senior</span>
        </div>
      </footer>
    </div>
  );
};

export default App;