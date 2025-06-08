export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [key: string]: any;
  };
  servers?: Array<{
    url: string;
    description?: string;
    [key: string]: any;
  }>;
  paths: {
    [path: string]: PathItem;
  };
  components?: {
    schemas?: { [key: string]: any };
    responses?: { [key: string]: any };
    parameters?: { [key: string]: any };
    examples?: { [key: string]: any };
    requestBodies?: { [key: string]: any };
    headers?: { [key: string]: any };
    securitySchemes?: { [key: string]: any };
    links?: { [key: string]: any };
    callbacks?: { [key: string]: any };
  };
  security?: Array<{ [key: string]: string[] }>;
  tags?: Array<{
    name: string;
    description?: string;
    [key: string]: any;
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
  [key: string]: any;
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  servers?: Array<any>;
  parameters?: Array<any>;
  [key: string]: any;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: any;
  operationId?: string;
  parameters?: Array<any>;
  requestBody?: any;
  responses: {
    [statusCode: string]: any;
  };
  callbacks?: { [key: string]: any };
  deprecated?: boolean;
  security?: Array<{ [key: string]: string[] }>;
  servers?: Array<any>;
  [key: string]: any;
}

export interface ScoringCriteria {
  name: string;
  weight: number;
  maxScore: number;
}

export interface ScoreResult {
  criterion: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
  issues: Issue[];
}

export interface Issue {
  path: string;
  operation?: string;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  criterion: string;
}

export interface ScoringReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  maxScore: number;
  results: ScoreResult[];
  totalIssues: number;
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  timestamp: string;
  specInfo: {
    title: string;
    version: string;
    pathCount: number;
    operationCount: number;
  };
}

export interface ScoringConfig {
  criteria: ScoringCriteria[];
  weights: {
    schemaTypes: number;
    documentation: number;
    pathsOperations: number;
    responseCodes: number;
    examples: number;
    security: number;
    bestPractices: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type ReportFormat = 'json' | 'markdown' | 'html';

export interface ExportOptions {
  format: ReportFormat;
  outputPath?: string;
  includeDetails?: boolean;
} 