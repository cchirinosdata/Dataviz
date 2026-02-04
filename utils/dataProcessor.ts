import { ColumnType, ColumnInfo, DataState, EngagementMatrix } from '../types';

/**
 * Normaliza errores comunes de encoding.
 */
export const fixEncoding = (str: string): string => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/Ã©/g, 'é')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã/g, 'í')
    .replace(/SÃ\xad/g, 'Sí')
    .replace(/duraciÃ³n/gi, 'duración')
    .replace(/telÃ©fono/gi, 'teléfono')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã¡/g, 'á');
};

const getMedian = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Intenta convertir un valor a número de forma robusta.
 */
const parseToNumber = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
};

/**
 * Clasifica semánticamente las columnas basándose en nombre, posición y datos.
 */
export const classifyColumn = (name: string, values: any[], index: number, totalColumns: number): ColumnType => {
  const n = name.toLowerCase().trim();
  
  // 1. Identificadores
  if (n.match(/\b(dni|id|documento|codigo|cédula|cedula|rut|identificación|identificacion|matrícula|matricula)\b/i)) return ColumnType.IDENTIFIER;
  
  // 2. Progreso (Prioriza columna F/index 5 o nombres clave)
  if (index === 5 || n === 'f' || n.match(/(%|progreso|resultado|avance|nota|puntaje|score|completion|completitud|avance)/i)) {
    // Verificar si los datos parecen numéricos o porcentajes
    const numericSample = values.some(v => parseToNumber(v) !== null);
    if (numericSample) return ColumnType.PERCENTAGE;
  }
  
  // 3. Duración (Prioriza última columna o nombres clave)
  if (index === totalColumns - 1 || n.match(/(minutos|duración|duracion|tiempo|horas|segundos|time|duration|spent|mínimo|maximo)/i)) {
    const numericSample = values.some(v => parseToNumber(v) !== null);
    if (numericSample) return ColumnType.DURATION;
  }
  
  const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined)).size;
  if (typeof values[0] === 'string' && uniqueValues < values.length * 0.2) return ColumnType.CATEGORICAL;
  if (typeof values[0] === 'number' || (values[0] && !isNaN(Number(values[0])))) return ColumnType.METRIC;

  return ColumnType.TEXT;
};

export const processInsights = (data: any[], columns: ColumnInfo[]) => {
  const corrections: string[] = [];
  
  // Buscar columnas por tipo detectado
  let progressCol = columns.find(c => c.type === ColumnType.PERCENTAGE);
  let durationCol = columns.find(c => c.type === ColumnType.DURATION);

  // Fallbacks extremos basados en la estructura reportada por el usuario (F y Última)
  if (!progressCol && columns.length >= 6) {
    progressCol = columns[5]; // Columna F
    corrections.push(`Usando Columna F ("${progressCol.name}") como Progreso`);
  }
  
  if (!durationCol && columns.length > 0) {
    durationCol = columns[columns.length - 1]; // Última columna
    corrections.push(`Usando última columna ("${durationCol.name}") como Duración`);
  }

  const regCol = columns.find(c => c.name.toLowerCase().match(/(registrado|inscrito|estado|status)/i));
  const resultCol = columns.find(c => c.type === ColumnType.PERCENTAGE && c.name !== progressCol?.name);

  let filteredData = data;
  if (regCol) {
    filteredData = data.filter(row => {
      const val = String(row[regCol.name]).toLowerCase();
      return val === 'sí' || val === 'si' || val === 'yes' || val === 'true' || val === 'registrado';
    });
    corrections.push(`Segmentación: ${filteredData.length} usuarios registrados`);
  }

  const getNormValue = (row: any, col?: ColumnInfo) => {
    if (!col) return 0;
    let v = parseToNumber(row[col.name]) || 0;
    // Si es porcentaje en formato 0.0-1.0, normalizar a 0-100
    if (col.type === ColumnType.PERCENTAGE && v > 0 && v <= 1) return v * 100;
    return v;
  };

  const completions = progressCol 
    ? filteredData.filter(row => getNormValue(row, progressCol) >= 100)
    : [];

  const distribution = [
    { range: '0-24%', count: 0 },
    { range: '25-49%', count: 0 },
    { range: '50-74%', count: 0 },
    { range: '75-99%', count: 0 },
    { range: '100%', count: 0 },
  ];

  filteredData.forEach(row => {
    const val = getNormValue(row, progressCol);
    if (val >= 100) distribution[4].count++;
    else if (val >= 75) distribution[3].count++;
    else if (val >= 50) distribution[2].count++;
    else if (val >= 25) distribution[1].count++;
    else distribution[0].count++;
  });

  // Matriz de Compromiso (Opción 3)
  let matrix: EngagementMatrix | undefined = undefined;
  if (progressCol && durationCol) {
    const progressValues = filteredData.map(row => getNormValue(row, progressCol));
    const durationValues = filteredData.map(row => getNormValue(row, durationCol));
    
    const medProgress = getMedian(progressValues);
    const medDuration = getMedian(durationValues);

    let stars = 0, persisters = 0, disconnected = 0, atRisk = 0;

    filteredData.forEach(row => {
      const p = getNormValue(row, progressCol);
      const d = getNormValue(row, durationCol);

      if (p >= medProgress) {
        if (d <= medDuration) stars++;
        else persisters++;
      } else {
        if (d <= medDuration) disconnected++;
        else atRisk++;
      }
    });

    matrix = {
      stars,
      persisters,
      atRisk,
      disconnected,
      medians: { progress: medProgress, duration: medDuration }
    };
  }

  const distResult = distribution.map(d => ({
    ...d,
    percentage: filteredData.length > 0 ? (d.count / filteredData.length) * 100 : 0
  }));

  let avgDurationHigh = 0;
  let avgDurationLow = 0;
  if (durationCol && progressCol) {
    const high = filteredData.filter(row => getNormValue(row, progressCol) >= 100);
    const low = filteredData.filter(row => getNormValue(row, progressCol) < 25);
    if (high.length > 0) avgDurationHigh = high.reduce((acc, curr) => acc + getNormValue(curr, durationCol), 0) / high.length;
    if (low.length > 0) avgDurationLow = low.reduce((acc, curr) => acc + getNormValue(curr, durationCol), 0) / low.length;
  }

  return {
    completions,
    progressDistribution: distResult,
    lowProgressCount: distribution[0].count,
    engagementMatrix: matrix,
    metrics: {
      avgProgress: progressCol ? (filteredData.reduce((acc, curr) => acc + getNormValue(curr, progressCol), 0) / (filteredData.length || 1)) : undefined,
      avgDurationHigh,
      avgDurationLow,
      avgResult: resultCol ? (filteredData.reduce((acc, curr) => acc + getNormValue(curr, resultCol), 0) / (filteredData.length || 1)) : undefined,
    },
    corrections,
    filteredData
  };
};
