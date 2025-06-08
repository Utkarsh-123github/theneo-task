import { OpenAPILoader } from '../loader/openapi-loader';
import { OpenAPISpec } from '../types';

// Mock fs and axios
jest.mock('fs');
jest.mock('axios');

import { readFileSync, existsSync, statSync } from 'fs';
import axios from 'axios';

const mockFs = {
  readFileSync: readFileSync as jest.MockedFunction<typeof readFileSync>,
  existsSync: existsSync as jest.MockedFunction<typeof existsSync>,
  statSync: statSync as jest.MockedFunction<typeof statSync>
};

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAPILoader', () => {
  let loader: OpenAPILoader;

  beforeEach(() => {
    loader = new OpenAPILoader();
    jest.clearAllMocks();
  });

  describe('File loading', () => {
    const validSpec: OpenAPISpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {}
    };

    it('should load JSON file successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validSpec));

      const result = await loader.load('test.json');
      
      expect(result).toEqual(validSpec);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf8');
    });

    it('should load YAML file successfully', async () => {
      const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const result = await loader.load('test.yaml');
      
      expect(result.openapi).toBe('3.0.0');
      expect(result.info.title).toBe('Test API');
    });

    it('should throw error for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(loader.load('nonexistent.json')).rejects.toThrow('File not found');
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue('invalid json {');

      await expect(loader.load('invalid.json')).rejects.toThrow('Failed to parse');
    });
  });

  describe('URL loading', () => {
    it('should load from URL successfully', async () => {
      const validSpec = {
        openapi: '3.0.0',
        info: { title: 'Remote API', version: '1.0.0' },
        paths: {}
      };

      mockAxios.get.mockResolvedValue({ data: JSON.stringify(validSpec) });

      const result = await loader.load('https://api.example.com/openapi.json');
      
      expect(result.info.title).toBe('Remote API');
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/openapi.json',
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            Accept: expect.stringContaining('application/json')
          })
        })
      );
    });

    it('should handle URL loading errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(loader.load('https://api.example.com/openapi.json'))
        .rejects.toThrow('Failed to load from URL');
    });
  });

  describe('Validation', () => {
    it('should validate correct OpenAPI spec', () => {
      const validSpec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const result = loader.validate(validSpec);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidSpec = {
        // Missing openapi
        info: {
          // Missing title and version
        },
        // Missing paths
      } as any;

      const result = loader.validate(invalidSpec);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('openapi'))).toBe(true);
      expect(result.errors.some(e => e.includes('info.title'))).toBe(true);
      expect(result.errors.some(e => e.includes('paths'))).toBe(true);
    });

    it('should detect unsupported OpenAPI version', () => {
      const invalidSpec = {
        openapi: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      } as any;

      const result = loader.validate(invalidSpec);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported OpenAPI version'))).toBe(true);
    });

    it('should validate path format', () => {
      const specWithInvalidPaths: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          'invalid-path': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      const result = loader.validate(specWithInvalidPaths);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('must start with a forward slash'))).toBe(true);
    });

    it('should validate operation structure', () => {
      const specWithInvalidOperation: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              // Missing responses
            } as any
          }
        }
      };

      const result = loader.validate(specWithInvalidOperation);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('missing required "responses" field'))).toBe(true);
    });

    it('should validate component schemas', () => {
      const specWithInvalidComponents: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            User: null as any
          }
        }
      };

      const result = loader.validate(specWithInvalidComponents);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid schema definition'))).toBe(true);
    });

    it('should generate warnings for empty paths', () => {
      const specWithEmptyPaths: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const result = loader.validate(specWithEmptyPaths);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('No paths defined'))).toBe(true);
    });
  });

  describe('Content parsing', () => {
    it('should detect JSON format', async () => {
      const jsonContent = '{"openapi": "3.0.0", "info": {"title": "Test", "version": "1.0.0"}, "paths": {}}';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue(jsonContent);

      const result = await loader.load('test.json');
      
      expect(result.openapi).toBe('3.0.0');
    });

    it('should detect YAML format', async () => {
      const yamlContent = `
openapi: "3.0.0"
info:
  title: "Test"
  version: "1.0.0"
paths: {}
`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const result = await loader.load('test.yaml');
      
      expect(result.openapi).toBe('3.0.0');
    });

    it('should handle mixed content gracefully', async () => {
      // Content that's neither valid JSON nor YAML
      const invalidContent = 'This is not a valid OpenAPI spec';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockFs.readFileSync.mockReturnValue(invalidContent);

      await expect(loader.load('test.txt')).rejects.toThrow('Failed to parse');
    });
  });
}); 