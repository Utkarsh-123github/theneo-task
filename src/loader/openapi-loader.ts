import { promises as fs, statSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { load } from 'js-yaml';
import axios from 'axios';
import { OpenAPISpec, ValidationResult, PathItem } from '../types';

export class OpenAPILoader {
  // Load OpenAPI spec from file path or URL
  async load(source: string): Promise<OpenAPISpec> {
    let content: string;

    if (this.isUrl(source)) {
      content = await this.loadFromUrl(source);
    } else {
      content = await this.loadFromFile(source);
    }

    return this.parseContent(content, source);
  }

  // Validate OpenAPI spec structure and syntax
  validate(spec: OpenAPISpec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!spec.openapi) {
        errors.push('Missing required field: openapi');
      } else if (!spec.openapi.startsWith('3.')) {
        errors.push(`Unsupported OpenAPI version: ${spec.openapi}. Only 3.x is supported.`);
      }

      if (!spec.info) {
        errors.push('Missing required field: info');
      } else {
        if (!spec.info.title) {
          errors.push('Missing required field: info.title');
        }
        if (!spec.info.version) {
          errors.push('Missing required field: info.version');
        }
      }

      if (!spec.paths) {
        errors.push('Missing required field: paths');
      } else if (Object.keys(spec.paths).length === 0) {
        warnings.push('No paths defined in the specification');
      }

      // Validate paths structure
      if (spec.paths) {
        this.validatePaths(spec.paths, errors, warnings);
      }

      // Validate components if present
      if (spec.components) {
        this.validateComponents(spec.components, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  private isUrl(source: string): boolean {
    try {
      new URL(source);
      return true;
    } catch {
      return false;
    }
  }

  private async loadFromUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json, application/yaml, text/yaml, text/plain'
        }
      });
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to load from URL ${url}: ${error.message}`);
      }
      throw new Error(`Failed to load from URL ${url}: ${error}`);
    }
  }

  private async loadFromFile(filePath: string): Promise<string> {
    try {
      const resolvedPath = resolve(filePath);
      
      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      return readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseContent(content: string, source: string): OpenAPISpec {
    try {
      // Try parsing as JSON first
      if (content.trim().startsWith('{')) {
        return JSON.parse(content);
      }
      
      // Try parsing as YAML
      const parsed = load(content) as OpenAPISpec;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure');
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec from ${source}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private validatePaths(paths: Record<string, PathItem>, errors: string[], warnings: string[]): void {
    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (!pathKey.startsWith('/')) {
        errors.push(`Path "${pathKey}" must start with a forward slash`);
      }

      if (pathItem && typeof pathItem === 'object') {
        const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
        
        for (const method of httpMethods) {
          if ((pathItem as any)[method]) {
            this.validateOperation(pathKey, method, (pathItem as any)[method], errors, warnings);
          }
        }
      }
    }
  }

  private validateOperation(path: string, method: string, operation: any, errors: string[], warnings: string[]): void {
    if (!operation.responses) {
      errors.push(`Operation ${method.toUpperCase()} ${path} is missing required "responses" field`);
    }

    if (operation.parameters) {
      if (!Array.isArray(operation.parameters)) {
        errors.push(`Operation ${method.toUpperCase()} ${path} has invalid parameters format (must be array)`);
      }
    }
  }

  private validateComponents(components: any, errors: string[], warnings: string[]): void {
    // Validate schemas if present
    if (components.schemas) {
      for (const [schemaName, schema] of Object.entries(components.schemas)) {
        if (!schema || typeof schema !== 'object') {
          errors.push(`Invalid schema definition for "${schemaName}"`);
        }
      }
    }

    // Validate security schemes if present
    if (components.securitySchemes) {
      for (const [schemeName, scheme] of Object.entries(components.securitySchemes)) {
        if (!scheme || typeof scheme !== 'object') {
          errors.push(`Invalid security scheme definition for "${schemeName}"`);
        } else if (!(scheme as any).type) {
          errors.push(`Security scheme "${schemeName}" is missing required "type" field`);
        }
      }
    }
  }
} 