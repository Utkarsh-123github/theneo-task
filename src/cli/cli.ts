import { Command } from 'commander';
import chalk from 'chalk';
import { OpenAPILoader } from '../loader/openapi-loader';
import { ScoringEngine } from '../scoring/scoring-engine';
import { ReportGenerator } from '../reporting/report-generator';
import { ReportFormat } from '../types';

export class CLI {
  private program: Command;
  private loader: OpenAPILoader;
  private scoringEngine: ScoringEngine;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.program = new Command();
    this.loader = new OpenAPILoader();
    this.scoringEngine = new ScoringEngine();
    this.reportGenerator = new ReportGenerator();
    
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('openapi-scorer')
      .description('A comprehensive OpenAPI specification scoring and validation tool')
      .version('1.0.0');

    this.program
      .command('score')
      .description('Score an OpenAPI specification')
      .argument('<source>', 'Path to OpenAPI spec file or URL')
      .option('-f, --format <format>', 'Output format (json, markdown, html)', 'json')
      .option('-o, --output <path>', 'Output file path')
      .option('--no-color', 'Disable colored output')
      .option('--verbose', 'Show detailed output')
      .action(async (source, options) => {
        await this.scoreCommand(source, options);
      });

    this.program
      .command('validate')
      .description('Validate OpenAPI specification syntax')
      .argument('<source>', 'Path to OpenAPI spec file or URL')
      .option('--no-color', 'Disable colored output')
      .action(async (source, options) => {
        await this.validateCommand(source, options);
      });

    this.program
      .command('info')
      .description('Show information about an OpenAPI specification')
      .argument('<source>', 'Path to OpenAPI spec file or URL')
      .action(async (source) => {
        await this.infoCommand(source);
      });
  }

  async run(args: string[]): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async scoreCommand(source: string, options: any): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Loading OpenAPI specification...'));
      
      // Load the specification
      const spec = await this.loader.load(source);
      
      // Validate first
      const validation = this.loader.validate(spec);
      if (!validation.isValid) {
        console.error(chalk.red('❌ Validation failed:'));
        validation.errors.forEach(error => {
          console.error(chalk.red('  -'), error);
        });
        process.exit(1);
      }

      if (validation.warnings.length > 0 && options.verbose) {
        console.log(chalk.yellow('⚠️  Warnings:'));
        validation.warnings.forEach(warning => {
          console.log(chalk.yellow('  -'), warning);
        });
      }

      console.log(chalk.green('✅ Specification loaded and validated'));
      console.log(chalk.blue('📊 Scoring specification...'));

      // Score the specification
      const report = this.scoringEngine.score(spec);

      // Display results
      this.displayScore(report, options.verbose);

      // Generate and save report if output specified
      if (options.output) {
        const format = options.format as ReportFormat;
        await this.reportGenerator.exportReport(report, {
          format,
          outputPath: options.output
        });
        console.log(chalk.green(`📄 Report saved to: ${options.output}`));
      } else if (options.format !== 'json' || options.verbose) {
        // Show formatted output if not JSON or if verbose
        const content = this.reportGenerator.generateReport(report, options.format);
        console.log('\n' + content);
      }

    } catch (error) {
      console.error(chalk.red('❌ Error scoring specification:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  }

  private async validateCommand(source: string, options: any): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Loading OpenAPI specification...'));
      
      const spec = await this.loader.load(source);
      const validation = this.loader.validate(spec);

      if (validation.isValid) {
        console.log(chalk.green('✅ OpenAPI specification is valid'));
        
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow('  -'), warning);
          });
        }
      } else {
        console.log(chalk.red('❌ OpenAPI specification is invalid'));
        console.log(chalk.red('\nErrors:'));
        validation.errors.forEach(error => {
          console.log(chalk.red('  -'), error);
        });
        
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow('  -'), warning);
          });
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Error validating specification:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  }

  private async infoCommand(source: string): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Loading OpenAPI specification...'));
      
      const spec = await this.loader.load(source);
      
      console.log(chalk.green('\n📋 Specification Information:'));
      console.log(`${chalk.bold('Title:')} ${spec.info?.title || 'N/A'}`);
      console.log(`${chalk.bold('Version:')} ${spec.info?.version || 'N/A'}`);
      console.log(`${chalk.bold('OpenAPI Version:')} ${spec.openapi || 'N/A'}`);
      
      if (spec.info?.description) {
        console.log(`${chalk.bold('Description:')} ${spec.info.description}`);
      }

      if (spec.servers && spec.servers.length > 0) {
        console.log(`${chalk.bold('Servers:')} ${spec.servers.length}`);
        spec.servers.forEach((server, index) => {
          console.log(`  ${index + 1}. ${server.url}${server.description ? ` - ${server.description}` : ''}`);
        });
      }

      const pathCount = Object.keys(spec.paths || {}).length;
      console.log(`${chalk.bold('Paths:')} ${pathCount}`);

      if (spec.tags && spec.tags.length > 0) {
        console.log(`${chalk.bold('Tags:')} ${spec.tags.map(t => t.name).join(', ')}`);
      }

      // Count operations
      let operationCount = 0;
      if (spec.paths) {
        for (const pathItem of Object.values(spec.paths)) {
          const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
          for (const method of methods) {
            if ((pathItem as any)[method]) {
              operationCount++;
            }
          }
        }
      }
      console.log(`${chalk.bold('Operations:')} ${operationCount}`);

      // Component info
      if (spec.components) {
        const components = spec.components;
        console.log(`${chalk.bold('Components:')}`);
        if (components.schemas) {
          console.log(`  - Schemas: ${Object.keys(components.schemas).length}`);
        }
        if (components.securitySchemes) {
          console.log(`  - Security Schemes: ${Object.keys(components.securitySchemes).length}`);
        }
        if (components.responses) {
          console.log(`  - Responses: ${Object.keys(components.responses).length}`);
        }
        if (components.parameters) {
          console.log(`  - Parameters: ${Object.keys(components.parameters).length}`);
        }
      }

    } catch (error) {
      console.error(chalk.red('❌ Error getting specification info:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  }

  private displayScore(report: any, verbose: boolean): void {
    const scoreColor = this.getScoreColor(report.overallScore);
    
    console.log(chalk.bold('\n📊 Scoring Results'));
    console.log('═'.repeat(50));
    
    console.log(`${chalk.bold('Overall Score:')} ${scoreColor(report.overallScore)}/100 (${this.getGradeColor(report.grade)(report.grade)})`);
    console.log(`${chalk.bold('API:')} ${report.specInfo.title} v${report.specInfo.version}`);
    console.log(`${chalk.bold('Total Issues:')} ${report.totalIssues}`);
    
    // Issue summary
    if (report.summary.criticalIssues > 0) {
      console.log(`  - ${chalk.red('Critical:')} ${report.summary.criticalIssues}`);
    }
    if (report.summary.highIssues > 0) {
      console.log(`  - ${chalk.keyword('orange')('High:')} ${report.summary.highIssues}`);
    }
    if (report.summary.mediumIssues > 0) {
      console.log(`  - ${chalk.yellow('Medium:')} ${report.summary.mediumIssues}`);
    }
    if (report.summary.lowIssues > 0) {
      console.log(`  - ${chalk.blue('Low:')} ${report.summary.lowIssues}`);
    }

    console.log('\n📋 Criteria Breakdown:');
    console.log('─'.repeat(70));
    
    for (const result of report.results) {
      const percentage = ((result.score / result.maxScore) * 100).toFixed(1);
      const scoreDisplay = `${result.score}/${result.maxScore} (${percentage}%)`;
      const issueCount = result.issues.length > 0 ? chalk.red(`${result.issues.length} issues`) : chalk.green('✓');
      
      console.log(`${chalk.bold(result.criterion.padEnd(25))} ${scoreDisplay.padEnd(15)} ${issueCount}`);
    }

    if (verbose && report.totalIssues > 0) {
      console.log('\n🔍 Detailed Issues:');
      console.log('─'.repeat(70));
      
      for (const result of report.results) {
        if (result.issues.length > 0) {
          console.log(`\n${chalk.bold.underline(result.criterion)}:`);
          
          for (const issue of result.issues) {
            const severityColor = this.getSeverityColor(issue.severity);
            console.log(`  ${severityColor('●')} ${issue.description}`);
            console.log(`    ${chalk.gray('Location:')} ${issue.path}${issue.operation ? ` → ${issue.operation.toUpperCase()}` : ''} → ${issue.location}`);
            console.log(`    ${chalk.gray('Suggestion:')} ${issue.suggestion}`);
          }
        }
      }
    }
  }

  private getScoreColor(score: number) {
    if (score >= 90) return chalk.green;
    if (score >= 80) return chalk.blue;
    if (score >= 70) return chalk.yellow;
    if (score >= 60) return chalk.keyword('orange');
    return chalk.red;
  }

  private getGradeColor(grade: string) {
    switch (grade) {
      case 'A': return chalk.green;
      case 'B': return chalk.blue;
      case 'C': return chalk.yellow;
      case 'D': return chalk.keyword('orange');
      case 'F': return chalk.red;
      default: return chalk.white;
    }
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return chalk.red;
      case 'high': return chalk.keyword('orange');
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.white;
    }
  }
} 