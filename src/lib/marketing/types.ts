export type DateRange = { days: 7 | 28 | 90; start: string; end: string };
export type ReportRow = { label: string; path?: string; values: number[] };
export type ReportTable = { columns: string[]; rows: ReportRow[]; limited?: boolean };
export type ReportingData = {
  overview: ReportTable; daily: ReportTable; pages: ReportTable;
  acquisition?: ReportTable; services?: ReportTable; conversions?: ReportTable; queries?: ReportTable; conversionDaily?: ReportTable;
  notes: string[];
};
export type SourceResult = { status: 'connected' | 'empty' | 'not_configured' | 'error'; message: string; updatedAt: string | null; cached: boolean; persisted: boolean; data: ReportingData | null };
export type MarketingDashboard = { range: DateRange; ga4: SourceResult; search: SourceResult };

export type WorkspaceActivity = {
  agentSummaries?:Record<string,ReturnType<typeof import('./execution-status').summarizeAgent>>;
  reports: {id:string;source:string;start_date:string;end_date:string;extracted_at:string}[];
  executions: {id:string;state:string;created_at:string;finished_at:string|null}[];
  artifacts: {id:string;kind:string;title:string;created_at:string}[];
};
