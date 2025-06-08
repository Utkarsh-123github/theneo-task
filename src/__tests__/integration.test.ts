import { OpenAPILoader } from '../loader/openapi-loader';
import { ScoringEngine } from '../scoring/scoring-engine';
import { ReportGenerator } from '../reporting/report-generator';
import { OpenAPISpec } from '../types';

describe('Integration Tests', () => {
  let loader: OpenAPILoader;
  let scorer: ScoringEngine;
  let reporter: ReportGenerator;

  beforeEach(() => {
    loader = new OpenAPILoader();
    scorer = new ScoringEngine();
    reporter = new ReportGenerator();
  });

  describe('Complete workflow', () => {
    it('should process a well-designed API spec end-to-end', async () => {
      // Create a comprehensive, well-designed spec
      const goodSpec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
          title: 'Comprehensive User API',
          version: '2.1.0',
          description: 'A well-designed API for user management with all best practices'
        },
        servers: [
          {
            url: 'https://api.example.com/v2',
            description: 'Production server'
          }
        ],
        security: [{ bearerAuth: [] }],
        paths: {
          '/users': {
            get: {
              tags: ['users'],
              summary: 'List users',
              description: 'Retrieve a paginated list of users',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  description: 'Number of users to return',
                  schema: { type: 'integer', minimum: 1, maximum: 100 }
                }
              ],
              responses: {
                '200': {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UserList' },
                      example: {
                        users: [{ id: 1, name: 'John Doe', email: 'john@example.com' }],
                        total: 1
                      }
                    }
                  }
                },
                '400': {
                  description: 'Bad request',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                },
                '401': {
                  description: 'Unauthorized',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                },
                '500': {
                  description: 'Internal server error',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            },
            post: {
              tags: ['users'],
              summary: 'Create user',
              description: 'Create a new user account',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CreateUser' },
                    example: {
                      name: 'Jane Doe',
                      email: 'jane@example.com'
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'User created',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                      example: {
                        id: 2,
                        name: 'Jane Doe',
                        email: 'jane@example.com'
                      }
                    }
                  }
                },
                '400': {
                  description: 'Bad request',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                },
                '409': {
                  description: 'User already exists',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            }
          },
          '/users/{id}': {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'User ID',
                schema: { type: 'integer', minimum: 1 }
              }
            ],
            get: {
              tags: ['users'],
              summary: 'Get user',
              description: 'Get user by ID',
              responses: {
                '200': {
                  description: 'User found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                      example: {
                        id: 1,
                        name: 'John Doe',
                        email: 'john@example.com'
                      }
                    }
                  }
                },
                '404': {
                  description: 'User not found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            },
            put: {
              tags: ['users'],
              summary: 'Update user',
              description: 'Update user information',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/UpdateUser' },
                    example: {
                      name: 'John Updated',
                      email: 'john.updated@example.com'
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'User updated',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' }
                    }
                  }
                },
                '404': {
                  description: 'User not found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            },
            delete: {
              tags: ['users'],
              summary: 'Delete user',
              description: 'Delete user account',
              responses: {
                '204': {
                  description: 'User deleted'
                },
                '404': {
                  description: 'User not found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          },
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'name', 'email'],
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', format: 'email', example: 'john@example.com' }
              }
            },
            CreateUser: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                name: { type: 'string', example: 'Jane Doe' },
                email: { type: 'string', format: 'email', example: 'jane@example.com' }
              }
            },
            UpdateUser: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'John Updated' },
                email: { type: 'string', format: 'email', example: 'john.updated@example.com' }
              }
            },
            UserList: {
              type: 'object',
              required: ['users', 'total'],
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                },
                total: { type: 'integer', example: 100 }
              }
            },
            Error: {
              type: 'object',
              required: ['error', 'message'],
              properties: {
                error: { type: 'string', example: 'USER_NOT_FOUND' },
                message: { type: 'string', example: 'The requested user was not found' }
              }
            }
          }
        },
        tags: [
          {
            name: 'users',
            description: 'User management operations'
          }
        ]
      };

      // Step 1: Validate the spec
      const validation = loader.validate(goodSpec);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 2: Score the spec
      const report = scorer.score(goodSpec);
      
      // Should get a high score (A or B grade)
      expect(report.overallScore).toBeGreaterThan(85);
      expect(['A', 'B']).toContain(report.grade);
      expect(report.specInfo.title).toBe('Comprehensive User API');
      expect(report.specInfo.version).toBe('2.1.0');
      expect(report.specInfo.pathCount).toBe(2);
      expect(report.specInfo.operationCount).toBe(5);

      // Should have minimal issues
      expect(report.totalIssues).toBeLessThan(5);

      // Step 3: Generate reports in all formats
      const jsonReport = reporter.generateReport(report, 'json');
      const markdownReport = reporter.generateReport(report, 'markdown');
      const htmlReport = reporter.generateReport(report, 'html');

      // Verify report formats
      expect(() => JSON.parse(jsonReport)).not.toThrow();
      expect(markdownReport).toContain('# OpenAPI Specification Scoring Report');
      expect(markdownReport).toContain('Comprehensive User API');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('Comprehensive User API');

      // Verify all criteria are scored
      expect(report.results).toHaveLength(7);
      const criteriaNames = report.results.map(r => r.criterion);
      expect(criteriaNames).toContain('Schema & Types');
      expect(criteriaNames).toContain('Descriptions & Documentation');
      expect(criteriaNames).toContain('Paths & Operations');
      expect(criteriaNames).toContain('Response Codes');
      expect(criteriaNames).toContain('Examples & Samples');
      expect(criteriaNames).toContain('Security');
      expect(criteriaNames).toContain('Best Practices');
    });

    it('should identify issues in a poorly designed API spec', async () => {
      // Create a spec with many issues
      const badSpec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
          title: 'Bad API',
          version: '1.0.0'
          // Missing description
        },
        // Missing servers
        paths: {
          '/get_users': { // Poor naming
            get: {
              // Missing tags, summary, description
              responses: {
                '200': {
                  description: 'OK'
                  // Missing schema and examples
                }
                // Missing error responses
              }
            }
          },
          '/users/{id}': {
            get: {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  // Missing description
                  schema: { type: 'string' }
                }
              ],
              responses: {
                '200': {
                  description: 'user'
                }
              }
            }
          }
        }
        // Missing components, security, tags
      };

      // Step 1: Validate (should still be valid structurally)
      const validation = loader.validate(badSpec);
      expect(validation.isValid).toBe(true);

      // Step 2: Score the spec
      const report = scorer.score(badSpec);
      
      // Should get a low score (D or F grade)
      expect(report.overallScore).toBeLessThan(60);
      expect(['D', 'F']).toContain(report.grade);

      // Should have many issues
      expect(report.totalIssues).toBeGreaterThan(10);

      // Should identify specific issue categories
      expect(report.summary.mediumIssues + report.summary.highIssues).toBeGreaterThan(5);

      // Step 3: Verify specific scoring criteria identify issues
      const schemaResult = report.results.find(r => r.criterion === 'Schema & Types');
      const docResult = report.results.find(r => r.criterion === 'Descriptions & Documentation');
      const securityResult = report.results.find(r => r.criterion === 'Security');
      const bestPracticesResult = report.results.find(r => r.criterion === 'Best Practices');

      expect(schemaResult?.issues.length).toBeGreaterThan(0);
      expect(docResult?.issues.length).toBeGreaterThan(0);
      expect(securityResult?.issues.length).toBeGreaterThan(0);
      expect(bestPracticesResult?.issues.length).toBeGreaterThan(0);

      // Step 4: Generate report and verify it contains issues
      const markdownReport = reporter.generateReport(report, 'markdown');
      expect(markdownReport).toContain('## Detailed Issues');
      expect(markdownReport).toContain('lacks');
    });

    it('should handle custom scoring configuration', () => {
      const customConfig = {
        weights: {
          schemaTypes: 30,      // Increase importance
          documentation: 30,    // Increase importance
          pathsOperations: 10,  // Decrease importance
          responseCodes: 10,    // Decrease importance
          examples: 5,          // Decrease importance
          security: 10,         // Keep same
          bestPractices: 5      // Decrease importance
        }
      };

      const customScorer = new ScoringEngine(customConfig);
      
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      const report = customScorer.score(spec);
      
      // Verify custom weights are applied
      const schemaResult = report.results.find(r => r.criterion === 'Schema & Types');
      const docResult = report.results.find(r => r.criterion === 'Descriptions & Documentation');
      
      expect(schemaResult?.weight).toBe(30);
      expect(docResult?.weight).toBe(30);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        loader.validate({} as any);
      }).not.toThrow();
    });

    it('should handle missing required fields', () => {
      const invalidSpec = {
        // Missing openapi, info, paths
      } as any;

      const validation = loader.validate(invalidSpec);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle unsupported report format', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const report = scorer.score(spec);
      
      expect(() => {
        reporter.generateReport(report, 'xml' as any);
      }).toThrow('Unsupported report format');
    });
  });
}); 