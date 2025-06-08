# OpenAPI Scorer

A comprehensive OpenAPI specification scoring and validation tool that helps you improve your API design quality through automated analysis and actionable feedback.

## 🚀 Features

- **Comprehensive Scoring**: Evaluates OpenAPI specs across 7 key criteria with weighted scoring
- **Multiple Input Sources**: Load specs from local files or URLs
- **Format Support**: JSON and YAML OpenAPI specifications  
- **Detailed Reports**: Export results in JSON, Markdown, or HTML formats
- **CLI Interface**: Easy-to-use command-line tool with colored output
- **Programmatic API**: Use as a library in your Node.js applications
- **Extensible**: Configurable scoring criteria and weights

## 📊 Scoring Criteria

The tool evaluates your OpenAPI specification across these criteria (total: 100 points):

| Criterion | Weight | Description |
|-----------|---------|-------------|
| **Schema & Types** | 20% | Proper data types, schema definitions, no free-form objects |
| **Descriptions & Documentation** | 20% | Meaningful descriptions for paths, operations, parameters |
| **Paths & Operations** | 15% | Consistent naming, CRUD conventions, no overlapping paths |
| **Response Codes** | 15% | Appropriate HTTP status codes for success and error cases |
| **Examples & Samples** | 10% | Request/response examples for major endpoints |
| **Security** | 10% | Defined security schemes and proper authentication |
| **Best Practices** | 10% | Versioning, servers array, tags, component reuse |

## 🛠️ Installation

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Global Installation (Optional)

```bash
npm install -g .
```

## 📖 Usage

### Command Line Interface

#### Score an OpenAPI Specification

```bash
# Score a local file
npm run dev score examples/sample-good-api.yaml

# Score from URL
npm run dev score https://api.example.com/openapi.json

# Score with detailed output
npm run dev score examples/sample-good-api.yaml --verbose

# Export report to file
npm run dev score examples/sample-good-api.yaml -f html -o report.html
npm run dev score examples/sample-good-api.yaml -f markdown -o report.md
```

#### Validate an OpenAPI Specification

```bash
# Validate syntax and structure
npm run dev validate examples/sample-good-api.yaml

# Validate from URL
npm run dev validate https://petstore.swagger.io/v2/swagger.json
```

#### Get Specification Information

```bash
# Display spec metadata
npm run dev info examples/sample-good-api.yaml
```

### Programmatic Usage

```typescript
import { OpenAPILoader, ScoringEngine, ReportGenerator } from 'openapi-scorer';

async function scoreAPI() {
  // Load the specification
  const loader = new OpenAPILoader();
  const spec = await loader.load('path/to/openapi.yaml');
  
  // Validate the specification
  const validation = loader.validate(spec);
  if (!validation.isValid) {
    console.error('Validation errors:', validation.errors);
    return;
  }
  
  // Score the specification
  const scorer = new ScoringEngine();
  const report = scorer.score(spec);
  
  // Generate report
  const generator = new ReportGenerator();
  const htmlReport = generator.generateReport(report, 'html');
  
  console.log(`Score: ${report.overallScore}/100 (${report.grade})`);
  console.log(`Issues: ${report.totalIssues}`);
}
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Test Against Sample Specs

```bash
# Test with a well-designed API (should score high)
npm run dev score examples/sample-good-api.yaml --verbose

# Test with a poorly designed API (should score low)  
npm run dev score examples/sample-bad-api.yaml --verbose
```

## 📁 Project Structure

```
src/
├── types/                 # TypeScript type definitions
├── loader/               # OpenAPI spec loading and validation
├── scoring/              # Scoring engine and criteria
├── reporting/            # Report generation (JSON/MD/HTML)
├── cli/                  # Command-line interface
├── __tests__/           # Unit and integration tests
└── index.ts             # Main entry point

examples/                # Sample OpenAPI specifications
├── sample-good-api.yaml # Well-designed API example
└── sample-bad-api.yaml  # API with common issues
```

## 🏆 Scoring Methodology

### Grade Scale
- **A (90-100)**: Excellent - Production ready with best practices
- **B (80-89)**: Good - Minor improvements recommended  
- **C (70-79)**: Fair - Several areas need attention
- **D (60-69)**: Poor - Significant improvements required
- **F (0-59)**: Failing - Major issues that must be addressed

### Issue Severity
- **Critical (5pt deduction)**: Breaks functionality or security
- **High (3pt deduction)**: Major impact on usability or standards
- **Medium (2pt deduction)**: Moderate impact on quality
- **Low (1pt deduction)**: Minor improvements for best practices


**Made with ❤️ for better API design by Utkarsh Tiwari** 
