
export enum ColumnType {
  IDENTIFIER = 'IDENTIFIER',
  CATEGORICAL = 'CATEGORICAL',
  PERCENTAGE = 'PERCENTAGE',
  DURATION = 'DURATION',
  TEXT = 'TEXT',
  METRIC = 'METRIC',
  UNKNOWN = 'UNKNOWN'
}

export interface ColumnInfo {
  name: string;
  originalName: string;
  type: ColumnType;
  sampleValue: any;
}

export interface EngagementMatrix {
  stars: number;
  persisters: number;
  atRisk: number;
  disconnected: number;
  medians: {
    progress: number;
    duration: number;
  };
}

export interface DataState {
  raw: any[];
  headers: string[];
  columns: ColumnInfo[];
  cleanedData: any[];
  insights: {
    completions: any[];
    progressDistribution: { range: string; count: number; percentage: number }[];
    lowProgressCount: number;
    totalUsers: number;
    unregisteredCount: number;
    engagementMatrix?: EngagementMatrix;
    metrics: {
      avgProgress?: number;
      avgDurationHigh?: number;
      avgDurationLow?: number;
      avgResult?: number;
    };
    corrections: string[];
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
