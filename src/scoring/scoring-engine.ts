import { 
  OpenAPISpec, 
  ScoringReport, 
  ScoreResult, 
  Issue, 
  ScoringConfig,
  PathItem,
  Operation 
} from '../types';

export class ScoringEngine {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = {
      criteria: [
        { name: 'Schema & Types', weight: 20, maxScore: 20 },
        { name: 'Descriptions & Documentation', weight: 20, maxScore: 20 },
        { name: 'Paths & Operations', weight: 15, maxScore: 15 },
        { name: 'Response Codes', weight: 15, maxScore: 15 },
        { name: 'Examples & Samples', weight: 10, maxScore: 10 },
        { name: 'Security', weight: 10, maxScore: 10 },
        { name: 'Best Practices', weight: 10, maxScore: 10 }
      ],
      weights: {
        schemaTypes: 20,
        documentation: 20,
        pathsOperations: 15,
        responseCodes: 15,
        examples: 10,
        security: 10,
        bestPractices: 10
      },
      ...config
    };
  }

  /**
   * Score an OpenAPI specification
   */
  score(spec: OpenAPISpec): ScoringReport {
    const results: ScoreResult[] = [];

    // Score each criterion
    results.push(this.scoreSchemaTypes(spec));
    results.push(this.scoreDocumentation(spec));
    results.push(this.scorePathsOperations(spec));
    results.push(this.scoreResponseCodes(spec));
    results.push(this.scoreExamples(spec));
    results.push(this.scoreSecurity(spec));
    results.push(this.scoreBestPractices(spec));

    // Calculate overall score
    const overallScore = results.reduce((sum, result) => sum + result.weightedScore, 0);
    const maxScore = 100;
    const grade = this.calculateGrade(overallScore);

    // Count issues by severity
    const allIssues = results.flatMap(r => r.issues);
    const summary = {
      criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
      highIssues: allIssues.filter(i => i.severity === 'high').length,
      mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
      lowIssues: allIssues.filter(i => i.severity === 'low').length
    };

    // Get spec info
    const pathCount = Object.keys(spec.paths || {}).length;
    const operationCount = this.countOperations(spec);

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      grade,
      maxScore,
      results,
      totalIssues: allIssues.length,
      summary,
      timestamp: new Date().toISOString(),
      specInfo: {
        title: spec.info?.title || 'Unknown',
        version: spec.info?.version || 'Unknown',
        pathCount,
        operationCount
      }
    };
  }

  private scoreSchemaTypes(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.schemaTypes;

    // Check for components/schemas usage
    if (!spec.components?.schemas || Object.keys(spec.components.schemas).length === 0) {
      issues.push({
        path: '/components/schemas',
        location: 'components',
        description: 'No reusable schemas defined in components',
        severity: 'medium',
        suggestion: 'Define reusable schemas in components/schemas to promote consistency',
        criterion: 'Schema & Types'
      });
      score -= 5;
    }

    // Check for proper data types in schemas
    if (spec.components?.schemas) {
      for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
        this.validateSchemaTypes(schemaName, schema as any, issues);
      }
    }

    // Check for schemas in operations
    this.checkOperationSchemas(spec, issues);

    // Deduct points based on severity
    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Schema & Types',
      score,
      maxScore: this.config.weights.schemaTypes,
      weight: this.config.weights.schemaTypes,
      weightedScore: score,
      issues
    };
  }

  private scoreDocumentation(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.documentation;

    // Check API-level documentation
    if (!spec.info.description) {
      issues.push({
        path: '/info',
        location: 'info.description',
        description: 'API description is missing',
        severity: 'medium',
        suggestion: 'Add a comprehensive description of your API in info.description',
        criterion: 'Descriptions & Documentation'
      });
      score -= 2;
    }

    // Check path and operation documentation
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        this.checkPathDocumentation(path, pathItem, issues);
      }
    }

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Descriptions & Documentation',
      score,
      maxScore: this.config.weights.documentation,
      weight: this.config.weights.documentation,
      weightedScore: score,
      issues
    };
  }

  private scorePathsOperations(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.pathsOperations;

    if (!spec.paths) {
      issues.push({
        path: '/paths',
        location: 'paths',
        description: 'No paths defined',
        severity: 'critical',
        suggestion: 'Define at least one path in your API specification',
        criterion: 'Paths & Operations'
      });
      return {
        criterion: 'Paths & Operations',
        score: 0,
        maxScore: this.config.weights.pathsOperations,
        weight: this.config.weights.pathsOperations,
        weightedScore: 0,
        issues
      };
    }

    // Check for consistent naming patterns
    this.checkPathNaming(spec.paths, issues);

    // Check for CRUD operations consistency
    this.checkCrudConsistency(spec.paths, issues);

    // Check for overlapping paths
    this.checkOverlappingPaths(spec.paths, issues);

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Paths & Operations',
      score,
      maxScore: this.config.weights.pathsOperations,
      weight: this.config.weights.pathsOperations,
      weightedScore: score,
      issues
    };
  }

  private scoreResponseCodes(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.responseCodes;

    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        this.checkOperationResponses(path, pathItem, issues);
      }
    }

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Response Codes',
      score,
      maxScore: this.config.weights.responseCodes,
      weight: this.config.weights.responseCodes,
      weightedScore: score,
      issues
    };
  }

  private scoreExamples(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.examples;

    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        this.checkExamples(path, pathItem, issues);
      }
    }

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Examples & Samples',
      score,
      maxScore: this.config.weights.examples,
      weight: this.config.weights.examples,
      weightedScore: score,
      issues
    };
  }

  private scoreSecurity(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.security;

    // Check for security schemes
    if (!spec.components?.securitySchemes || Object.keys(spec.components.securitySchemes).length === 0) {
      issues.push({
        path: '/components/securitySchemes',
        location: 'components',
        description: 'No security schemes defined',
        severity: 'high',
        suggestion: 'Define appropriate security schemes (OAuth2, API Key, etc.)',
        criterion: 'Security'
      });
      score -= 5;
    }

    // Check for global security requirements
    if (!spec.security || spec.security.length === 0) {
      issues.push({
        path: '/security',
        location: 'root',
        description: 'No global security requirements defined',
        severity: 'medium',
        suggestion: 'Define global security requirements or ensure operations have individual security',
        criterion: 'Security'
      });
      score -= 3;
    }

    // Check operation-level security
    if (spec.paths) {
      this.checkOperationSecurity(spec, issues);
    }

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Security',
      score,
      maxScore: this.config.weights.security,
      weight: this.config.weights.security,
      weightedScore: score,
      issues
    };
  }

  private scoreBestPractices(spec: OpenAPISpec): ScoreResult {
    const issues: Issue[] = [];
    let score = this.config.weights.bestPractices;

    // Check for versioning
    if (!spec.info.version || spec.info.version === '1.0.0') {
      issues.push({
        path: '/info/version',
        location: 'info',
        description: 'API version should be meaningful, not default',
        severity: 'low',
        suggestion: 'Use semantic versioning (e.g., 1.2.3) or date-based versioning',
        criterion: 'Best Practices'
      });
      score -= 1;
    }

    // Check for servers array
    if (!spec.servers || spec.servers.length === 0) {
      issues.push({
        path: '/servers',
        location: 'root',
        description: 'No servers defined',
        severity: 'medium',
        suggestion: 'Define at least one server URL',
        criterion: 'Best Practices'
      });
      score -= 2;
    }

    // Check for tags usage
    if (spec.paths) {
      this.checkTagsUsage(spec, issues);
    }

    // Check for component reuse
    this.checkComponentReuse(spec, issues);

    const deduction = this.calculateDeduction(issues);
    score = Math.max(0, score - deduction);

    return {
      criterion: 'Best Practices',
      score,
      maxScore: this.config.weights.bestPractices,
      weight: this.config.weights.bestPractices,
      weightedScore: score,
      issues
    };
  }

  // Helper methods for specific validations

  private validateSchemaTypes(schemaName: string, schema: any, issues: Issue[]): void {
    if (!schema.type && !schema.$ref && !schema.allOf && !schema.oneOf && !schema.anyOf) {
      issues.push({
        path: `/components/schemas/${schemaName}`,
        location: 'schema',
        description: `Schema "${schemaName}" lacks type definition`,
        severity: 'medium',
        suggestion: 'Specify a type (object, string, number, etc.) for the schema',
        criterion: 'Schema & Types'
      });
    }

    if (schema.type === 'object' && !schema.properties && !schema.additionalProperties) {
      issues.push({
        path: `/components/schemas/${schemaName}`,
        location: 'schema',
        description: `Object schema "${schemaName}" has no defined properties`,
        severity: 'medium',
        suggestion: 'Define properties for object schemas or use additionalProperties',
        criterion: 'Schema & Types'
      });
    }
  }

  private checkOperationSchemas(spec: OpenAPISpec, issues: Issue[]): void {
    if (!spec.paths) return;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      
      for (const method of methods) {
        const operation = (pathItem as any)[method] as Operation;
        if (operation) {
          // Check request body schema
          if (operation.requestBody && !this.hasSchemaReference(operation.requestBody)) {
            issues.push({
              path,
              operation: method,
              location: 'requestBody',
              description: 'Request body lacks proper schema definition',
              severity: 'medium',
              suggestion: 'Define schema for request body content',
              criterion: 'Schema & Types'
            });
          }

          // Check response schemas
          if (operation.responses) {
            for (const [statusCode, response] of Object.entries(operation.responses)) {
              if (response && !this.hasSchemaReference(response)) {
                issues.push({
                  path,
                  operation: method,
                  location: `responses.${statusCode}`,
                  description: `Response ${statusCode} lacks proper schema definition`,
                  severity: 'medium',
                  suggestion: 'Define schema for response content',
                  criterion: 'Schema & Types'
                });
              }
            }
          }
        }
      }
    }
  }

  private hasSchemaReference(obj: any): boolean {
    if (!obj) return false;
    
    // Check for direct schema
    if (obj.schema) return true;
    
    // Check in content types
    if (obj.content) {
      for (const contentType of Object.values(obj.content)) {
        if ((contentType as any)?.schema) return true;
      }
    }
    
    return false;
  }

  private checkPathDocumentation(path: string, pathItem: PathItem, issues: Issue[]): void {
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    
    for (const method of methods) {
      const operation = (pathItem as any)[method] as Operation;
      if (operation) {
        if (!operation.summary && !operation.description) {
          issues.push({
            path,
            operation: method,
            location: 'operation',
            description: 'Operation lacks summary and description',
            severity: 'medium',
            suggestion: 'Add summary and/or description to explain the operation',
            criterion: 'Descriptions & Documentation'
          });
        }

        // Check parameter descriptions
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!param.description) {
              issues.push({
                path,
                operation: method,
                location: `parameters.${param.name}`,
                description: `Parameter "${param.name}" lacks description`,
                severity: 'low',
                suggestion: 'Add description to explain the parameter purpose',
                criterion: 'Descriptions & Documentation'
              });
            }
          }
        }
      }
    }
  }

  private checkPathNaming(paths: Record<string, PathItem>, issues: Issue[]): void {
    const pathKeys = Object.keys(paths);
    
    for (const path of pathKeys) {
      // Check for consistent naming (kebab-case recommended)
      if (path.includes('_')) {
        issues.push({
          path,
          location: 'path',
          description: 'Path uses underscores, consider using hyphens for consistency',
          severity: 'low',
          suggestion: 'Use kebab-case (hyphens) instead of snake_case (underscores)',
          criterion: 'Paths & Operations'
        });
      }

      // Check for trailing slashes
      if (path.endsWith('/') && path !== '/') {
        issues.push({
          path,
          location: 'path',
          description: 'Path has trailing slash',
          severity: 'low',
          suggestion: 'Remove trailing slash from path',
          criterion: 'Paths & Operations'
        });
      }
    }
  }

  private checkCrudConsistency(paths: Record<string, PathItem>, issues: Issue[]): void {
    // Group paths by resource
    const resources = new Map<string, string[]>();
    
    for (const path of Object.keys(paths)) {
      const segments = path.split('/').filter(s => s && !s.startsWith('{'));
      if (segments.length > 0) {
        const resource = segments[segments.length - 1];
        if (!resources.has(resource)) {
          resources.set(resource, []);
        }
        resources.get(resource)?.push(path);
      }
    }

    // Check for CRUD completeness
    for (const [resource, resourcePaths] of resources) {
      if (resourcePaths.length === 1) {
        const path = resourcePaths[0];
        const pathItem = paths[path];
        const methods = Object.keys(pathItem).filter(k => 
          ['get', 'post', 'put', 'patch', 'delete'].includes(k)
        );

        if (methods.length === 1) {
          issues.push({
            path,
            location: 'operations',
            description: `Resource "${resource}" only has one operation`,
            severity: 'low',
            suggestion: 'Consider implementing full CRUD operations for resources',
            criterion: 'Paths & Operations'
          });
        }
      }
    }
  }

  private checkOverlappingPaths(paths: Record<string, PathItem>, issues: Issue[]): void {
    const pathKeys = Object.keys(paths);
    
    for (let i = 0; i < pathKeys.length; i++) {
      for (let j = i + 1; j < pathKeys.length; j++) {
        if (this.pathsOverlap(pathKeys[i], pathKeys[j])) {
          issues.push({
            path: pathKeys[i],
            location: 'path',
            description: `Path overlaps with ${pathKeys[j]}`,
            severity: 'medium',
            suggestion: 'Ensure paths are distinct and non-overlapping',
            criterion: 'Paths & Operations'
          });
        }
      }
    }
  }

  private pathsOverlap(path1: string, path2: string): boolean {
    const segments1 = path1.split('/').filter(s => s);
    const segments2 = path2.split('/').filter(s => s);
    
    if (segments1.length !== segments2.length) {
      return false;
    }
    
    for (let i = 0; i < segments1.length; i++) {
      const seg1 = segments1[i];
      const seg2 = segments2[i];
      
      if (seg1 !== seg2 && !seg1.startsWith('{') && !seg2.startsWith('{')) {
        return false;
      }
    }
    
    return true;
  }

  private checkOperationResponses(path: string, pathItem: PathItem, issues: Issue[]): void {
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    
    for (const method of methods) {
      const operation = (pathItem as any)[method] as Operation;
      if (operation && operation.responses) {
        const responseCodes = Object.keys(operation.responses);
        
        // Check for success response
        const hasSuccess = responseCodes.some(code => 
          code.startsWith('2') || code === 'default'
        );
        
        if (!hasSuccess) {
          issues.push({
            path,
            operation: method,
            location: 'responses',
            description: 'No success response (2xx) defined',
            severity: 'high',
            suggestion: 'Define at least one 2xx success response',
            criterion: 'Response Codes'
          });
        }

        // Check for error responses
        const hasClientError = responseCodes.some(code => code.startsWith('4'));
        const hasServerError = responseCodes.some(code => code.startsWith('5'));
        
        if (!hasClientError && !hasServerError) {
          issues.push({
            path,
            operation: method,
            location: 'responses',
            description: 'No error responses (4xx/5xx) defined',
            severity: 'medium',
            suggestion: 'Define appropriate error responses (400, 404, 500, etc.)',
            criterion: 'Response Codes'
          });
        }

        // Check for specific method expectations
        this.checkMethodSpecificResponses(path, method, operation, issues);
      }
    }
  }

  private checkMethodSpecificResponses(path: string, method: string, operation: Operation, issues: Issue[]): void {
    const responseCodes = Object.keys(operation.responses);
    
    switch (method) {
      case 'post':
        if (!responseCodes.includes('201') && !responseCodes.includes('200')) {
          issues.push({
            path,
            operation: method,
            location: 'responses',
            description: 'POST operation should typically return 201 (Created) or 200',
            severity: 'low',
            suggestion: 'Consider using 201 for resource creation',
            criterion: 'Response Codes'
          });
        }
        break;
      case 'delete':
        if (!responseCodes.includes('204') && !responseCodes.includes('200')) {
          issues.push({
            path,
            operation: method,
            location: 'responses',
            description: 'DELETE operation should typically return 204 (No Content) or 200',
            severity: 'low',
            suggestion: 'Consider using 204 for successful deletion with no content',
            criterion: 'Response Codes'
          });
        }
        break;
    }
  }

  private checkExamples(path: string, pathItem: PathItem, issues: Issue[]): void {
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    
    for (const method of methods) {
      const operation = (pathItem as any)[method] as Operation;
      if (operation) {
        let hasExamples = false;

        // Check request body examples
        if (operation.requestBody) {
          hasExamples = this.hasExamplesInContent(operation.requestBody);
        }

        // Check response examples
        if (operation.responses) {
          for (const response of Object.values(operation.responses)) {
            if (this.hasExamplesInContent(response)) {
              hasExamples = true;
              break;
            }
          }
        }

        if (!hasExamples) {
          issues.push({
            path,
            operation: method,
            location: 'examples',
            description: 'Operation lacks examples',
            severity: 'low',
            suggestion: 'Add examples to request/response bodies for better documentation',
            criterion: 'Examples & Samples'
          });
        }
      }
    }
  }

  private hasExamplesInContent(obj: any): boolean {
    if (!obj) return false;
    
    if (obj.example || obj.examples) return true;
    
    if (obj.content) {
      for (const contentType of Object.values(obj.content)) {
        if ((contentType as any)?.example || (contentType as any)?.examples) {
          return true;
        }
      }
    }
    
    return false;
  }

  private checkOperationSecurity(spec: OpenAPISpec, issues: Issue[]): void {
    if (!spec.paths) return;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      
      for (const method of methods) {
        const operation = (pathItem as any)[method] as Operation;
        if (operation) {
          const hasGlobalSecurity = spec.security && spec.security.length > 0;
          const hasOperationSecurity = operation.security && operation.security.length > 0;
          
          if (!hasGlobalSecurity && !hasOperationSecurity) {
            issues.push({
              path,
              operation: method,
              location: 'security',
              description: 'Operation has no security requirements',
              severity: 'medium',
              suggestion: 'Define security requirements for the operation',
              criterion: 'Security'
            });
          }
        }
      }
    }
  }

  private checkTagsUsage(spec: OpenAPISpec, issues: Issue[]): void {
    const usedTags = new Set<string>();
    const definedTags = new Set(spec.tags?.map(t => t.name) || []);

    if (!spec.paths) return;

    // Collect used tags
    for (const pathItem of Object.values(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      
      for (const method of methods) {
        const operation = (pathItem as any)[method] as Operation;
        if (operation?.tags) {
          operation.tags.forEach(tag => usedTags.add(tag));
        }
      }
    }

    // Check for undefined tags being used
    for (const usedTag of usedTags) {
      if (!definedTags.has(usedTag)) {
        issues.push({
          path: '/tags',
          location: 'tags',
          description: `Tag "${usedTag}" is used but not defined`,
          severity: 'low',
          suggestion: 'Define all tags in the tags array with descriptions',
          criterion: 'Best Practices'
        });
      }
    }

    // Check if operations have tags
    let operationsWithoutTags = 0;
    for (const pathItem of Object.values(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      
      for (const method of methods) {
        const operation = (pathItem as any)[method] as Operation;
        if (operation && (!operation.tags || operation.tags.length === 0)) {
          operationsWithoutTags++;
        }
      }
    }

    if (operationsWithoutTags > 0) {
      issues.push({
        path: '/paths',
        location: 'operations',
        description: `${operationsWithoutTags} operations are not tagged`,
        severity: 'low',
        suggestion: 'Add tags to operations for better organization',
        criterion: 'Best Practices'
      });
    }
  }

  private checkComponentReuse(spec: OpenAPISpec, issues: Issue[]): void {
    if (!spec.components) {
      issues.push({
        path: '/components',
        location: 'components',
        description: 'No components defined for reuse',
        severity: 'low',
        suggestion: 'Extract common schemas, responses, and parameters to components',
        criterion: 'Best Practices'
      });
    }
  }

  private calculateDeduction(issues: Issue[]): number {
    return issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case 'critical': return sum + 5;
        case 'high': return sum + 3;
        case 'medium': return sum + 2;
        case 'low': return sum + 1;
        default: return sum;
      }
    }, 0);
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private countOperations(spec: OpenAPISpec): number {
    if (!spec.paths) return 0;
    
    let count = 0;
    for (const pathItem of Object.values(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      for (const method of methods) {
        if ((pathItem as any)[method]) {
          count++;
        }
      }
    }
    return count;
  }
} 