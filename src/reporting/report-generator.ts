import { ScoringReport, ReportFormat, ExportOptions } from '../types';
import { promises as fs } from 'fs';

export class ReportGenerator {
  /**
   * Generate report in specified format
   */
  generateReport(report: ScoringReport, format: ReportFormat): string {
    switch (format) {
      case 'json':
        return this.generateJsonReport(report);
      case 'markdown':
        return this.generateMarkdownReport(report);
      case 'html':
        return this.generateHtmlReport(report);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Export report to file
   */
  async exportReport(report: ScoringReport, options: ExportOptions): Promise<string> {
    const content = this.generateReport(report, options.format);
    
    if (options.outputPath) {
      await fs.writeFile(options.outputPath, content, 'utf8');
      return options.outputPath;
    }
    
    return content;
  }

  private generateJsonReport(report: ScoringReport): string {
    return JSON.stringify(report, null, 2);
  }

  private generateMarkdownReport(report: ScoringReport): string {
    const md = [];
    
    // Header
    md.push(`# OpenAPI Specification Scoring Report`);
    md.push('');
    md.push(`**API:** ${report.specInfo.title} v${report.specInfo.version}`);
    md.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
    md.push('');
    
    // Overall Score
    md.push(`## Overall Score: ${report.overallScore}/100 (Grade: ${report.grade})`);
    md.push('');
    
    // Score breakdown
    md.push(`## Score Breakdown`);
    md.push('');
    md.push('| Criterion | Score | Max | Weight | Issues |');
    md.push('|-----------|-------|-----|--------|--------|');
    
    for (const result of report.results) {
      md.push(`| ${result.criterion} | ${result.score} | ${result.maxScore} | ${result.weight}% | ${result.issues.length} |`);
    }
    
    md.push('');
    
    // Summary
    md.push(`## Summary`);
    md.push('');
    md.push(`- **Total Issues:** ${report.totalIssues}`);
    md.push(`- **Critical:** ${report.summary.criticalIssues}`);
    md.push(`- **High:** ${report.summary.highIssues}`);
    md.push(`- **Medium:** ${report.summary.mediumIssues}`);
    md.push(`- **Low:** ${report.summary.lowIssues}`);
    md.push('');
    md.push(`**API Statistics:**`);
    md.push(`- Paths: ${report.specInfo.pathCount}`);
    md.push(`- Operations: ${report.specInfo.operationCount}`);
    md.push('');
    
    // Detailed Issues
    md.push(`## Detailed Issues`);
    md.push('');
    
    for (const result of report.results) {
      if (result.issues.length > 0) {
        md.push(`### ${result.criterion} (${result.issues.length} issues)`);
        md.push('');
        
        for (const issue of result.issues) {
          md.push(`#### ${this.getSeverityEmoji(issue.severity)} ${issue.description}`);
          md.push('');
          md.push(`**Location:** ${issue.path}${issue.operation ? ` → ${issue.operation.toUpperCase()}` : ''} → ${issue.location}`);
          md.push('');
          md.push(`**Severity:** ${issue.severity.toUpperCase()}`);
          md.push('');
          md.push(`**Suggestion:** ${issue.suggestion}`);
          md.push('');
        }
      }
    }
    
    return md.join('\n');
  }

  private generateHtmlReport(report: ScoringReport): string {
    const scoreColor = this.getScoreColor(report.overallScore);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenAPI Scoring Report - ${report.specInfo.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #e9ecef;
        }
        .score-display {
            font-size: 3em;
            font-weight: bold;
            color: ${scoreColor};
            margin: 10px 0;
        }
        .grade {
            font-size: 2em;
            background: ${scoreColor};
            color: white;
            padding: 10px 20px;
            border-radius: 50%;
            display: inline-block;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #495057;
        }
        .criteria-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .criteria-table th,
        .criteria-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .criteria-table th {
            background-color: #495057;
            color: white;
        }
        .criteria-table tr:hover {
            background-color: #f8f9fa;
        }
        .issue {
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid;
            border-radius: 4px;
        }
        .issue.critical {
            border-color: #dc3545;
            background-color: #f8d7da;
        }
        .issue.high {
            border-color: #fd7e14;
            background-color: #ffeaa7;
        }
        .issue.medium {
            border-color: #ffc107;
            background-color: #fff3cd;
        }
        .issue.low {
            border-color: #17a2b8;
            background-color: #d1ecf1;
        }
        .issue-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .issue-location {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
        }
        .issue-suggestion {
            font-style: italic;
            color: #495057;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .progress-bar {
            background-color: #e9ecef;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: ${scoreColor};
            width: ${report.overallScore}%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OpenAPI Specification Scoring Report</h1>
            <h2>${report.specInfo.title} v${report.specInfo.version}</h2>
            <div class="score-display">${report.overallScore}/100</div>
            <div class="grade">${report.grade}</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </div>

        <div class="section">
            <h2>Statistics</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${report.totalIssues}</div>
                    <div>Total Issues</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${report.specInfo.pathCount}</div>
                    <div>API Paths</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${report.specInfo.operationCount}</div>
                    <div>Operations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${report.summary.criticalIssues}</div>
                    <div>Critical Issues</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Score Breakdown</h2>
            <table class="criteria-table">
                <thead>
                    <tr>
                        <th>Criterion</th>
                        <th>Score</th>
                        <th>Max Score</th>
                        <th>Weight</th>
                        <th>Issues</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.results.map(result => `
                        <tr>
                            <td>${result.criterion}</td>
                            <td>${result.score}</td>
                            <td>${result.maxScore}</td>
                            <td>${result.weight}%</td>
                            <td>${result.issues.length}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Detailed Issues</h2>
            ${report.results.map(result => {
              if (result.issues.length === 0) return '';
              
              return `
                <h3>${result.criterion} (${result.issues.length} issues)</h3>
                ${result.issues.map(issue => `
                    <div class="issue ${issue.severity}">
                        <div class="issue-title">${this.getSeverityEmoji(issue.severity)} ${issue.description}</div>
                        <div class="issue-location">
                            <strong>Location:</strong> ${issue.path}${issue.operation ? ` → ${issue.operation.toUpperCase()}` : ''} → ${issue.location}
                        </div>
                        <div class="issue-suggestion">
                            <strong>Suggestion:</strong> ${issue.suggestion}
                        </div>
                    </div>
                `).join('')}
              `;
            }).join('')}
        </div>
    </div>
</body>
</html>`.trim();
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return '#28a745';
    if (score >= 80) return '#17a2b8';
    if (score >= 70) return '#ffc107';
    if (score >= 60) return '#fd7e14';
    return '#dc3545';
  }
} 